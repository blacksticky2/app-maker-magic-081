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
import { Plus, Crown, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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
        .select("id, role, custom_role_name, is_admin, user:profiles!family_members_user_profile_fkey(id, username, avatar_url, points)")
        .eq("family_id", currentFamily!.id);
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

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-display text-3xl font-bold">Family</h1>
        <CreateFamilyDialog onCreated={() => refresh()} />
      </div>

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
          <p className="text-muted-foreground">No family yet. Create one to get started.</p>
        </div>
      ) : (
        <>
          <div className="glass rounded-3xl p-6 gradient-soft">
            <h2 className="font-display text-2xl font-bold">{currentFamily.name}</h2>
            <p className="text-sm text-muted-foreground mt-1">{members?.length ?? 0} members</p>
            <div className="mt-4">
              <Link to="/family/invite" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl gradient-hero text-white font-medium">
                <UserPlus className="h-4 w-4" /> Invite member
              </Link>
            </div>
          </div>

          {isLoading ? <Loader /> : (
            <div className="glass rounded-3xl p-4">
              <h3 className="font-display font-semibold mb-3 px-2">Members</h3>
              <ul className="space-y-2">
                {(members ?? []).map((m: any) => (
                  <li key={m.id} className="flex items-center gap-3 p-3 rounded-2xl bg-muted/40">
                    <div className="h-10 w-10 rounded-full bg-background grid place-items-center font-display font-semibold">{m.user?.username?.[0]?.toUpperCase()}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">@{m.user?.username}</p>
                        {m.is_admin && <Crown className="h-3.5 w-3.5 text-accent" />}
                      </div>
                      <p className="text-xs text-muted-foreground">{m.role === "Custom" ? (m.custom_role_name ?? "Custom") : m.role}</p>
                    </div>
                    {(isAdmin || m.user?.id === user!.id) && (
                      <Select
                        defaultValue={m.role}
                        onValueChange={(v) => {
                          if (v === "Custom") {
                            const name = prompt("Custom role name?", m.custom_role_name ?? "");
                            updateRole.mutate({ id: m.id, role: v, custom_role_name: name });
                          } else updateRole.mutate({ id: m.id, role: v, custom_role_name: null });
                        }}
                      >
                        <SelectTrigger className="w-32 h-8 text-xs rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                      </Select>
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
        <DialogHeader><DialogTitle>Create a family</DialogTitle></DialogHeader>
        <div><Label>Family name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. The Khans" className="mt-1 rounded-xl" /></div>
        <DialogFooter><Button onClick={() => create.mutate()} disabled={!name.trim()} className="rounded-xl gradient-hero text-white">Create</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
