// Mirrors the on-chain reason byte:
//   1 = ERROR, 2 = FRAUD, 3 = EXPIRED, 4 = OTHER
// Zero is reserved as the "not revoked" sentinel and is not a valid reason.

export const REVOCATION_REASONS = ['ERROR', 'FRAUD', 'EXPIRED', 'OTHER'] as const;
export type RevocationReason = (typeof REVOCATION_REASONS)[number];

export const REVOCATION_REASON_TO_BYTE: Readonly<Record<RevocationReason, number>> = {
  ERROR: 1,
  FRAUD: 2,
  EXPIRED: 3,
  OTHER: 4,
};

export const REVOCATION_BYTE_TO_REASON: Readonly<Record<number, RevocationReason>> = {
  1: 'ERROR',
  2: 'FRAUD',
  3: 'EXPIRED',
  4: 'OTHER',
};

export const REVOCATION_REASON_LABELS: Readonly<Record<RevocationReason, string>> = {
  ERROR: 'Issued in error',
  FRAUD: 'Fraud or misrepresentation',
  EXPIRED: 'Expired or superseded',
  OTHER: 'Other',
};

export const reasonFromByte = (b: number): RevocationReason | undefined =>
  REVOCATION_BYTE_TO_REASON[b];

export const reasonToByte = (r: RevocationReason): number => REVOCATION_REASON_TO_BYTE[r];
