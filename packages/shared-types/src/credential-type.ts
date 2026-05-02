export const CREDENTIAL_TYPES = ['DEGREE', 'CERTIFICATE', 'ID'] as const;
export type CredentialType = (typeof CREDENTIAL_TYPES)[number];

export const CREDENTIAL_TYPE_LABELS: Readonly<Record<CredentialType, string>> = {
  DEGREE: 'Degree',
  CERTIFICATE: 'Certificate',
  ID: 'Identity document',
};

export const isCredentialType = (s: unknown): s is CredentialType =>
  typeof s === 'string' && (CREDENTIAL_TYPES as readonly string[]).includes(s);
