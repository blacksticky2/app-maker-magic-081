import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentFamily } from "@/hooks/use-current-family";
import { usePresence, useUserPresence } from "@/hooks/use-presence";
import { Trophy, CheckCircle2, Users, Crown, Shield, Plus, Mail, Check, X, Settings as SettingsIcon, Activity } from "lucide-react";
import { AvatarUploader } from "@/components/AvatarUploader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { StatusDot } from "@/components/StatusDot";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfileHub,
});

function ProfileHub() {
  const { profile } = useAuth();
  const { families, refresh } = useCurrentFamily();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // If a child route is active (e.g. /profile/$userId), render only the child
  if (pathname !== "/profile" && pathname !== "/profile/") return <Outlet />;
  if (!profile) return null;
  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="glass rounded-3xl p-6 md:p-8 text-center gradient-soft">
        <div className="flex justify-center">
          <AvatarUploader />
        </div>
        <h1 className="font-display text-3xl font-bold mt-4">@{profile.username}</h1>
        <p className="text-sm text-muted-foreground">{profile.email}</p>
        <div className="grid grid-cols-3 gap-3 mt-5 max-w-sm mx-auto">
          <Stat icon={<Trophy className="h-4 w-4 text-accent" />} label="Points" value={profile.points} />
          <Stat icon={<CheckCircle2 className="h-4 w-4 text-success" />} label="Chores" value={profile.completed_chores} />
          <Stat icon={<Users className="h-4 w-4 text-primary" />} label="Families" value={families.length} />
        </div>
      </div>

      <Tabs defaultValue="families">
        <TabsList className="glass rounded-2xl w-full grid grid-cols-4">
          <TabsTrigger value="families" className="rounded-xl"><Users className="h-3.5 w-3.5 mr-1.5" />Families</TabsTrigger>
          <TabsTrigger value="manage" className="rounded-xl"><Crown className="h-3.5 w-3.5 mr-1.5" />Manage</TabsTrigger>
          <TabsTrigger value="status" className="rounded-xl"><Activity className="h-3.5 w-3.5 mr-1.5" />Status</TabsTrigger>
          <TabsTrigger value="settings" className="rounded-xl"><SettingsIcon className="h-3.5 w-3.5 mr-1.5" />Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="families" className="mt-4"><MyFamiliesTab onRefresh={refresh} /></TabsContent>
        <TabsContent value="manage" className="mt-4"><ManageFamiliesTab /></TabsContent>
        <TabsContent value="status" className="mt-4"><ActivityTab /></TabsContent>
        <TabsContent value="settings" className="mt-4"><FamilySettingsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="glass rounded-2xl p-3 text-center">
      <div className="flex justify-center mb-0.5">{icon}</div>
      <div className="font-display font-bold text-xl">{value ?? 0}</div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
    </div>
  );
}

