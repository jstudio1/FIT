"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ImageOff, Save, Search, Trash2, Upload } from "lucide-react";
import {
  saveMenuItemAction,
  deleteMenuItemAction,
  refetchMenuImageAction,
  type MenuItemInput,
} from "@/app/_actions/menu-admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type MenuAdminInitial = {
  id: number;
  name: string;
  description: string | null;
  ingredients: string[];
  calories: number;
  protein: number;
  carb: number;
  fat: number;
  tagClean: boolean;
  tagLowCal: boolean;
  tagDessert: boolean;
  mealType: "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK" | "ANY";
  isActive: boolean;
  hasImage: boolean;
  imageCredit: string | null;
} | null;

const MEAL_TYPES: { value: MenuItemInput["mealType"]; label: string }[] = [
  { value: "ANY", label: "ทุกมื้อ" },
  { value: "BREAKFAST", label: "เช้า" },
  { value: "LUNCH", label: "กลางวัน" },
  { value: "DINNER", label: "เย็น" },
  { value: "SNACK", label: "ของว่าง" },
];

export function MenuAdminForm({
  initial,
  maxUploadSizeMb,
}: {
  initial: MenuAdminInitial;
  maxUploadSizeMb: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [refetching, setRefetching] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [id, setId] = useState<number | null>(initial?.id ?? null);
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [ingredients, setIngredients] = useState((initial?.ingredients ?? []).join("\n"));
  const [calories, setCalories] = useState(String(initial?.calories ?? ""));
  const [protein, setProtein] = useState(String(initial?.protein ?? ""));
  const [carb, setCarb] = useState(String(initial?.carb ?? ""));
  const [fat, setFat] = useState(String(initial?.fat ?? ""));
  const [tagClean, setTagClean] = useState(initial?.tagClean ?? false);
  const [tagLowCal, setTagLowCal] = useState(initial?.tagLowCal ?? false);
  const [tagDessert, setTagDessert] = useState(initial?.tagDessert ?? false);
  const [mealType, setMealType] = useState<MenuItemInput["mealType"]>(initial?.mealType ?? "ANY");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [hasImage, setHasImage] = useState(initial?.hasImage ?? false);
  const [imageCredit, setImageCredit] = useState(initial?.imageCredit ?? null);
  const [cacheBust, setCacheBust] = useState(0);
  const [pexelsQuery, setPexelsQuery] = useState("");

  function save() {
    startTransition(async () => {
      const res = await saveMenuItemAction({
        id,
        name,
        description,
        ingredients,
        calories: Number(calories) || 0,
        protein: Number(protein) || 0,
        carb: Number(carb) || 0,
        fat: Number(fat) || 0,
        tagClean,
        tagLowCal,
        tagDessert,
        mealType,
        isActive,
      });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(res.success ?? "บันทึกแล้ว");
      if (!id && res.id) {
        // สร้างใหม่สำเร็จ — ย้ายไปหน้าแก้ไขเพื่อให้ใส่รูปได้ต่อ
        router.push(`/owner/menu/${res.id}`);
        return;
      }
      router.refresh();
    });
  }

  function remove() {
    if (!id) return;
    if (!confirm(`ลบเมนู "${name}" ถาวร? — กู้คืนไม่ได้`)) return;
    startTransition(async () => {
      const res = await deleteMenuItemAction(id);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(res.success ?? "ลบแล้ว");
      router.push("/owner/menu");
    });
  }

  async function onPickFile(file: File | undefined) {
    if (!file || !id) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("id", String(id));
      fd.append("image", file);
      const res = await fetch("/api/menu/upload", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "อัปโหลดไม่สำเร็จ");
        return;
      }
      toast.success("อัปเดตรูปแล้ว");
      setHasImage(true);
      setImageCredit(null);
      setCacheBust((v) => v + 1);
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function refetchFromPexels() {
    if (!id) return;
    setRefetching(true);
    startTransition(async () => {
      const res = await refetchMenuImageAction(id, pexelsQuery);
      setRefetching(false);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(res.success ?? "อัปเดตรูปแล้ว");
      setHasImage(true);
      if (res.imageCredit) setImageCredit(res.imageCredit);
      setCacheBust((v) => v + 1);
      router.refresh();
    });
  }

  return (
    <div className="space-y-5 max-w-2xl">
      {/* รูปภาพ — จัดการได้เฉพาะเมนูที่บันทึกแล้ว (มี id) */}
      <div className="rounded-[var(--radius-lg)] border border-border bg-card p-5">
        <Label className="mb-2 block">รูปภาพ</Label>
        {!id ? (
          <p className="text-sm text-muted-foreground">
            บันทึกเมนูก่อน แล้วค่อยกลับมาใส่/เปลี่ยนรูปได้
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <div className="h-24 w-24 shrink-0 rounded-[var(--radius-md)] overflow-hidden bg-muted border border-border flex items-center justify-center">
                {hasImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/menu/${id}?v=${cacheBust}`}
                    alt={name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ImageOff className="size-6 text-muted-foreground" />
                )}
              </div>
              <div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload className="size-3.5" />
                  {uploading ? "กำลังอัปโหลด..." : "อัปโหลดรูปเอง"}
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onPickFile(e.target.files?.[0])}
                />
                <p className="text-xs text-muted-foreground mt-1.5">JPG/PNG/WebP ไม่เกิน {maxUploadSizeMb}MB</p>
                {imageCredit && (
                  <p className="text-[11px] text-muted-foreground mt-1">{imageCredit}</p>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Input
                value={pexelsQuery}
                onChange={(e) => setPexelsQuery(e.target.value)}
                placeholder="ค้นรูปใหม่จาก Pexels เช่น grilled chicken salad"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                disabled={refetching || pending}
                onClick={refetchFromPexels}
              >
                <Search className="size-3.5" />
                {refetching ? "กำลังค้นหา..." : "ค้นรูปใหม่"}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              พิมพ์คำค้นเป็นภาษาอังกฤษจะได้ผลลัพธ์ตรงกว่า — ระบบจะแทนที่รูปเดิมทันทีที่เจอรูปที่ใช้ได้
            </p>
          </div>
        )}
      </div>

      {/* ข้อมูลเมนู */}
      <div className="rounded-[var(--radius-lg)] border border-border bg-card p-5 space-y-4">
        <div>
          <Label htmlFor="name">ชื่อเมนู</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="description">คำอธิบาย</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-16"
          />
        </div>
        <div>
          <Label htmlFor="ingredients">ส่วนประกอบหลัก (บรรทัดละ 1 รายการ สูงสุด 6 บรรทัด)</Label>
          <Textarea
            id="ingredients"
            value={ingredients}
            onChange={(e) => setIngredients(e.target.value)}
            placeholder={"อกไก่ 150 กรัม\nผักสลัดรวม\nน้ำสลัดใส"}
            className="min-h-28 font-mono text-sm"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <Label htmlFor="calories">แคลอรี่</Label>
            <Input id="calories" type="number" value={calories} onChange={(e) => setCalories(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="protein">โปรตีน (ก.)</Label>
            <Input id="protein" type="number" value={protein} onChange={(e) => setProtein(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="carb">คาร์บ (ก.)</Label>
            <Input id="carb" type="number" value={carb} onChange={(e) => setCarb(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="fat">ไขมัน (ก.)</Label>
            <Input id="fat" type="number" value={fat} onChange={(e) => setFat(e.target.value)} />
          </div>
        </div>

        <div>
          <Label htmlFor="mealType">มื้อที่เหมาะสม</Label>
          <select
            id="mealType"
            value={mealType}
            onChange={(e) => setMealType(e.target.value as MenuItemInput["mealType"])}
            className="flex h-10 w-full rounded-[var(--radius-md)] border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          >
            {MEAL_TYPES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-4 pt-1">
          {(
            [
              { key: "clean", label: "คลีน", value: tagClean, set: setTagClean },
              { key: "lowcal", label: "แคลน้อย", value: tagLowCal, set: setTagLowCal },
              { key: "dessert", label: "ขนมเพื่อสุขภาพ", value: tagDessert, set: setTagDessert },
            ] as const
          ).map((t) => (
            <label key={t.key} className="inline-flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={t.value}
                onChange={(e) => t.set(e.target.checked)}
                className="size-4 accent-primary"
              />
              {t.label}
            </label>
          ))}
          <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="size-4 accent-primary"
            />
            แสดงในแอป (active)
          </label>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button type="button" disabled={pending} onClick={save}>
          <Save className="size-4" />
          {pending ? "กำลังบันทึก..." : "บันทึกเมนู"}
        </Button>
        {id && (
          <button
            type="button"
            disabled={pending}
            onClick={remove}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50",
            )}
          >
            <Trash2 className="size-4" />
            ลบเมนูนี้
          </button>
        )}
      </div>
    </div>
  );
}
