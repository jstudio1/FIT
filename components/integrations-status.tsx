import { CheckCircle2, XCircle, KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";

type Integration = {
  name: string;
  envVars: string[];
  usedFor: string;
  configured: boolean;
};

/** สถานะการตั้งค่า API/บริการภายนอกทั้งหมดที่ระบบใช้อยู่ — อ่านอย่างเดียว ดูให้รู้ว่ามีอะไรตั้งไว้บ้าง
 * การเปลี่ยนค่าจริงยังต้องแก้ที่ไฟล์ .env บนเซิร์ฟเวอร์แล้ว restart (ปลอดภัยกว่าให้แก้ผ่านหน้าเว็บ) */
export function IntegrationsStatus() {
  const integrations: Integration[] = [
    {
      name: "Google Vision (ตรวจอาหารอัตโนมัติด้วย AI)",
      envVars: ["GOOGLE_SA_CLIENT_EMAIL", "GOOGLE_SA_PRIVATE_KEY"],
      usedFor: "วิเคราะห์รูปอาหารที่ลูกเทรนส่งมา เพื่อประมาณแคลอรี่อัตโนมัติ",
      configured: !!process.env.GOOGLE_SA_CLIENT_EMAIL && !!process.env.GOOGLE_SA_PRIVATE_KEY,
    },
    {
      name: "USDA FoodData Central",
      envVars: ["USDA_FDC_API_KEY"],
      usedFor: "ดึงข้อมูลโภชนาการอ้างอิงมาช่วยคำนวณแคลอรี่ให้แม่นยำขึ้น",
      configured: !!process.env.USDA_FDC_API_KEY,
    },
    {
      name: "Pexels (รูปเมนูแนะนำ)",
      envVars: ["PEXELS_API_KEY"],
      usedFor: "ดึงรูปประกอบเมนูแนะนำตอนเพิ่มเมนูใหม่ / เปลี่ยนรูป",
      configured: !!process.env.PEXELS_API_KEY,
    },
  ];

  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-card shadow-sm p-5 max-w-xl">
      <div className="flex items-center gap-2 mb-1">
        <KeyRound className="size-4.5 text-primary" />
        <h3 className="font-semibold">API & บริการภายนอก</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        แสดงเฉพาะสถานะว่าตั้งค่าไว้หรือยัง — ไม่แสดงค่าคีย์จริงเพื่อความปลอดภัย การเปลี่ยนค่าต้องแก้ไฟล์{" "}
        <code className="px-1 py-0.5 rounded bg-muted text-foreground">.env</code> บนเซิร์ฟเวอร์แล้ว restart แอป
      </p>
      <div className="divide-y divide-border">
        {integrations.map((it) => (
          <div key={it.name} className="py-3 first:pt-0 last:pb-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium">{it.name}</div>
                <p className="text-xs text-muted-foreground mt-0.5">{it.usedFor}</p>
                <p className="text-[11px] text-muted-foreground mt-1 font-mono">
                  {it.envVars.join(", ")}
                </p>
              </div>
              <span
                className={cn(
                  "shrink-0 inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
                  it.configured
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {it.configured ? (
                  <CheckCircle2 className="size-3.5" />
                ) : (
                  <XCircle className="size-3.5" />
                )}
                {it.configured ? "ตั้งค่าแล้ว" : "ยังไม่ได้ตั้งค่า"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
