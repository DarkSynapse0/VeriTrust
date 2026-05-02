import { ok } from '@/lib/api/envelope';
import { clearSessionCookie } from '@/lib/auth/session';

export async function POST(): Promise<Response> {
  const res = ok({ ok: true });
  res.headers.set('Set-Cookie', clearSessionCookie());
  return res;
}
