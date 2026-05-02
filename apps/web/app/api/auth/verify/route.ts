import { z } from 'zod';
import { signSession, verifySiweMessage } from '@/lib/auth/siwe';
import { buildSessionCookie } from '@/lib/auth/session';
import { ok, fail, ApiErrorCodes } from '@/lib/api/envelope';
import { getEnv } from '@/lib/env';
import { audit } from '@/lib/audit/logger';

const Body = z.object({
  message: z.string().min(1),
  signature: z.string().min(1),
});

function clientIp(req: Request): string | null {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]?.trim() ?? null;
  return req.headers.get('x-real-ip');
}

export async function POST(req: Request): Promise<Response> {
  const env = getEnv();
  const body = await req.json().catch(() => null);
  const parsed = Body.safeParse(body);
  if (!parsed.success) return fail(ApiErrorCodes.BAD_REQUEST, 'Invalid request body');

  let verified;
  try {
    verified = await verifySiweMessage(parsed.data.message, parsed.data.signature);
  } catch (e: unknown) {
    return fail(ApiErrorCodes.UNAUTHORIZED, e instanceof Error ? e.message : 'siwe_failed', 401);
  }

  const token = await signSession(verified);
  const cookie = buildSessionCookie(token, env.SESSION_TTL_SECONDS);

  await audit({
    entityType: 'session',
    entityId: verified.address,
    action: 'session.created',
    actorAddress: verified.address,
    ipAddress: clientIp(req),
  }).catch(() => {
    // audit best-effort; don't block login on DB miss
  });

  const res = ok({ address: verified.address, chainId: verified.chainId });
  res.headers.set('Set-Cookie', cookie);
  return res;
}
