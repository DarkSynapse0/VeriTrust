import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export const metadata = { title: 'Issuer dashboard' };

// Wallet auth + dashboard interactivity is scaffolded but not yet wired.
// See README §Roadmap for the remaining UI work.

export default function IssuerDashboardPage() {
  return (
    <div className="container max-w-5xl py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-2 text-muted-foreground">
          Sign in with your wallet to view issuance activity, issue new credentials, and manage
          revocations.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Issued" value="—" hint="all-time confirmed" />
        <StatCard title="This month" value="—" hint="confirmed in last 30 days" />
        <StatCard title="Revoked" value="—" hint="all-time" />
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Wallet sign-in not yet wired</CardTitle>
          <CardDescription>
            The SIWE auth API and the issuance/revocation APIs are implemented and tested. The
            wallet-connect UI on this page is a follow-up — see README's roadmap.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            For now, you can call the API directly. <code>POST /api/auth/nonce</code>, then SIWE
            sign, then <code>POST /api/auth/verify</code>, then{' '}
            <code>POST /api/issuance/single</code>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ title, value, hint }: { title: string; value: string; hint: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-3xl tabular-nums">{value}</CardTitle>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground">{hint}</CardContent>
    </Card>
  );
}
