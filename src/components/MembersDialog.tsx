import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { UserAvatar } from "@/components/UserAvatar";
import { MessageCircle, User as UserIcon, Users } from "lucide-react";
import { useState, type ReactNode } from "react";

export function MembersDialog({ familyId, trigger }: { familyId: string; trigger?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const { data: members } = useQuery({
    queryKey: ["family-members-mini", familyId],
    enabled: open && !!familyId,
    queryFn: async () => {
      const { data } = await supabase
        .from("family_members")
        .select("user_id, role, custom_role_name, is_admin, user:profiles!family_members_user_profile_fkey(id, username, avatar_url)")
        .eq("family_id", familyId);
      return data ?? [];
    },
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="sm" className="rounded-xl">
            <Users className="h-4 w-4 mr-1" /> Members
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Family members</DialogTitle></DialogHeader>
        <ul className="space-y-2 max-h-[60vh] overflow-y-auto">
          {(members ?? []).map((m: any) => {
            const isMe = m.user_id === user?.id;
            return (
              <li key={m.user_id} className="flex items-center gap-3 p-2 rounded-2xl bg-muted/40">
                <UserAvatar userId={m.user?.id} username={m.user?.username} avatarUrl={m.user?.avatar_url} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">@{m.user?.username}{isMe && <span className="text-xs text-muted-foreground"> · you</span>}</p>
                  <p className="text-xs text-muted-foreground">{m.role === "Custom" ? (m.custom_role_name ?? "Member") : m.role}</p>
                </div>
                <Button asChild size="icon" variant="ghost" className="h-8 w-8">
                  <Link to="/profile/$userId" params={{ userId: m.user_id }} onClick={() => setOpen(false)}>
                    <UserIcon className="h-4 w-4" />
                  </Link>
                </Button>
                {!isMe && (
                  <Button asChild size="icon" variant="ghost" className="h-8 w-8">
                    <Link to="/dm/$userId" params={{ userId: m.user_id }} onClick={() => setOpen(false)}>
                      <MessageCircle className="h-4 w-4" />
                    </Link>
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
