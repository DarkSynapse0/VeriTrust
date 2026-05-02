// Re-export the workspace-owned Prisma client. Apps should import from here,
// not directly from @veritrust/db, so we can wrap the singleton or add
// instrumentation in one place.
export { prisma, Prisma } from '@veritrust/db';
export type {
  Issuer,
  Credential,
  CredentialSchema,
  AuditLog,
  CredentialType,
  CredentialStatus,
  RevocationReason,
} from '@veritrust/db';
