import { cn } from "@/lib/utils";

type Status = "online" | "idle" | "offline";

const COLORS: Record<Status, string> = {
  online: "bg-emerald-500",
  idle: "bg-amber-400",
  offline: "bg-zinc-400",
};

const SIZES = {
  sm: "h-2 w-2 ring-2",
  md: "h-3 w-3 ring-2",
  lg: "h-3.5 w-3.5 ring-[3px]",
};

export function StatusDot({
  status,
  size = "md",
  className,
  pulse = true,
}: {
  status: Status;
  size?: keyof typeof SIZES;
  className?: string;
  pulse?: boolean;
}) {
  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      {pulse && status === "online" && (
        <span className={cn("absolute inset-0 rounded-full animate-ping opacity-60", COLORS[status])} />
      )}
      <span className={cn("relative inline-block rounded-full ring-background", SIZES[size], COLORS[status])} />
    </span>
  );
}

export function StatusLabel({ status }: { status: Status }) {
  const text = status === "online" ? "Active now" : status === "idle" ? "Idle" : "Offline";
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <StatusDot status={status} size="sm" pulse={false} />
      {text}
    </span>
  );
}

export function lastSeenLabel(lastSeenAt: string | null | undefined): string {
  if (!lastSeenAt) return "—";
  const ms = Date.now() - new Date(lastSeenAt).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
