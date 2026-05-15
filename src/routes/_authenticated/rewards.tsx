import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentFamily } from "@/hooks/use-current-family";
import { useAuth } from "@/hooks/use-auth";
import { Loader } from "@/components/Loader";
import { Trophy, Crown } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/rewards")({
  component: RewardsPage,
});

function RewardsPage() {
  const { currentFamily, isAdmin } = useCurrentFamily();
  const { profile } = useAuth();
  const qc = useQueryClient();

  const { data: leaderboard, isLoading } = useQuery({
    queryKey: ["leaderboard", currentFamily?.id],
    enabled: !!currentFamily,
    queryFn: async () => {
      const { data: members } = await supabase
        .from("family_members")
        .select("user:profiles(id, username, avatar_url, points, completed_chores)")
        .eq("family_id", currentFamily!.id);
      return ((members ?? []).map((m: any) => m.user).filter(Boolean) as any[]).sort((a, b) => b.points - a.points);
    },
  });

  const { data: settings } = useQuery({
    queryKey: ["reward_settings", currentFamily?.id],
    enabled: !!currentFamily,
    queryFn: async () => {
      const { data } = await supabase.from("reward_settings").select("*").eq("family_id", currentFamily!.id).maybeSingle();
      return data;
    },
  });

  const [rate, setRate] = useState("");
  const saveRate = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("reward_settings").upsert({ family_id: currentFamily!.id, points_per_pkr: Number(rate) });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Rate updated"); qc.invalidateQueries({ queryKey: ["reward_settings", currentFamily?.id] }); },
  });

  if (!currentFamily) return <p className="text-center text-muted-foreground py-12">Select a family first.</p>;

  const ppk = Number(settings?.points_per_pkr ?? 1);
  const myPkr = ppk > 0 ? Math.floor((profile?.points ?? 0) / ppk) : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <h1 className="font-display text-3xl font-bold">Rewards</h1>

      <div className="glass rounded-3xl p-6 gradient-soft">
        <p className="text-sm">Your balance</p>
        <div className="flex items-end gap-3 mt-1">
          <span className="text-5xl font-display font-bold text-gradient">{profile?.points ?? 0}</span>
          <span className="text-muted-foreground mb-2">pts ≈ <strong className="text-foreground">{myPkr} PKR</strong></span>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Current rate: {ppk} point = 1 PKR</p>
        {isAdmin && (
          <div className="mt-4 flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">Points per 1 PKR</label>
              <Input type="number" step="0.1" placeholder={String(ppk)} value={rate} onChange={(e) => setRate(e.target.value)} className="mt-1 rounded-xl bg-background" />
            </div>
            <Button onClick={() => saveRate.mutate()} disabled={!rate} className="rounded-xl gradient-hero text-white">Save</Button>
          </div>
        )}
      </div>

      <div className="glass rounded-3xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="h-5 w-5 text-accent" />
          <h2 className="font-display font-semibold">Family leaderboard</h2>
        </div>
        {isLoading ? <Loader /> : (
          <ol className="space-y-2">
            {(leaderboard ?? []).map((m: any, i) => (
              <li key={m.id} className="flex items-center gap-3 p-3 rounded-2xl bg-muted/40">
                <span className="w-7 h-7 rounded-full bg-background grid place-items-center font-display font-bold text-sm">
                  {i === 0 ? <Crown className="h-4 w-4 text-accent" /> : i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">@{m.username}</p>
                  <p className="text-xs text-muted-foreground">{m.completed_chores} chores done</p>
                </div>
                <span className="font-display font-bold">{m.points} <span className="text-xs text-muted-foreground font-normal">pts</span></span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
