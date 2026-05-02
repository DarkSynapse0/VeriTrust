import { issueNonce } from '@/lib/auth/siwe';
import { ok, fail, ApiErrorCodes } from '@/lib/api/envelope';

export async function POST(): Promise<Response> {
  try {
    const nonce = await issueNonce();
    return ok({ nonce });
  } catch (e: unknown) {
    return fail(ApiErrorCodes.INTERNAL, e instanceof Error ? e.message : 'unknown', 500);
  }
}
