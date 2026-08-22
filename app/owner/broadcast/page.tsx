import { desc, eq } from "drizzle-orm";
import { Megaphone } from "lucide-react";
import { db } from "@/lib/db";
import { notifications, users } from "@/lib/db/schema";
import { requireRole } from "@/lib/authz";
import { PageHeader } from "@/components/page-header";
import { BroadcastForm } from "@/components/broadcast-form";

export const dynamic = "force-dynamic";

export default async function OwnerBroadcastPage() {
  await requireRole("OWNER");

  const [trainers, clients] = await Promise.all([
    db
      .select({ id: users.id, fullName: users.fullName, username: users.username, active: users.active })
      .from(users)
      .where(eq(users.role, "TRAINER"))
      .orderBy(users.fullName),
    db
      .select({ id: users.id, fullName: users.fullName, username: users.username, active: users.active })
      .from(users)
      .where(eq(users.role, "CLIENT"))
      .orderBy(users.fullName),
  ]);

  // ประกาศล่าสุด (แยกตามหัวข้อ/เวลา) — ดึงรายการ broadcast ล่าสุด
  const recent = await db
    .select({
      title: notifications.title,
      message: notifications.message,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .where(eq(notifications.type, "broadcast"))
    .orderBy(desc(notifications.createdAt))
    .limit(20);

  // รวมประกาศที่ส่งเวลาเดียวกัน (แสดงแบบ dedupe คร่าวๆ ตาม title+createdAt วินาที)
  const seen = new Set<string>();
  const history = recent.filter((r) => {
    const key = `${r.title}_${r.createdAt.toISOString().slice(0, 19)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return (
    <>
      <PageHeader
        title="ประกาศ"
        description="ส่งข้อความแจ้งเตือนถึงเทรนเนอร์หรือลูกเทรน — ทั้งหมดหรือเลือกเฉพาะบางคน"
      />

      <BroadcastForm trainers={trainers} clients={clients} />

      {history.length > 0 && (
        <div className="mt-8 max-w-xl">
          <h3 className="font-semibold mb-3">ประกาศล่าสุด</h3>
          <div className="space-y-2">
            {history.map((h, i) => (
              <div
                key={i}
                style={{ "--stagger": Math.min(i, 8) } as React.CSSProperties}
                className="animate-fade-up hover-lift rounded-[var(--radius-md)] border border-border bg-card p-4"
              >
                <div className="flex items-center gap-2 font-medium text-sm">
                  <Megaphone className="icon-pop size-4 text-primary" />
                  {h.title}
                </div>
                {h.message && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {h.message}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {h.createdAt.toLocaleString("th-TH")}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
