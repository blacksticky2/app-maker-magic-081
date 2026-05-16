import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Fuel, ListChecks, MessageSquare, Package, Sparkles, Trophy, Users, ArrowRight, Shield, Heart } from "lucide-react";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import heroFamily from "@/assets/hero-family.jpg";
import iconHome from "@/assets/icon-home.png";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  component: Landing,
});

const FEATURES = [
  { icon: Package, title: "Smart Inventory", desc: "Track groceries, household items, expiry dates and low-stock alerts.", color: "from-teal-400 to-cyan-500" },
  { icon: Fuel, title: "Fuel Tracker", desc: "Bike, car and custom vehicles with refill history and cost charts.", color: "from-orange-400 to-rose-500" },
  { icon: ListChecks, title: "Gamified Chores", desc: "Post chores, accept tasks, upload proof, earn points.", color: "from-emerald-400 to-teal-500" },
  { icon: Trophy, title: "Rewards", desc: "Convert points to PKR with admin-configurable rates.", color: "from-amber-400 to-orange-500" },
  { icon: MessageSquare, title: "Family Chat & DMs", desc: "Realtime group chat plus private messages.", color: "from-fuchsia-400 to-pink-500" },
  { icon: Bell, title: "Live Notifications", desc: "Instant alerts for low stock, chore requests, and more.", color: "from-sky-400 to-indigo-500" },
];

function Landing() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      <AnimatedBackground variant="hero" />

      <header className="px-6 py-5 flex items-center justify-between max-w-7xl mx-auto relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-2xl gradient-hero grid place-items-center text-white font-display font-bold shadow-lg animate-pulse-glow">F</div>
          <span className="font-display font-bold text-xl">FamilyHub</span>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/auth" className="px-4 py-2 text-sm font-medium hover:text-primary transition-colors">Sign in</Link>
          <Link to="/auth" search={{ mode: "signup" }} className="shine px-5 py-2.5 rounded-xl gradient-hero text-white text-sm font-semibold shadow-lg hover-lift">
            Get started
          </Link>
        </div>
      </header>

      <section className="px-6 pt-10 pb-16 max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center relative z-10">
        <div className="text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-strong text-xs font-medium mb-6 animate-fade-up">
            <Sparkles className="h-3 w-3 text-accent" /> Built with love for Pakistani families
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-display font-bold leading-[1.05] animate-fade-up">
            One hub for your <span className="text-gradient">whole family</span>.
          </h1>
          <p className="mt-6 max-w-xl mx-auto lg:mx-0 text-lg text-muted-foreground animate-fade-up">
            Manage groceries, fuel, chores, rewards and chat in one beautifully designed space. Real-time. Private. Yours.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-3 animate-fade-up">
            <Link to="/auth" search={{ mode: "signup" }} className="shine group px-7 py-3.5 rounded-2xl gradient-hero text-white font-semibold shadow-xl hover-lift inline-flex items-center gap-2">
              Create your family
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link to="/auth" className="px-7 py-3.5 rounded-2xl glass-strong font-semibold hover-lift">
              I already have an account
            </Link>
          </div>
          <div className="mt-8 flex items-center justify-center lg:justify-start gap-6 text-xs text-muted-foreground animate-fade-up">
            <span className="inline-flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-primary" /> End-to-end private</span>
            <span className="inline-flex items-center gap-1.5"><Heart className="h-3.5 w-3.5 text-accent" /> Free forever</span>
          </div>
        </div>

        <div className="relative animate-fade-up" style={{ animationDelay: "120ms" }}>
          <div className="absolute -inset-6 gradient-hero blur-3xl opacity-30 rounded-[3rem]" />
          <div className="relative glass-strong rounded-[2.5rem] p-3 hover-lift">
            <img
              src={heroFamily}
              alt="Happy Pakistani family"
              width={1280}
              height={960}
              className="rounded-[2rem] w-full h-auto"
            />
          </div>
          <img
            src={iconHome}
            alt=""
            width={120}
            height={120}
            className="absolute -bottom-8 -left-8 w-28 h-28 animate-float drop-shadow-2xl hidden md:block"
          />
          <div className="absolute -top-4 -right-4 glass-strong rounded-2xl px-4 py-3 animate-float" style={{ animationDelay: "1.2s" }}>
            <div className="text-xs text-muted-foreground">Today's points</div>
            <div className="font-display font-bold text-2xl text-gradient">+240</div>
          </div>
        </div>
      </section>

      <section className="px-6 pb-24 max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-10 animate-fade-up">
          <h2 className="font-display text-3xl md:text-4xl font-bold">Everything your family needs</h2>
          <p className="text-muted-foreground mt-2">Six powerful tools woven into one delightful experience.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className="group glass-strong rounded-3xl p-6 hover-lift animate-fade-up relative overflow-hidden"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br ${f.color} opacity-20 blur-2xl group-hover:opacity-40 transition-opacity`} />
              <div className={`relative w-12 h-12 rounded-2xl bg-gradient-to-br ${f.color} grid place-items-center text-white mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-display font-semibold text-lg relative">{f.title}</h3>
              <p className="text-sm text-muted-foreground mt-1 relative">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 pb-24 max-w-5xl mx-auto relative z-10">
        <div className="glass-strong rounded-[2.5rem] p-10 md:p-14 text-center relative overflow-hidden">
          <div className="absolute inset-0 gradient-hero opacity-10" />
          <div className="relative">
            <h2 className="font-display text-3xl md:text-5xl font-bold">Ready to bring your family together?</h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">Free to start. No credit card. Built in Pakistan with care.</p>
            <Link to="/auth" search={{ mode: "signup" }} className="shine inline-flex items-center gap-2 mt-7 px-8 py-4 rounded-2xl gradient-hero text-white font-semibold shadow-2xl hover-lift">
              Join FamilyHub <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="px-6 py-8 text-center text-sm text-muted-foreground border-t border-border/40 relative z-10">
        <div className="flex items-center justify-center gap-2">
          <Users className="h-4 w-4" />
          <span>FamilyHub · Crafted with care</span>
        </div>
      </footer>
    </div>
  );
}
