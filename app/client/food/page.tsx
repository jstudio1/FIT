import { addDays } from "date-fns";
import { and, eq, gte, lt, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { foodLogs, foodComments } from "@/lib/db/schema";
import { requireRole } from "@/lib/authz";
import { getWeekDays, weekStart, toDateStr } from "@/lib/schedule";
import {
  latestNutritionPerLog,
  sumTotals,
  type NutritionEntry,
} from "@/lib/nutrition";
import { DateStrip, type DateStripDay } from "@/components/date-strip";
import { FoodDiarySummary } from "@/components/food-diary-summary";
import {
  FoodLogCard,
  type FoodLogCardComment,
} from "@/components/food-log-card";
import { FoodUpload } from "@/components/food-upload";

export const dynamic = "force-dynamic";

export default async function ClientFoodPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const client = await requireRole("CLIENT");
  const sp = await searchParams;

  const selectedDate =
    sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date)
      ? new Date(`${sp.date}T00:00:00`)
      : new Date();
  const selectedDateStr = toDateStr(selectedDate);
  const days = getWeekDays(selectedDate);
  const ws = weekStart(selectedDate);
  const rangeStart = ws;
  const rangeEnd = addDays(ws, 7);
  const prevDateStr = toDateStr(addDays(selectedDate, -7));
  const nextDateStr = toDateStr(addDays(selectedDate, 7));

  const logs = await db
    .select()
    .from(foodLogs)
    .where(
      and(
        eq(foodLogs.clientId, client.id),
        gte(foodLogs.createdAt, rangeStart),
        lt(foodLogs.createdAt, rangeEnd),
      ),
    )
    .orderBy(foodLogs.createdAt);

  const logIds = logs.map((l) => l.id);
  const comments = logIds.length
    ? await db
        .select()
        .from(foodComments)
        .where(inArray(foodComments.foodLogId, logIds))
        .orderBy(foodComments.createdAt)
    : [];

  const commentsByLog = new Map<number, typeof comments>();
  for (const c of comments) {
    const arr = commentsByLog.get(c.foodLogId) ?? [];
    arr.push(c);
    commentsByLog.set(c.foodLogId, arr);
  }

  const logsByDate = new Map<string, typeof logs>();
  for (const l of logs) {
    const key = toDateStr(l.createdAt);
    const arr = logsByDate.get(key) ?? [];
    arr.push(l);
    logsByDate.set(key, arr);
  }

  const dateStripDays: DateStripDay[] = days.map((d) => ({
    dateStr: d.dateStr,
    dayShort: d.dayShort,
    dayNum: d.dayNum,
    hasEntries: (logsByDate.get(d.dateStr)?.length ?? 0) > 0,
  }));

  const selectedLogs = logsByDate.get(selectedDateStr) ?? [];

  const nutritionEntries: NutritionEntry[] = comments.map((c) => ({
    foodLogId: c.foodLogId,
    calories: c.calories,
    carbs: c.carbs,
    protein: c.protein,
    fat: c.fat,
    createdAt: c.createdAt,
  }));
  const latestMap = latestNutritionPerLog(nutritionEntries);
  const selectedNutrition = selectedLogs
    .map((l) => latestMap.get(l.id))
    .filter((x): x is NutritionEntry => !!x);
  const totals = sumTotals(selectedNutrition);

  return (
    <>
      <DateStrip
        basePath="/client/food"
        days={dateStripDays}
        selectedDateStr={selectedDateStr}
        prevDateStr={prevDateStr}
        nextDateStr={nextDateStr}
      />

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <FoodDiarySummary totals={totals} />
          <FoodUpload />
        </div>

        <div>
          {selectedLogs.length === 0 ? (
            <div className="text-center py-16 rounded-[var(--radius-lg)] border border-dashed border-border bg-card text-muted-foreground">
              ยังไม่มีรูปอาหารในวันนี้ — กดปุ่มส่งรูปอาหาร
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {selectedLogs.map((log) => {
                const cs = commentsByLog.get(log.id) ?? [];
                const cardComments: FoodLogCardComment[] = cs.map((c) => ({
                  id: c.id,
                  comment: c.comment,
                  calories: c.calories,
                  carbs: c.carbs,
                  protein: c.protein,
                  fat: c.fat,
                  authorLabel: "เทรนเนอร์",
                }));
                return (
                  <FoodLogCard key={log.id} log={log} comments={cardComments} />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
