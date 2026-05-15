import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Fuel, ListChecks, MessageSquare, Package, Sparkles, Trophy, Users } from "lucide-react";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  component: Landing,
});

const FEATURES = [
  { icon: Package, title: "Smart Inventory", desc: "Track groceries, household items, expiry dates and low-stock alerts." },
  { icon: Fuel, title: "Fuel Tracker", desc: "Bike, car and custom vehicles with refill history and cost charts." },
  { icon: ListChecks, title: "Gamified Chores", desc: "Post chores, accept tasks, upload proof, earn points." },
  { icon: Trophy, title: "Rewards", desc: "Convert points to PKR with admin-configurable rates." },
  { icon: MessageSquare, title: "Family Chat & DMs", desc: "Realtime group chat plus private messages." },
  { icon: Bell, title: "Live Notifications", desc: "Instant alerts for low stock, chore requests, and more." },
];

function Landing() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute -top-40 -left-40 w-[32rem] h-[32rem] rounded-full gradient-soft blur-3xl animate-blob" />
        <div className="absolute top-1/3 -right-40 w-[28rem] h-[28rem] rounded-full gradient-soft blur-3xl animate-blob" style={{ animationDelay: "5s" }} />
      </div>

      <header className="px-6 py-5 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl gradient-hero grid place-items-center text-white font-display font-bold">F</div>
          <span className="font-display font-bold text-xl">FamilyHub</span>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/auth" className="px-4 py-2 text-sm font-medium hover:text-primary">Sign in</Link>
          <Link to="/auth" search={{ mode: "signup" }} className="px-5 py-2.5 rounded-xl gradient-hero text-white text-sm font-semibold shadow-md hover-lift">
            Get started
          </Link>
        </div>
      </header>

      <section className="px-6 pt-12 pb-20 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs font-medium mb-6 animate-fade-up">
          <Sparkles className="h-3 w-3 text-accent" /> Built for Pakistani families
        </div>
        <h1 className="text-5xl md:text-7xl font-display font-bold leading-[1.05] animate-fade-up">
          One hub for your <span className="text-gradient">whole family</span>.
        </h1>
        <p className="mt-6 max-w-2xl mx-auto text-lg text-muted-foreground animate-fade-up">
          Manage groceries, fuel, chores, rewards and chat in one beautifully designed space. Real-time. Private. Yours.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 animate-fade-up">
          <Link to="/auth" search={{ mode: "signup" }} className="px-7 py-3 rounded-xl gradient-hero text-white font-semibold shadow-lg hover-lift">
            Create your family
          </Link>
          <Link to="/auth" className="px-7 py-3 rounded-xl glass font-semibold hover-lift">
            I already have an account
          </Link>
        </div>
      </section>

      <section className="px-6 pb-24 max-w-7xl mx-auto">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <div key={f.title} className="glass rounded-3xl p-6 hover-lift animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="w-11 h-11 rounded-xl gradient-hero grid place-items-center text-white mb-4">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-display font-semibold text-lg">{f.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="px-6 py-8 text-center text-sm text-muted-foreground border-t border-border/40">
        <div className="flex items-center justify-center gap-2">
          <Users className="h-4 w-4" />
          <span>FamilyHub · Crafted with care</span>
        </div>
      </footer>
    </div>
  );
}
