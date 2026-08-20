import { PowerOff } from "lucide-react";

/** แสดงเมื่อ owner ปิดใช้งานฟีเจอร์นี้ไว้ (แต่มีคนเข้าตรงผ่าน URL) */
export function FeatureDisabled({
  message = "ฟีเจอร์นี้ถูกปิดใช้งานอยู่ในขณะนี้",
}: {
  message?: string;
}) {
  return (
    <div className="text-center py-16 rounded-[var(--radius-lg)] border border-dashed border-border bg-card text-muted-foreground">
      <PowerOff className="size-8 mx-auto mb-2" />
      {message}
    </div>
  );
}
