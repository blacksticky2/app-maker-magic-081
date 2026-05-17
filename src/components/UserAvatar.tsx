import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

type Props = {
  userId?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  linkToProfile?: boolean;
  className?: string;
};

const SIZES = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-base",
  xl: "h-24 w-24 text-3xl",
};

export function UserAvatar({ userId, username, avatarUrl, size = "md", linkToProfile = false, className }: Props) {
  const inner = (
    <div
      className={cn(
        "rounded-full overflow-hidden grid place-items-center font-display font-semibold text-white gradient-hero shrink-0 ring-2 ring-background/40",
        SIZES[size],
        className
      )}
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt={username ?? "avatar"} className="h-full w-full object-cover" />
      ) : (
        <span>{username?.[0]?.toUpperCase() ?? "?"}</span>
      )}
    </div>
  );
  if (linkToProfile && userId) {
    return (
      <Link to="/profile/$userId" params={{ userId }} className="hover:scale-105 transition-transform">
        {inner}
      </Link>
    );
  }
  return inner;
}
