"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Tag, Plus, X } from "lucide-react";
import { createTagAction, toggleClientTagAction } from "@/app/_actions/client-tags";
import { tagColorClass } from "@/lib/tag-colors";
import { cn } from "@/lib/utils";

export type TagOption = { id: number; name: string; color: string };

export function ClientTagPicker({
  clientId,
  allTags,
  assignedTagIds,
}: {
  clientId: number;
  allTags: TagOption[];
  assignedTagIds: number[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [pending, startTransition] = useTransition();
  const assigned = new Set(assignedTagIds);

  const toggle = (tagId: number) =>
    startTransition(async () => {
      const res = await toggleClientTagAction(clientId, tagId);
      if (res.error) toast.error(res.error);
      router.refresh();
    });

  const createAndAssign = () =>
    startTransition(async () => {
      const name = newName.trim();
      if (!name) return;
      const res = await createTagAction(name);
      if (res.error && !res.tagId) {
        toast.error(res.error);
        return;
      }
      if (res.tagId) await toggleClientTagAction(clientId, res.tagId);
      setNewName("");
      router.refresh();
    });

  return (
    <div className="relative inline-block">
      <div className="flex flex-wrap items-center gap-1.5">
        {allTags
          .filter((t) => assigned.has(t.id))
          .map((t) => (
            <span
              key={t.id}
              className={cn(
                "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full",
                tagColorClass(t.color),
              )}
            >
              {t.name}
              <button
                type="button"
                disabled={pending}
                onClick={(e) => {
                  e.stopPropagation();
                  toggle(t.id);
                }}
                className="hover:opacity-70 disabled:opacity-50"
                aria-label={`ถอดแท็ก ${t.name}`}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpen((v) => !v);
          }}
          className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border border-dashed border-border text-muted-foreground hover:bg-muted"
        >
          <Tag className="size-3" />
          แท็ก
        </button>
      </div>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute left-0 mt-2 w-56 rounded-lg border border-border bg-card shadow-lg z-50 p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="max-h-48 overflow-y-auto space-y-0.5">
              {allTags.length === 0 && (
                <p className="text-xs text-muted-foreground px-2 py-1.5">ยังไม่มีแท็ก</p>
              )}
              {allTags.map((t) => (
                <label
                  key={t.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-muted cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={assigned.has(t.id)}
                    disabled={pending}
                    onChange={() => toggle(t.id)}
                    className="size-3.5"
                  />
                  <span className={cn("text-xs px-1.5 py-0.5 rounded-full", tagColorClass(t.color))}>
                    {t.name}
                  </span>
                </label>
              ))}
            </div>
            <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    createAndAssign();
                  }
                }}
                placeholder="สร้างแท็กใหม่..."
                className="flex-1 h-8 px-2 rounded-md border border-input bg-card text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              />
              <button
                type="button"
                disabled={pending || !newName.trim()}
                onClick={createAndAssign}
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
