import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentFamily } from "@/hooks/use-current-family";
import { Loader } from "@/components/Loader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Crown, UserPlus, LogOut, Check, X, Mail } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { UserAvatar } from "@/components/UserAvatar";

export const Route = createFileRoute("/_authenticated/family/")({
  component: FamilyPage,
});

const ROLES = ["Dad", "Mom", "Brother", "Sister", "Grandmother", "Grandfather", "Uncle", "Aunt", "Cousin", "Custom"] as const;

function FamilyPage() {
  const { user } = useAuth();
  const { families, currentFamily, isAdmin, refresh, setCurrentFamilyId } = useCurrentFamily();
  const qc = useQueryClient();

  const { data: members, isLoading } = useQuery({
    queryKey: ["family-members", currentFamily?.id],
    enabled: !!currentFamily,
    queryFn: async () => {
      const { data } = await supabase
        .from("family_members")
        .select("id, user_id, role, custom_role_name, is_admin, user:profiles!family_members_user_profile_fkey(id, username, avatar_url, points)")
        .eq("family_id", currentFamily!.id);
      return data ?? [];
    },
  });

  const { data: invites } = useQuery({
    queryKey: ["my-invites", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("family_invites")
        .select("id, status, family:families(id, name)")
        .eq("invited_user_id", user!.id)
        .eq("status", "pending");
      return data ?? [];
    },
  });

  const updateRole = useMutation({
    mutationFn: async ({ id, role, custom_role_name }: { id: string; role: string; custom_role_name?: string | null }) => {
      const { error } = await supabase.from("family_members").update({ role: role as typeof ROLES[number], custom_role_name: custom_role_name ?? null }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["family-members", currentFamily?.id] }),
  });

  const toggleAdmin = useMutation({
    mutationFn: async ({ id, makeAdmin }: { id: string; makeAdmin: boolean }) => {
      const { error } = await supabase.from("family_members").update({ is_admin: makeAdmin }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["family-members", currentFamily?.id] }),
    onError: (e) => toast.error((e as Error).message),
  });

  const leaveMut = useMutation({
    mutationFn: async () => {
      const admins = (members ?? []).filter((m: any) => m.is_admin);
      if (isAdmin && admins.length <= 1) {
        throw new Error("You're the only admin. Promote someone else first.");
      }
      const me = (members ?? []).find((m: any) => m.user_id === user!.id);
      if (!me) throw new Error("Not a member");
      const { error } = await supabase.from("family_members").delete().eq("id", me.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("You left the family");
      await refresh();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const respondInvite = useMutation({
    mutationFn: async ({ inviteId, familyId, accept }: { inviteId: string; familyId: string; accept: boolean }) => {
      if (accept) {
        const { error: e1 } = await supabase.from("family_members").insert({ family_id: familyId, user_id: user!.id, role: "Custom" });
        if (e1 && !e1.message.includes("duplicate")) throw e1;
      }
      const { error: e2 } = await supabase.from("family_invites").update({ status: accept ? "accepted" : "declined" }).eq("id", inviteId);
      if (e2) throw e2;
    },
    onSuccess: async (_d, v) => {
      toast.success(v.accept ? "Joined family" : "Invite declined");
      qc.invalidateQueries({ queryKey: ["my-invites", user?.id] });
      await refresh();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-display text-3xl font-bold">Families</h1>
        <CreateFamilyDialog onCreated={() => refresh()} />
      </div>

      {(invites ?? []).length > 0 && (
        <div className="glass rounded-3xl p-4 space-y-2">
          <p className="font-display font-semibold flex items-center gap-2"><Mail className="h-4 w-4" /> Pending invitations</p>
          {invites!.map((iv: any) => (
            <div key={iv.id} className="flex items-center gap-3 p-3 rounded-2xl bg-muted/40">
              <div className="flex-1">
                <p className="font-medium">{iv.family?.name}</p>
                <p className="text-xs text-muted-foreground">You've been invited to join</p>
              </div>
              <Button size="sm" className="rounded-xl gradient-hero text-white" onClick={() => respondInvite.mutate({ inviteId: iv.id, familyId: iv.family.id, accept: true })}>
                <Check className="h-3 w-3 mr-1" /> Join
              </Button>
              <Button size="sm" variant="outline" className="rounded-xl" onClick={() => respondInvite.mutate({ inviteId: iv.id, familyId: iv.family.id, accept: false })}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {families.length > 1 && (
        <div className="glass rounded-2xl p-3 flex flex-wrap gap-2">
          {families.map((f) => (
            <button
              key={f.family.id}
              onClick={() => setCurrentFamilyId(f.family.id)}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium ${currentFamily?.id === f.family.id ? "gradient-hero text-white" : "bg-muted"}`}
            >
              {f.family.name}
            </button>
          ))}
        </div>
      )}

      {!currentFamily ? (
        <div className="glass rounded-3xl p-12 text-center">
          <p className="text-muted-foreground">No family yet. Create or join one to get started.</p>
        </div>
      ) : (
        <>
          <div className="glass rounded-3xl p-6 gradient-soft">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h2 className="font-display text-2xl font-bold">{currentFamily.name}</h2>
                <p className="text-sm text-muted-foreground mt-1">{members?.length ?? 0} members · You're {isAdmin ? "an admin" : "a member"}</p>
              </div>
              <div className="flex gap-2">
                {isAdmin && (
                  <Link to="/family/invite" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl gradient-hero text-white text-sm font-medium">
                    <UserPlus className="h-4 w-4" /> Invite
                  </Link>
                )}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="rounded-xl"><LogOut className="h-4 w-4 mr-1" /> Leave</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Leave {currentFamily.name}?</AlertDialogTitle>
                      <AlertDialogDescription>You'll lose access to this family's chats, chores, and inventory.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => leaveMut.mutate()}>Leave family</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>

          {isLoading ? <Loader /> : (
            <div className="glass rounded-3xl p-4">
              <h3 className="font-display font-semibold mb-3 px-2">Members</h3>
              <ul className="space-y-2">
                {(members ?? []).map((m: any) => (
                  <li key={m.id} className="flex items-center gap-3 p-3 rounded-2xl bg-muted/40">
                    <UserAvatar userId={m.user?.id} username={m.user?.username} avatarUrl={m.user?.avatar_url} size="md" linkToProfile />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">@{m.user?.username}</p>
                        {m.is_admin && <Crown className="h-3.5 w-3.5 text-accent" />}
                      </div>
                      <p className="text-xs text-muted-foreground">{m.role === "Custom" ? (m.custom_role_name ?? "Custom") : m.role}</p>
                    </div>
                    {(isAdmin || m.user_id === user!.id) && (
                      <Select
                        defaultValue={m.role}
                        onValueChange={(v) => {
                          if (v === "Custom") {
                            const name = prompt("Custom role name?", m.custom_role_name ?? "");
                            updateRole.mutate({ id: m.id, role: v, custom_role_name: name });
                          } else updateRole.mutate({ id: m.id, role: v, custom_role_name: null });
                        }}
                      >
                        <SelectTrigger className="w-28 h-8 text-xs rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                      </Select>
                    )}
                    {isAdmin && m.user_id !== user!.id && (
                      <Button
                        size="sm"
                        variant={m.is_admin ? "secondary" : "outline"}
                        className="rounded-xl text-xs h-8"
                        onClick={() => toggleAdmin.mutate({ id: m.id, makeAdmin: !m.is_admin })}
                      >
                        {m.is_admin ? "Demote" : "Make admin"}
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CreateFamilyDialog({ onCreated }: { onCreated: () => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("families").insert({ name, created_by: user!.id });
      if (error) throw error;
    },
    onSuccess: () => { setOpen(false); setName(""); onCreated(); toast.success("Family created"); },
    onError: (e) => toast.error((e as Error).message),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button className="rounded-xl gradient-hero text-white"><Plus className="h-4 w-4 mr-1" /> Create family</Button></DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Create a new family</DialogTitle></DialogHeader>
        <div><Label>Family name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. The Khans" className="mt-1 rounded-xl" /></div>
        <DialogFooter><Button onClick={() => create.mutate()} disabled={!name.trim()} className="rounded-xl gradient-hero text-white">Create</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
