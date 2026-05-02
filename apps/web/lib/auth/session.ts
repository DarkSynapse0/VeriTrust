import { cookies } from 'next/headers';
import { getEnv } from '../env';
import { verifySession, type SessionPayload } from './siwe';

export async function getSession(): Promise<SessionPayload | null> {
  const env = getEnv();
  const store = await cookies();
  const token = store.get(env.SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    return await verifySession(token);
  } catch {
    return null;
  }
}

export async function requireSession(): Promise<SessionPayload> {
  const s = await getSession();
  if (!s) throw new Error('Unauthorized');
  return s;
}

export function buildSessionCookie(token: string, ttlSeconds: number): string {
  const env = getEnv();
  const isProd = env.NODE_ENV === 'production';
  const parts = [
    `${env.SESSION_COOKIE_NAME}=${token}`,
    `Path=/`,
    `HttpOnly`,
    `SameSite=Strict`,
    `Max-Age=${ttlSeconds}`,
  ];
  if (isProd) parts.push('Secure');
  return parts.join('; ');
}

export function clearSessionCookie(): string {
  const env = getEnv();
  return `${env.SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`;
}
