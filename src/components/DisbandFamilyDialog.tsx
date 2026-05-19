import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Trash2 } from "lucide-react";
import { toast } from "sonner";

export function DisbandFamilyDialog({
  familyId,
  familyName,
  trigger,
  onDeleted,
}: {
  familyId: string;
  familyName: string;
  trigger: React.ReactNode;
  onDeleted?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");

  const del = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("families").delete().eq("id", familyId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Family disbanded");
      setOpen(false);
      onDeleted?.();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setConfirm(""); }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" /> Disband {familyName}?
          </DialogTitle>
          <DialogDescription>
            This permanently deletes the family along with all chats, chores, inventory, vehicles, notifications, and member records.
            <span className="block mt-2 font-medium text-foreground">This cannot be undone.</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Type the family name to confirm:</p>
          <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={familyName} className="rounded-xl" />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="destructive"
            disabled={confirm !== familyName}
            onClick={() => del.mutate()}
          >
            <Trash2 className="h-4 w-4 mr-1" /> Disband forever
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
