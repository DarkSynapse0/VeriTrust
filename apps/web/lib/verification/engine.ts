import type {
  Bytes32Hex,
  CredentialPublicView,
  EthAddress,
  VerificationResult,
} from '@veritrust/shared-types';
import { reasonFromByte } from '@veritrust/shared-types';
import type { OnChainCredential } from '../chain/adapter';
import type { Credential, Issuer } from '../db';

/// Dependencies the engine talks to. Injected so the engine itself stays a
/// pure function — easy to unit-test with mocks.
export interface EngineDeps {
  readChain: (hash: Bytes32Hex) => Promise<OnChainCredential>;
  readDbCredential: (hash: Bytes32Hex) => Promise<(Credential & { issuer: Issuer }) | null>;
  /// Optional — when provided, the engine fetches the canonical JSON and
  /// re-hashes it; mismatch ⇒ TAMPERED. Tests can omit this.
  fetchCanonicalAndRehash?: (
    canonicalKey: string,
  ) => Promise<{ rehashedCredentialHash: Bytes32Hex }>;
}

function toPublicView(
  cred: Credential & { issuer: Issuer },
  fields: Record<string, string | number | boolean>,
): CredentialPublicView {
  return {
    credentialHash: cred.credentialHash as Bytes32Hex,
    credentialType: cred.credentialType,
    schemaVersion: cred.schemaVersion,
    recipientName: cred.recipientName,
    issuer: {
      id: cred.issuer.id,
      walletAddress: cred.issuer.walletAddress as EthAddress,
      name: cred.issuer.name,
      logoUrl: cred.issuer.logoUrl,
      isAuthorized: cred.issuer.isAuthorized,
    },
    fields,
    issuedAt: cred.issuedAt.toISOString(),
    expiresAt: cred.expiresAt?.toISOString() ?? null,
    revokedAt: cred.revokedAt?.toISOString() ?? null,
    revocationReason: cred.revocationReason ?? null,
  };
}

/// Verify a credential by hash. Pure function over its dependencies.
///
/// Decision flow (see also docs/architecture.md):
///   1. Read chain. Not exists → NOT_REGISTERED.
///   2. Read DB. Missing → NOT_REGISTERED (we have the hash but no canonical
///      record; verifier should treat this as "we don't know about this").
///   3. Chain says revoked → REVOKED.
///   4. (Optional) Re-hash canonical JSON; mismatch → TAMPERED.
///   5. Otherwise → VERIFIED.
export async function verifyByHash(
  credentialHash: Bytes32Hex,
  deps: EngineDeps,
): Promise<VerificationResult> {
  const verifiedAt = new Date().toISOString();

  const onChain = await deps.readChain(credentialHash);
  if (!onChain.exists) {
    return { status: 'NOT_REGISTERED', credentialHash, verifiedAt };
  }

  const dbCred = await deps.readDbCredential(credentialHash);
  if (!dbCred) {
    return { status: 'NOT_REGISTERED', credentialHash, verifiedAt };
  }

  const publicFields = (dbCred.metadata as Record<string, string | number | boolean> | null) ?? {};
  const publicView = toPublicView(dbCred, publicFields);

  if (onChain.revoked) {
    const reason = reasonFromByte(onChain.revocationReason) ?? 'OTHER';
    return {
      status: 'REVOKED',
      credentialHash,
      credential: publicView,
      revokedAt: new Date(onChain.revokedAt * 1000).toISOString(),
      revocationReason: reason,
      verifiedAt,
    };
  }

  if (deps.fetchCanonicalAndRehash) {
    try {
      const { rehashedCredentialHash } = await deps.fetchCanonicalAndRehash(
        dbCred.canonicalJsonR2Key,
      );
      if (rehashedCredentialHash.toLowerCase() !== credentialHash.toLowerCase()) {
        return {
          status: 'TAMPERED',
          credentialHash,
          canonicalCredential: publicView,
          mismatch: 'pdf-canonical',
          verifiedAt,
        };
      }
    } catch {
      // Storage unavailable — fall through to VERIFIED based on chain+DB.
      // The lib/storage failure is its own concern; we trust the chain hash.
    }
  }

  return {
    status: 'VERIFIED',
    credentialHash,
    credential: publicView,
    chainTxHash: dbCred.chainTxHash ?? '',
    chainBlockNumber: Number(dbCred.chainBlockNumber ?? 0n),
    verifiedAt,
  };
}
