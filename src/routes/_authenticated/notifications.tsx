import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentFamily } from "@/hooks/use-current-family";
import { Loader } from "@/components/Loader";
import { Bell, CheckCheck, Inbox, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/notifications")({
  component: NotifPage,
});

function NotifPage() {
  const { user } = useAuth();
  const { refresh } = useCurrentFamily();
  const qc = useQueryClient();

  const { data: notifs, isLoading } = useQuery({
    queryKey: ["notifs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("notifications").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(50);
      return data ?? [];
    },
  });

  const { data: invites } = useQuery({
    queryKey: ["invites", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("family_invites")
        .select("*, family:families(name, avatar_url), inviter:profiles!family_invites_invited_by_fkey(username)")
        .eq("invited_user_id", user!.id)
        .eq("status", "pending");
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`notif:${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => qc.invalidateQueries({ queryKey: ["notifs", user.id] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, qc]);

  const markAll = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("notifications").update({ read: true }).eq("user_id", user!.id).eq("read", false);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifs", user?.id] }),
  });

  const respondInvite = useMutation({
    mutationFn: async ({ id, family_id, accept }: { id: string; family_id: string; accept: boolean }) => {
      if (accept) {
        const { error: e1 } = await supabase.from("family_members").insert({ family_id, user_id: user!.id, role: "Custom" });
        if (e1) throw e1;
      }
      const { error } = await supabase.from("family_invites").update({ status: accept ? "accepted" : "declined" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["invites", user?.id] });
      refresh();
      toast.success(v.accept ? "Joined family!" : "Invite declined");
    },
  });

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold">Notifications</h1>
        <Button variant="outline" size="sm" className="rounded-xl" onClick={() => markAll.mutate()}><CheckCheck className="h-4 w-4 mr-1" />Mark all read</Button>
      </div>

      {(invites ?? []).length > 0 && (
        <div className="glass rounded-3xl p-5 space-y-3">
          <h2 className="font-display font-semibold">Family invitations</h2>
          {invites!.map((inv: any) => (
            <div key={inv.id} className="flex items-center gap-3 p-3 rounded-2xl bg-muted/40">
              <div className="w-10 h-10 rounded-xl gradient-hero grid place-items-center text-white font-display font-bold">{inv.family?.name?.[0]}</div>
              <div className="flex-1">
                <p className="font-semibold">{inv.family?.name}</p>
                <p className="text-xs text-muted-foreground">Invited by @{inv.inviter?.username}</p>
              </div>
              <Button size="sm" className="rounded-xl gradient-hero text-white" onClick={() => respondInvite.mutate({ id: inv.id, family_id: inv.family_id, accept: true })}><Check className="h-3 w-3" /></Button>
              <Button size="sm" variant="outline" className="rounded-xl" onClick={() => respondInvite.mutate({ id: inv.id, family_id: inv.family_id, accept: false })}><X className="h-3 w-3" /></Button>
            </div>
          ))}
        </div>
      )}

      {isLoading ? <Loader /> : (notifs ?? []).length === 0 ? (
        <div className="glass rounded-3xl p-12 text-center text-muted-foreground">
          <Inbox className="h-10 w-10 mx-auto mb-3" />
          You're all caught up.
        </div>
      ) : (
        <ul className="space-y-2">
          {notifs!.map((n: any) => (
            <li key={n.id} className={`glass rounded-2xl p-4 ${!n.read ? "border-l-4 border-l-primary" : ""}`}>
              <div className="flex items-start gap-3">
                <Bell className="h-4 w-4 mt-1 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{n.title}</p>
                  {n.body && <p className="text-sm text-muted-foreground">{n.body}</p>}
                  <p className="text-[10px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
