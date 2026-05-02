'use client';

import { useState, useTransition } from 'react';
import { Search, Loader2 } from 'lucide-react';
import type { VerificationResult } from '@veritrust/shared-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ResultCard } from './result-card';

const HASH_RE = /^0x[a-fA-F0-9]{64}$/;

interface Props {
  /// When true, render the form in compact mode for the landing-page widget.
  readonly compact?: boolean;
  /// Demo result lets us show the four states without a deployed contract.
  readonly demoResult?: VerificationResult | null;
}

export function VerificationForm({ compact, demoResult = null }: Props) {
  const [hash, setHash] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VerificationResult | null>(demoResult);
  const [pending, start] = useTransition();

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = hash.trim();
    setError(null);
    setResult(null);
    if (!HASH_RE.test(trimmed)) {
      setError('Paste the 0x-prefixed credential hash (64 hex characters).');
      return;
    }
    start(async () => {
      try {
        const r = await fetch('/api/verification/by-hash', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credentialHash: trimmed.toLowerCase() }),
        });
        const json = (await r.json()) as
          | { ok: true; data: VerificationResult }
          | { ok: false; error: { code: string; message: string } };
        if (!json.ok) {
          setError(json.error.message);
          return;
        }
        setResult(json.data);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Verification failed');
      }
    });
  };

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
        <Input
          aria-label="Credential hash"
          placeholder="0x… 64-character credential hash"
          value={hash}
          onChange={(e) => setHash(e.target.value)}
          className="font-mono text-sm"
          disabled={pending}
        />
        <Button type="submit" size={compact ? 'md' : 'lg'} disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Verify
        </Button>
      </form>
      {error && (
        <p role="alert" className="text-sm text-tampered-fg">
          {error}
        </p>
      )}
      {result && <ResultCard result={result} />}
    </div>
  );
}
