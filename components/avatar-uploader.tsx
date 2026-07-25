"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera } from "lucide-react";

export function AvatarUploader({
  userId,
  fullName,
  hasAvatar,
}: {
  userId: number;
  fullName: string;
  hasAvatar: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  // เริ่มที่ 0 เสมอ (ตรงกันทั้ง server/client กัน hydration mismatch)
  // แล้วค่อยเพิ่มหลังอัปโหลดสำเร็จ เพื่อ cache-bust รูปใหม่
  const [cacheBust, setCacheBust] = useState(0);

  async function onPick(file: File | undefined) {
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("avatar", file);
      const res = await fetch("/api/profile/avatar", {
        method: "POST",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "อัปโหลดไม่สำเร็จ");
        setPreview(null);
        return;
      }
      toast.success("อัปเดตรูปโปรไฟล์แล้ว");
      setCacheBust((v) => v + 1);
      router.refresh();
    } catch {
      toast.error("เกิดข้อผิดพลาด");
      setPreview(null);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-full overflow-hidden bg-accent text-accent-foreground flex items-center justify-center text-3xl font-semibold border border-border">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="รูปโปรไฟล์" className="h-full w-full object-cover" />
          ) : hasAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/avatar/${userId}${cacheBust ? `?v=${cacheBust}` : ""}`}
              alt="รูปโปรไฟล์"
              className="h-full w-full object-cover"
            />
          ) : (
            fullName.charAt(0)
          )}
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm hover:opacity-90 disabled:opacity-50"
          title="เปลี่ยนรูปโปรไฟล์"
        >
          <Camera className="size-4" />
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onPick(e.target.files?.[0])}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {uploading ? "กำลังอัปโหลด..." : "แตะไอคอนกล้องเพื่อเปลี่ยนรูป"}
      </p>
    </div>
  );
}
