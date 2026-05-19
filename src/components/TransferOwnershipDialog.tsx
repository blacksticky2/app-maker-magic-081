import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown } from "lucide-react";
import { toast } from "sonner";
import { UserAvatar } from "./UserAvatar";

export function TransferOwnershipDialog({
  familyId,
  familyName,
  trigger,
  onTransferred,
}: {
  familyId: string;
  familyName: string;
  trigger: React.ReactNode;
  onTransferred?: () => void;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [pick, setPick] = useState<string | null>(null);

  const { data: members } = useQuery({
    queryKey: ["transfer-members", familyId, open],
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase
        .from("family_members")
        .select("user_id, user:profiles!family_members_user_profile_fkey(id, username, avatar_url)")
        .eq("family_id", familyId);
      return (data ?? []).filter((m: any) => m.user_id !== user!.id);
    },
  });

  const transfer = useMutation({
    mutationFn: async () => {
      if (!pick) throw new Error("Pick a member");
      const { error } = await supabase.rpc("transfer_family_ownership", { _family_id: familyId, _new_owner: pick });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ownership transferred");
      setOpen(false);
      onTransferred?.();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Crown className="h-4 w-4 text-accent" /> Transfer ownership</DialogTitle>
          <DialogDescription>Pick a new owner for <strong>{familyName}</strong>. They'll get full control and you'll become an admin.</DialogDescription>
        </DialogHeader>
        <ul className="space-y-2 max-h-72 overflow-y-auto">
          {(members ?? []).map((m: any) => (
            <li key={m.user_id}>
              <button
                onClick={() => setPick(m.user_id)}
                className={`w-full flex items-center gap-3 p-2.5 rounded-xl border transition ${pick === m.user_id ? "border-primary bg-primary/10" : "border-transparent bg-muted/40 hover:bg-muted"}`}
              >
                <UserAvatar userId={m.user?.id} username={m.user?.username} avatarUrl={m.user?.avatar_url} size="sm" />
                <span className="text-sm font-medium">@{m.user?.username}</span>
              </button>
            </li>
          ))}
          {(members ?? []).length === 0 && (
            <li className="text-xs text-muted-foreground text-center py-4">No other members to transfer to.</li>
          )}
        </ul>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={!pick} className="gradient-hero text-white" onClick={() => transfer.mutate()}>Transfer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
