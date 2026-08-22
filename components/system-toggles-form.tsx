"use client";

import { useActionState, useEffect, useState } from "react";
import { MessageCircle, Trophy, Save } from "lucide-react";
import { saveSystemTogglesAction } from "@/app/_actions/owner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      className={cn(
        "relative shrink-0 h-7 w-12 rounded-full transition-colors disabled:opacity-50",
        checked ? "bg-primary" : "bg-muted",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform",
          checked && "translate-x-5",
        )}
      />
    </button>
  );
}

export function SystemTogglesForm({
  chatEnabled: initialChatEnabled,
  gamificationEnabled: initialGamificationEnabled,
  pointsTrainingCompleted,
  pointsFoodLogged,
  pointsBadgeBonus,
}: {
  chatEnabled: boolean;
  gamificationEnabled: boolean;
  pointsTrainingCompleted: number;
  pointsFoodLogged: number;
  pointsBadgeBonus: number;
}) {
  const [state, formAction, pending] = useActionState(saveSystemTogglesAction, null);
  const [chatEnabled, setChatEnabled] = useState(initialChatEnabled);
  const [gamificationEnabled, setGamificationEnabled] = useState(initialGamificationEnabled);

  useEffect(() => {
    if (state?.success) toast.success(state.success);
    else if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <form
      action={formAction}
      className="rounded-[var(--radius-lg)] border border-border bg-card shadow-sm p-5 space-y-5"
    >
      <input type="hidden" name="chatEnabled" value={chatEnabled ? "on" : "off"} />
      <input type="hidden" name="gamificationEnabled" value={gamificationEnabled ? "on" : "off"} />

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <MessageCircle className="size-4.5 text-primary shrink-0" />
          <div>
            <div className="font-medium text-sm">ระบบแชทเทรนเนอร์-ลูกเทรน</div>
            <p className="text-xs text-muted-foreground">ปิดแล้วเมนู &ldquo;แชท&rdquo; จะหายไปทั้งสองฝั่ง</p>
          </div>
        </div>
        <Toggle checked={chatEnabled} onChange={setChatEnabled} disabled={pending} />
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Trophy className="size-4.5 text-primary shrink-0" />
          <div>
            <div className="font-medium text-sm">ระบบแต้มสะสม / Badge / Leaderboard</div>
            <p className="text-xs text-muted-foreground">ปิดแล้วจะไม่มีการให้แต้มใหม่ และซ่อนเมนู &ldquo;แต้มสะสม&rdquo;</p>
          </div>
        </div>
        <Toggle checked={gamificationEnabled} onChange={setGamificationEnabled} disabled={pending} />
      </div>

      <div className="border-t border-border pt-4">
        <Label className="mb-2 block">ค่าแต้มที่ให้ (แต้ม)</Label>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label htmlFor="pointsTrainingCompleted" className="text-xs text-muted-foreground">
              มาเทรนสำเร็จ
            </Label>
            <Input
              id="pointsTrainingCompleted"
              name="pointsTrainingCompleted"
              type="number"
              min={0}
              defaultValue={pointsTrainingCompleted}
            />
          </div>
          <div>
            <Label htmlFor="pointsFoodLogged" className="text-xs text-muted-foreground">
              ส่งรูปอาหาร
            </Label>
            <Input
              id="pointsFoodLogged"
              name="pointsFoodLogged"
              type="number"
              min={0}
              defaultValue={pointsFoodLogged}
            />
          </div>
          <div>
            <Label htmlFor="pointsBadgeBonus" className="text-xs text-muted-foreground">
              ปลดล็อก Badge
            </Label>
            <Input
              id="pointsBadgeBonus"
              name="pointsBadgeBonus"
              type="number"
              min={0}
              defaultValue={pointsBadgeBonus}
            />
          </div>
        </div>
      </div>

      <Button type="submit" disabled={pending}>
        <Save className="size-4" />
        {pending ? "กำลังบันทึก..." : "บันทึกการตั้งค่าระบบ"}
      </Button>
    </form>
  );
}
