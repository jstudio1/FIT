"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Megaphone } from "lucide-react";
import { broadcastAction } from "@/app/_actions/owner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type BroadcastRecipient = {
  id: number;
  fullName: string;
  username: string;
  active: boolean;
};

export function BroadcastForm({
  trainers,
  clients,
}: {
  trainers: BroadcastRecipient[];
  clients: BroadcastRecipient[];
}) {
  const [state, formAction, pending] = useActionState(broadcastAction, null);
  const formRef = useRef<HTMLFormElement>(null);
  const [targetRole, setTargetRole] = useState<"TRAINER" | "CLIENT">("TRAINER");
  const [mode, setMode] = useState<"ALL" | "SPECIFIC">("ALL");
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const list = targetRole === "TRAINER" ? trainers : clients;
  const listLabel = targetRole === "TRAINER" ? "เทรนเนอร์" : "ลูกเทรน";

  useEffect(() => {
    if (state?.success) {
      toast.success(state.success);
      formRef.current?.reset();
      setMode("ALL");
      setSelected(new Set());
    } else if (state?.error) {
      toast.error(state.error);
    }
  }, [state]);

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const canSubmit = useMemo(
    () => mode === "ALL" || selected.size > 0,
    [mode, selected],
  );

  return (
    <form
      ref={formRef}
      action={formAction}
      className="rounded-[var(--radius-lg)] border border-border bg-card shadow-sm p-5 space-y-4 max-w-xl"
    >
      <input type="hidden" name="targetRole" value={targetRole} />
      <input type="hidden" name="mode" value={mode} />

      <div>
        <Label>ส่งถึง</Label>
        <div className="flex gap-2 mt-1.5">
          {(["TRAINER", "CLIENT"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => {
                setTargetRole(r);
                setMode("ALL");
                setSelected(new Set());
              }}
              className={cn(
                "flex-1 px-3 py-2 rounded-md text-sm font-medium border transition-colors",
                targetRole === r
                  ? "bg-primary text-primary-foreground border-transparent"
                  : "border-border hover:bg-muted",
              )}
            >
              {r === "TRAINER" ? "เทรนเนอร์" : "ลูกเทรน"}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label>ผู้รับ</Label>
        <div className="flex gap-2 mt-1.5">
          {(["ALL", "SPECIFIC"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                "flex-1 px-3 py-2 rounded-md text-sm font-medium border transition-colors",
                mode === m
                  ? "bg-accent text-accent-foreground border-transparent"
                  : "border-border hover:bg-muted",
              )}
            >
              {m === "ALL" ? `${listLabel}ทุกคน` : "เลือกเฉพาะบางคน"}
            </button>
          ))}
        </div>
      </div>

      {mode === "SPECIFIC" && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-muted-foreground">
              เลือกแล้ว {selected.size} คน
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelected(new Set(list.map((p) => p.id)))}
                className="text-xs text-primary hover:underline"
              >
                เลือกทั้งหมด
              </button>
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                className="text-xs text-muted-foreground hover:underline"
              >
                ล้างการเลือก
              </button>
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto rounded-[var(--radius-md)] border border-border divide-y divide-border">
            {list.length === 0 ? (
              <p className="text-sm text-muted-foreground p-3">ยังไม่มี{listLabel}ในระบบ</p>
            ) : (
              list.map((p) => (
                <label
                  key={p.id}
                  className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted/50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    name="userIds"
                    value={p.id}
                    checked={selected.has(p.id)}
                    onChange={() => toggle(p.id)}
                    className="size-4"
                  />
                  <span className="flex-1 min-w-0 truncate">
                    {p.fullName} <span className="text-muted-foreground">@{p.username}</span>
                  </span>
                  {!p.active && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">
                      ปิด
                    </span>
                  )}
                </label>
              ))
            )}
          </div>
        </div>
      )}

      <div>
        <Label htmlFor="title">หัวข้อ</Label>
        <Input
          id="title"
          name="title"
          placeholder="เช่น ปิดปรับปรุงระบบวันอาทิตย์"
          required
        />
      </div>
      <div>
        <Label htmlFor="message">ข้อความ</Label>
        <Textarea
          id="message"
          name="message"
          placeholder="รายละเอียดที่ต้องการแจ้ง..."
          className="min-h-24"
        />
      </div>
      {mode === "ALL" && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="activeOnly" defaultChecked className="size-4" />
          ส่งเฉพาะที่ใช้งานอยู่
        </label>
      )}
      <Button type="submit" disabled={pending || !canSubmit}>
        <Megaphone className="size-4" />
        {pending ? "กำลังส่ง..." : "ส่งประกาศ"}
      </Button>
    </form>
  );
}
