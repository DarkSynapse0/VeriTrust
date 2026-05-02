import { NextResponse } from 'next/server';
import type { ApiEnvelope } from '@veritrust/shared-types';

export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json<ApiEnvelope<T>>({ ok: true, data }, init);
}

export function fail(
  code: string,
  message: string,
  status = 400,
  extra?: ResponseInit,
): NextResponse {
  return NextResponse.json<ApiEnvelope<never>>(
    { ok: false, error: { code, message } },
    { status, ...extra },
  );
}

export const ApiErrorCodes = {
  BAD_REQUEST: 'bad_request',
  UNAUTHORIZED: 'unauthorized',
  FORBIDDEN: 'forbidden',
  NOT_FOUND: 'not_found',
  CONFLICT: 'conflict',
  RATE_LIMITED: 'rate_limited',
  INTERNAL: 'internal',
  CHAIN_UNAVAILABLE: 'chain_unavailable',
  STORAGE_UNAVAILABLE: 'storage_unavailable',
} as const;
