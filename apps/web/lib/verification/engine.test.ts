import { describe, expect, it } from 'vitest';
import type { Bytes32Hex } from '@veritrust/shared-types';
import { verifyByHash, type EngineDeps } from './engine';

const HASH: Bytes32Hex = `0x${'a'.repeat(64)}` as Bytes32Hex;

const dbCred = {
  id: 'cred1',
  credentialHash: HASH,
  credentialType: 'DEGREE',
  schemaVersion: '1.0.0',
  canonicalJsonR2Key: 'canonical/cred1.json',
  canonicalJsonSize: 100,
  recipientName: 'Alice Doe',
  recipientIdHash: 'a'.repeat(64),
  issuerId: 'issuer1',
  issuedAt: new Date('2025-01-01T00:00:00Z'),
  expiresAt: null,
  chainTxHash: '0xabc',
  chainConfirmedAt: new Date('2025-01-01T00:00:00Z'),
  chainBlockNumber: 100n,
  status: 'CONFIRMED',
  revokedAt: null,
  revocationReason: null,
  revocationTxHash: null,
  pdfR2Key: null,
  metadata: { degree: 'BSc' },
  createdAt: new Date(),
  updatedAt: new Date(),
  issuer: {
    id: 'issuer1',
    walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
    name: 'Test U',
    displayName: null,
    description: null,
    websiteUrl: null,
    logoUrl: null,
    contactEmail: null,
    isAuthorized: true,
    credentialsIssued: 1,
    credentialsRevoked: 0,
    authorizedAt: new Date('2025-01-01'),
    deauthorizedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
} as unknown as Awaited<ReturnType<NonNullable<EngineDeps['readDbCredential']>>>;

describe('verifyByHash', () => {
  it('returns NOT_REGISTERED when chain has no record', async () => {
    const deps: EngineDeps = {
      readChain: async () => ({
        exists: false,
        issuer: '0x0000000000000000000000000000000000000000',
        registeredAt: 0,
        revokedAt: 0,
        revocationReason: 0,
        revoked: false,
      }),
      readDbCredential: async () => null,
    };
    const r = await verifyByHash(HASH, deps);
    expect(r.status).toBe('NOT_REGISTERED');
  });

  it('returns NOT_REGISTERED when chain has it but DB does not (orphaned)', async () => {
    const deps: EngineDeps = {
      readChain: async () => ({
        exists: true,
        issuer: '0x1234567890abcdef1234567890abcdef12345678',
        registeredAt: 1700000000,
        revokedAt: 0,
        revocationReason: 0,
        revoked: false,
      }),
      readDbCredential: async () => null,
    };
    const r = await verifyByHash(HASH, deps);
    expect(r.status).toBe('NOT_REGISTERED');
  });

  it('returns VERIFIED when chain + DB agree and not revoked', async () => {
    const deps: EngineDeps = {
      readChain: async () => ({
        exists: true,
        issuer: '0x1234567890abcdef1234567890abcdef12345678',
        registeredAt: 1700000000,
        revokedAt: 0,
        revocationReason: 0,
        revoked: false,
      }),
      readDbCredential: async () => dbCred,
    };
    const r = await verifyByHash(HASH, deps);
    expect(r.status).toBe('VERIFIED');
    if (r.status === 'VERIFIED') {
      expect(r.credential.recipientName).toBe('Alice Doe');
      expect(r.chainTxHash).toBe('0xabc');
    }
  });

  it('returns REVOKED with the correct reason mapping', async () => {
    const deps: EngineDeps = {
      readChain: async () => ({
        exists: true,
        issuer: '0x1234567890abcdef1234567890abcdef12345678',
        registeredAt: 1700000000,
        revokedAt: 1701000000,
        revocationReason: 2, // FRAUD
        revoked: true,
      }),
      readDbCredential: async () => dbCred,
    };
    const r = await verifyByHash(HASH, deps);
    expect(r.status).toBe('REVOKED');
    if (r.status === 'REVOKED') {
      expect(r.revocationReason).toBe('FRAUD');
    }
  });

  it('returns TAMPERED when canonical JSON re-hash mismatches', async () => {
    const deps: EngineDeps = {
      readChain: async () => ({
        exists: true,
        issuer: '0x1234567890abcdef1234567890abcdef12345678',
        registeredAt: 1700000000,
        revokedAt: 0,
        revocationReason: 0,
        revoked: false,
      }),
      readDbCredential: async () => dbCred,
      fetchCanonicalAndRehash: async () => ({
        rehashedCredentialHash: `0x${'b'.repeat(64)}` as Bytes32Hex,
      }),
    };
    const r = await verifyByHash(HASH, deps);
    expect(r.status).toBe('TAMPERED');
    if (r.status === 'TAMPERED') {
      expect(r.mismatch).toBe('pdf-canonical');
    }
  });

  it('falls through to VERIFIED if canonical-fetch throws (storage outage)', async () => {
    const deps: EngineDeps = {
      readChain: async () => ({
        exists: true,
        issuer: '0x1234567890abcdef1234567890abcdef12345678',
        registeredAt: 1700000000,
        revokedAt: 0,
        revocationReason: 0,
        revoked: false,
      }),
      readDbCredential: async () => dbCred,
      fetchCanonicalAndRehash: async () => {
        throw new Error('R2 unavailable');
      },
    };
    const r = await verifyByHash(HASH, deps);
    expect(r.status).toBe('VERIFIED');
  });
});
