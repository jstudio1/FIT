export type NutritionEntry = {
  foodLogId: number;
  calories: number | null;
  carbs: number | null;
  protein: number | null;
  fat: number | null;
  createdAt: Date;
};

export type DailyTotals = {
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
};

/**
 * เลือกคอมเมนต์ล่าสุดที่มีข้อมูลโภชนาการ ต่อรูปอาหาร 1 รูป (ป้องกันนับซ้ำ
 * ถ้าเทรนเนอร์คอมเมนต์รูปเดียวกันหลายครั้ง — เอาค่าล่าสุดเป็นตัวจริง)
 */
export function latestNutritionPerLog(
  comments: NutritionEntry[],
): Map<number, NutritionEntry> {
  const map = new Map<number, NutritionEntry>();
  for (const c of comments) {
    if (
      c.calories == null &&
      c.carbs == null &&
      c.protein == null &&
      c.fat == null
    )
      continue;
    const existing = map.get(c.foodLogId);
    if (!existing || c.createdAt.getTime() >= existing.createdAt.getTime()) {
      map.set(c.foodLogId, c);
    }
  }
  return map;
}

export function sumTotals(entries: NutritionEntry[]): DailyTotals {
  return entries.reduce(
    (acc, e) => ({
      calories: acc.calories + (e.calories ?? 0),
      carbs: acc.carbs + (e.carbs ?? 0),
      protein: acc.protein + (e.protein ?? 0),
      fat: acc.fat + (e.fat ?? 0),
    }),
    { calories: 0, carbs: 0, protein: 0, fat: 0 },
  );
}
