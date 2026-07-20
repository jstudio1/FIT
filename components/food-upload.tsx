"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera, Upload, X } from "lucide-react";
import { MEAL_OPTIONS } from "@/lib/meals";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function FoodUpload() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [meal, setMeal] = useState("BREAKFAST");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function pick(f: File | null) {
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  function reset() {
    setFile(null);
    setPreview(null);
    setNote("");
    setMeal("BREAKFAST");
    if (inputRef.current) inputRef.current.value = "";
  }

  async function submit() {
    if (!file) {
      toast.error("เลือกรูปอาหารก่อน");
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      fd.append("mealType", meal);
      fd.append("note", note);
      const res = await fetch("/api/food/upload", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "อัปโหลดไม่สำเร็จ");
        return;
      }
      toast.success("ส่งรูปอาหารแล้ว");
      reset();
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Camera className="size-4" />
        ส่งรูปอาหาร
      </Button>
    );
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-card shadow-sm p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">ส่งรูปอาหาร</h3>
        <button
          onClick={() => {
            setOpen(false);
            reset();
          }}
          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>รูปอาหาร</Label>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => pick(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:text-primary-foreground file:px-3 file:py-2 file:text-sm"
          />
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt="ตัวอย่าง"
              className="mt-3 rounded-md max-h-48 object-cover border border-border"
            />
          )}
        </div>

        <div className="space-y-4">
          <div>
            <Label>มื้ออาหาร</Label>
            <select
              value={meal}
              onChange={(e) => setMeal(e.target.value)}
              className="flex h-10 w-full rounded-[var(--radius-md)] border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            >
              {MEAL_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>หมายเหตุ (ถ้ามี)</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="เช่น ข้าวกล้อง + อกไก่ย่าง"
              className="min-h-10"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <Button onClick={submit} disabled={busy}>
          <Upload className="size-4" />
          {busy ? "กำลังส่ง..." : "ส่งให้เทรนเนอร์"}
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setOpen(false);
            reset();
          }}
        >
          ยกเลิก
        </Button>
      </div>
    </div>
  );
}
