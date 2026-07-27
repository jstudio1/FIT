"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ImageIcon, Save } from "lucide-react";
import { savePopupSettingsAction } from "@/app/_actions/owner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function PopupSettingsForm({
  popupEnabled,
  popupTitle,
  popupLinkUrl,
  hasImage,
}: {
  popupEnabled: boolean;
  popupTitle: string | null;
  popupLinkUrl: string | null;
  hasImage: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [cacheBust, setCacheBust] = useState(0);
  const [enabled, setEnabled] = useState(popupEnabled);

  const [state, formAction, pending] = useActionState(savePopupSettingsAction, null);

  useEffect(() => {
    if (state?.success) toast.success(state.success);
    else if (state?.error) toast.error(state.error);
  }, [state]);

  async function onPick(file: File | undefined) {
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/popup-image/upload", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "อัปโหลดไม่สำเร็จ");
        setPreview(null);
        return;
      }
      toast.success("อัปเดตรูปป็อปอัพแล้ว");
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
    <div className="rounded-[var(--radius-lg)] border border-border bg-card shadow-sm p-5 space-y-5 max-w-xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold">ป็อปอัพประกาศ</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            โชว์ให้เทรนเนอร์และลูกเทรนเห็นครั้งเดียวต่อการล็อกอิน (ไม่โชว์ให้เจ้าของระบบ) — กดสลับแล้วต้องกด
            &ldquo;บันทึก&rdquo; ด้านล่างด้วย
          </p>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setEnabled((v) => !v);
          }}
          aria-pressed={enabled}
          className={cn(
            "relative shrink-0 h-7 w-12 rounded-full transition-colors disabled:opacity-50",
            enabled ? "bg-primary" : "bg-muted",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform",
              enabled && "translate-x-5",
            )}
          />
        </button>
      </div>

      <div>
        <Label className="mb-1.5 block">รูปภาพ</Label>
        <div className="flex items-center gap-4">
          <div className="h-24 w-24 shrink-0 rounded-[var(--radius-md)] overflow-hidden bg-muted border border-border flex items-center justify-center">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="ป็อปอัพ" className="h-full w-full object-cover" />
            ) : hasImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/popup-image${cacheBust ? `?v=${cacheBust}` : ""}`}
                alt="ป็อปอัพ"
                className="h-full w-full object-cover"
              />
            ) : (
              <ImageIcon className="size-6 text-muted-foreground" />
            )}
          </div>
          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? "กำลังอัปโหลด..." : "เลือกรูป"}
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onPick(e.target.files?.[0])}
            />
            <p className="text-xs text-muted-foreground mt-1.5">JPG/PNG/WebP ไม่เกิน 8MB</p>
          </div>
        </div>
      </div>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="popupEnabled" value={enabled ? "on" : "off"} />
        <div>
          <Label htmlFor="popupTitle">หัวข้อ (ถ้ามี)</Label>
          <Input
            id="popupTitle"
            name="popupTitle"
            defaultValue={popupTitle ?? ""}
            placeholder="เช่น โปรโมชันพิเศษเดือนนี้"
          />
        </div>
        <div>
          <Label htmlFor="popupLinkUrl">ลิงก์เมื่อกดรูป (ถ้ามี)</Label>
          <Input
            id="popupLinkUrl"
            name="popupLinkUrl"
            type="url"
            defaultValue={popupLinkUrl ?? ""}
            placeholder="https://..."
          />
        </div>
        <Button type="submit" disabled={pending}>
          <Save className="size-4" />
          {pending ? "กำลังบันทึก..." : "บันทึกการตั้งค่าป็อปอัพ"}
        </Button>
      </form>
    </div>
  );
}
