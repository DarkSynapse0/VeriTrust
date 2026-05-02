'use client';

import { CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react';
import type { VerificationResult } from '@veritrust/shared-types';
import { REVOCATION_REASON_LABELS, CREDENTIAL_TYPE_LABELS } from '@veritrust/shared-types';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { dateStyle: 'long' });

interface Props {
  readonly result: VerificationResult;
  readonly className?: string;
}

export function ResultCard({ result, className }: Props) {
  switch (result.status) {
    case 'VERIFIED':
      return <VerifiedCard result={result} className={className} />;
    case 'TAMPERED':
      return <TamperedCard result={result} className={className} />;
    case 'REVOKED':
      return <RevokedCard result={result} className={className} />;
    case 'NOT_REGISTERED':
      return <NotRegisteredCard result={result} className={className} />;
  }
}

function StatusFrame({
  tone,
  icon,
  headline,
  subtext,
  children,
  className,
}: {
  tone: 'verified' | 'tampered' | 'revoked' | 'notreg';
  icon: React.ReactNode;
  headline: string;
  subtext: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const palette = {
    verified: 'bg-verified-bg border-verified-border text-verified-fg',
    tampered: 'bg-tampered-bg border-tampered-border text-tampered-fg',
    revoked: 'bg-revoked-bg border-revoked-border text-revoked-fg',
    notreg: 'bg-notreg-bg border-notreg-border text-notreg-fg',
  }[tone];

  return (
    <Card
      className={cn('overflow-hidden border-2', palette, className)}
      aria-live="polite"
      role="status"
    >
      <div className="flex flex-col items-start gap-4 p-6 sm:p-8">
        <div className="flex items-center gap-3" aria-hidden>
          {icon}
        </div>
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
            {headline}
          </h2>
          <p className="text-sm opacity-90">{subtext}</p>
        </div>
      </div>
      {children}
    </Card>
  );
}

function CredentialDetails({
  result,
}: {
  result: {
    credential: NonNullable<Extract<VerificationResult, { status: 'VERIFIED' }>['credential']>;
  };
}) {
  const c = result.credential;
  const fields = c.fields;
  return (
    <CardContent className="border-t bg-background/40 text-foreground">
      <dl className="grid grid-cols-1 gap-x-6 gap-y-4 pt-6 sm:grid-cols-2">
        <div>
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">Credential</dt>
          <dd className="mt-1 text-sm font-medium">{CREDENTIAL_TYPE_LABELS[c.credentialType]}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">Recipient</dt>
          <dd className="mt-1 text-sm font-medium">{c.recipientName}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">Issuer</dt>
          <dd className="mt-1 text-sm font-medium">
            {c.issuer.name}
            {c.issuer.isAuthorized && (
              <span className="ml-2 inline-flex items-center rounded-full bg-verified-bg px-2 py-0.5 text-[10px] font-medium uppercase text-verified-fg">
                Verified institution
              </span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">Issued</dt>
          <dd className="mt-1 text-sm font-medium">{fmtDate(c.issuedAt)}</dd>
        </div>
        {Object.entries(fields).map(([k, v]) => (
          <div key={k}>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">{humanize(k)}</dt>
            <dd className="mt-1 text-sm font-medium break-words">{String(v)}</dd>
          </div>
        ))}
      </dl>
      <details className="mt-6 text-xs">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
          View canonical record
        </summary>
        <div className="mt-2 overflow-x-auto rounded border bg-muted/40 p-3 font-mono text-[11px]">
          <div>credentialHash: {result.credential.credentialHash}</div>
        </div>
      </details>
    </CardContent>
  );
}

function VerifiedCard({
  result,
  className,
}: {
  result: Extract<VerificationResult, { status: 'VERIFIED' }>;
  className?: string;
}) {
  return (
    <StatusFrame
      tone="verified"
      className={className}
      icon={<CheckCircle2 className="h-12 w-12" strokeWidth={1.6} />}
      headline="Verified"
      subtext="This credential matches the issuer's record on file."
    >
      <CredentialDetails result={result} />
    </StatusFrame>
  );
}

function TamperedCard({
  result,
  className,
}: {
  result: Extract<VerificationResult, { status: 'TAMPERED' }>;
  className?: string;
}) {
  return (
    <StatusFrame
      tone="tampered"
      className={className}
      icon={<XCircle className="h-12 w-12" strokeWidth={1.6} />}
      headline="This document has been modified"
      subtext="The contents of the file you submitted do not match the original record on file. Treat this credential as untrustworthy."
    >
      {result.canonicalCredential && (
        <CardContent className="border-t bg-background/40 text-foreground">
          <p className="pt-6 text-xs text-muted-foreground">
            We have a record on file with credential hash{' '}
            <span className="font-mono">
              {result.canonicalCredential.credentialHash.slice(0, 18)}…
            </span>
            , but the file you submitted hashes differently.
          </p>
        </CardContent>
      )}
    </StatusFrame>
  );
}

function RevokedCard({
  result,
  className,
}: {
  result: Extract<VerificationResult, { status: 'REVOKED' }>;
  className?: string;
}) {
  return (
    <StatusFrame
      tone="revoked"
      className={className}
      icon={<AlertTriangle className="h-12 w-12" strokeWidth={1.6} />}
      headline="This credential was revoked"
      subtext={`Revoked on ${fmtDate(result.revokedAt)} — ${REVOCATION_REASON_LABELS[result.revocationReason]}.`}
    >
      <CredentialDetails result={result} />
    </StatusFrame>
  );
}

function NotRegisteredCard({
  result,
  className,
}: {
  result: Extract<VerificationResult, { status: 'NOT_REGISTERED' }>;
  className?: string;
}) {
  return (
    <StatusFrame
      tone="notreg"
      className={className}
      icon={<Info className="h-12 w-12" strokeWidth={1.6} />}
      headline="No record found"
      subtext="We have no record of this credential. This does not necessarily mean it's fake — the issuing institution may not be on VeriTrust. Manual verification is recommended."
    >
      <CardContent className="border-t bg-background/40 text-foreground">
        <p className="pt-6 font-mono text-[11px] text-muted-foreground break-all">
          {result.credentialHash}
        </p>
      </CardContent>
    </StatusFrame>
  );
}

function humanize(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}
