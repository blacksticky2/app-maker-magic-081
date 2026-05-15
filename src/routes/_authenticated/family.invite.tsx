import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentFamily } from "@/hooks/use-current-family";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Send, User } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/family/invite")({
  component: InvitePage,
});

function InvitePage() {
  const { user } = useAuth();
  const { currentFamily, isAdmin } = useCurrentFamily();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const search = async () => {
    if (!query.trim()) return;
    setSearching(true);
    const q = `%${query.trim()}%`;
    const { data } = await supabase
      .from("profiles")
      .select("id, username, email, avatar_url")
      .or(`username.ilike.${q},email.ilike.${q}`)
      .neq("id", user!.id)
      .limit(10);
    setResults(data ?? []);
    setSearching(false);
  };

  const invite = useMutation({
    mutationFn: async (uid: string) => {
      const { error } = await supabase.from("family_invites").insert({
        family_id: currentFamily!.id, invited_user_id: uid, invited_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => toast.success("Invitation sent"),
    onError: (e) => toast.error((e as Error).message),
  });

  if (!currentFamily) return <p className="text-muted-foreground text-center py-12">Pick or create a family first.</p>;
  if (!isAdmin) return <p className="text-muted-foreground text-center py-12">Only family admins can invite new members.</p>;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="font-display text-3xl font-bold">Add family member</h1>
        <p className="text-sm text-muted-foreground">Search by username or email to send an invitation to <strong>{currentFamily.name}</strong>.</p>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); search(); }} className="glass rounded-2xl p-3 flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="@username or email…" className="pl-9 rounded-xl border-0 bg-transparent" />
        </div>
        <Button type="submit" disabled={searching} className="rounded-xl gradient-hero text-white">Search</Button>
      </form>

      {results.length > 0 && (
        <ul className="space-y-2">
          {results.map((r) => (
            <li key={r.id} className="glass rounded-2xl p-3 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-muted grid place-items-center"><User className="h-4 w-4" /></div>
              <div className="flex-1 min-w-0">
                <p className="font-medium">@{r.username}</p>
                <p className="text-xs text-muted-foreground truncate">{r.email}</p>
              </div>
              <Button size="sm" className="rounded-xl gradient-hero text-white" onClick={() => invite.mutate(r.id)}>
                <Send className="h-3 w-3 mr-1" /> Invite
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
