import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/grocery")({
  component: () => (
    <div className="max-w-3xl mx-auto text-center py-16">
      <h1 className="font-display text-3xl font-bold">Grocery Stock</h1>
      <p className="text-muted-foreground mt-2">Your grocery stock lives in your main inventory. Filter by grocery categories there.</p>
      <Link to="/inventory" className="inline-block mt-6 px-6 py-3 rounded-xl gradient-hero text-white font-semibold hover-lift">
        Open inventory
      </Link>
    </div>
  ),
});
