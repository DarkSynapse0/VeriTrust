import { describe, expect, it } from 'vitest';
import type { CanonicalCredential } from '@veritrust/shared-types';
import { canonicalizeCredential, rehash } from './index';
import { hashRecipientId } from '../hash';

const baseDegree = (): CanonicalCredential => ({
  type: 'veritrust.credential.v1',
  credentialType: 'DEGREE',
  schemaVersion: '1.0.0',
  issuer: {
    walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
    name: 'Test University',
  },
  recipient: {
    name: 'Alice Doe',
    idHash: hashRecipientId('alice@example.com'),
  },
  fields: {
    degree: 'BSc',
    field: 'Computer Science',
    institution: 'Test University',
    graduationDate: '2025-05-15',
  },
  issuedAt: '2025-05-15T00:00:00.000Z',
});

describe('canonicalizeCredential', () => {
  it('produces a stable hash across 1000 runs of the same input', () => {
    const c = baseDegree();
    const first = canonicalizeCredential(c);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const reference = first.value.credentialHash;
    for (let i = 0; i < 1000; i++) {
      const r = canonicalizeCredential(c);
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value.credentialHash).toBe(reference);
    }
  });

  it('produces the same hash regardless of input key order', () => {
    const c1: CanonicalCredential = baseDegree();
    const reordered = {
      // Re-build with keys in a deliberately different order.
      issuedAt: c1.issuedAt,
      fields: c1.fields,
      recipient: c1.recipient,
      issuer: c1.issuer,
      schemaVersion: c1.schemaVersion,
      credentialType: c1.credentialType,
      type: c1.type,
    } as CanonicalCredential;
    const r1 = canonicalizeCredential(c1);
    const r2 = canonicalizeCredential(reordered);
    expect(r1.ok && r2.ok).toBe(true);
    if (r1.ok && r2.ok) expect(r1.value.credentialHash).toBe(r2.value.credentialHash);
  });

  it('rehash of the canonical bytes returns the same hash', () => {
    const r = canonicalizeCredential(baseDegree());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(rehash(r.value.canonicalBytes)).toBe(r.value.credentialHash);
  });

  it('changing a single field changes the hash', () => {
    const c1 = baseDegree();
    const c2: CanonicalCredential = {
      ...c1,
      fields: { ...c1.fields, degree: 'MSc' },
    };
    const r1 = canonicalizeCredential(c1);
    const r2 = canonicalizeCredential(c2);
    expect(r1.ok && r2.ok).toBe(true);
    if (r1.ok && r2.ok) expect(r1.value.credentialHash).not.toBe(r2.value.credentialHash);
  });

  it('rejects a credential missing required fields', () => {
    const bad = baseDegree();
    const stripped = {
      ...bad,
      fields: { degree: 'BSc' },
    } as unknown as CanonicalCredential;
    const r = canonicalizeCredential(stripped);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('SCHEMA_INVALID');
  });

  it('rejects a credential with an unknown additional field', () => {
    const bad = baseDegree();
    const tampered = {
      ...bad,
      fields: { ...bad.fields, sneakyExtra: 'x' },
    } as unknown as CanonicalCredential;
    const r = canonicalizeCredential(tampered);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('SCHEMA_INVALID');
  });

  it('rejects a wallet address with the wrong shape', () => {
    const bad = baseDegree();
    const tampered = {
      ...bad,
      issuer: { ...bad.issuer, walletAddress: 'not-an-address' },
    } as unknown as CanonicalCredential;
    const r = canonicalizeCredential(tampered);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('SCHEMA_INVALID');
  });
});
