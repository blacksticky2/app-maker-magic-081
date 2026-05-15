import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentFamily } from "@/hooks/use-current-family";
import { useAuth } from "@/hooks/use-auth";
import { Loader } from "@/components/Loader";
import { Package, Fuel, ListChecks, Bell, AlertTriangle, Trophy } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function StatCard({ icon: Icon, label, value, href, color }: { icon: typeof Package; label: string; value: string; href: string; color: string }) {
  return (
    <Link to={href} className="glass rounded-3xl p-5 hover-lift block">
      <div className={`w-11 h-11 rounded-xl grid place-items-center text-white mb-3 ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-2xl font-display font-bold">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </Link>
  );
}

function Dashboard() {
  const { currentFamily, families, loading } = useCurrentFamily();
  const { profile } = useAuth();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats", currentFamily?.id],
    enabled: !!currentFamily,
    queryFn: async () => {
      const fid = currentFamily!.id;
      const [inv, lowStock, chores, notif, vehicles] = await Promise.all([
        supabase.from("inventory_items").select("id", { count: "exact", head: true }).eq("family_id", fid),
        supabase.from("inventory_items").select("id, name, quantity, low_stock_threshold, unit").eq("family_id", fid),
        supabase.from("chores").select("id, title, points, status").eq("family_id", fid).in("status", ["open", "submitted"]),
        supabase.from("notifications").select("id", { count: "exact", head: true }).eq("read", false),
        supabase.from("vehicles").select("id, name, current_fuel, fuel_capacity, low_fuel_threshold").eq("family_id", fid),
      ]);
      const lowItems = (lowStock.data ?? []).filter((i) => Number(i.quantity) <= Number(i.low_stock_threshold));
      const lowFuelV = (vehicles.data ?? []).filter((v) => Number(v.current_fuel) <= Number(v.low_fuel_threshold));
      return {
        inventoryCount: inv.count ?? 0,
        lowStockCount: lowItems.length,
        lowStockItems: lowItems.slice(0, 4),
        choresOpen: chores.data?.length ?? 0,
        unread: notif.count ?? 0,
        lowFuel: lowFuelV,
      };
    },
  });

  if (loading) return <Loader />;

  if (!currentFamily) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <div className="w-20 h-20 rounded-3xl gradient-hero grid place-items-center text-white text-3xl mx-auto mb-6">👨‍👩‍👧</div>
        <h1 className="font-display text-3xl font-bold">Welcome{profile?.username ? `, @${profile.username}` : ""}!</h1>
        <p className="text-muted-foreground mt-2">Create your first family or accept an invite to get started.</p>
        <div className="flex gap-3 justify-center mt-6">
          <Link to="/family" className="px-6 py-3 rounded-xl gradient-hero text-white font-semibold hover-lift">Create a family</Link>
          <Link to="/notifications" className="px-6 py-3 rounded-xl glass font-semibold hover-lift">Check invites</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <p className="text-sm text-muted-foreground">Welcome back</p>
        <h1 className="font-display text-3xl md:text-4xl font-bold">{currentFamily.name}</h1>
      </div>

      {isLoading ? <Loader /> : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon={Package} label="Inventory items" value={String(stats?.inventoryCount ?? 0)} href="/inventory" color="bg-primary" />
            <StatCard icon={AlertTriangle} label="Low stock" value={String(stats?.lowStockCount ?? 0)} href="/inventory" color="bg-accent" />
            <StatCard icon={ListChecks} label="Open chores" value={String(stats?.choresOpen ?? 0)} href="/chores" color="bg-success" />
            <StatCard icon={Bell} label="Unread alerts" value={String(stats?.unread ?? 0)} href="/notifications" color="bg-warning" />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="glass rounded-3xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-semibold">Low stock alerts</h2>
                <Link to="/inventory" className="text-xs text-primary">View all</Link>
              </div>
              {stats?.lowStockItems.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">Everything looks stocked up 🎉</p>
              ) : (
                <ul className="space-y-2">
                  {stats?.lowStockItems.map((i) => (
                    <li key={i.id} className="flex items-center justify-between rounded-xl px-3 py-2 bg-accent/10">
                      <span className="font-medium">{i.name}</span>
                      <span className="text-sm text-muted-foreground">{Number(i.quantity)} {i.unit}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="glass rounded-3xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-semibold">Fuel status</h2>
                <Link to="/fuel" className="text-xs text-primary">Manage</Link>
              </div>
              {(stats?.lowFuel ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">All vehicles have enough fuel ⛽</p>
              ) : (
                <ul className="space-y-2">
                  {stats?.lowFuel.map((v) => (
                    <li key={v.id} className="flex items-center justify-between rounded-xl px-3 py-2 bg-destructive/10">
                      <span className="font-medium flex items-center gap-2"><Fuel className="h-4 w-4" /> {v.name}</span>
                      <span className="text-sm text-destructive font-semibold">{Number(v.current_fuel)} L</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="glass rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold flex items-center gap-2"><Trophy className="h-5 w-5 text-accent" /> Your points</h2>
              <Link to="/rewards" className="text-xs text-primary">Rewards</Link>
            </div>
            <div className="flex items-end gap-3">
              <span className="text-5xl font-display font-bold text-gradient">{profile?.points ?? 0}</span>
              <span className="text-muted-foreground mb-2">pts · {profile?.completed_chores ?? 0} chores done</span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Belongs to {families.length} {families.length === 1 ? "family" : "families"}
          </p>
        </>
      )}
    </div>
  );
}
