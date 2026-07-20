import { format } from "date-fns";
import { desc, eq, inArray } from "drizzle-orm";
import { MessageSquare, Flame } from "lucide-react";
import { db } from "@/lib/db";
import { foodLogs, foodComments, users } from "@/lib/db/schema";
import { requireRole } from "@/lib/authz";
import { MEAL_LABELS } from "@/lib/meals";
import { PageHeader } from "@/components/page-header";
import { FoodCommentForm } from "@/components/food-comment-form";

export const dynamic = "force-dynamic";

export default async function TrainerFoodReviewPage() {
  const trainer = await requireRole("TRAINER");

  const logs = await db
    .select({
      id: foodLogs.id,
      mealType: foodLogs.mealType,
      note: foodLogs.note,
      createdAt: foodLogs.createdAt,
      clientName: users.fullName,
    })
    .from(foodLogs)
    .innerJoin(users, eq(users.id, foodLogs.clientId))
    .where(eq(users.trainerId, trainer.id))
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
        title="ตรวจอาหาร"
        description="รายการอาหารที่ลูกเทรนส่งมา — คอมเมนต์และระบุแคลอรี่"
      />

      {logs.length === 0 ? (
        <div className="text-center py-16 rounded-[var(--radius-lg)] border border-dashed border-border bg-card text-muted-foreground">
          ยังไม่มีรูปอาหารจากลูกเทรน
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {logs.map((log) => {
            const cs = commentsByLog.get(log.id) ?? [];
            return (
              <div
                key={log.id}
                className="rounded-[var(--radius-lg)] border border-border bg-card shadow-sm overflow-hidden"
              >
                <div className="flex gap-4 p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/uploads/${log.id}`}
                    alt="อาหาร"
                    className="w-28 h-28 rounded-md object-cover bg-muted shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{log.clientName}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-accent text-accent-foreground">
                        {MEAL_LABELS[log.mealType]}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(log.createdAt, "dd/MM/yyyy HH:mm")}
                      </span>
                    </div>
                    {log.note && <p className="text-sm mt-2">{log.note}</p>}
                  </div>
                </div>

                <div className="px-4 pb-4">
                  {cs.length > 0 && (
                    <div className="space-y-2 mb-1">
                      {cs.map((c) => (
                        <div
                          key={c.id}
                          className="text-sm bg-muted rounded-md px-3 py-2"
                        >
                          <div className="flex items-center gap-2 text-primary font-medium text-xs mb-0.5">
                            <MessageSquare className="size-3.5" />
                            คุณ
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
                  )}
                  <FoodCommentForm foodLogId={log.id} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
