import { randomBytes } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import { SiweMessage } from 'siwe';
import { getEnv } from '../env';
import { getRedis } from '../cache/redis';

const NONCE_PREFIX = 'vt:siwe:nonce';

export async function issueNonce(): Promise<string> {
  const env = getEnv();
  const nonce = randomBytes(16).toString('hex');
  const r = getRedis();
  if (!r) {
    // Dev fallback: nonce is still returned but cannot be enforced single-use.
    return nonce;
  }
  await r.set(`${NONCE_PREFIX}:${nonce}`, '1', { ex: env.SIWE_NONCE_TTL_SECONDS });
  return nonce;
}

/// Single-use: throws if the nonce wasn't issued or has already been used.
export async function consumeNonce(nonce: string): Promise<void> {
  const r = getRedis();
  if (!r) return; // dev mode; nonce unenforced
  const key = `${NONCE_PREFIX}:${nonce}`;
  const existed = await r.del(key);
  if (existed !== 1) throw new Error('Invalid or expired nonce');
}

export interface VerifiedSiwe {
  readonly address: string;
  readonly chainId: number;
  readonly issuedAt: string;
}

export async function verifySiweMessage(message: string, signature: string): Promise<VerifiedSiwe> {
  const env = getEnv();
  const siwe = new SiweMessage(message);
  const { data } = await siwe.verify({
    signature,
    domain: env.SIWE_DOMAIN,
  });
  await consumeNonce(data.nonce);
  return {
    address: data.address.toLowerCase(),
    chainId: data.chainId,
    issuedAt: data.issuedAt ?? new Date().toISOString(),
  };
}

function sessionSecret(): Uint8Array {
  const env = getEnv();
  if (!env.SESSION_SECRET) throw new Error('SESSION_SECRET not set');
  return new TextEncoder().encode(env.SESSION_SECRET);
}

export interface SessionPayload {
  readonly address: string;
  readonly chainId: number;
  readonly iat: number;
  readonly exp: number;
}

export async function signSession(verified: VerifiedSiwe): Promise<string> {
  const env = getEnv();
  const now = Math.floor(Date.now() / 1000);
  return await new SignJWT({ address: verified.address, chainId: verified.chainId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setExpirationTime(now + env.SESSION_TTL_SECONDS)
    .setIssuer('veritrust')
    .sign(sessionSecret());
}

export async function verifySession(token: string): Promise<SessionPayload> {
  const { payload } = await jwtVerify(token, sessionSecret(), { issuer: 'veritrust' });
  return payload as unknown as SessionPayload;
}

export const SESSION_COOKIE = (() => getEnv().SESSION_COOKIE_NAME)();
