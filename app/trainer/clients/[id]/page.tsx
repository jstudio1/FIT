import Link from "next/link";
import { notFound } from "next/navigation";
import { addDays, format } from "date-fns";
import { and, asc, desc, eq, gte, lt, inArray } from "drizzle-orm";
import {
  ArrowLeft,
  ClipboardCheck,
  LineChart as LineChartIcon,
  NotebookText,
  UtensilsCrossed,
  Mail,
  Phone,
  Calculator,
} from "lucide-react";
import { db } from "@/lib/db";
import {
  users,
  clientProfiles,
  bookings,
  sessionResults,
  foodLogs,
  foodComments,
  clientTags,
  clientTagLinks,
  calculatorResults,
} from "@/lib/db/schema";
import { requireRole } from "@/lib/authz";
import {
  isPastSlot,
  slotRangeLabel,
  getWeekDays,
  weekStart,
  toDateStr,
} from "@/lib/schedule";
import {
  latestNutritionPerLog,
  nutritionForLog,
  sumTotals,
  type NutritionEntry,
} from "@/lib/nutrition";
import { ProfileForm } from "@/components/profile-form";
import {
  TrainerAttendance,
  type BookingRow,
} from "@/components/trainer-attendance";
import { ResultsChart, type ResultPoint } from "@/components/results-chart";
import { ResultsLog, type ResultLogRow } from "@/components/results-log";
import { DateStrip, type DateStripDay } from "@/components/date-strip";
import { FoodDiarySummary } from "@/components/food-diary-summary";
import {
  FoodLogCard,
  type FoodLogCardComment,
} from "@/components/food-log-card";
import { FoodCommentForm } from "@/components/food-comment-form";
import { ClientTagPicker } from "@/components/client-tag-picker";
import { PointsSummaryCard } from "@/components/points-summary-card";
import { getGamificationProfile } from "@/lib/gamification";

export const dynamic = "force-dynamic";

const GOAL_LABEL: Record<string, string> = { cut: "ลดไขมัน", maintain: "คงที่", bulk: "เพิ่มกล้าม" };

