import type { Metadata } from 'next';
import type { VerificationResult } from '@veritrust/shared-types';
import { VerificationForm } from '@/components/verification/verification-form';
import { ResultCard } from '@/components/verification/result-card';

export const metadata: Metadata = {
  title: 'Verify a credential',
  description: 'Paste a credential hash, scan a QR code, or upload the PDF.',
};

interface SearchParams {
  h?: string;
  demo?: 'verified' | 'tampered' | 'revoked' | 'not_registered';
}

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const demoResult = params.demo ? buildDemoResult(params.demo) : null;

  return (
    <div className="container max-w-3xl py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Verify a credential</h1>
        <p className="mt-2 text-muted-foreground">
          Paste the credential hash from a QR code, or upload the document.
        </p>
        {demoResult && (
          <p className="mt-2 text-xs uppercase tracking-widest text-muted-foreground">
            Preview · {params.demo}
          </p>
        )}
      </header>

      {demoResult ? (
        <div className="space-y-6">
          <ResultCard result={demoResult} />
          <p className="text-xs text-muted-foreground">
            This is a static preview of the <code>{params.demo}</code> state. Visit{' '}
            <code>/verify?demo=verified</code>, <code>?demo=tampered</code>,{' '}
            <code>?demo=revoked</code>, or <code>?demo=not_registered</code> to see each.
          </p>
        </div>
      ) : (
        <VerificationForm />
      )}
    </div>
  );
}

function buildDemoResult(kind: NonNullable<SearchParams['demo']>): VerificationResult {
  const now = new Date().toISOString();
  const hash = `0x${'a'.repeat(64)}` as const;
  const credential = {
    credentialHash: hash,
    credentialType: 'DEGREE' as const,
    schemaVersion: '1.0.0',
    recipientName: 'Alice Doe',
    issuer: {
      id: 'issuer1',
      walletAddress: '0x1234567890abcdef1234567890abcdef12345678' as const,
      name: 'Northbridge University',
      logoUrl: null,
      isAuthorized: true,
    },
    fields: {
      degree: 'Bachelor of Science',
      field: 'Computer Science',
      institution: 'Northbridge University',
      graduationDate: '2025-05-15',
    },
    issuedAt: '2025-05-15T00:00:00.000Z',
    expiresAt: null,
    revokedAt: null,
    revocationReason: null,
  };

  switch (kind) {
    case 'verified':
      return {
        status: 'VERIFIED',
        credentialHash: hash,
        credential,
        chainTxHash: '0xdeadbeef'.padEnd(66, '0'),
        chainBlockNumber: 12_345_678,
        verifiedAt: now,
      };
    case 'tampered':
      return {
        status: 'TAMPERED',
        credentialHash: hash,
        canonicalCredential: credential,
        mismatch: 'pdf-canonical',
        verifiedAt: now,
      };
    case 'revoked':
      return {
        status: 'REVOKED',
        credentialHash: hash,
        credential: { ...credential, revokedAt: now, revocationReason: 'EXPIRED' as const },
        revokedAt: now,
        revocationReason: 'EXPIRED',
        verifiedAt: now,
      };
    case 'not_registered':
      return {
        status: 'NOT_REGISTERED',
        credentialHash: hash,
        verifiedAt: now,
      };
  }
}
