import meshBg from "@/assets/mesh-bg.jpg";

export function AnimatedBackground({ variant = "app" }: { variant?: "app" | "hero" }) {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Static mesh image base */}
      <div
        className="absolute inset-0 opacity-40 dark:opacity-25"
        style={{
          backgroundImage: `url(${meshBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(40px) saturate(120%)",
        }}
      />
      {/* Animated mesh overlay */}
      <div className="absolute inset-0 animate-mesh opacity-50 dark:opacity-30" />

      {/* Floating blobs */}
      <div className="absolute -top-32 -left-32 w-[28rem] h-[28rem] rounded-full bg-primary/30 blur-3xl animate-blob" />
      <div
        className="absolute top-1/3 -right-32 w-[26rem] h-[26rem] rounded-full bg-accent/30 blur-3xl animate-blob"
        style={{ animationDelay: "6s" }}
      />
      <div
        className="absolute -bottom-32 left-1/3 w-[24rem] h-[24rem] rounded-full bg-primary/20 blur-3xl animate-blob"
        style={{ animationDelay: "12s" }}
      />

      {variant === "hero" && (
        <>
          <div className="absolute top-20 left-10 w-3 h-3 rounded-full bg-accent/60 animate-float" />
          <div className="absolute top-40 right-20 w-2 h-2 rounded-full bg-primary/70 animate-float" style={{ animationDelay: "1.5s" }} />
          <div className="absolute bottom-32 left-1/4 w-4 h-4 rounded-full bg-accent/50 animate-float" style={{ animationDelay: "3s" }} />
        </>
      )}

      {/* Grain */}
      <div className="absolute inset-0 grain" />
    </div>
  );
}
