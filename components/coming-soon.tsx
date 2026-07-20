import { Construction } from "lucide-react";

export function ComingSoon({ phase }: { phase: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 rounded-[var(--radius-lg)] border border-dashed border-border bg-card">
      <div className="h-12 w-12 rounded-full bg-accent text-accent-foreground flex items-center justify-center mb-3">
        <Construction className="size-6" />
      </div>
      <p className="font-medium">อยู่ระหว่างพัฒนา</p>
      <p className="text-sm text-muted-foreground mt-1">
        ฟีเจอร์นี้จะมาใน{phase}
      </p>
    </div>
  );
}
