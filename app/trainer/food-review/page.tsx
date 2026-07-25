import { format } from "date-fns";
import { desc, eq, inArray } from "drizzle-orm";
import { MessageSquare, Flame, Sparkles, AlertTriangle } from "lucide-react";
import { db } from "@/lib/db";
import { foodLogs, foodComments, users, trainerSettings } from "@/lib/db/schema";
import { requireRole } from "@/lib/authz";
import { MEAL_LABELS } from "@/lib/meals";
import { PageHeader } from "@/components/page-header";
import { FoodCommentForm } from "@/components/food-comment-form";
import { NutritionAutoToggle } from "@/components/nutrition-auto-toggle";
import { RetryAiButton } from "@/components/retry-ai-button";

export const dynamic = "force-dynamic";

function MacroLine({
  calories,
  carbs,
  protein,
  fat,
}: {
  calories: number | null;
  carbs: number | null;
  protein: number | null;
  fat: number | null;
}) {
  const macroParts = [
    carbs != null && `คาร์บ ${carbs}ก.`,
    protein != null && `โปรตีน ${protein}ก.`,
    fat != null && `ไขมัน ${fat}ก.`,
  ].filter(Boolean);
  if (calories == null && macroParts.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
      {calories != null && (
        <span className="inline-flex items-center gap-1 text-amber-600">
          <Flame className="size-3.5" />
          {calories} แคล
        </span>
      )}
      {macroParts.length > 0 && <span>{macroParts.join(" · ")}</span>}
    </div>
  );
}

export default async function TrainerFoodReviewPage() {
  const trainer = await requireRole("TRAINER");

  const [setting] = await db
    .select()
    .from(trainerSettings)
    .where(eq(trainerSettings.trainerId, trainer.id))
    .limit(1);
  const autoEnabled = setting?.autoNutritionEnabled ?? false;

  const logs = await db
    .select({
      id: foodLogs.id,
      mealType: foodLogs.mealType,
      note: foodLogs.note,
      createdAt: foodLogs.createdAt,
      clientName: users.fullName,
      autoStatus: foodLogs.autoStatus,
      autoCalories: foodLogs.autoCalories,
      autoCarbs: foodLogs.autoCarbs,
      autoProtein: foodLogs.autoProtein,
      autoFat: foodLogs.autoFat,
      autoLabel: foodLogs.autoLabel,
      reviewedAt: foodLogs.reviewedAt,
      reviewedBy: foodLogs.reviewedBy,
    })
    .from(foodLogs)
    .innerJoin(users, eq(users.id, foodLogs.clientId))
    .where(eq(users.trainerId, trainer.id))
    .orderBy(desc(foodLogs.createdAt));

  const pending = logs.filter((l) => !l.reviewedAt);
  const reviewed = [...logs.filter((l) => l.reviewedAt)].sort(
    (a, b) => (b.reviewedAt?.getTime() ?? 0) - (a.reviewedAt?.getTime() ?? 0),
  );

  const trainerReviewedIds = reviewed
    .filter((l) => l.reviewedBy === "TRAINER")
    .map((l) => l.id);
  const trainerComments = trainerReviewedIds.length
    ? await db
        .select()
        .from(foodComments)
        .where(inArray(foodComments.foodLogId, trainerReviewedIds))
    : [];
  const commentByLog = new Map(trainerComments.map((c) => [c.foodLogId, c]));

  return (
    <>
      <PageHeader
        title="ตรวจอาหาร"
        description="รายการอาหารที่ลูกเทรนส่งมา — คอมเมนต์และระบุแคลอรี่"
      />

      <NutritionAutoToggle enabled={autoEnabled} />

      {logs.length === 0 ? (
        <div className="text-center py-16 rounded-[var(--radius-lg)] border border-dashed border-border bg-card text-muted-foreground">
          ยังไม่มีรูปอาหารจากลูกเทรน
        </div>
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">
              รอตรวจ ({pending.length})
            </h2>
            {pending.length === 0 ? (
              <div className="text-center py-10 rounded-[var(--radius-lg)] border border-dashed border-border bg-card text-muted-foreground text-sm">
                ไม่มีรายการค้างตรวจ
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {pending.map((log) => (
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
                      {log.autoStatus === "FAILED" && (
                        <div className="flex items-center justify-between gap-2 text-xs text-amber-700 bg-amber-50 rounded-md px-3 py-2 mb-2">
                          <span className="flex items-center gap-1.5">
                            <AlertTriangle className="size-3.5 shrink-0" />
                            AI คำนวณไม่สำเร็จ
                          </span>
                          <RetryAiButton foodLogId={log.id} />
                        </div>
                      )}
                      <FoodCommentForm foodLogId={log.id} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">
              ตรวจแล้ว ({reviewed.length})
            </h2>
            {reviewed.length === 0 ? (
              <div className="text-center py-10 rounded-[var(--radius-lg)] border border-dashed border-border bg-card text-muted-foreground text-sm">
                ยังไม่มีรายการที่ตรวจแล้ว
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {reviewed.map((log) => (
                  <div
                    key={log.id}
                    className="rounded-[var(--radius-lg)] border border-border bg-card shadow-sm overflow-hidden opacity-90"
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
                      <div className="text-sm bg-muted rounded-md px-3 py-2">
                        {log.reviewedBy === "AUTO" ? (
                          <>
                            <div className="flex items-center gap-1.5 text-primary font-medium text-xs mb-0.5">
                              <Sparkles className="size-3.5" />
                              ประมาณการโดย AI
                            </div>
                            {log.autoLabel && (
                              <p className="text-muted-foreground text-xs">
                                ตรวจพบ: {log.autoLabel}
                              </p>
                            )}
                            <MacroLine
                              calories={log.autoCalories}
                              carbs={log.autoCarbs}
                              protein={log.autoProtein}
                              fat={log.autoFat}
                            />
                          </>
                        ) : (
                          (() => {
                            const c = commentByLog.get(log.id);
                            return (
                              <>
                                <div className="flex items-center gap-1.5 text-primary font-medium text-xs mb-0.5">
                                  <MessageSquare className="size-3.5" />
                                  คุณตรวจแล้ว
                                </div>
                                {c?.comment && (
                                  <p className="text-muted-foreground">{c.comment}</p>
                                )}
                                {c && (
                                  <MacroLine
                                    calories={c.calories}
                                    carbs={c.carbs}
                                    protein={c.protein}
                                    fat={c.fat}
                                  />
                                )}
                              </>
                            );
                          })()
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
