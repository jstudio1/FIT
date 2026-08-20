import { UtensilsCrossed } from "lucide-react";

/**
 * ไดอะแกรมส่วนประกอบอาหาร — รูปตรงกลาง มีเส้นโยงออกไป 6 จุดรอบๆ
 * (บนซ้าย/บนขวา/กลางซ้าย/กลางขวา/ล่างซ้าย/ล่างขวา) สไตล์ป้ายกำกับสเปกสินค้า
 *
 * เรขาคณิตคำนวณไว้ตายตัวบน viewBox 160x100 (สัดส่วน 16:10) — วงกลมรูปอยู่ที่ (80,50) รัศมี 22
 * จุดปลายเส้นฝั่งป้าย: TL(14,12) TR(146,12) ML(6,50) MR(154,50) BL(14,88) BR(146,88)
 * จุดที่เส้นแตะขอบรูป (คำนวณจากจุดตัดเส้นตรงกับวงกลม) ใช้ตำแหน่งคงที่ด้านล่างนี้
 */
const EDGE_POINTS = {
  tl: { x: 60.9, y: 39.0 },
  tr: { x: 99.1, y: 39.0 },
  ml: { x: 58.0, y: 50.0 },
  mr: { x: 102.0, y: 50.0 },
  bl: { x: 60.9, y: 61.0 },
  br: { x: 99.1, y: 61.0 },
} as const;

const LABEL_ANCHORS = {
  tl: { x: 14, y: 12 },
  tr: { x: 146, y: 12 },
  ml: { x: 6, y: 50 },
  mr: { x: 154, y: 50 },
  bl: { x: 14, y: 88 },
  br: { x: 146, y: 88 },
} as const;

type Slot = keyof typeof EDGE_POINTS;
const ORDER: Slot[] = ["tl", "tr", "ml", "mr", "bl", "br"];

export function MenuIngredientDiagram({
  imageId,
  imageAlt,
  hasImage,
  ingredients,
}: {
  imageId: number;
  imageAlt: string;
  hasImage: boolean;
  ingredients: string[];
}) {
  const items = ingredients.slice(0, 6);

  return (
    <div className="relative max-w-md mx-9 sm:mx-auto aspect-[16/10] select-none">
      {/* เส้นโยง — วาดด้วย SVG พิกัดคงที่ */}
      <svg
        viewBox="0 0 160 100"
        className="absolute inset-0 w-full h-full text-primary/40"
        preserveAspectRatio="none"
      >
        {items.map((_, i) => {
          const slot = ORDER[i];
          const edge = EDGE_POINTS[slot];
          const anchor = LABEL_ANCHORS[slot];
          return (
            <g key={slot}>
              <line
                x1={edge.x}
                y1={edge.y}
                x2={anchor.x}
                y2={anchor.y}
                stroke="currentColor"
                strokeWidth={0.4}
                strokeDasharray="1.5 1.2"
              />
              <circle cx={edge.x} cy={edge.y} r={0.9} fill="currentColor" />
              <circle
                cx={anchor.x}
                cy={anchor.y}
                r={1.3}
                fill="var(--card)"
                stroke="currentColor"
                strokeWidth={0.5}
              />
            </g>
          );
        })}
      </svg>

      {/* รูปตรงกลาง */}
      <div
        className="absolute rounded-full overflow-hidden border-4 border-card shadow-xl bg-muted ring-1 ring-border"
        style={{
          left: "50%",
          top: "50%",
          width: "27.5%",
          aspectRatio: "1 / 1",
          transform: "translate(-50%, -50%)",
        }}
      >
        {hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/menu/${imageId}`} alt={imageAlt} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-muted-foreground">
            <UtensilsCrossed className="size-6" />
          </div>
        )}
      </div>

      {/* ป้ายส่วนประกอบ 6 จุด */}
      {items.map((ingredient, i) => {
        const slot = ORDER[i];
        const anchor = LABEL_ANCHORS[slot];
        const isLeft = slot === "tl" || slot === "ml" || slot === "bl";
        const leftPct = (anchor.x / 160) * 100;
        return (
          <div
            key={slot}
            className="absolute w-[4.5rem] sm:w-[7.5rem]"
            style={{
              [isLeft ? "right" : "left"]: `${isLeft ? 100 - leftPct : leftPct}%`,
              top: `${anchor.y}%`,
              transform: "translateY(-50%)",
            }}
          >
            <div
              className={`flex items-center gap-1.5 rounded-2xl border border-primary/30 bg-card/95 backdrop-blur px-2 py-1 sm:px-2.5 shadow-sm w-fit max-w-full ${
                isLeft ? "ml-auto flex-row-reverse text-right" : "mr-auto text-left"
              }`}
            >
              <span className="size-1.5 rounded-full bg-primary shrink-0" />
              <span className="text-[10px] sm:text-xs font-medium leading-tight">
                {ingredient}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
