export * from './result';
export * from './credential-type';
export * from './revocation-reason';
export * from './credential';
export * from './issuer';
export * from './verification-result';

// API envelope — every API route returns one of these two.
export type ApiEnvelope<T> =
  | { readonly ok: true; readonly data: T }
  | {
      readonly ok: false;
      readonly error: { readonly code: string; readonly message: string };
    };
