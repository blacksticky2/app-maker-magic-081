import { type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Package,
  ShoppingBasket,
  Fuel,
  ListChecks,
  Trophy,
  MessageSquare,
  Send,
  Bell,
  UserPlus,
  Settings,
  User as UserIcon,
  LogOut,
  Moon,
  Sun,
  Users,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { useCurrentFamily } from "@/hooks/use-current-family";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/inventory", label: "Inventory", icon: Package },
  { to: "/grocery", label: "Grocery", icon: ShoppingBasket },
  { to: "/fuel", label: "Fuel", icon: Fuel },
  { to: "/chores", label: "Chores", icon: ListChecks },
  { to: "/rewards", label: "Rewards", icon: Trophy },
  { to: "/chat", label: "Family Chat", icon: MessageSquare },
  { to: "/dm", label: "Messages", icon: Send },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/family", label: "Family", icon: Users },
  { to: "/family/invite", label: "Add Member", icon: UserPlus },
  { to: "/settings", label: "Settings", icon: Settings },
  { to: "/profile", label: "Profile", icon: UserIcon },
] as const;

const MOBILE_NAV = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/inventory", label: "Stock", icon: Package },
  { to: "/chores", label: "Chores", icon: ListChecks },
  { to: "/chat", label: "Chat", icon: MessageSquare },
  { to: "/profile", label: "Me", icon: UserIcon },
] as const;

function FamilySwitcher() {
  const { families, currentFamily, setCurrentFamilyId } = useCurrentFamily();
  if (!currentFamily) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="w-full glass rounded-2xl px-3 py-2 text-left hover-lift">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Family</p>
          <p className="font-display font-semibold truncate">{currentFamily.name}</p>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Switch family</DropdownMenuLabel>
        {families.map((f) => (
          <DropdownMenuItem key={f.family.id} onClick={() => setCurrentFamilyId(f.family.id)}>
            {f.family.name}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/family">Manage families</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth();
  const { theme, setTheme, resolved } = useTheme();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      {/* Decorative blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full gradient-soft blur-3xl opacity-60 animate-blob" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full gradient-soft blur-3xl opacity-60 animate-blob" style={{ animationDelay: "4s" }} />
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-sidebar-border bg-sidebar/70 backdrop-blur-xl p-4 gap-3 sticky top-0 h-screen">
        <Link to="/dashboard" className="flex items-center gap-2 px-2 py-1">
          <div className="w-9 h-9 rounded-xl gradient-hero grid place-items-center text-white font-display font-bold">F</div>
          <span className="font-display font-bold text-xl">FamilyHub</span>
        </Link>
        <FamilySwitcher />
        <nav className="flex-1 overflow-y-auto -mx-1 mt-1">
          {NAV.map((item) => {
            const active = pathname === item.to || pathname.startsWith(item.to + "/");
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 mx-1 rounded-xl text-sm font-medium transition-all",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-40 glass border-b border-border/40 px-4 md:px-6 h-14 flex items-center gap-3">
          <Link to="/dashboard" className="flex items-center gap-2 md:hidden">
            <div className="w-7 h-7 rounded-lg gradient-hero grid place-items-center text-white font-display font-bold text-sm">F</div>
            <span className="font-display font-bold">FamilyHub</span>
          </Link>
          <div className="flex-1" />
          <Button variant="ghost" size="icon" asChild>
            <Link to="/notifications" aria-label="Notifications"><Bell className="h-4 w-4" /></Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(resolved === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
          >
            {resolved === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-9 w-9 rounded-full overflow-hidden border border-border bg-muted grid place-items-center">
                {profile?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="font-display font-semibold text-sm">
                    {profile?.username?.[0]?.toUpperCase() ?? "U"}
                  </span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>
                <div className="font-display">@{profile?.username}</div>
                <div className="text-xs text-muted-foreground">{profile?.points ?? 0} pts</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild><Link to="/profile">Profile</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/settings">Settings</Link></DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut}><LogOut className="h-4 w-4 mr-2" />Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1 px-4 md:px-8 py-6 pb-24 md:pb-8 animate-fade-up">{children}</main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 glass border-t border-border/40 grid grid-cols-5 h-16">
          {MOBILE_NAV.map((item) => {
            const active = pathname === item.to || pathname.startsWith(item.to + "/");
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <item.icon className={cn("h-5 w-5", active && "scale-110")} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
