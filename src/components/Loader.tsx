export function Loader({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <div className="relative h-10 w-10">
        <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
        <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin-slow" />
      </div>
      {label && <p className="text-sm text-muted-foreground">{label}</p>}
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="min-h-screen grid place-items-center bg-background">
      <Loader label="Loading FamilyHub…" />
    </div>
  );
}
