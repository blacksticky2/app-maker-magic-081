import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";

export type Family = { id: string; name: string; avatar_url: string | null; banner_url: string | null; created_by: string };
type FamilyMember = { family: Family; role: string; custom_role_name: string | null; is_admin: boolean };

type Ctx = {
  families: FamilyMember[];
  currentFamily: Family | null;
  isAdmin: boolean;
  setCurrentFamilyId: (id: string) => void;
  refresh: () => Promise<void>;
  loading: boolean;
};

const FamCtx = createContext<Ctx | null>(null);

export function FamilyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [families, setFamilies] = useState<FamilyMember[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) {
      setFamilies([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("family_members")
      .select("role, custom_role_name, is_admin, family:families(id, name, avatar_url, banner_url, created_by)")
      .eq("user_id", user.id);
    const list = ((data as unknown as FamilyMember[]) || []).filter((m) => m.family);
    setFamilies(list);
    const stored = typeof window !== "undefined" ? localStorage.getItem("currentFamilyId") : null;
    const pick = list.find((f) => f.family.id === stored)?.family.id ?? list[0]?.family.id ?? null;
    setCurrentId(pick);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const setCurrentFamilyId = (id: string) => {
    localStorage.setItem("currentFamilyId", id);
    setCurrentId(id);
  };

  const current = families.find((f) => f.family.id === currentId);
  const value: Ctx = {
    families,
    currentFamily: current?.family ?? null,
    isAdmin: !!current?.is_admin,
    setCurrentFamilyId,
    refresh: load,
    loading,
  };
  return <FamCtx.Provider value={value}>{children}</FamCtx.Provider>;
}

export const useCurrentFamily = () => {
  const ctx = useContext(FamCtx);
  if (!ctx) throw new Error("useCurrentFamily must be used within FamilyProvider");
  return ctx;
};
