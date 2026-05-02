import { z } from 'zod';
import { ok, fail, ApiErrorCodes } from '@/lib/api/envelope';
import { prisma } from '@/lib/db';
import { requireSession } from '@/lib/auth/session';
import { waitForConfirmation } from '@/lib/chain/adapter';
import { invalidateCached, verificationCacheKey } from '@/lib/cache/redis';
import { audit } from '@/lib/audit/logger';
import { REVOCATION_REASONS, reasonFromByte } from '@veritrust/shared-types';

const Body = z.object({
  credentialId: z.string().min(1),
  reason: z.enum(REVOCATION_REASONS),
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
});

/// Confirms a revocation tx the issuer has already submitted from their wallet.
/// The wallet sign is the security boundary; the API just records and waits.
export async function POST(req: Request): Promise<Response> {
  let session;
  try {
    session = await requireSession();
  } catch {
    return fail(ApiErrorCodes.UNAUTHORIZED, 'Sign in with your wallet first', 401);
  }
  const body = await req.json().catch(() => null);
  const parsed = Body.safeParse(body);
  if (!parsed.success) return fail(ApiErrorCodes.BAD_REQUEST, 'Invalid request body');

  const cred = await prisma.credential.findUnique({
    where: { id: parsed.data.credentialId },
    include: { issuer: true },
  });
  if (!cred) return fail(ApiErrorCodes.NOT_FOUND, 'Credential not found', 404);
  if (cred.issuer.walletAddress.toLowerCase() !== session.address.toLowerCase()) {
    return fail(ApiErrorCodes.FORBIDDEN, 'Only the original issuer can revoke', 403);
  }
  if (cred.status === 'REVOKED') {
    return fail(ApiErrorCodes.CONFLICT, 'Credential already revoked', 409);
  }

  let receipt;
  try {
    receipt = await waitForConfirmation(parsed.data.txHash as `0x${string}`, 2);
  } catch (e: unknown) {
    return fail(
      ApiErrorCodes.CHAIN_UNAVAILABLE,
      e instanceof Error ? e.message : 'tx_confirmation_failed',
      503,
    );
  }
  if (receipt.status !== 'success') {
    return fail(ApiErrorCodes.CONFLICT, 'Revocation transaction reverted', 409);
  }

  await prisma.$transaction([
    prisma.credential.update({
      where: { id: cred.id },
      data: {
        status: 'REVOKED',
        revokedAt: new Date(),
        revocationReason: parsed.data.reason,
        revocationTxHash: parsed.data.txHash,
      },
    }),
    prisma.issuer.update({
      where: { id: cred.issuerId },
      data: { credentialsRevoked: { increment: 1 } },
    }),
  ]);

  await invalidateCached(verificationCacheKey(cred.credentialHash));

  await audit({
    entityType: 'credential',
    entityId: cred.id,
    action: 'credential.revoked',
    actorAddress: session.address,
    payloadHash: cred.credentialHash,
    metadata: {
      reason: parsed.data.reason,
      txHash: parsed.data.txHash,
      reasonByte:
        Object.entries({ ERROR: 1, FRAUD: 2, EXPIRED: 3, OTHER: 4 }).find(
          ([k]) => k === parsed.data.reason,
        )?.[1] ?? 0,
    },
  });

  return ok({
    status: 'REVOKED',
    credentialHash: cred.credentialHash,
    reason: reasonFromByte(
      Object.entries({ ERROR: 1, FRAUD: 2, EXPIRED: 3, OTHER: 4 }).find(
        ([k]) => k === parsed.data.reason,
      )?.[1] ?? 0,
    ),
  });
}
