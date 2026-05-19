import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentFamily } from "@/hooks/use-current-family";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Send, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { UserAvatar } from "./UserAvatar";

export function InviteUsersDialog({ familyId, trigger }: { familyId: string; trigger?: React.ReactNode }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const { families } = useCurrentFamily();

  const search = async () => {
    const term = q.trim();
    if (!term) { setResults([]); return; }
    setSearching(true);
    const like = `%${term}%`;
    const { data } = await supabase
      .from("profiles")
      .select("id, username, email, avatar_url")
      .or(`username.ilike.${like},email.ilike.${like}`)
      .neq("id", user!.id)
      .limit(15);
    setResults(data ?? []);
    setSearching(false);
  };

  const invite = useMutation({
    mutationFn: async (uid: string) => {
      const { error } = await supabase.from("family_invites").insert({
        family_id: familyId, invited_user_id: uid, invited_by: user!.id,
      });
      if (error) throw error;
      await supabase.from("notifications").insert({
        user_id: uid,
        family_id: familyId,
        type: "family_invite",
        title: "You've been invited to a family",
        body: `${families.find((f) => f.family.id === familyId)?.family.name ?? "A family"} invited you to join.`,
        link: "/profile",
      } as any).then(() => null, () => null);
    },
    onSuccess: () => toast.success("Invitation sent"),
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button className="rounded-xl gradient-hero text-white"><UserPlus className="h-4 w-4 mr-1" /> Invite</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Invite members</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); search(); }} className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search @username or email…" className="pl-9 rounded-xl" />
          </div>
          <Button type="submit" disabled={searching} className="rounded-xl">Search</Button>
        </form>
        <ul className="space-y-2 max-h-80 overflow-y-auto -mx-1 px-1">
          {results.length === 0 && (
            <li className="text-xs text-muted-foreground text-center py-4">{searching ? "Searching…" : "No results yet"}</li>
          )}
          {results.map((r) => (
            <li key={r.id} className="flex items-center gap-3 p-2 rounded-xl bg-muted/40 hover:bg-muted transition">
              <UserAvatar userId={r.id} username={r.username} avatarUrl={r.avatar_url} size="sm" showStatus />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">@{r.username}</p>
                <p className="text-[11px] text-muted-foreground truncate">{r.email}</p>
              </div>
              <Button size="sm" className="rounded-lg gradient-hero text-white h-8" onClick={() => invite.mutate(r.id)}>
                <Send className="h-3 w-3 mr-1" /> Invite
              </Button>
            </li>
          ))}
        </ul>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}><X className="h-4 w-4 mr-1" />Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
