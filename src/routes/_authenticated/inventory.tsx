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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Minus, Trash2, AlertTriangle, Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/inventory")({
  component: InventoryPage,
});

const CATEGORIES = ["Vegetables", "Fruits", "Grains", "Dairy", "Meat", "Spices", "Drinks", "Snacks", "Oil", "Cleaning", "Medicine", "LPG", "Household", "Other"];
const UNITS = ["kg", "g", "L", "ml", "pcs", "packets", "dozen"];

const PRESETS = [
  { name: "Tomatoes", category: "Vegetables", unit: "kg" },
  { name: "Potatoes", category: "Vegetables", unit: "kg" },
  { name: "Onions", category: "Vegetables", unit: "kg" },
  { name: "Peas", category: "Vegetables", unit: "kg" },
  { name: "Apples", category: "Fruits", unit: "kg" },
  { name: "Mangoes", category: "Fruits", unit: "kg" },
  { name: "Bananas", category: "Fruits", unit: "dozen" },
  { name: "Rice", category: "Grains", unit: "kg" },
  { name: "Flour (Atta)", category: "Grains", unit: "kg" },
  { name: "Sugar", category: "Grains", unit: "kg" },
  { name: "Milk", category: "Dairy", unit: "L" },
  { name: "Eggs", category: "Dairy", unit: "dozen" },
  { name: "Chicken", category: "Meat", unit: "kg" },
  { name: "Beef", category: "Meat", unit: "kg" },
  { name: "Salt", category: "Spices", unit: "kg" },
  { name: "Chili Powder", category: "Spices", unit: "g" },
  { name: "Cooking Oil", category: "Oil", unit: "L" },
  { name: "Ghee", category: "Oil", unit: "kg" },
  { name: "Tea", category: "Drinks", unit: "packets" },
  { name: "Noodles", category: "Snacks", unit: "packets" },
  { name: "Dish Soap", category: "Cleaning", unit: "pcs" },
  { name: "Detergent", category: "Cleaning", unit: "kg" },
  { name: "Paracetamol", category: "Medicine", unit: "packets" },
  { name: "LPG Cylinder", category: "LPG", unit: "pcs" },
  { name: "Toilet Paper", category: "Household", unit: "packets" },
];

function InventoryPage() {
  const { currentFamily, isAdmin } = useCurrentFamily();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [addOpen, setAddOpen] = useState(false);

  const { data: items, isLoading } = useQuery({
    queryKey: ["inventory", currentFamily?.id],
    enabled: !!currentFamily,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("*")
        .eq("family_id", currentFamily!.id)
        .order("category")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const adjustMut = useMutation({
    mutationFn: async ({ id, delta, current }: { id: string; delta: number; current: number }) => {
      const next = Math.max(0, current + delta);
      const { error } = await supabase
        .from("inventory_items")
        .update({ quantity: next, updated_by: user!.id })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inventory", currentFamily?.id] }),
    onError: (e) => toast.error((e as Error).message),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("inventory_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory", currentFamily?.id] });
      toast.success("Item removed");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (!currentFamily) return <p className="text-center text-muted-foreground py-12">Select or create a family first.</p>;

  const filtered = (items ?? []).filter((i) => {
    if (cat !== "all" && i.category !== cat) return false;
    if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-bold">Inventory</h1>
          <p className="text-sm text-muted-foreground">{isAdmin ? "Track everything your family needs." : "View-only — only admins can change stock."}</p>
        </div>
        {isAdmin && <AddItemDialog open={addOpen} onOpenChange={setAddOpen} />}
      </div>

      <div className="glass rounded-2xl p-3 flex flex-wrap gap-2 items-center">
        <div className="flex-1 min-w-[180px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search items…" className="pl-9 h-10 rounded-xl border-0 bg-transparent" />
        </div>
        <Select value={cat} onValueChange={setCat}>
          <SelectTrigger className="w-44 h-10 rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? <Loader /> : filtered.length === 0 ? (
        <div className="glass rounded-3xl p-12 text-center">
          <p className="text-muted-foreground">No items yet. Add your first item to get started.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((i) => {
            const low = Number(i.quantity) <= Number(i.low_stock_threshold);
            return (
              <div key={i.id} className="glass rounded-2xl p-4 hover-lift">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-display font-semibold">{i.name}</h3>
                      {low && <AlertTriangle className="h-4 w-4 text-accent" />}
                    </div>
                    <p className="text-xs text-muted-foreground">{i.category}</p>
                  </div>
                  {isAdmin && (
                    <button onClick={() => deleteMut.mutate(i.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className={`text-2xl font-display font-bold ${low ? "text-accent" : ""}`}>
                    {Number(i.quantity)} <span className="text-sm font-medium text-muted-foreground">{i.unit}</span>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="outline" className="h-8 w-8 rounded-full" onClick={() => adjustMut.mutate({ id: i.id, delta: -1, current: Number(i.quantity) })}><Minus className="h-3 w-3" /></Button>
                      <Button size="icon" variant="outline" className="h-8 w-8 rounded-full" onClick={() => adjustMut.mutate({ id: i.id, delta: 1, current: Number(i.quantity) })}><Plus className="h-3 w-3" /></Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AddItemDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { currentFamily } = useCurrentFamily();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Other");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("pcs");
  const [threshold, setThreshold] = useState("1");

  const reset = () => { setName(""); setCategory("Other"); setQuantity("1"); setUnit("pcs"); setThreshold("1"); };

  const addMut = useMutation({
    mutationFn: async (payload: { name: string; category: string; quantity: number; unit: string; low_stock_threshold: number }) => {
      const { error } = await supabase.from("inventory_items").insert({
        family_id: currentFamily!.id,
        updated_by: user!.id,
        ...payload,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory", currentFamily?.id] });
      toast.success("Item added");
      reset();
      onOpenChange(false);
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="rounded-xl gradient-hero text-white"><Plus className="h-4 w-4 mr-1" /> Add item</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add inventory item</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Quick add from presets</Label>
            <div className="mt-2 flex flex-wrap gap-1 max-h-32 overflow-y-auto">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  onClick={() => { setName(p.name); setCategory(p.category); setUnit(p.unit); }}
                  className="text-xs px-2 py-1 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
          <div><Label htmlFor="iname">Name</Label><Input id="iname" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 rounded-xl" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Unit</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>{UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Quantity</Label><Input type="number" min="0" step="0.1" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="mt-1 rounded-xl" /></div>
            <div><Label>Low-stock alert at</Label><Input type="number" min="0" step="0.1" value={threshold} onChange={(e) => setThreshold(e.target.value)} className="mt-1 rounded-xl" /></div>
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={() => addMut.mutate({ name, category, quantity: Number(quantity), unit, low_stock_threshold: Number(threshold) })}
            disabled={!name.trim() || addMut.isPending}
            className="rounded-xl gradient-hero text-white"
          >
            Add to inventory
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
