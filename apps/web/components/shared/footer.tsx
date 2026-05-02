export function Footer() {
  return (
    <footer className="border-t">
      <div className="container flex flex-col items-center justify-between gap-2 py-6 text-xs text-muted-foreground sm:flex-row">
        <p>© {new Date().getFullYear()} VeriTrust. Tamper-evident credentials.</p>
        <p>Trust, made tamper-evident.</p>
      </div>
    </footer>
  );
}
