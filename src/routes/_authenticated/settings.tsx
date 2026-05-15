import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { LogOut, Moon, Sun, Monitor, Bell } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { signOut, profile } = useAuth();
  const { theme, setTheme } = useTheme();
  const [sound, setSound] = useState(true);
  const [push, setPush] = useState(false);

  const enablePush = async () => {
    if (!("Notification" in window)) return;
    const p = await Notification.requestPermission();
    setPush(p === "granted");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="font-display text-3xl font-bold">Settings</h1>

      <section className="glass rounded-3xl p-6 space-y-4">
        <h2 className="font-display font-semibold">Appearance</h2>
        <div>
          <Label>Theme</Label>
          <Select value={theme} onValueChange={(v) => setTheme(v as any)}>
            <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="light"><div className="flex items-center gap-2"><Sun className="h-4 w-4" /> Light</div></SelectItem>
              <SelectItem value="dark"><div className="flex items-center gap-2"><Moon className="h-4 w-4" /> Dark</div></SelectItem>
              <SelectItem value="system"><div className="flex items-center gap-2"><Monitor className="h-4 w-4" /> System</div></SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      <section className="glass rounded-3xl p-6 space-y-4">
        <h2 className="font-display font-semibold">Notifications</h2>
        <div className="flex items-center justify-between">
          <div>
            <Label>Notification sounds</Label>
            <p className="text-xs text-muted-foreground">Play a sound for new alerts in-app.</p>
          </div>
          <Switch checked={sound} onCheckedChange={setSound} />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label>Browser push</Label>
            <p className="text-xs text-muted-foreground">Receive notifications even when the tab is closed.</p>
          </div>
          {push ? <span className="text-xs text-success font-semibold">Enabled</span> : (
            <Button size="sm" variant="outline" className="rounded-xl" onClick={enablePush}><Bell className="h-3 w-3 mr-1" /> Enable</Button>
          )}
        </div>
      </section>

      <section className="glass rounded-3xl p-6 space-y-2">
        <h2 className="font-display font-semibold">Account</h2>
        <p className="text-sm text-muted-foreground">Signed in as <strong>@{profile?.username}</strong></p>
        <Button variant="outline" className="rounded-xl" onClick={signOut}><LogOut className="h-4 w-4 mr-2" /> Sign out</Button>
      </section>
    </div>
  );
}
