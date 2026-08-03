export const TAG_COLOR_CLASSES: Record<string, string> = {
  teal: "bg-teal-100 text-teal-700",
  blue: "bg-blue-100 text-blue-700",
  amber: "bg-amber-100 text-amber-700",
  rose: "bg-rose-100 text-rose-700",
  violet: "bg-violet-100 text-violet-700",
  emerald: "bg-emerald-100 text-emerald-700",
};

export function tagColorClass(color: string): string {
  return TAG_COLOR_CLASSES[color] ?? TAG_COLOR_CLASSES.teal;
}
