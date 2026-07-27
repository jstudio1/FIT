"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

export function PopupAnnouncement({
  title,
  linkUrl,
  seenKey,
}: {
  title: string | null;
  linkUrl: string | null;
  seenKey: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const storageKey = `popup_seen_${seenKey}`;
    if (sessionStorage.getItem(storageKey)) return;
    sessionStorage.setItem(storageKey, "1");
    setOpen(true);
  }, [seenKey]);

  if (!open) return null;

  const image = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/api/popup-image"
      alt={title ?? "ประกาศ"}
      className="w-full h-auto object-contain rounded-t-[var(--radius-lg)]"
    />
  );

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/50" onClick={() => setOpen(false)} />
      <div className="fixed inset-0 z-[61] flex items-center justify-center p-4 pointer-events-none">
        <div className="relative w-full max-w-md rounded-[var(--radius-lg)] bg-card shadow-xl overflow-hidden pointer-events-auto">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute top-2 right-2 z-10 h-8 w-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70"
            aria-label="ปิด"
          >
            <X className="size-4" />
          </button>
          {linkUrl ? (
            <a href={linkUrl} target="_blank" rel="noopener noreferrer">
              {image}
            </a>
          ) : (
            image
          )}
          {title && <p className="p-4 text-sm font-medium">{title}</p>}
        </div>
      </div>
    </>
  );
}
