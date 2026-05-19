import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";

type Status = "online" | "idle" | "offline";
type Ctx = {
  presence: Map<string, Status>;
  myStatus: Status;
  setMyStatus: (s: Status) => void;
};

const PresCtx = createContext<Ctx | null>(null);

const IDLE_MS = 5 * 60 * 1000;
const HEARTBEAT_MS = 30 * 1000;

export function PresenceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [presence, setPresence] = useState<Map<string, Status>>(new Map());
  const [myStatus, setMyStatusState] = useState<Status>("online");

  const beat = useCallback(async (status: Status) => {
    if (!user) return;
    await supabase.rpc("update_presence", { _status: status });
  }, [user]);

  // Heartbeat
  useEffect(() => {
    if (!user) return;
    beat(myStatus);
    const id = setInterval(() => beat(myStatus), HEARTBEAT_MS);
    const onBeforeUnload = () => { void supabase.rpc("update_presence", { _status: "offline" }); };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => { clearInterval(id); window.removeEventListener("beforeunload", onBeforeUnload); };
  }, [user, myStatus, beat]);

  // Idle detection
  useEffect(() => {
    if (!user) return;
    let last = Date.now();
    const bump = () => { last = Date.now(); if (myStatus === "idle") setMyStatusState("online"); };
    const events = ["mousemove", "keydown", "touchstart", "scroll"];
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    const id = setInterval(() => {
      if (Date.now() - last > IDLE_MS && myStatus === "online") setMyStatusState("idle");
    }, 30_000);
    return () => { events.forEach((e) => window.removeEventListener(e, bump)); clearInterval(id); };
  }, [user, myStatus]);

  // Realtime: listen to all profile updates (status changes)
  useEffect(() => {
    if (!user) return;
    const chan = supabase
      .channel("profiles-presence")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" }, (payload: any) => {
        const p = payload.new;
        if (!p?.id) return;
        const status = computeStatus(p.status, p.last_seen_at);
        setPresence((prev) => {
          const next = new Map(prev);
          next.set(p.id, status);
          return next;
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(chan); };
  }, [user]);

  const setMyStatus = (s: Status) => setMyStatusState(s);

  return <PresCtx.Provider value={{ presence, myStatus, setMyStatus }}>{children}</PresCtx.Provider>;
}

export function computeStatus(status: string | null | undefined, lastSeenAt: string | null | undefined): Status {
  if (!lastSeenAt) return "offline";
  const ageMs = Date.now() - new Date(lastSeenAt).getTime();
  if (ageMs > 2 * HEARTBEAT_MS + 15_000) return "offline";
  if (status === "idle") return "idle";
  return "online";
}

export const usePresence = () => {
  const ctx = useContext(PresCtx);
  if (!ctx) throw new Error("usePresence must be used within PresenceProvider");
  return ctx;
};

/** Lazy presence map for a list of user ids — fetches profiles + falls back to last_seen */
export function useUserPresence(userIds: string[]) {
  const { presence } = usePresence();
  const [seed, setSeed] = useState<Map<string, Status>>(new Map());

  useEffect(() => {
    if (userIds.length === 0) return;
    const missing = userIds.filter((id) => !presence.has(id) && !seed.has(id));
    if (missing.length === 0) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, status, last_seen_at")
        .in("id", missing);
      const next = new Map(seed);
      (data ?? []).forEach((p: any) => next.set(p.id, computeStatus(p.status, p.last_seen_at)));
      setSeed(next);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userIds.join(",")]);

  return (id: string): Status => presence.get(id) ?? seed.get(id) ?? "offline";
}
