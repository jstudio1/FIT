import { format } from "date-fns";
import { desc, eq, inArray } from "drizzle-orm";
import { MessageSquare, Flame } from "lucide-react";
import { db } from "@/lib/db";
import { foodLogs, foodComments } from "@/lib/db/schema";
import { requireRole } from "@/lib/authz";
import { MEAL_LABELS } from "@/lib/meals";
import { PageHeader } from "@/components/page-header";
import { FoodUpload } from "@/components/food-upload";

export const dynamic = "force-dynamic";

export default async function ClientFoodPage() {
  const client = await requireRole("CLIENT");

  const logs = await db
    .select()
    .from(foodLogs)
    .where(eq(foodLogs.clientId, client.id))
    .orderBy(desc(foodLogs.createdAt));

  const logIds = logs.map((l) => l.id);
  const comments = logIds.length
    ? await db
        .select()
        .from(foodComments)
        .where(inArray(foodComments.foodLogId, logIds))
        .orderBy(desc(foodComments.createdAt))
    : [];
  const commentsByLog = new Map<number, typeof comments>();
  for (const c of comments) {
    const arr = commentsByLog.get(c.foodLogId) ?? [];
    arr.push(c);
    commentsByLog.set(c.foodLogId, arr);
  }

  return (
    <>
      <PageHeader
        title="ส่งอาหาร"
        description="ถ่ายรูปอาหารแต่ละมื้อส่งให้เทรนเนอร์ตรวจ"
      />

      <FoodUpload />

      {logs.length === 0 ? (
        <div className="text-center py-16 rounded-[var(--radius-lg)] border border-dashed border-border bg-card text-muted-foreground">
          ยังไม่มีรูปอาหาร — กดปุ่มส่งรูปอาหารด้านบน
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {logs.map((log) => {
            const cs = commentsByLog.get(log.id) ?? [];
            return (
              <div
                key={log.id}
                className="rounded-[var(--radius-lg)] border border-border bg-card shadow-sm overflow-hidden"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/uploads/${log.id}`}
                  alt="อาหาร"
                  className="w-full h-48 object-cover bg-muted"
                />
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-accent text-accent-foreground">
                      {MEAL_LABELS[log.mealType]}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(log.createdAt, "dd/MM/yyyy HH:mm")}
                    </span>
                  </div>
                  {log.note && <p className="text-sm mt-2">{log.note}</p>}

                  {cs.length > 0 ? (
                    <div className="mt-3 space-y-2 border-t border-border pt-3">
                      {cs.map((c) => (
                        <div key={c.id} className="text-sm">
                          <div className="flex items-center gap-2 text-primary font-medium text-xs mb-0.5">
                            <MessageSquare className="size-3.5" />
                            เทรนเนอร์
                            {c.calories != null && (
                              <span className="inline-flex items-center gap-1 text-amber-600">
                                <Flame className="size-3.5" />
                                {c.calories} แคล
                              </span>
                            )}
                          </div>
                          {c.comment && (
                            <p className="text-muted-foreground">{c.comment}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-3 border-t border-border pt-3">
                      รอเทรนเนอร์ตรวจ
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
