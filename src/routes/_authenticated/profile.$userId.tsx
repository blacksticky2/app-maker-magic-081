import { createFileRoute, useParams, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Loader } from "@/components/Loader";
import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { Trophy, CheckCircle2, MessageCircle, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile/$userId")({
  component: UserProfilePage,
});

function UserProfilePage() {
  const { userId } = useParams({ from: "/_authenticated/profile/$userId" });
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMe = user?.id === userId;

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile-view", userId],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      return data;
    },
  });

  if (isLoading) return <Loader />;
  if (!profile) return <p className="text-center text-muted-foreground py-12">User not found.</p>;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <Button variant="ghost" size="sm" onClick={() => navigate({ to: ".." as any })}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Back
      </Button>
      <div className="glass rounded-3xl p-8 text-center gradient-soft">
        <div className="flex justify-center">
          <UserAvatar userId={profile.id} username={profile.username} avatarUrl={profile.avatar_url} size="xl" />
        </div>
        <h1 className="font-display text-3xl font-bold mt-4">@{profile.username}</h1>
        {isMe && <p className="text-xs text-muted-foreground mt-1">This is you</p>}
        {!isMe && (
          <Button asChild className="mt-4 gradient-hero text-white">
            <Link to="/dm/$userId" params={{ userId: profile.id }}>
              <MessageCircle className="h-4 w-4 mr-2" />Send Message
            </Link>
          </Button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="glass rounded-2xl p-4 text-center">
          <Trophy className="h-5 w-5 mx-auto text-accent mb-1" />
          <div className="font-display font-bold text-2xl">{profile.points}</div>
          <div className="text-xs text-muted-foreground">Points</div>
        </div>
        <div className="glass rounded-2xl p-4 text-center">
          <CheckCircle2 className="h-5 w-5 mx-auto text-success mb-1" />
          <div className="font-display font-bold text-2xl">{profile.completed_chores}</div>
          <div className="text-xs text-muted-foreground">Chores done</div>
        </div>
      </div>
    </div>
  );
}
