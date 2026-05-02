import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="container flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">404</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-2 max-w-md text-muted-foreground">
        The link you followed may be broken, or the page may have been moved.
      </p>
      <Button asChild className="mt-6" variant="outline">
        <Link href="/">Back to home</Link>
      </Button>
    </div>
  );
}
