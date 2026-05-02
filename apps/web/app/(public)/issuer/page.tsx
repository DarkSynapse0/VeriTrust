import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const metadata = { title: 'For issuers' };

export default function IssuerLandingPage() {
  return (
    <div className="container max-w-3xl py-16">
      <header className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight">Become an issuer</h1>
        <p className="mt-3 text-muted-foreground">
          Issue tamper-evident degrees, certificates, and IDs that anyone can verify in seconds.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>How issuance works</CardTitle>
          <CardDescription>
            Sign in with your institution's wallet, fill the credential form, sign the registration
            transaction, and download a signed PDF for your recipient.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p>
            Authorization is granted by an admin after a one-time vetting step. Once authorized, you
            can issue credentials individually or in bulk via CSV.
          </p>
          <Button asChild>
            <a href="/issuer/dashboard">Open issuer dashboard</a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
