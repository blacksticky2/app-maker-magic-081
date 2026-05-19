import { createFileRoute, useNavigate, useParams, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useUserPresence } from "@/hooks/use-presence";
import { Loader } from "@/components/Loader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { UserAvatar } from "@/components/UserAvatar";
import { StatusDot, lastSeenLabel } from "@/components/StatusDot";
import { InviteUsersDialog } from "@/components/InviteUsersDialog";
import { TransferOwnershipDialog } from "@/components/TransferOwnershipDialog";
import { DisbandFamilyDialog } from "@/components/DisbandFamilyDialog";
import { ArrowLeft, Crown, Shield, LogOut, Trophy, CheckCircle2, MessageCircle, Trash2, X, Mail } from "lucide-react";
import { toast } from "sonner";
import { useCurrentFamily } from "@/hooks/use-current-family";

export const Route = createFileRoute("/_authenticated/family/$familyId/manage")({
  component: ManageFamilyPage,
});

const ROLES = ["Dad", "Mom", "Brother", "Sister", "Grandmother", "Grandfather", "Uncle", "Aunt", "Cousin", "Custom"] as const;

function ManageFamilyPage() {
  const { familyId } = useParams({ from: "/_authenticated/family/$familyId/manage" });
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { refresh: refreshFamilies } = useCurrentFamily();

  const { data: family, isLoading: famLoading } = useQuery({
    queryKey: ["family-detail", familyId],
    queryFn: async () => {
      const { data } = await supabase.from("families").select("*").eq("id", familyId).maybeSingle();
      return data;
    },
  });

  const { data: members, isLoading: memLoading } = useQuery({
    queryKey: ["family-members-detail", familyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("family_members")
        .select("id, user_id, role, custom_role_name, is_admin, joined_at, user:profiles!family_members_user_profile_fkey(id, username, email, avatar_url, points, completed_chores, last_seen_at, status)")
        .eq("family_id", familyId);
      return data ?? [];
    },
  });

  const { data: invites } = useQuery({
    queryKey: ["family-invites", familyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("family_invites")
        .select("id, status, created_at, invited_user_id")
        .eq("family_id", familyId)
        .eq("status", "pending");
      const list = data ?? [];
      if (list.length === 0) return [] as any[];
      const ids = list.map((i: any) => i.invited_user_id);
      const { data: profs } = await supabase.from("profiles").select("id, username, avatar_url").in("id", ids);
      const byId = new Map((profs ?? []).map((p: any) => [p.id, p]));
      return list.map((iv: any) => ({ ...iv, invited_user: byId.get(iv.invited_user_id) }));
    },
  });

  const me = (members ?? []).find((m: any) => m.user_id === user?.id);
  const isOwner = family?.owner_id === user?.id;
  const isAdmin = !!me?.is_admin;

  const userIds = (members ?? []).map((m: any) => m.user_id);
  const getStatus = useUserPresence(userIds);
  const onlineCount = userIds.filter((id) => getStatus(id) === "online").length;

  const updateRole = useMutation({
    mutationFn: async ({ id, role, custom_role_name }: { id: string; role: string; custom_role_name?: string | null }) => {
      const { error } = await supabase.from("family_members").update({ role: role as any, custom_role_name: custom_role_name ?? null }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["family-members-detail", familyId] }),
    onError: (e) => toast.error((e as Error).message),
  });

  const toggleAdmin = useMutation({
    mutationFn: async ({ id, makeAdmin }: { id: string; makeAdmin: boolean }) => {
      const { error } = await supabase.from("family_members").update({ is_admin: makeAdmin }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["family-members-detail", familyId] }); },
    onError: (e) => toast.error((e as Error).message),
  });

  const removeMember = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("family_members").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Member removed"); qc.invalidateQueries({ queryKey: ["family-members-detail", familyId] }); },
    onError: (e) => toast.error((e as Error).message),
  });

  const leave = useMutation({
    mutationFn: async () => {
      if (isOwner) throw new Error("Owner must transfer ownership before leaving.");
      if (!me) throw new Error("Not a member");
      const { error } = await supabase.from("family_members").delete().eq("id", me.id);
      if (error) throw error;
    },
    onSuccess: async () => { toast.success("You left the family"); await refreshFamilies(); navigate({ to: "/profile" }); },
    onError: (e) => toast.error((e as Error).message),
  });

  const revokeInvite = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("family_invites").update({ status: "declined" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["family-invites", familyId] }),
  });

  if (famLoading || memLoading) return <Loader />;
  if (!family) return <p className="text-center py-12 text-muted-foreground">Family not found.</p>;
  if (!me) return <p className="text-center py-12 text-muted-foreground">You're not a member of this family.</p>;

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/profile" })}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to profile
      </Button>

      {/* Header card */}
      <div className="glass rounded-3xl overflow-hidden">
        <div className="h-28 gradient-hero relative">
          {family.banner_url && <img src={family.banner_url} alt="" className="h-full w-full object-cover" />}
        </div>
        <div className="p-5 flex items-start gap-4 flex-wrap">
          <div className="-mt-12 h-20 w-20 rounded-2xl bg-card border-4 border-card grid place-items-center font-display text-2xl font-bold text-white gradient-hero shadow-lg">
            {family.avatar_url ? <img src={family.avatar_url} className="h-full w-full object-cover rounded-xl" /> : family.name[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-2xl font-bold flex items-center gap-2">
              {family.name}
              {isOwner && <Badge className="gradient-hero text-white border-0"><Crown className="h-3 w-3 mr-1" /> Owner</Badge>}
              {!isOwner && isAdmin && <Badge variant="secondary"><Shield className="h-3 w-3 mr-1" /> Admin</Badge>}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {members?.length ?? 0} members · <span className="inline-flex items-center gap-1"><StatusDot status="online" size="sm" pulse={false} /> {onlineCount} online</span>
            </p>
          </div>
          {isAdmin && <InviteUsersDialog familyId={family.id} />}
        </div>
      </div>

      <Tabs defaultValue="members">
        <TabsList className="glass rounded-2xl">
          <TabsTrigger value="members" className="rounded-xl">Members</TabsTrigger>
          <TabsTrigger value="invites" className="rounded-xl">Invites {(invites ?? []).length > 0 && <span className="ml-1 text-[10px] bg-accent text-accent-foreground px-1.5 rounded-full">{invites!.length}</span>}</TabsTrigger>
          <TabsTrigger value="settings" className="rounded-xl">Settings</TabsTrigger>
          <TabsTrigger value="danger" className="rounded-xl text-destructive">Danger</TabsTrigger>
        </TabsList>

        {/* MEMBERS */}
        <TabsContent value="members" className="space-y-2 mt-4">
          {(members ?? []).map((m: any) => {
            const isMemberOwner = family.owner_id === m.user_id;
            const status = getStatus(m.user_id);
            const canManage = isAdmin && m.user_id !== user!.id && !isMemberOwner;
            const canPromote = isOwner && m.user_id !== user!.id;
            return (
              <div key={m.id} className="glass rounded-2xl p-4 flex items-center gap-3 flex-wrap hover:shadow-md transition">
                <UserAvatar userId={m.user?.id} username={m.user?.username} avatarUrl={m.user?.avatar_url} size="lg" showStatus linkToProfile />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold truncate">@{m.user?.username}</p>
                    {isMemberOwner && <Crown className="h-3.5 w-3.5 text-accent" />}
                    {!isMemberOwner && m.is_admin && <Shield className="h-3.5 w-3.5 text-primary" />}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {m.role === "Custom" ? (m.custom_role_name ?? "Custom") : m.role}
                    {" · "}
                    {status === "online" ? "Active now" : `Last seen ${lastSeenLabel(m.user?.last_seen_at)}`}
                  </p>
                  <div className="flex gap-3 mt-1.5 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Trophy className="h-3 w-3 text-accent" /> {m.user?.points ?? 0} pts</span>
                    <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-success" /> {m.user?.completed_chores ?? 0} chores</span>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {m.user_id !== user!.id && (
                    <Button asChild size="sm" variant="outline" className="rounded-xl h-8">
                      <Link to="/dm/$userId" params={{ userId: m.user_id }}><MessageCircle className="h-3.5 w-3.5" /></Link>
                    </Button>
                  )}
                  {(isAdmin || m.user_id === user!.id) && !isMemberOwner && (
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
                  {canPromote && !isMemberOwner && (
                    <Button
                      size="sm"
                      variant={m.is_admin ? "secondary" : "outline"}
                      className="rounded-xl text-xs h-8"
                      onClick={() => toggleAdmin.mutate({ id: m.id, makeAdmin: !m.is_admin })}
                    >
                      {m.is_admin ? "Demote" : "Make admin"}
                    </Button>
                  )}
                  {canManage && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="rounded-xl h-8 text-destructive"><X className="h-3.5 w-3.5" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove @{m.user?.username}?</AlertDialogTitle>
                          <AlertDialogDescription>They'll lose access to this family.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => removeMember.mutate(m.id)}>Remove</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            );
          })}
        </TabsContent>

        {/* INVITES */}
        <TabsContent value="invites" className="space-y-2 mt-4">
          {isAdmin && <InviteUsersDialog familyId={family.id} trigger={<Button className="rounded-xl gradient-hero text-white w-full"><Mail className="h-4 w-4 mr-1" /> Send new invite</Button>} />}
          {(invites ?? []).length === 0 ? (
            <p className="text-center py-8 text-sm text-muted-foreground">No pending invites.</p>
          ) : (
            (invites ?? []).map((iv: any) => (
              <div key={iv.id} className="glass rounded-2xl p-3 flex items-center gap-3">
                <UserAvatar userId={iv.invited_user?.id} username={iv.invited_user?.username} avatarUrl={iv.invited_user?.avatar_url} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">@{iv.invited_user?.username}</p>
                  <p className="text-[11px] text-muted-foreground">Sent {lastSeenLabel(iv.created_at)}</p>
                </div>
                {isAdmin && <Button size="sm" variant="ghost" className="rounded-xl" onClick={() => revokeInvite.mutate(iv.id)}>Revoke</Button>}
              </div>
            ))
          )}
        </TabsContent>

        {/* SETTINGS */}
        <TabsContent value="settings" className="space-y-3 mt-4">
          <div className="glass rounded-2xl p-5">
            <h3 className="font-display font-semibold mb-2">Roles & permissions</h3>
            <ul className="text-sm text-muted-foreground space-y-1.5">
              <li><Crown className="h-3.5 w-3.5 inline mr-1 text-accent" /> <strong>Owner</strong> — full control, can transfer or disband family</li>
              <li><Shield className="h-3.5 w-3.5 inline mr-1 text-primary" /> <strong>Admin</strong> — manage chores, inventory, vehicles, members, invites</li>
              <li><strong className="ml-5">Member</strong> — view all family data, complete chores, chat</li>
            </ul>
          </div>
        </TabsContent>

        {/* DANGER */}
        <TabsContent value="danger" className="space-y-3 mt-4">
          <div className="glass rounded-2xl p-5 border border-destructive/30">
            <h3 className="font-display font-semibold text-destructive">Leave family</h3>
            <p className="text-xs text-muted-foreground mt-1 mb-3">
              {isOwner ? "You're the owner. Transfer ownership before you can leave." : "Step away from this family. You can be re-invited later."}
            </p>
            <div className="flex gap-2 flex-wrap">
              {isOwner && (
                <TransferOwnershipDialog
                  familyId={family.id}
                  familyName={family.name}
                  onTransferred={() => { qc.invalidateQueries(); refreshFamilies(); }}
                  trigger={<Button variant="outline" className="rounded-xl"><Crown className="h-4 w-4 mr-1" /> Transfer ownership</Button>}
                />
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="rounded-xl" disabled={isOwner}><LogOut className="h-4 w-4 mr-1" /> Leave family</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Leave {family.name}?</AlertDialogTitle>
                    <AlertDialogDescription>You'll lose access to this family's chats, chores, and inventory.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => leave.mutate()}>Leave</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {isOwner && (
            <div className="glass rounded-2xl p-5 border border-destructive/40 bg-destructive/5">
              <h3 className="font-display font-semibold text-destructive">Disband family</h3>
              <p className="text-xs text-muted-foreground mt-1 mb-3">Permanently delete this family and all of its data for everyone.</p>
              <DisbandFamilyDialog
                familyId={family.id}
                familyName={family.name}
                onDeleted={async () => { await refreshFamilies(); navigate({ to: "/profile" }); }}
                trigger={<Button variant="destructive" className="rounded-xl"><Trash2 className="h-4 w-4 mr-1" /> Disband forever</Button>}
              />
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
