import { format } from "date-fns";
import { MessageSquare, Flame } from "lucide-react";
import { MEAL_LABELS } from "@/lib/meals";

export type FoodLogCardComment = {
  id: number;
  comment: string | null;
  calories: number | null;
  carbs: number | null;
  protein: number | null;
  fat: number | null;
  authorLabel: string;
};

export type FoodLogCardData = {
  id: number;
  mealType: string;
  note: string | null;
  createdAt: Date;
};

function NutritionLine({ c }: { c: FoodLogCardComment }) {
  const macroParts: string[] = [];
  if (c.carbs != null) macroParts.push(`คาร์บ ${c.carbs}ก.`);
  if (c.protein != null) macroParts.push(`โปรตีน ${c.protein}ก.`);
  if (c.fat != null) macroParts.push(`ไขมัน ${c.fat}ก.`);

  if (c.calories == null && macroParts.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
      {c.calories != null && (
        <span className="inline-flex items-center gap-1 text-amber-600">
          <Flame className="size-3.5" />
          {c.calories} แคล
        </span>
      )}
      {macroParts.length > 0 && <span>{macroParts.join(" · ")}</span>}
    </div>
  );
}

export function FoodLogCard({
  log,
  comments,
  imageSize = "h-48",
  footer,
}: {
  log: FoodLogCardData;
  comments: FoodLogCardComment[];
  imageSize?: string;
  footer?: React.ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-card shadow-sm overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/uploads/${log.id}`}
        alt="อาหาร"
        className={`w-full ${imageSize} object-cover bg-muted`}
      />
      <div className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs px-2 py-0.5 rounded-full bg-accent text-accent-foreground">
            {MEAL_LABELS[log.mealType] ?? log.mealType}
          </span>
          <span className="text-xs text-muted-foreground">
            {format(log.createdAt, "dd/MM/yyyy HH:mm")}
          </span>
        </div>
        {log.note && <p className="text-sm mt-2">{log.note}</p>}

        {comments.length > 0 ? (
          <div className="mt-3 space-y-2 border-t border-border pt-3">
            {comments.map((c) => (
              <div key={c.id} className="text-sm">
                <div className="flex items-center gap-2 text-primary font-medium text-xs mb-0.5">
                  <MessageSquare className="size-3.5" />
                  {c.authorLabel}
                </div>
                {c.comment && (
                  <p className="text-muted-foreground">{c.comment}</p>
                )}
                <NutritionLine c={c} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground mt-3 border-t border-border pt-3">
            รอเทรนเนอร์ตรวจ
          </p>
        )}

        {footer}
      </div>
    </div>
  );
}
