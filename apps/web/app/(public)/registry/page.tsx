import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export const metadata = { title: 'Registered institutions' };

export default function RegistryPage() {
  return (
    <div className="container max-w-4xl py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Registered institutions</h1>
        <p className="mt-2 text-muted-foreground">
          Universities, certification bodies, and other authorized issuers.
        </p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>No institutions registered yet</CardTitle>
          <CardDescription>
            The admin needs to authorize at least one issuer for the registry to populate. Once they
            do, every institution and their public-facing details will appear here.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            This page is implemented but its contents come from the database. With no issuers yet,
            it shows this empty state. Authorize an issuer through the admin flow to populate it.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
