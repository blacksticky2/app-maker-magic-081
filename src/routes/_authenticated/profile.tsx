import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentFamily } from "@/hooks/use-current-family";
import { Trophy, CheckCircle2, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { profile } = useAuth();
  const { families } = useCurrentFamily();
  if (!profile) return null;
  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="glass rounded-3xl p-8 text-center gradient-soft">
        <div className="h-24 w-24 mx-auto rounded-full bg-background grid place-items-center font-display font-bold text-3xl text-gradient">
          {profile.username[0]?.toUpperCase()}
        </div>
        <h1 className="font-display text-3xl font-bold mt-4">@{profile.username}</h1>
        <p className="text-sm text-muted-foreground">{profile.email}</p>
      </div>
      <div className="grid grid-cols-3 gap-3">
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
        <div className="glass rounded-2xl p-4 text-center">
          <Users className="h-5 w-5 mx-auto text-primary mb-1" />
          <div className="font-display font-bold text-2xl">{families.length}</div>
          <div className="text-xs text-muted-foreground">Families</div>
        </div>
      </div>
    </div>
  );
}