/* ---------- My Families: pending invites + family cards + create ---------- */
function MyFamiliesTab({ onRefresh }: { onRefresh: () => Promise<void> }) {
  const { user } = useAuth();
  const { families, currentFamily, setCurrentFamilyId } = useCurrentFamily();
  const qc = useQueryClient();

  const { data: invites } = useQuery({
    queryKey: ["my-invites", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("family_invites")
        .select("id, family_id, status")
        .eq("invited_user_id", user!.id)
        .eq("status", "pending");
      const list = data ?? [];
      if (list.length === 0) return [] as any[];
      const fIds = list.map((i: any) => i.family_id);
      const { data: fams } = await supabase.from("families").select("id, name, avatar_url").in("id", fIds);
      const byId = new Map((fams ?? []).map((f: any) => [f.id, f]));
      return list.map((iv: any) => ({ ...iv, family: byId.get(iv.family_id) }));
    },
  });

  const respond = useMutation({
    mutationFn: async ({ inviteId, familyId, accept }: { inviteId: string; familyId: string; accept: boolean }) => {
      if (accept) {
        const { error: e1 } = await supabase.from("family_members").insert({ family_id: familyId, user_id: user!.id, role: "Custom" });
        if (e1 && !e1.message.includes("duplicate")) throw e1;
      }
      const { error } = await supabase.from("family_invites").update({ status: accept ? "accepted" : "declined" }).eq("id", inviteId);
      if (error) throw error;
    },
    onSuccess: async (_d, v) => {
      toast.success(v.accept ? "Joined family" : "Invite declined");
      qc.invalidateQueries({ queryKey: ["my-invites"] });
      await onRefresh();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="space-y-3">
      {(invites ?? []).length > 0 && (
        <div className="glass rounded-3xl p-4 space-y-2">
          <p className="font-display font-semibold flex items-center gap-2"><Mail className="h-4 w-4" /> Pending invitations</p>
          {invites!.map((iv: any) => (
            <div key={iv.id} className="flex items-center gap-3 p-3 rounded-2xl bg-muted/40">
              <div className="flex-1 min-w-0">
                <p className="font-medium">{iv.family?.name ?? "Family"}</p>
                <p className="text-xs text-muted-foreground">You've been invited to join</p>
              </div>
              <Button size="sm" className="rounded-xl gradient-hero text-white" onClick={() => respond.mutate({ inviteId: iv.id, familyId: iv.family_id, accept: true })}>
                <Check className="h-3 w-3 mr-1" /> Join
              </Button>
              <Button size="sm" variant="outline" className="rounded-xl" onClick={() => respond.mutate({ inviteId: iv.id, familyId: iv.family_id, accept: false })}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold">My families</h3>
        <CreateFamilyDialog onCreated={onRefresh} />
      </div>

      {families.length === 0 ? (
        <div className="glass rounded-3xl p-10 text-center text-muted-foreground text-sm">You're not in any family yet. Create one or accept an invite.</div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {families.map((f) => (
            <FamilyCard
              key={f.family.id}
              family={f.family}
              role={f.role === "Custom" ? f.custom_role_name ?? "Custom" : f.role}
              isAdmin={f.is_admin}
              isOwner={f.family.owner_id === user?.id}
              isCurrent={currentFamily?.id === f.family.id}
              onSetCurrent={() => setCurrentFamilyId(f.family.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FamilyCard({ family, role, isAdmin, isOwner, isCurrent, onSetCurrent }: any) {
  const { data: stats } = useQuery({
    queryKey: ["family-card-stats", family.id],
    queryFn: async () => {
      const { count } = await supabase.from("family_members").select("id", { count: "exact", head: true }).eq("family_id", family.id);
      const { data: ms } = await supabase.from("family_members").select("user_id").eq("family_id", family.id);
      return { count: count ?? 0, ids: (ms ?? []).map((m: any) => m.user_id) };
    },
  });
  const ids = stats?.ids ?? [];
  const getStatus = useUserPresence(ids);
  const online = ids.filter((id) => getStatus(id) === "online").length;

  return (
    <div className={`glass rounded-3xl overflow-hidden hover-lift transition ${isCurrent ? "ring-2 ring-primary" : ""}`}>
      <div className="h-16 gradient-hero relative">
        {family.banner_url && <img src={family.banner_url} className="h-full w-full object-cover" />}
      </div>
      <div className="p-4 pt-0">
        <div className="-mt-8 mb-2 h-14 w-14 rounded-xl bg-card border-4 border-card grid place-items-center font-display font-bold text-white gradient-hero shadow">
          {family.avatar_url ? <img src={family.avatar_url} className="h-full w-full object-cover rounded-lg" /> : family.name[0]?.toUpperCase()}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className="font-display font-semibold text-lg truncate">{family.name}</h4>
          {isOwner ? (
            <Badge className="gradient-hero text-white border-0 text-[10px]"><Crown className="h-2.5 w-2.5 mr-0.5" />Owner</Badge>
          ) : isAdmin ? (
            <Badge variant="secondary" className="text-[10px]"><Shield className="h-2.5 w-2.5 mr-0.5" />Admin</Badge>
          ) : (
            <Badge variant="outline" className="text-[10px]">{role}</Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">{stats?.count ?? 0} members · <span className="inline-flex items-center gap-1"><StatusDot status="online" size="sm" pulse={false} />{online} online</span></p>
        <div className="flex gap-2 mt-3">
          <Button size="sm" variant="outline" className="rounded-xl flex-1" onClick={onSetCurrent} disabled={isCurrent}>{isCurrent ? "Active" : "Switch"}</Button>
          <Button asChild size="sm" className="rounded-xl gradient-hero text-white flex-1">
            <Link to="/family/$familyId/manage" params={{ familyId: family.id }}>Manage</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Manage Families: same list, focused on quick deep-link ---------- */
function ManageFamiliesTab() {
  const { families } = useCurrentFamily();
  if (families.length === 0) return <p className="text-center text-sm text-muted-foreground py-10">Join or create a family to manage it.</p>;
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Pick a family to manage members, roles, invites, and settings.</p>
      {families.map((f) => (
        <Link
          key={f.family.id}
          to="/family/$familyId/manage"
          params={{ familyId: f.family.id }}
          className="glass rounded-2xl p-4 flex items-center gap-3 hover-lift"
        >
          <div className="h-12 w-12 rounded-xl gradient-hero grid place-items-center font-display font-bold text-white">
            {f.family.avatar_url ? <img src={f.family.avatar_url} className="h-full w-full object-cover rounded-xl" /> : f.family.name[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{f.family.name}</p>
            <p className="text-xs text-muted-foreground">{f.is_admin ? "Admin" : f.role === "Custom" ? (f.custom_role_name ?? "Member") : f.role}</p>
          </div>
          <Crown className={`h-4 w-4 ${f.is_admin ? "text-accent" : "text-muted-foreground/40"}`} />
        </Link>
      ))}
    </div>
  );
}

/* ---------- Activity Status ---------- */
function ActivityTab() {
  const { myStatus, setMyStatus } = usePresence();
  const opts: { v: "online" | "idle" | "offline"; label: string; desc: string }[] = [
    { v: "online", label: "Active now", desc: "Visible as online to family" },
    { v: "idle", label: "Idle", desc: "You're around but not active" },
    { v: "offline", label: "Invisible", desc: "Hide your activity status" },
  ];
  return (
    <div className="space-y-3">
      <div className="glass rounded-3xl p-5">
        <h3 className="font-display font-semibold mb-3">My status</h3>
        <div className="space-y-2">
          {opts.map((o) => (
            <button
              key={o.v}
              onClick={() => setMyStatus(o.v)}
              className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition text-left ${myStatus === o.v ? "border-primary bg-primary/10" : "border-transparent bg-muted/40 hover:bg-muted"}`}
            >
              <StatusDot status={o.v} pulse={o.v === "online"} />
              <div className="flex-1">
                <p className="font-medium text-sm">{o.label}</p>
                <p className="text-[11px] text-muted-foreground">{o.desc}</p>
              </div>
              {myStatus === o.v && <Check className="h-4 w-4 text-primary" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- Family Settings (preferences placeholder) ---------- */
function FamilySettingsTab() {
  return (
    <div className="glass rounded-3xl p-5 text-sm text-muted-foreground">
      <h3 className="font-display font-semibold text-foreground mb-1">Family preferences</h3>
      <p>Your notification preferences and family defaults will live here. For per-family controls (name, roles, members, danger zone), open <strong className="text-foreground">Manage Families</strong>.</p>
    </div>
  );
}

/* ---------- Create family dialog ---------- */
function CreateFamilyDialog({ onCreated }: { onCreated: () => Promise<void> | void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("families").insert({ name, created_by: user!.id, owner_id: user!.id });
      if (error) throw error;
    },
    onSuccess: async () => { setOpen(false); setName(""); await onCreated(); toast.success("Family created"); },
    onError: (e) => toast.error((e as Error).message),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" className="rounded-xl gradient-hero text-white"><Plus className="h-4 w-4 mr-1" /> New family</Button></DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Create a new family</DialogTitle></DialogHeader>
        <div>
          <Label>Family name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. The Khans" className="mt-1 rounded-xl" />
        </div>
        <DialogFooter><Button onClick={() => create.mutate()} disabled={!name.trim()} className="rounded-xl gradient-hero text-white">Create</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
