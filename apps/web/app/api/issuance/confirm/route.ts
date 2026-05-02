import { z } from 'zod';
import { ok, fail, ApiErrorCodes } from '@/lib/api/envelope';
import { prisma } from '@/lib/db';
import { requireSession } from '@/lib/auth/session';
import { waitForConfirmation } from '@/lib/chain/adapter';
import { putCanonicalJson, canonicalJsonKey } from '@/lib/storage/r2';
import { invalidateCached, verificationCacheKey } from '@/lib/cache/redis';
import { audit } from '@/lib/audit/logger';

const Body = z.object({
  credentialId: z.string().min(1),
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  canonicalJsonBase64: z.string().min(1),
});

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
    return fail(ApiErrorCodes.FORBIDDEN, 'You did not issue this credential', 403);
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
    await prisma.credential.update({
      where: { id: cred.id },
      data: { status: 'FAILED', chainTxHash: parsed.data.txHash },
    });
    return fail(ApiErrorCodes.CONFLICT, 'Chain transaction reverted', 409);
  }

  // Persist canonical JSON to R2.
  let r2Key = cred.canonicalJsonR2Key;
  if (!r2Key) {
    r2Key = canonicalJsonKey(cred.id);
    try {
      const bytes = Buffer.from(parsed.data.canonicalJsonBase64, 'base64');
      await putCanonicalJson(r2Key, bytes);
    } catch (e: unknown) {
      // R2 unavailable is non-fatal — chain is the source of truth and we can
      // regenerate canonical JSON from DB metadata. Log + continue.
      console.warn('R2 upload failed:', e);
    }
  }

  await prisma.$transaction([
    prisma.credential.update({
      where: { id: cred.id },
      data: {
        status: 'CONFIRMED',
        chainTxHash: parsed.data.txHash,
        chainConfirmedAt: new Date(),
        chainBlockNumber: receipt.blockNumber,
        canonicalJsonR2Key: r2Key,
      },
    }),
    prisma.issuer.update({
      where: { id: cred.issuerId },
      data: { credentialsIssued: { increment: 1 } },
    }),
  ]);

  await invalidateCached(verificationCacheKey(cred.credentialHash));

  await audit({
    entityType: 'credential',
    entityId: cred.id,
    action: 'credential.confirmed',
    actorAddress: session.address,
    payloadHash: cred.credentialHash,
    metadata: {
      txHash: parsed.data.txHash,
      blockNumber: Number(receipt.blockNumber),
    },
  });

  return ok({ status: 'CONFIRMED', credentialHash: cred.credentialHash });
}
