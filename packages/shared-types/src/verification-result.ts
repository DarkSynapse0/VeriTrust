import type { Bytes32Hex, CredentialPublicView } from './credential';
import type { RevocationReason } from './revocation-reason';

// The four-state model. The status field is the discriminator — never use a
// nullable details field with optional sub-fields; switch on `status`.

export type VerificationStatus = 'VERIFIED' | 'TAMPERED' | 'REVOKED' | 'NOT_REGISTERED';

export interface VerifiedResult {
  readonly status: 'VERIFIED';
  readonly credentialHash: Bytes32Hex;
  readonly credential: CredentialPublicView;
  readonly chainTxHash: string;
  readonly chainBlockNumber: number;
  readonly verifiedAt: string;
}

export interface TamperedResult {
  readonly status: 'TAMPERED';
  readonly credentialHash: Bytes32Hex;
  /// What we have on record, when there's enough metadata to render side-by-side.
  readonly canonicalCredential: CredentialPublicView | null;
  /// Where the mismatch was first observed: 'pdf-payload' (PDF QR vs payload),
  /// 'pdf-canonical' (PDF payload differs from R2 canonical), or 'pdf-chain'
  /// (everything signed but the chain has a different hash for this id).
  readonly mismatch: 'pdf-payload' | 'pdf-canonical' | 'pdf-chain' | 'unknown';
  readonly verifiedAt: string;
}

export interface RevokedResult {
  readonly status: 'REVOKED';
  readonly credentialHash: Bytes32Hex;
  readonly credential: CredentialPublicView;
  readonly revokedAt: string;
  readonly revocationReason: RevocationReason;
  readonly verifiedAt: string;
}

export interface NotRegisteredResult {
  readonly status: 'NOT_REGISTERED';
  readonly credentialHash: Bytes32Hex;
  readonly verifiedAt: string;
}

export type VerificationResult =
  | VerifiedResult
  | TamperedResult
  | RevokedResult
  | NotRegisteredResult;

export const isVerified = (r: VerificationResult): r is VerifiedResult => r.status === 'VERIFIED';
export const isTampered = (r: VerificationResult): r is TamperedResult => r.status === 'TAMPERED';
export const isRevoked = (r: VerificationResult): r is RevokedResult => r.status === 'REVOKED';
export const isNotRegistered = (r: VerificationResult): r is NotRegisteredResult =>
  r.status === 'NOT_REGISTERED';
