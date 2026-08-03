"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Tags, Plus, Trash2, X } from "lucide-react";
import { createTagAction, deleteTagAction } from "@/app/_actions/client-tags";
import { tagColorClass } from "@/lib/tag-colors";
import type { TagOption } from "@/components/client-tag-picker";
import { cn } from "@/lib/utils";

export function ManageTagsPanel({ allTags }: { allTags: TagOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [pending, startTransition] = useTransition();

  const create = () =>
    startTransition(async () => {
      const name = newName.trim();
      if (!name) return;
      const res = await createTagAction(name);
      if (res.error && !res.tagId) toast.error(res.error);
      else {
        toast.success(res.success ?? "สร้างแท็กแล้ว");
        setNewName("");
      }
      router.refresh();
    });

  const remove = (tagId: number) =>
    startTransition(async () => {
      const res = await deleteTagAction(tagId);
      if (res.error) toast.error(res.error);
      else toast.success(res.success ?? "ลบแท็กแล้ว");
      router.refresh();
    });

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-border bg-card text-sm hover:bg-muted"
      >
        <Tags className="size-4" />
        จัดการแท็ก
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 mt-2 w-64 rounded-lg border border-border bg-card shadow-lg z-50 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold">แท็กทั้งหมด</span>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="size-4" />
              </button>
            </div>
            <div className="max-h-56 overflow-y-auto space-y-1">
              {allTags.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">ยังไม่มีแท็ก — สร้างด้านล่าง</p>
              ) : (
                allTags.map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-2">
                    <span className={cn("text-xs px-2 py-0.5 rounded-full", tagColorClass(t.color))}>
                      {t.name}
                    </span>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => remove(t.id)}
                      className="text-muted-foreground hover:text-destructive disabled:opacity-50"
                      title="ลบแท็กนี้ (ถอดออกจากลูกเทรนทุกคนด้วย)"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    create();
                  }
                }}
                placeholder="ชื่อแท็กใหม่..."
                className="flex-1 h-8 px-2 rounded-md border border-input bg-card text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              />
              <button
                type="button"
                disabled={pending || !newName.trim()}
                onClick={create}
                className="h-8 w-8 shrink-0 rounded-md bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50"
              >
                <Plus className="size-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
