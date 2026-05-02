import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';

export function PublicNavbar() {
  return (
    <header className="sticky top-0 z-30 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <ShieldCheck className="h-5 w-5" aria-hidden />
          <span>VeriTrust</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link href="/verify" className="text-muted-foreground hover:text-foreground">
            Verify
          </Link>
          <Link href="/registry" className="text-muted-foreground hover:text-foreground">
            Registry
          </Link>
          <Link href="/issuer" className="text-muted-foreground hover:text-foreground">
            For issuers
          </Link>
        </nav>
      </div>
    </header>
  );
}
