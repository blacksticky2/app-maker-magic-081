import { Link, useRouterState } from "@tanstack/react-router";
import { MessageSquare, Send } from "lucide-react";
import { cn } from "@/lib/utils";

export function ChatTabs() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const onFamily = pathname === "/chat";
  const onDm = pathname.startsWith("/dm");
  return (
    <div className="max-w-3xl mx-auto mb-4 glass rounded-2xl p-1 grid grid-cols-2 gap-1">
      <Link
        to="/chat"
        className={cn(
          "flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-all",
          onFamily ? "gradient-hero text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
        )}
      >
        <MessageSquare className="h-4 w-4" /> Family Chat
      </Link>
      <Link
        to="/dm"
        className={cn(
          "flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-all",
          onDm ? "gradient-hero text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Send className="h-4 w-4" /> Private DMs
      </Link>
    </div>
  );
}
