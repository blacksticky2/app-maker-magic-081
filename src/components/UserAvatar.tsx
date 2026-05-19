import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { StatusDot } from "./StatusDot";
import { useUserPresence } from "@/hooks/use-presence";

type Props = {
  userId?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  linkToProfile?: boolean;
  showStatus?: boolean;
  className?: string;
};

const SIZES = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-base",
  xl: "h-24 w-24 text-3xl",
};

const DOT_POS = {
  sm: "bottom-0 right-0",
  md: "bottom-0 right-0",
  lg: "bottom-0.5 right-0.5",
  xl: "bottom-1 right-1",
};

export function UserAvatar({
  userId,
  username,
  avatarUrl,
  size = "md",
  linkToProfile = false,
  showStatus = false,
  className,
}: Props) {
  const getStatus = useUserPresence(showStatus && userId ? [userId] : []);
  const status = showStatus && userId ? getStatus(userId) : "offline";

  const inner = (
    <div className={cn("relative inline-block", className)}>
      <div
        className={cn(
          "rounded-full overflow-hidden grid place-items-center font-display font-semibold text-white gradient-hero shrink-0 ring-2 ring-background/40",
          SIZES[size]
        )}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={username ?? "avatar"} className="h-full w-full object-cover" />
        ) : (
          <span>{username?.[0]?.toUpperCase() ?? "?"}</span>
        )}
      </div>
      {showStatus && userId && (
        <span className={cn("absolute", DOT_POS[size])}>
          <StatusDot status={status} size={size === "xl" ? "lg" : size === "sm" ? "sm" : "md"} />
        </span>
      )}
    </div>
  );
  if (linkToProfile && userId) {
    return (
      <Link to="/profile/$userId" params={{ userId }} className="hover:scale-105 transition-transform inline-block">
        {inner}
      </Link>
    );
  }
  return inner;
}
