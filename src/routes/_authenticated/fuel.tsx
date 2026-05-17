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
import { Fuel, Plus, Droplet } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/fuel")({
  component: FuelPage,
});

function FuelPage() {
  const { currentFamily, isAdmin } = useCurrentFamily();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: vehicles, isLoading } = useQuery({
    queryKey: ["vehicles", currentFamily?.id],
    enabled: !!currentFamily,
    queryFn: async () => {
      const { data } = await supabase.from("vehicles").select("*").eq("family_id", currentFamily!.id).order("created_at");
      return data ?? [];
    },
  });

  const refillMut = useMutation({
    mutationFn: async ({ vehicle, liters, cost }: { vehicle: any; liters: number; cost: number }) => {
      const next = Math.min(Number(vehicle.fuel_capacity), Number(vehicle.current_fuel) + liters);
      const { error: e1 } = await supabase.from("vehicles").update({ current_fuel: next }).eq("id", vehicle.id);
      if (e1) throw e1;
      const { error: e2 } = await supabase.from("fuel_logs").insert({
        vehicle_id: vehicle.id, family_id: currentFamily!.id, liters, cost, logged_by: user!.id,
      });
      if (e2) throw e2;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vehicles", currentFamily?.id] });
      toast.success("Refill logged");
    },
  });

  const useMut = useMutation({
    mutationFn: async ({ vehicle, liters }: { vehicle: any; liters: number }) => {
      const next = Math.max(0, Number(vehicle.current_fuel) - liters);
      const { error } = await supabase.from("vehicles").update({ current_fuel: next }).eq("id", vehicle.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vehicles", currentFamily?.id] }),
  });

  if (!currentFamily) return <p className="text-center text-muted-foreground py-12">Select a family first.</p>;

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Fuel Tracking</h1>
          <p className="text-sm text-muted-foreground">Manage your family vehicles and fuel.</p>
        </div>
        <AddVehicleDialog />
      </div>

      {isLoading ? <Loader /> : (vehicles ?? []).length === 0 ? (
        <div className="glass rounded-3xl p-12 text-center">
          <Fuel className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No vehicles yet. Add bikes, cars or anything that needs fuel.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {vehicles!.map((v) => {
            const pct = Math.round((Number(v.current_fuel) / Number(v.fuel_capacity)) * 100);
            const low = Number(v.current_fuel) <= Number(v.low_fuel_threshold);
            return (
              <div key={v.id} className="glass rounded-3xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-display font-semibold text-lg flex items-center gap-2">
                      <Fuel className="h-5 w-5 text-primary" /> {v.name}
                    </h3>
                    <p className="text-xs text-muted-foreground capitalize">{v.vehicle_type}</p>
                  </div>
                  <span className={`text-2xl font-display font-bold ${low ? "text-destructive" : "text-foreground"}`}>{Number(v.current_fuel)} L</span>
                </div>
                <div className="mt-4 h-3 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full transition-all ${low ? "bg-destructive" : "gradient-hero"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{pct}% of {Number(v.fuel_capacity)} L capacity</p>
                <div className="mt-4 flex gap-2">
                  <RefillButton vehicle={v} onRefill={(l, c) => refillMut.mutate({ vehicle: v, liters: l, cost: c })} />
                  <Button variant="outline" size="sm" className="rounded-xl" onClick={() => useMut.mutate({ vehicle: v, liters: 1 })}>
                    <Droplet className="h-3 w-3 mr-1" /> Use 1L
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AddVehicleDialog() {
  const { currentFamily } = useCurrentFamily();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("bike");
  const [capacity, setCapacity] = useState("12");
  const [threshold, setThreshold] = useState("2");

  const addMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("vehicles").insert({
        family_id: currentFamily!.id, name, vehicle_type: type,
        fuel_capacity: Number(capacity), low_fuel_threshold: Number(threshold), current_fuel: 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vehicles", currentFamily?.id] });
      setOpen(false); setName(""); toast.success("Vehicle added");
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button className="rounded-xl gradient-hero text-white"><Plus className="h-4 w-4 mr-1" /> Add vehicle</Button></DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add vehicle</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Bike 1" className="mt-1 rounded-xl" /></div>
          <div>
            <Label>Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bike">Bike</SelectItem>
                <SelectItem value="car">Car</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Capacity (L)</Label><Input type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} className="mt-1 rounded-xl" /></div>
            <div><Label>Low fuel at (L)</Label><Input type="number" value={threshold} onChange={(e) => setThreshold(e.target.value)} className="mt-1 rounded-xl" /></div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => addMut.mutate()} disabled={!name.trim()} className="rounded-xl gradient-hero text-white">Add vehicle</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RefillButton({ vehicle, onRefill }: { vehicle: any; onRefill: (l: number, c: number) => void }) {
  const [open, setOpen] = useState(false);
  const [liters, setLiters] = useState("5");
  const [cost, setCost] = useState("");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" className="rounded-xl gradient-hero text-white"><Plus className="h-3 w-3 mr-1" /> Refill</Button></DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Refill {vehicle.name}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Liters</Label><Input type="number" step="0.1" value={liters} onChange={(e) => setLiters(e.target.value)} className="mt-1 rounded-xl" /></div>
          <div><Label>Cost (PKR)</Label><Input type="number" value={cost} onChange={(e) => setCost(e.target.value)} className="mt-1 rounded-xl" /></div>
        </div>
        <DialogFooter>
          <Button className="rounded-xl gradient-hero text-white" onClick={() => { onRefill(Number(liters), Number(cost || 0)); setOpen(false); }}>Log refill</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
