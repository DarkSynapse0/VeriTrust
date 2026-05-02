/// Minimal ABI for VeriTrustRegistry — only the surface the web app uses.
/// Source of truth is packages/contracts/contracts/VeriTrustRegistry.sol.
export const VeriTrustRegistryAbi = [
  {
    type: 'function',
    name: 'authorizeIssuer',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'issuer', type: 'address' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'revokeIssuer',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'issuer', type: 'address' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'transferAdmin',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'newAdmin', type: 'address' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'registerCredential',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'credentialHash', type: 'bytes32' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'batchRegister',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'hashes', type: 'bytes32[]' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'revokeCredential',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'credentialHash', type: 'bytes32' },
      { name: 'reason', type: 'uint8' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'verifyCredential',
    stateMutability: 'view',
    inputs: [{ name: 'credentialHash', type: 'bytes32' }],
    outputs: [
      { name: 'exists', type: 'bool' },
      { name: 'issuer', type: 'address' },
      { name: 'registeredAt', type: 'uint40' },
      { name: 'revokedAt', type: 'uint40' },
      { name: 'revocationReason', type: 'uint8' },
      { name: 'revoked', type: 'bool' },
    ],
  },
  {
    type: 'function',
    name: 'isAuthorizedIssuer',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'bool' }],
  },
  {
    type: 'event',
    name: 'CredentialRegistered',
    inputs: [
      { name: 'credentialHash', type: 'bytes32', indexed: true },
      { name: 'issuer', type: 'address', indexed: true },
      { name: 'timestamp', type: 'uint40', indexed: false },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'CredentialRevoked',
    inputs: [
      { name: 'credentialHash', type: 'bytes32', indexed: true },
      { name: 'issuer', type: 'address', indexed: true },
      { name: 'reason', type: 'uint8', indexed: false },
      { name: 'timestamp', type: 'uint40', indexed: false },
    ],
    anonymous: false,
  },
] as const;

export type VeriTrustRegistryAbiType = typeof VeriTrustRegistryAbi;
