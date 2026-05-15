import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentFamily } from "@/hooks/use-current-family";
import { useAuth } from "@/hooks/use-auth";
import { Loader } from "@/components/Loader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

export const Route = createFileRoute("/_authenticated/chat")({
  component: ChatPage,
});

function ChatPage() {
  const { currentFamily } = useCurrentFamily();
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const { data: conv } = useQuery({
    queryKey: ["family-conv", currentFamily?.id],
    enabled: !!currentFamily,
    queryFn: async () => {
      const { data } = await supabase.from("conversations").select("*").eq("family_id", currentFamily!.id).eq("type", "family").maybeSingle();
      return data;
    },
  });

  const { data: messages, isLoading } = useQuery({
    queryKey: ["messages", conv?.id],
    enabled: !!conv,
    queryFn: async () => {
      const { data } = await supabase
        .from("messages")
        .select("*, sender:profiles!messages_sender_id_fkey(username, avatar_url)")
        .eq("conversation_id", conv!.id)
        .order("created_at", { ascending: true })
        .limit(200);
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!conv) return;
    const ch = supabase
      .channel(`messages:${conv.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conv.id}` }, () => {
        qc.invalidateQueries({ queryKey: ["messages", conv.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [conv, qc]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages?.length]);

  const sendMut = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase.from("messages").insert({
        conversation_id: conv!.id, sender_id: user!.id, content,
      });
      if (error) throw error;
    },
    onSuccess: () => setText(""),
  });

  if (!currentFamily) return <p className="text-center text-muted-foreground py-12">Select a family first.</p>;

  return (
    <div className="max-w-3xl mx-auto h-[calc(100vh-12rem)] flex flex-col glass rounded-3xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border/40">
        <h1 className="font-display font-semibold">{currentFamily.name} · Family Chat</h1>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {isLoading ? <Loader /> : (messages ?? []).map((m: any) => {
          const mine = m.sender_id === user!.id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"} animate-fade-up`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${mine ? "gradient-hero text-white" : "bg-muted"}`}>
                {!mine && <p className="text-[10px] font-semibold opacity-70 mb-0.5">@{m.sender?.username}</p>}
                <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); if (text.trim()) sendMut.mutate(text.trim()); }} className="border-t border-border/40 p-3 flex gap-2">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder={`Message as @${profile?.username}…`} className="rounded-xl" />
        <Button type="submit" size="icon" className="rounded-xl gradient-hero text-white" disabled={!text.trim()}><Send className="h-4 w-4" /></Button>
      </form>
    </div>
  );
}
