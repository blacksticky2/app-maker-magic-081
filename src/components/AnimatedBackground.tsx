export function AnimatedBackground({ variant = "app" }: { variant?: "app" | "hero" }) {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Soft gradient base — cheap, no blur */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />

      {/* Two soft blobs — only on md+ to keep mobile smooth */}
      <div className="hidden md:block absolute -top-40 -left-40 w-[32rem] h-[32rem] rounded-full bg-primary/20 blur-3xl animate-blob will-change-transform" />
      <div
        className="hidden md:block absolute -bottom-40 -right-40 w-[28rem] h-[28rem] rounded-full bg-accent/20 blur-3xl animate-blob will-change-transform"
        style={{ animationDelay: "8s" }}
      />

      {variant === "hero" && (
        <div className="hidden md:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[36rem] h-[36rem] rounded-full bg-primary/10 blur-3xl" />
      )}
    </div>
  );
}
