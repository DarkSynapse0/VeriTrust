// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";

/// @title  VeriTrustRegistry
/// @notice Tamper-evident registry of credential hashes. Stores hashes only;
///         all human-readable credential data lives off-chain (R2 + Postgres).
/// @dev    Admin manages the issuer allowlist via OpenZeppelin AccessControl.
///         Only authorized issuers may register or revoke credentials. A
///         credential record is fixed at registration; only the revocation
///         fields can change after creation.
contract VeriTrustRegistry is AccessControl {
    // -----------------------------------------------------------------
    // Roles
    // -----------------------------------------------------------------
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");

    // -----------------------------------------------------------------
    // Limits
    // -----------------------------------------------------------------
    uint256 public constant MAX_BATCH_SIZE = 500;
    uint8 public constant MAX_REVOCATION_REASON = 4;

    // -----------------------------------------------------------------
    // Storage — packed into a single 32-byte slot
    //   address (20) + uint40 (5) + uint40 (5) + uint8 (1) = 31 bytes
    // -----------------------------------------------------------------
    struct CredentialRecord {
        address issuer;
        uint40 registeredAt;
        uint40 revokedAt;
        uint8 revocationReason;
    }

    mapping(bytes32 credentialHash => CredentialRecord record) private _records;

    // -----------------------------------------------------------------
    // Events
    // -----------------------------------------------------------------
    event IssuerAuthorized(address indexed issuer, address indexed by);
    event IssuerRevoked(address indexed issuer, address indexed by);
    event AdminTransferred(address indexed from, address indexed to);
    event CredentialRegistered(
        bytes32 indexed credentialHash,
        address indexed issuer,
        uint40 timestamp
    );
    event CredentialRevoked(
        bytes32 indexed credentialHash,
        address indexed issuer,
        uint8 reason,
        uint40 timestamp
    );
    event BatchRegistered(address indexed issuer, uint256 count);

    // -----------------------------------------------------------------
    // Errors
    // -----------------------------------------------------------------
    error ZeroAddress();
    error ZeroHash();
    error EmptyBatch();
    error BatchTooLarge(uint256 size, uint256 max);
    error CredentialAlreadyRegistered(bytes32 credentialHash);
    error CredentialNotFound(bytes32 credentialHash);
    error CredentialAlreadyRevoked(bytes32 credentialHash);
    error NotOriginalIssuer(bytes32 credentialHash, address caller, address originalIssuer);
    error InvalidRevocationReason(uint8 reason);
    error AdminTransferToSelf();

    // -----------------------------------------------------------------
    // Constructor
    // -----------------------------------------------------------------
    constructor(address initialAdmin) {
        if (initialAdmin == address(0)) revert ZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, initialAdmin);
    }

    // -----------------------------------------------------------------
    // Issuer management
    // -----------------------------------------------------------------

    /// @notice Grant ISSUER_ROLE to `issuer`. Idempotent: emits no event if
    ///         the address is already an authorized issuer.
    function authorizeIssuer(address issuer) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (issuer == address(0)) revert ZeroAddress();
        if (!hasRole(ISSUER_ROLE, issuer)) {
            _grantRole(ISSUER_ROLE, issuer);
            emit IssuerAuthorized(issuer, msg.sender);
        }
    }

    /// @notice Revoke ISSUER_ROLE from `issuer`. Idempotent: emits no event
    ///         if the address was not authorized. Previously-registered
    ///         credentials remain on-chain; only future writes are blocked.
    function revokeIssuer(address issuer) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (issuer == address(0)) revert ZeroAddress();
        if (hasRole(ISSUER_ROLE, issuer)) {
            _revokeRole(ISSUER_ROLE, issuer);
            emit IssuerRevoked(issuer, msg.sender);
        }
    }

    function isAuthorizedIssuer(address account) external view returns (bool) {
        return hasRole(ISSUER_ROLE, account);
    }

    // -----------------------------------------------------------------
    // Admin transfer
    // -----------------------------------------------------------------

    /// @notice Atomically grant DEFAULT_ADMIN_ROLE to `newAdmin` and revoke
    ///         it from the caller. Single-step on purpose for the hackathon;
    ///         production deployments should use a multisig or a two-step
    ///         pattern (Ownable2Step-style).
    function transferAdmin(address newAdmin) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newAdmin == address(0)) revert ZeroAddress();
        if (newAdmin == msg.sender) revert AdminTransferToSelf();
        _grantRole(DEFAULT_ADMIN_ROLE, newAdmin);
        _revokeRole(DEFAULT_ADMIN_ROLE, msg.sender);
        emit AdminTransferred(msg.sender, newAdmin);
    }

    // -----------------------------------------------------------------
    // Credential registration
    // -----------------------------------------------------------------

    /// @notice Register a single credential hash. Reverts on duplicate so
    ///         the API layer can distinguish "already issued by us"
    ///         (surface as success) from "issued by someone else" (conflict).
    function registerCredential(bytes32 credentialHash) external onlyRole(ISSUER_ROLE) {
        _registerCredential(credentialHash);
    }

    /// @notice Atomically register a batch. Any failure (zero hash, duplicate)
    ///         reverts the entire batch — the API pre-filters duplicates.
    function batchRegister(bytes32[] calldata hashes) external onlyRole(ISSUER_ROLE) {
        uint256 n = hashes.length;
        if (n == 0) revert EmptyBatch();
        if (n > MAX_BATCH_SIZE) revert BatchTooLarge(n, MAX_BATCH_SIZE);
        for (uint256 i = 0; i < n; ) {
            _registerCredential(hashes[i]);
            unchecked {
                ++i;
            }
        }
        emit BatchRegistered(msg.sender, n);
    }

    function _registerCredential(bytes32 credentialHash) internal {
        if (credentialHash == bytes32(0)) revert ZeroHash();
        CredentialRecord storage rec = _records[credentialHash];
        if (rec.issuer != address(0)) revert CredentialAlreadyRegistered(credentialHash);
        uint40 ts = uint40(block.timestamp);
        rec.issuer = msg.sender;
        rec.registeredAt = ts;
        emit CredentialRegistered(credentialHash, msg.sender, ts);
    }

    // -----------------------------------------------------------------
    // Credential revocation
    // -----------------------------------------------------------------

    /// @notice Revoke a credential. Only the original issuer can revoke,
    ///         and only if they currently hold ISSUER_ROLE. If a
    ///         de-authorized issuer needs to revoke, the admin must
    ///         re-authorize them first (intentional kill-switch behavior).
    /// @param  reason 1=ERROR, 2=FRAUD, 3=EXPIRED, 4=OTHER. Zero is
    ///         reserved as the "not revoked" sentinel.
    function revokeCredential(bytes32 credentialHash, uint8 reason) external onlyRole(ISSUER_ROLE) {
        if (reason == 0 || reason > MAX_REVOCATION_REASON) {
            revert InvalidRevocationReason(reason);
        }
        CredentialRecord storage rec = _records[credentialHash];
        if (rec.issuer == address(0)) revert CredentialNotFound(credentialHash);
        if (rec.issuer != msg.sender) {
            revert NotOriginalIssuer(credentialHash, msg.sender, rec.issuer);
        }
        if (rec.revokedAt != 0) revert CredentialAlreadyRevoked(credentialHash);
        uint40 ts = uint40(block.timestamp);
        rec.revokedAt = ts;
        rec.revocationReason = reason;
        emit CredentialRevoked(credentialHash, msg.sender, reason, ts);
    }

    // -----------------------------------------------------------------
    // Verification (read)
    // -----------------------------------------------------------------

    /// @notice Read a credential record. Returns zeroed values for an
    ///         unregistered hash; callers should branch on `exists`.
    function verifyCredential(
        bytes32 credentialHash
    )
        external
        view
        returns (
            bool exists,
            address issuer,
            uint40 registeredAt,
            uint40 revokedAt,
            uint8 revocationReason,
            bool revoked
        )
    {
        CredentialRecord storage rec = _records[credentialHash];
        exists = rec.issuer != address(0);
        issuer = rec.issuer;
        registeredAt = rec.registeredAt;
        revokedAt = rec.revokedAt;
        revocationReason = rec.revocationReason;
        revoked = rec.revokedAt != 0;
    }
}
