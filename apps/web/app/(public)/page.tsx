import Link from 'next/link';
import { ArrowRight, Lock, ScanLine, FileCheck } from 'lucide-react';
import { VerificationForm } from '@/components/verification/verification-form';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
  return (
    <div>
      <section className="border-b">
        <div className="container py-20 sm:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Verify any credential in seconds.
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Tamper-evident credentials, issued by registered institutions and confirmed by anyone
              — no account, no wallet.
            </p>
          </div>
          <div className="mx-auto mt-10 max-w-2xl">
            <VerificationForm compact />
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Don't have a hash?{' '}
              <Link href="/verify" className="underline">
                Upload a PDF or scan a QR code
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      <section className="border-b bg-muted/30">
        <div className="container py-16">
          <h2 className="text-center text-sm font-medium uppercase tracking-widest text-muted-foreground">
            How it works
          </h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            <Step
              icon={<Lock className="h-6 w-6" />}
              title="Issuer registers"
              description="Authorized institutions register credential records to a tamper-evident registry."
            />
            <Step
              icon={<FileCheck className="h-6 w-6" />}
              title="Recipient receives PDF"
              description="A signed PDF is generated with an embedded QR code linking back to the verifier."
            />
            <Step
              icon={<ScanLine className="h-6 w-6" />}
              title="Anyone verifies"
              description="Scan the QR or upload the document. We check the record and tell you Verified, Tampered, Revoked, or Not Registered."
            />
          </div>
        </div>
      </section>

      <section className="container py-16 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">For institutions</h2>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          Issue degrees, certificates, and IDs with integrity guarantees built in. Connect your
          wallet to apply for issuer access.
        </p>
        <div className="mt-6">
          <Button asChild>
            <Link href="/issuer">
              For issuers <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

function Step({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-start gap-3">
      <div className="rounded-md bg-background p-2 ring-1 ring-border">{icon}</div>
      <h3 className="font-medium">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
