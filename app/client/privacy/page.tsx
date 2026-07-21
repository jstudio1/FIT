import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { privacyConsents, privacyRequests } from "@/lib/db/schema";
import { requireRole } from "@/lib/authz";
import { acceptPrivacyAction, PRIVACY_POLICY_VERSION, requestAccountDeletionAction } from "@/app/_actions/privacy";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function PrivacyPage() {
  const user = await requireRole("CLIENT");
  const [consent] = await db.select().from(privacyConsents).where(eq(privacyConsents.userId, user.id)).limit(1);
  const requests = await db.select().from(privacyRequests).where(eq(privacyRequests.userId, user.id)).orderBy(desc(privacyRequests.createdAt)).limit(10);
  return <div className="space-y-6">
    <h1 className="text-2xl font-semibold">ความเป็นส่วนตัวและข้อมูลสุขภาพ</h1>
    <Card><CardHeader><CardTitle>นโยบายข้อมูล</CardTitle></CardHeader><CardContent className="space-y-4">
      <p>ระบบเก็บข้อมูลโปรไฟล์สุขภาพ ผลการวัด ตารางนัด และรูปอาหารเพื่อให้บริการฝึกสอน ข้อมูลเข้าถึงได้เฉพาะเจ้าของระบบ เทรนเนอร์ที่รับผิดชอบ และตัวคุณตามหน้าที่</p>
      <p>เก็บข้อมูลระหว่างที่บัญชียังใช้งาน และดำเนินการคำขอลบภายใน 30 วัน เว้นแต่ข้อมูลที่กฎหมายกำหนดให้เก็บรักษา</p>
      <p className="text-sm text-muted-foreground">เวอร์ชัน {PRIVACY_POLICY_VERSION}</p>
      {consent?.policyVersion === PRIVACY_POLICY_VERSION && !consent.withdrawnAt
        ? <p className="text-green-700">ยอมรับนโยบายแล้ว</p>
        : <form action={acceptPrivacyAction}><Button type="submit">ยอมรับนโยบาย</Button></form>}
    </CardContent></Card>
    <Card><CardHeader><CardTitle>สิทธิ์ในข้อมูลของคุณ</CardTitle></CardHeader><CardContent className="space-y-4">
      <a className={buttonVariants()} href="/api/privacy/export">ดาวน์โหลดข้อมูลทั้งหมด (JSON)</a>
      <form action={requestAccountDeletionAction}><Button type="submit" variant="destructive">ขอลบบัญชีและบังคับออกจากทุกอุปกรณ์</Button></form>
      {requests.map((r) => <p className="text-sm" key={r.id}>คำขอ {r.requestType} — {r.status}</p>)}
    </CardContent></Card>
  </div>;
}
