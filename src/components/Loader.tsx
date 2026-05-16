export function Loader({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12 animate-fade-up">
      <div className="relative h-12 w-12">
        <div className="absolute inset-0 rounded-full border-2 border-primary/15" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary border-r-primary/60 animate-spin-slow" />
        <div className="absolute inset-2 rounded-full gradient-hero opacity-20 blur-md" />
      </div>
      {label && <p className="text-sm text-muted-foreground font-medium">{label}</p>}
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
