import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentFamily } from "@/hooks/use-current-family";
import { Loader } from "@/components/Loader";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, MessageCircle } from "lucide-react";
import { ChatTabs } from "@/components/ChatTabs";
import { UserAvatar } from "@/components/UserAvatar";

export const Route = createFileRoute("/_authenticated/dm/")({
  component: DMIndex,
});

function DMIndex() {
  const { user } = useAuth();
  const { currentFamily } = useCurrentFamily();

  const { data: members, isLoading } = useQuery({
    queryKey: ["fam-members-dm", currentFamily?.id],
    enabled: !!currentFamily,
    queryFn: async () => {
      const { data } = await supabase
        .from("family_members")
        .select("user:profiles!family_members_user_profile_fkey(id, username, avatar_url)")
        .eq("family_id", currentFamily!.id);
      return ((data ?? []).map((m: any) => m.user).filter(Boolean) as any[]).filter((p) => p.id !== user!.id);
    },
  });

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <ChatTabs />
      <h1 className="font-display text-3xl font-bold">Private Messages</h1>
      {!currentFamily ? (
        <p className="text-muted-foreground">Join a family to message members.</p>
      ) : isLoading ? <Loader /> : (members ?? []).length === 0 ? (
        <div className="glass rounded-3xl p-12 text-center text-muted-foreground">No other members yet.</div>
      ) : (
        <ul className="space-y-2">
          {members!.map((m) => (
            <li key={m.id}>
              <Link to="/dm/$userId" params={{ userId: m.id }} className="glass rounded-2xl p-4 hover-lift flex items-center gap-3">
                <div className="h-10 w-10 rounded-full gradient-hero grid place-items-center font-display font-semibold text-white">{m.username[0]?.toUpperCase()}</div>
                <div className="flex-1"><p className="font-display font-semibold">@{m.username}</p></div>
                <MessageCircle className="h-5 w-5 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
