import { useCallback, useRef, useState } from "react";
import Cropper from "react-easy-crop";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Camera, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

async function getCroppedBlob(src: string, area: { x: number; y: number; width: number; height: number }): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
  const size = 512;
  const c = document.createElement("canvas");
  c.width = size; c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, size, size);
  return new Promise((res) => c.toBlob((b) => res(b!), "image/jpeg", 0.9));
}

export function AvatarUploader({ children }: { children?: React.ReactNode }) {
  const { user, profile, refreshProfile } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<any>(null);
  const [uploading, setUploading] = useState(false);

  const onComplete = useCallback((_: any, pixels: any) => setArea(pixels), []);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 8 * 1024 * 1024) { toast.error("Max 8MB"); return; }
    const r = new FileReader();
    r.onload = () => setSrc(r.result as string);
    r.readAsDataURL(f);
  };

  const upload = async () => {
    if (!src || !area || !user) return;
    setUploading(true);
    try {
      const blob = await getCroppedBlob(src, area);
      const path = `${user.id}/avatar-${Date.now()}.jpg`;
      const { error } = await supabase.storage.from("avatars").upload(path, blob, { contentType: "image/jpeg", upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      const { error: upErr } = await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", user.id);
      if (upErr) throw upErr;
      await refreshProfile();
      toast.success("Profile picture updated");
      setSrc(null);
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleFile} />
      <button onClick={() => fileRef.current?.click()} className="group relative inline-flex">
        {children ?? (
          <div className="h-24 w-24 rounded-full overflow-hidden gradient-hero grid place-items-center text-white font-display font-bold text-3xl ring-4 ring-background shadow-xl">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              profile?.username?.[0]?.toUpperCase()
            )}
          </div>
        )}
        <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition grid place-items-center">
          <Camera className="h-6 w-6 text-white" />
        </div>
      </button>

      <Dialog open={!!src} onOpenChange={(o) => !o && setSrc(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Crop your picture</DialogTitle></DialogHeader>
          <div className="relative h-72 w-full bg-muted rounded-xl overflow-hidden">
            {src && (
              <Cropper image={src} crop={crop} zoom={zoom} aspect={1} cropShape="round" showGrid={false}
                onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onComplete} />
            )}
          </div>
          <div className="px-1">
            <p className="text-xs text-muted-foreground mb-2">Zoom</p>
            <Slider value={[zoom]} min={1} max={3} step={0.05} onValueChange={(v) => setZoom(v[0])} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSrc(null)} disabled={uploading}>Cancel</Button>
            <Button onClick={upload} disabled={uploading} className="gradient-hero text-white">
              {uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading…</> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
