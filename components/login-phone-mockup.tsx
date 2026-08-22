// พรีวิวมือถือแบบ CSS ล้วน (ไม่ใช้รูปภาพ) — โชว์หน้าตาแอปคร่าวๆ ในกรอบไอโฟน สำหรับธีมหน้า login
export function LoginPhoneMockup() {
  return (
    <div className="relative w-[220px] sm:w-[250px] aspect-[9/19] rounded-[2.2rem] bg-neutral-900 p-2.5 shadow-2xl shadow-black/40 ring-1 ring-black/10">
      {/* ปุ่มด้านข้าง */}
      <div className="absolute -left-[3px] top-20 h-8 w-[3px] rounded-l-sm bg-neutral-700" />
      <div className="absolute -left-[3px] top-32 h-12 w-[3px] rounded-l-sm bg-neutral-700" />
      <div className="absolute -right-[3px] top-28 h-16 w-[3px] rounded-r-sm bg-neutral-700" />

      <div className="relative h-full w-full overflow-hidden rounded-[1.6rem] bg-background">
        {/* Dynamic Island */}
        <div className="absolute left-1/2 top-2 h-5 w-20 -translate-x-1/2 rounded-full bg-neutral-900 z-10" />

        <div className="flex h-full flex-col px-3 pt-8 pb-3 gap-2">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="h-5 w-5 rounded-md bg-primary" />
            <div className="h-2 w-14 rounded-full bg-foreground/20" />
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <div className="rounded-lg border border-border bg-card p-2">
              <div className="h-1.5 w-8 rounded-full bg-muted-foreground/30 mb-1.5" />
              <div className="h-2.5 w-10 rounded-full bg-primary/70" />
            </div>
            <div className="rounded-lg border border-border bg-card p-2">
              <div className="h-1.5 w-8 rounded-full bg-muted-foreground/30 mb-1.5" />
              <div className="h-2.5 w-10 rounded-full bg-primary/70" />
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-2">
            <svg viewBox="0 0 36 36" className="size-9 shrink-0 -rotate-90">
              <circle cx="18" cy="18" r="15" fill="none" stroke="var(--muted)" strokeWidth="4" />
              <circle
                cx="18"
                cy="18"
                r="15"
                fill="none"
                stroke="var(--primary)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray="94.2"
                strokeDashoffset="24"
              />
            </svg>
            <div className="flex-1 space-y-1">
              <div className="h-1.5 w-16 rounded-full bg-foreground/20" />
              <div className="h-1.5 w-10 rounded-full bg-muted-foreground/25" />
            </div>
          </div>

          <div className="space-y-1.5 flex-1">
            <div className="flex items-end gap-1">
              <div className="rounded-lg rounded-bl-sm bg-muted px-2 py-1.5 max-w-[70%]">
                <div className="h-1.5 w-16 rounded-full bg-muted-foreground/30" />
              </div>
            </div>
            <div className="flex items-end justify-end gap-1">
              <div className="rounded-lg rounded-br-sm bg-primary/80 px-2 py-1.5 max-w-[70%]">
                <div className="h-1.5 w-12 rounded-full bg-white/50" />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-around rounded-lg border border-border bg-card px-2 py-1.5 mt-auto">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`size-3.5 rounded-md ${i === 0 ? "bg-primary" : "bg-muted-foreground/25"}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
