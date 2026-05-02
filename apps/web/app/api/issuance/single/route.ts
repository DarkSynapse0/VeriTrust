import { z } from 'zod';
import type { CanonicalCredential } from '@veritrust/shared-types';
import { ok, fail, ApiErrorCodes } from '@/lib/api/envelope';
import { canonicalizeCredential } from '@/lib/canonicalize';
import { hashRecipientId } from '@/lib/hash';
import { prisma } from '@/lib/db';
import { requireSession } from '@/lib/auth/session';
import { audit } from '@/lib/audit/logger';

// The API receives the raw issuer-supplied form; it never trusts client-side
// canonicalization. Hashing is server-only so the issuer can't substitute a
// different hash than what their fields produce.

const SingleIssueRequest = z.object({
  credentialType: z.enum(['DEGREE', 'CERTIFICATE', 'ID']),
  schemaVersion: z.string().min(1),
  issuerName: z.string().min(1).max(200),
  recipient: z.object({
    name: z.string().min(1).max(200),
    /// Plaintext identifier (email etc.) — we hash it server-side.
    identifier: z.string().min(1).max(500),
  }),
  fields: z.record(z.union([z.string(), z.number(), z.boolean()])),
  issuedAt: z.string().datetime(),
  expiresAt: z.string().datetime().optional(),
});

export async function POST(req: Request): Promise<Response> {
  let session;
  try {
    session = await requireSession();
  } catch {
    return fail(ApiErrorCodes.UNAUTHORIZED, 'Sign in with your wallet first', 401);
  }

  const body = await req.json().catch(() => null);
  const parsed = SingleIssueRequest.safeParse(body);
  if (!parsed.success) {
    return fail(ApiErrorCodes.BAD_REQUEST, parsed.error.issues.map((i) => i.message).join('; '));
  }
  const input = parsed.data;

  const issuer = await prisma.issuer.findUnique({
    where: { walletAddress: session.address },
  });
  if (!issuer) {
    return fail(
      ApiErrorCodes.FORBIDDEN,
      'Issuer profile not found — admin must authorize this wallet first',
      403,
    );
  }
  if (!issuer.isAuthorized) {
    return fail(ApiErrorCodes.FORBIDDEN, 'This issuer is not authorized to issue credentials', 403);
  }

  const canonical: CanonicalCredential = {
    type: 'veritrust.credential.v1',
    credentialType: input.credentialType,
    schemaVersion: input.schemaVersion,
    issuer: {
      walletAddress: session.address as `0x${string}`,
      name: input.issuerName,
    },
    recipient: {
      name: input.recipient.name,
      idHash: hashRecipientId(input.recipient.identifier),
    },
    fields: input.fields,
    issuedAt: input.issuedAt,
    ...(input.expiresAt ? { expiresAt: input.expiresAt } : {}),
  };

  const result = canonicalizeCredential(canonical);
  if (!result.ok) {
    const details =
      result.error.code === 'SCHEMA_INVALID'
        ? result.error.details.join('; ')
        : result.error.details;
    return fail(ApiErrorCodes.BAD_REQUEST, `Schema validation failed: ${details}`);
  }

  // Idempotency: if this hash already exists, return the existing record.
  const existing = await prisma.credential.findUnique({
    where: { credentialHash: result.value.credentialHash },
  });
  if (existing) {
    return ok({
      credentialId: existing.id,
      credentialHash: existing.credentialHash,
      canonicalJsonBase64: Buffer.from(result.value.canonicalBytes).toString('base64'),
      idempotent: true,
    });
  }

  const created = await prisma.credential.create({
    data: {
      credentialHash: result.value.credentialHash,
      credentialType: input.credentialType,
      schemaVersion: input.schemaVersion,
      canonicalJsonR2Key: '',
      canonicalJsonSize: result.value.canonicalBytes.byteLength,
      recipientName: input.recipient.name,
      recipientIdHash: hashRecipientId(input.recipient.identifier),
      issuerId: issuer.id,
      issuedAt: new Date(input.issuedAt),
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      status: 'PENDING',
      metadata: input.fields,
    },
  });

  await audit({
    entityType: 'credential',
    entityId: created.id,
    action: 'credential.issued',
    actorAddress: session.address,
    payloadHash: result.value.credentialHash,
    metadata: { credentialType: input.credentialType, schemaVersion: input.schemaVersion },
  });

  return ok({
    credentialId: created.id,
    credentialHash: result.value.credentialHash,
    canonicalJsonBase64: Buffer.from(result.value.canonicalBytes).toString('base64'),
    idempotent: false,
  });
}
