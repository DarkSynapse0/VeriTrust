import type { CredentialType } from './credential-type';
import type { RevocationReason } from './revocation-reason';

/// Hex string `0x` followed by 64 hex chars (32 bytes).
export type Bytes32Hex = `0x${string}`;

/// Lowercase 0x-prefixed Ethereum address.
export type EthAddress = `0x${string}`;

/// The canonical credential payload — the exact shape that gets canonicalized
/// (RFC 8785) and hashed. No client-specific extensions live here. Optional
/// fields must be omitted, not set to null, for canonicalization stability.
export interface CanonicalCredential {
  /// "veritrust.credential.v1"
  readonly type: 'veritrust.credential.v1';
  readonly credentialType: CredentialType;
  /// Schema version, e.g. "1.0.0".
  readonly schemaVersion: string;
  readonly issuer: {
    readonly walletAddress: EthAddress;
    readonly name: string;
  };
  readonly recipient: {
    readonly name: string;
    /// SHA-256 hex of email or other identifier. Never the raw value.
    readonly idHash: string;
  };
  readonly fields: Readonly<Record<string, string | number | boolean>>;
  /// ISO 8601 timestamp, e.g. "2026-05-02T00:00:00.000Z".
  readonly issuedAt: string;
  readonly expiresAt?: string;
}

export interface CredentialPublicView {
  readonly credentialHash: Bytes32Hex;
  readonly credentialType: CredentialType;
  readonly schemaVersion: string;
  readonly recipientName: string;
  readonly issuer: {
    readonly id: string;
    readonly walletAddress: EthAddress;
    readonly name: string;
    readonly logoUrl: string | null;
    readonly isAuthorized: boolean;
  };
  readonly fields: Readonly<Record<string, string | number | boolean>>;
  readonly issuedAt: string;
  readonly expiresAt: string | null;
  readonly revokedAt: string | null;
  readonly revocationReason: RevocationReason | null;
}