export default async function ClientProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const { id } = await params;
  const clientId = Number(id);
  const trainer = await requireRole("TRAINER");
  const sp = await searchParams;

  const [client] = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.id, clientId),
        eq(users.role, "CLIENT"),
        eq(users.trainerId, trainer.id),
      ),
    )
    .limit(1);
  if (!client) notFound();

  const allTags = await db
    .select()
    .from(clientTags)
    .where(eq(clientTags.trainerId, trainer.id))
    .orderBy(clientTags.createdAt);
  const assignedTagLinks = await db
    .select({ tagId: clientTagLinks.tagId })
    .from(clientTagLinks)
    .where(eq(clientTagLinks.clientId, clientId));
  const assignedTagIds = assignedTagLinks.map((l) => l.tagId);

  const [profile] = await db
    .select()
    .from(clientProfiles)
    .where(eq(clientProfiles.userId, clientId))
    .limit(1);

  // นัดเทรน (เช็คการมาเทรน)
  const bkRows = await db
    .select()
    .from(bookings)
    .where(
      and(eq(bookings.clientId, clientId), eq(bookings.trainerId, trainer.id)),
    )
    .orderBy(desc(bookings.date), desc(bookings.hour));
  const now = new Date();
  const todayStr = toDateStr(now);
  const attendance: BookingRow[] = bkRows.map((b) => ({
    id: b.id,
    dateLabel: b.date,
    timeLabel: slotRangeLabel(b.hour),
    status: b.status,
    isPast: isPastSlot(b.date, b.hour, now),
    isToday: b.date === todayStr,
    sessionStartedAt: b.sessionStartedAt ? b.sessionStartedAt.toISOString() : null,
    durationMinutes: b.durationMinutes,
    durationNote: b.durationNote,
  }));

  const gamification = await getGamificationProfile(clientId);
  const earnedBadges = gamification.badges.filter((b) => b.earnedAt);

  const bmiHistory = await db
    .select()
    .from(calculatorResults)
    .where(eq(calculatorResults.clientId, clientId))
    .orderBy(desc(calculatorResults.createdAt))
    .limit(10);

  // ผลลัพธ์
  const results = await db
    .select()
    .from(sessionResults)
    .where(eq(sessionResults.clientId, clientId))
    .orderBy(asc(sessionResults.measuredAt));
  const chartData: ResultPoint[] = results.map((r) => ({
    date: format(r.measuredAt, "d/M"),
    weight: r.weight,
    waist: r.waist,
    muscleMass: r.muscleMass,
    bodyFat: r.bodyFat,
  }));
  const logRows: ResultLogRow[] = [...results]
    .reverse()
    .map((r) => ({
      id: r.id,
      dateLabel: format(r.measuredAt, "dd/MM/yyyy"),
      phase: r.phase,
      weight: r.weight,
      waist: r.waist,
      muscleMass: r.muscleMass,
      bodyFat: r.bodyFat,
      note: r.note,
    }));

  // ไดอารี่อาหาร
  const selectedDate =
    sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date)
      ? new Date(`${sp.date}T00:00:00`)
      : new Date();
  const selectedDateStr = toDateStr(selectedDate);
  const diaryDays = getWeekDays(selectedDate);
  const diaryWs = weekStart(selectedDate);
  const diaryRangeStart = diaryWs;
  const diaryRangeEnd = addDays(diaryWs, 7);
  const prevDateStr = toDateStr(addDays(selectedDate, -7));
  const nextDateStr = toDateStr(addDays(selectedDate, 7));

  const diaryLogs = await db
    .select()
    .from(foodLogs)
    .where(
      and(
        eq(foodLogs.clientId, clientId),
        gte(foodLogs.createdAt, diaryRangeStart),
        lt(foodLogs.createdAt, diaryRangeEnd),
      ),
    )
    .orderBy(foodLogs.createdAt);

  const diaryLogIds = diaryLogs.map((l) => l.id);
  const diaryComments = diaryLogIds.length
    ? await db
        .select()
        .from(foodComments)
        .where(inArray(foodComments.foodLogId, diaryLogIds))
        .orderBy(foodComments.createdAt)
    : [];
  const diaryCommentsByLog = new Map<number, typeof diaryComments>();
  for (const c of diaryComments) {
    const arr = diaryCommentsByLog.get(c.foodLogId) ?? [];
    arr.push(c);
    diaryCommentsByLog.set(c.foodLogId, arr);
  }

  const diaryLogsByDate = new Map<string, typeof diaryLogs>();
  for (const l of diaryLogs) {
    const key = toDateStr(l.createdAt);
    const arr = diaryLogsByDate.get(key) ?? [];
    arr.push(l);
    diaryLogsByDate.set(key, arr);
  }

  const diaryDateStripDays: DateStripDay[] = diaryDays.map((d) => ({
    dateStr: d.dateStr,
    dayShort: d.dayShort,
    dayNum: d.dayNum,
    hasEntries: (diaryLogsByDate.get(d.dateStr)?.length ?? 0) > 0,
  }));

  const selectedDiaryLogs = diaryLogsByDate.get(selectedDateStr) ?? [];

  const diaryNutritionEntries: NutritionEntry[] = diaryComments.map((c) => ({
    foodLogId: c.foodLogId,
    calories: c.calories,
    carbs: c.carbs,
    protein: c.protein,
    fat: c.fat,
    createdAt: c.createdAt,
  }));
  const diaryLatestMap = latestNutritionPerLog(diaryNutritionEntries);
  const diarySelectedNutrition = selectedDiaryLogs
    .map((l) => nutritionForLog(l, diaryLatestMap.get(l.id)))
    .filter((x): x is NutritionEntry => !!x);
  const diaryTotals = sumTotals(diarySelectedNutrition);

  return (
    <>
      <Link
        href="/trainer/clients"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="size-4" />
        กลับไปหน้ารายชื่อ
      </Link>

      <div className="mb-6">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-semibold overflow-hidden">
            {client.avatarPath ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/avatar/${client.id}`}
                alt={client.fullName}
                className="h-full w-full object-cover"
              />
            ) : (
              client.fullName.charAt(0)
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {client.fullName}
              {client.nickname && (
                <span className="text-lg font-normal text-muted-foreground">
                  {" "}
                  ({client.nickname})
                </span>
              )}
            </h1>
            <p className="text-sm text-muted-foreground">
              @{client.username} · ลูกเทรนของคุณ
            </p>
          </div>
        </div>

        {(client.email || client.phone) && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-sm text-muted-foreground">
            {client.email && (
              <a
                href={`mailto:${client.email}`}
                className="inline-flex items-center gap-1.5 hover:text-foreground"
              >
                <Mail className="size-3.5" />
                {client.email}
              </a>
            )}
            {client.phone && (
              <a
                href={`tel:${client.phone}`}
                className="inline-flex items-center gap-1.5 hover:text-foreground"
              >
                <Phone className="size-3.5" />
                {client.phone}
              </a>
            )}
          </div>
        )}

        <div className="mt-3">
          <ClientTagPicker
            clientId={client.id}
            allTags={allTags}
            assignedTagIds={assignedTagIds}
          />
        </div>
      </div>

      <div className="space-y-5">
        {/* กราฟผลลัพธ์ */}
        <div className="rounded-[var(--radius-lg)] border border-border bg-card shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <LineChartIcon className="size-4.5 text-primary" />
            <h3 className="font-semibold">แนวโน้มผลลัพธ์</h3>
          </div>
          <ResultsChart data={chartData} />
        </div>

        {/* ประวัติบันทึกผลรายวัน */}
        <div className="rounded-[var(--radius-lg)] border border-border bg-card shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-border">
            <NotebookText className="size-4.5 text-primary" />
            <h3 className="font-semibold">ประวัติบันทึกผล (รายวัน)</h3>
          </div>
          <ResultsLog rows={logRows} />
        </div>

        {/* ไดอารี่อาหาร */}
        <div className="rounded-[var(--radius-lg)] border border-border bg-card shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <UtensilsCrossed className="size-4.5 text-primary" />
            <h3 className="font-semibold">ไดอารี่อาหาร</h3>
          </div>

          <DateStrip
            basePath={`/trainer/clients/${clientId}`}
            days={diaryDateStripDays}
            selectedDateStr={selectedDateStr}
            prevDateStr={prevDateStr}
            nextDateStr={nextDateStr}
            showTitle={false}
          />

          <div className="grid gap-4 grid-cols-1 lg:grid-cols-[320px_1fr]">
            <FoodDiarySummary totals={diaryTotals} />

            <div>
              {selectedDiaryLogs.length === 0 ? (
                <div className="text-center py-16 rounded-[var(--radius-lg)] border border-dashed border-border bg-muted/40 text-muted-foreground">
                  ยังไม่มีรูปอาหารในวันนี้
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {selectedDiaryLogs.map((log) => {
                    const cs = diaryCommentsByLog.get(log.id) ?? [];
                    const cardComments: FoodLogCardComment[] = cs.map((c) => ({
                      id: c.id,
                      comment: c.comment,
                      calories: c.calories,
                      carbs: c.carbs,
                      protein: c.protein,
                      fat: c.fat,
                      authorLabel: "คุณ",
                    }));
                    if (cardComments.length === 0 && log.reviewedBy === "AUTO") {
                      cardComments.push({
                        id: -log.id,
                        comment: log.autoLabel ? `ตรวจพบ: ${log.autoLabel}` : null,
                        calories: log.autoCalories,
                        carbs: log.autoCarbs,
                        protein: log.autoProtein,
                        fat: log.autoFat,
                        authorLabel: "⚡ AI (ประมาณการ)",
                      });
                    }
                    return (
                      <FoodLogCard
                        key={log.id}
                        log={log}
                        comments={cardComments}
                        imageSize="h-36"
                        footer={
                          !log.reviewedAt && <FoodCommentForm foodLogId={log.id} />
                        }
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* แต้มสะสม & Badge */}
        <PointsSummaryCard
          totalPoints={gamification.totalPoints}
          currentStreak={gamification.currentStreak}
          earnedBadges={earnedBadges}
        />

        {/* ประวัติคำนวณ BMI/TDEE */}
        {bmiHistory.length > 0 && (
          <div className="rounded-[var(--radius-lg)] border border-border bg-card shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-border">
              <Calculator className="size-4.5 text-primary" />
              <h3 className="font-semibold">ประวัติคำนวณ BMI/TDEE</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[560px]">
                <thead>
                  <tr className="text-[11px] text-muted-foreground border-b border-border">
                    <th className="text-left font-medium px-5 py-2">วันที่</th>
                    <th className="text-left font-medium px-3 py-2">เป้าหมาย</th>
                    <th className="text-right font-medium px-3 py-2">BMI</th>
                    <th className="text-right font-medium px-3 py-2">TDEE</th>
                    <th className="text-right font-medium px-3 py-2">แคลอรี่</th>
                    <th className="text-right font-medium px-3 py-2">P</th>
                    <th className="text-right font-medium px-3 py-2">C</th>
                    <th className="text-right font-medium px-5 py-2">F</th>
                  </tr>
                </thead>
                <tbody>
                  {bmiHistory.map((r) => (
                    <tr key={r.id} className="border-b border-border last:border-0">
                      <td className="px-5 py-2 whitespace-nowrap">
                        {format(r.createdAt, "d MMM yy")}
                      </td>
                      <td className="px-3 py-2">{GOAL_LABEL[r.goal] ?? r.goal}</td>
                      <td className="px-3 py-2 text-right">{r.bmi.toFixed(1)}</td>
                      <td className="px-3 py-2 text-right">{r.tdee.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right font-medium">
                        {r.calories.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right">{r.protein}g</td>
                      <td className="px-3 py-2 text-right">{r.carb}g</td>
                      <td className="px-5 py-2 text-right">{r.fat}g</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* การมาเทรน */}
        <div className="rounded-[var(--radius-lg)] border border-border bg-card shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-border">
            <ClipboardCheck className="size-4.5 text-primary" />
            <h3 className="font-semibold">การมาเทรน</h3>
          </div>
          <TrainerAttendance bookings={attendance} />
        </div>

        {/* ประวัติ */}
        <div>
          <h3 className="font-semibold mb-3">ประวัติลูกเทรน</h3>
          <ProfileForm clientId={clientId} profile={profile ?? null} />
        </div>
      </div>
    </>
  );
}
