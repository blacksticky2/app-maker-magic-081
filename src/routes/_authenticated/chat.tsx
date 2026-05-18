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
import { ChatTabs } from "@/components/ChatTabs";
import { UserAvatar } from "@/components/UserAvatar";
import { MembersDialog } from "@/components/MembersDialog";
import { ChatImageButton } from "@/components/ChatImageButton";

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
        .select("*, sender:profiles!messages_sender_profile_fkey(username, avatar_url)")
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
    mutationFn: async ({ content, imageUrl }: { content?: string; imageUrl?: string }) => {
      const { error } = await supabase.from("messages").insert({
        conversation_id: conv!.id, sender_id: user!.id,
        content: content ?? null, image_url: imageUrl ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => setText(""),
  });

  if (!currentFamily) return (
    <div><ChatTabs /><p className="text-center text-muted-foreground py-12">Select a family first.</p></div>
  );

  return (
    <div>
      <ChatTabs />
      <div className="max-w-3xl mx-auto h-[calc(100vh-16rem)] flex flex-col glass rounded-3xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border/40 flex items-center justify-between gap-2">
          <h1 className="font-display font-semibold truncate">{currentFamily.name} · Family Chat</h1>
          <MembersDialog familyId={currentFamily.id} />
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {isLoading ? <Loader /> : (messages ?? []).map((m: any) => {
            const mine = m.sender_id === user!.id;
            return (
              <div key={m.id} className={`flex gap-2 ${mine ? "justify-end" : "justify-start"} animate-fade-up`}>
                {!mine && (
                  <UserAvatar userId={m.sender_id} username={m.sender?.username} avatarUrl={m.sender?.avatar_url} size="sm" linkToProfile />
                )}
                <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${mine ? "gradient-hero text-white" : "bg-muted"}`}>
                  {!mine && <p className="text-[10px] font-semibold opacity-70 mb-0.5">@{m.sender?.username}</p>}
                  {m.image_url && (
                    <a href={m.image_url} target="_blank" rel="noreferrer">
                      <img src={m.image_url} alt="" className="rounded-xl max-h-64 object-cover mb-1" loading="lazy" />
                    </a>
                  )}
                  {m.content && <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>}
                </div>
                {mine && (
                  <UserAvatar userId={m.sender_id} username={m.sender?.username} avatarUrl={m.sender?.avatar_url} size="sm" />
                )}
              </div>
            );
          })}
          <div ref={endRef} />
        </div>
        <form onSubmit={(e) => { e.preventDefault(); if (text.trim()) sendMut.mutate({ content: text.trim() }); }} className="border-t border-border/40 p-3 flex gap-2">
          <ChatImageButton onUploaded={(url) => sendMut.mutate({ imageUrl: url })} />
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder={`Message as @${profile?.username}…`} className="rounded-xl" />
          <Button type="submit" size="icon" className="rounded-xl gradient-hero text-white" disabled={!text.trim()}><Send className="h-4 w-4" /></Button>
        </form>
      </div>
    </div>
  );
}
