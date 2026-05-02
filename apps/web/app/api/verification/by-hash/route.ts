import { z } from 'zod';
import type { Bytes32Hex } from '@veritrust/shared-types';
import { ok, fail, ApiErrorCodes } from '@/lib/api/envelope';
import { readCredential } from '@/lib/chain/adapter';
import { prisma } from '@/lib/db';
import { rehash } from '@/lib/canonicalize';
import { getCanonicalJson } from '@/lib/storage/r2';
import { verifyByHash } from '@/lib/verification/engine';
import { CACHE_TTL, getCached, setCached, verificationCacheKey } from '@/lib/cache/redis';
import { checkRateLimit, getVerifyRateLimiter } from '@/lib/cache/rate-limit';
import { audit } from '@/lib/audit/logger';

const Body = z.object({
  credentialHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Must be a 0x-prefixed bytes32 hex'),
});

function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]?.trim() ?? 'unknown';
  return req.headers.get('x-real-ip') ?? 'unknown';
}

export async function POST(req: Request): Promise<Response> {
  const ip = clientIp(req);

  const rl = await checkRateLimit(getVerifyRateLimiter(), ip);
  if (!rl.allowed) {
    const res = fail(
      ApiErrorCodes.RATE_LIMITED,
      `Too many requests. Try again in ${rl.resetSeconds}s.`,
      429,
    );
    res.headers.set('Retry-After', String(rl.resetSeconds));
    return res;
  }

  const body = await req.json().catch(() => null);
  const parsed = Body.safeParse(body);
  if (!parsed.success) return fail(ApiErrorCodes.BAD_REQUEST, 'credentialHash is required');

  const credentialHash = parsed.data.credentialHash.toLowerCase() as Bytes32Hex;
  const cacheKey = verificationCacheKey(credentialHash);
  const cached = await getCached<unknown>(cacheKey);
  if (cached) return ok(cached);

  let result;
  try {
    result = await verifyByHash(credentialHash, {
      readChain: readCredential,
      readDbCredential: (h) =>
        prisma.credential.findUnique({
          where: { credentialHash: h },
          include: { issuer: true },
        }),
      fetchCanonicalAndRehash: async (key) => {
        const bytes = await getCanonicalJson(key);
        return { rehashedCredentialHash: rehash(bytes) };
      },
    });
  } catch (e: unknown) {
    return fail(
      ApiErrorCodes.CHAIN_UNAVAILABLE,
      e instanceof Error ? e.message : 'verification_failed',
      503,
    );
  }

  const ttl =
    result.status === 'VERIFIED'
      ? CACHE_TTL.VERIFIED
      : result.status === 'REVOKED'
        ? CACHE_TTL.REVOKED
        : result.status === 'TAMPERED'
          ? CACHE_TTL.TAMPERED
          : CACHE_TTL.NOT_REGISTERED;
  await setCached(cacheKey, result, ttl);

  await audit({
    entityType: 'verification',
    entityId: credentialHash,
    action: 'verification.queried',
    metadata: { status: result.status },
    ipAddress: ip,
  }).catch(() => {
    /* best-effort */
  });

  return ok(result);
}
