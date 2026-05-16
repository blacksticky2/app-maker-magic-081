import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentFamily } from "@/hooks/use-current-family";
import { useAuth } from "@/hooks/use-auth";
import { Loader } from "@/components/Loader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, CheckCircle2, Trophy, Clock, XCircle, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/chores")({
  component: ChoresPage,
});

function ChoresPage() {
  const { currentFamily } = useCurrentFamily();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState("open");

  const { data: chores, isLoading } = useQuery({
    queryKey: ["chores", currentFamily?.id],
    enabled: !!currentFamily,
    queryFn: async () => {
      const { data } = await supabase
        .from("chores")
        .select("*, creator:profiles!chores_created_by_profile_fkey(username), assignee:profiles!chores_assigned_to_profile_fkey(username)")
        .eq("family_id", currentFamily!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: any }) => {
      const { error } = await supabase.from("chores").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chores", currentFamily?.id] }),
  });

  const deleteChore = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("chores").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chores", currentFamily?.id] });
      toast.success("Chore deleted");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const [editing, setEditing] = useState<any>(null);

  if (!currentFamily) return <p className="text-center text-muted-foreground py-12">Select a family first.</p>;

  const filtered = (chores ?? []).filter((c) => {
    if (tab === "open") return ["open", "accepted", "in_progress"].includes(c.status);
    if (tab === "submitted") return c.status === "submitted";
    if (tab === "done") return c.status === "approved";
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Chores</h1>
          <p className="text-sm text-muted-foreground">Post tasks, earn points, get rewards.</p>
        </div>
        <AddChoreDialog />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="rounded-xl">
          <TabsTrigger value="open" className="rounded-lg">Open</TabsTrigger>
          <TabsTrigger value="submitted" className="rounded-lg">Pending approval</TabsTrigger>
          <TabsTrigger value="done" className="rounded-lg">Completed</TabsTrigger>
        </TabsList>
        <TabsContent value={tab} className="mt-4">
          {isLoading ? <Loader /> : filtered.length === 0 ? (
            <div className="glass rounded-3xl p-12 text-center text-muted-foreground">No chores here.</div>
          ) : (
            <ul className="space-y-3">
              {filtered.map((c: any) => (
                <li key={c.id} className="glass rounded-2xl p-4 hover-lift">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-display font-semibold">{c.title}</h3>
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-accent/15 text-accent font-semibold">
                          <Trophy className="h-3 w-3" /> {c.points} pts
                        </span>
                        <StatusBadge status={c.status} />
                      </div>
                      {c.description && <p className="text-sm text-muted-foreground mt-1">{c.description}</p>}
                      <p className="text-xs text-muted-foreground mt-2">
                        Posted by @{c.creator?.username}
                        {c.assignee && <> · Doing: @{c.assignee.username}</>}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1">
                      {c.created_by === user!.id ? (
                        <>
                          {c.status === "open" && (
                            <>
                              <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setEditing(c)}>
                                <Pencil className="h-3 w-3 mr-1" /> Edit
                              </Button>
                              <Button size="sm" variant="outline" className="rounded-xl text-destructive hover:text-destructive" onClick={() => { if (confirm("Delete this chore?")) deleteChore.mutate(c.id); }}>
                                <Trash2 className="h-3 w-3 mr-1" /> Delete
                              </Button>
                            </>
                          )}
                          {c.status === "submitted" && (
                            <>
                              <Button size="sm" className="rounded-xl gradient-hero text-white" onClick={() => { updateStatus.mutate({ id: c.id, patch: { status: "approved" } }); toast.success("Approved! Points awarded."); }}>
                                <CheckCircle2 className="h-3 w-3 mr-1" /> Approve
                              </Button>
                              <Button size="sm" variant="outline" className="rounded-xl" onClick={() => updateStatus.mutate({ id: c.id, patch: { status: "rejected" } })}>Reject</Button>
                            </>
                          )}
                        </>
                      ) : (
                        <>
                          {c.status === "open" && (
                            <Button size="sm" className="rounded-xl gradient-hero text-white" onClick={() => updateStatus.mutate({ id: c.id, patch: { status: "accepted", assigned_to: user!.id } })}>Accept</Button>
                          )}
                          {(c.status === "accepted" || c.status === "in_progress") && c.assigned_to === user!.id && (
                            <Button size="sm" className="rounded-xl gradient-hero text-white" onClick={() => updateStatus.mutate({ id: c.id, patch: { status: "submitted" } })}>Mark done</Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>

      <EditChoreDialog chore={editing} onClose={() => setEditing(null)} onSaved={() => qc.invalidateQueries({ queryKey: ["chores", currentFamily?.id] })} />
    </div>
  );
}

function EditChoreDialog({ chore, onClose, onSaved }: { chore: any; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [points, setPoints] = useState("15");
  const open = !!chore;

  useState(() => undefined);
  // sync when chore changes
  if (chore && title === "" && description === "" && points === "15" && (chore.title !== title || chore.description !== description)) {
    // initial population
  }

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("chores").update({
        title, description, points: Number(points),
      }).eq("id", chore.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Chore updated"); onSaved(); onClose(); },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md" onOpenAutoFocus={() => {
        if (chore) { setTitle(chore.title ?? ""); setDescription(chore.description ?? ""); setPoints(String(chore.points ?? 15)); }
      }}>
        <DialogHeader><DialogTitle>Edit chore</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 rounded-xl" /></div>
          <div><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 rounded-xl" /></div>
          <div><Label>Points reward</Label><Input type="number" value={points} onChange={(e) => setPoints(e.target.value)} className="mt-1 rounded-xl" /></div>
        </div>
        <DialogFooter>
          <Button onClick={() => save.mutate()} disabled={!title.trim()} className="rounded-xl gradient-hero text-white">Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; icon: any }> = {
    open: { label: "Open", cls: "bg-muted text-foreground", icon: Clock },
    accepted: { label: "Accepted", cls: "bg-primary/15 text-primary", icon: Clock },
    in_progress: { label: "In progress", cls: "bg-primary/15 text-primary", icon: Clock },
    submitted: { label: "Awaiting approval", cls: "bg-warning/20 text-foreground", icon: Clock },
    approved: { label: "Approved", cls: "bg-success/20 text-foreground", icon: CheckCircle2 },
    rejected: { label: "Rejected", cls: "bg-destructive/15 text-destructive", icon: XCircle },
  };
  const m = map[status] ?? map.open;
  const Icon = m.icon;
  return <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${m.cls}`}><Icon className="h-3 w-3" />{m.label}</span>;
}

function AddChoreDialog() {
  const { currentFamily } = useCurrentFamily();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [points, setPoints] = useState("15");

  const addMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("chores").insert({
        family_id: currentFamily!.id, title, description, points: Number(points), created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chores", currentFamily?.id] });
      toast.success("Chore posted");
      setOpen(false); setTitle(""); setDescription(""); setPoints("15");
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button className="rounded-xl gradient-hero text-white"><Plus className="h-4 w-4 mr-1" /> Post chore</Button></DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Post a chore</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Buy a pack of noodles" className="mt-1 rounded-xl" /></div>
          <div><Label>Description (optional)</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 rounded-xl" /></div>
          <div><Label>Points reward</Label><Input type="number" value={points} onChange={(e) => setPoints(e.target.value)} className="mt-1 rounded-xl" /></div>
        </div>
        <DialogFooter>
          <Button onClick={() => addMut.mutate()} disabled={!title.trim()} className="rounded-xl gradient-hero text-white">Post chore</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
