import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { Loader } from "@/components/Loader";
import { UserAvatar } from "@/components/UserAvatar";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dm/$userId")({
  component: DMConversation,
});

async function getOrCreateDM(meId: string, otherId: string): Promise<string> {
  // find existing dm where both are members
  const { data: mine } = await supabase
    .from("conversation_members")
    .select("conversation_id, conversation:conversations!inner(type, family_id)")
    .eq("user_id", meId);
  const myDmIds = (mine ?? []).filter((r: any) => r.conversation?.type === "dm").map((r: any) => r.conversation_id as string);
  if (myDmIds.length) {
    const { data: their } = await supabase
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", otherId)
      .in("conversation_id", myDmIds);
    const match = (their ?? [])[0]?.conversation_id;
    if (match) return match;
  }
  const { data: c, error } = await supabase.from("conversations").insert({ type: "dm" }).select("id").single();
  if (error) throw error;
  await supabase.from("conversation_members").insert([
    { conversation_id: c.id, user_id: meId },
    { conversation_id: c.id, user_id: otherId },
  ]);
  return c.id as string;
}

function DMConversation() {
  const { userId } = useParams({ from: "/_authenticated/dm/$userId" });
  const { user } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const { data: other } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, username, avatar_url").eq("id", userId).maybeSingle();
      return data;
    },
  });

  const { data: me } = useQuery({
    queryKey: ["profile-me-mini", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("avatar_url, username").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  const { data: convId } = useQuery({
    queryKey: ["dm-conv", user?.id, userId],
    enabled: !!user,
    queryFn: () => getOrCreateDM(user!.id, userId),
  });

  const { data: messages, isLoading } = useQuery({
    queryKey: ["dm-messages", convId],
    enabled: !!convId,
    queryFn: async () => {
      const { data } = await supabase.from("messages").select("*").eq("conversation_id", convId!).order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!convId) return;
    const ch = supabase
      .channel(`dm:${convId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${convId}` }, () => {
        qc.invalidateQueries({ queryKey: ["dm-messages", convId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [convId, qc]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages?.length]);

  const sendMut = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase.from("messages").insert({ conversation_id: convId!, sender_id: user!.id, content });
      if (error) throw error;
    },
    onSuccess: () => setText(""),
  });

  return (
    <div className="max-w-2xl mx-auto h-[calc(100vh-12rem)] flex flex-col glass rounded-3xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border/40">
        <h1 className="font-display font-semibold">@{other?.username ?? "…"}</h1>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {isLoading ? <Loader /> : (messages ?? []).map((m: any) => {
          const mine = m.sender_id === user!.id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"} animate-fade-up`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${mine ? "gradient-hero text-white" : "bg-muted"}`}>
                <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); if (text.trim() && convId) sendMut.mutate(text.trim()); }} className="border-t border-border/40 p-3 flex gap-2">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message…" className="rounded-xl" />
        <Button type="submit" size="icon" className="rounded-xl gradient-hero text-white" disabled={!text.trim()}><Send className="h-4 w-4" /></Button>
      </form>
    </div>
  );
}
