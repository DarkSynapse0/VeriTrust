import { prisma } from '../db';
import { sha256Hex } from '../hash';

export type AuditAction =
  | 'credential.issued'
  | 'credential.confirmed'
  | 'credential.revoked'
  | 'credential.failed'
  | 'issuer.authorized'
  | 'issuer.deauthorized'
  | 'admin.transferred'
  | 'verification.queried'
  | 'session.created'
  | 'session.revoked';

interface AuditEntry {
  readonly entityType: 'credential' | 'issuer' | 'admin' | 'session' | 'verification';
  readonly entityId: string;
  readonly action: AuditAction;
  readonly actorAddress?: string | null;
  readonly payloadHash?: string | null;
  readonly metadata?: Record<string, unknown>;
  readonly ipAddress?: string | null;
}

/// Append an audit log row. Never logs PII — caller must hash sensitive payloads
/// upstream. Pass raw IP; we hash it before storage.
export async function audit(entry: AuditEntry): Promise<void> {
  await prisma.auditLog.create({
    data: {
      entityType: entry.entityType,
      entityId: entry.entityId,
      action: entry.action,
      actorAddress: entry.actorAddress ?? null,
      payloadHash: entry.payloadHash ?? null,
      metadata: (entry.metadata ?? {}) as object,
      ipAddressHash: entry.ipAddress ? sha256Hex(entry.ipAddress) : null,
    },
  });
}
