"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { format } from "date-fns";
import {
  Send,
  Image as ImageIcon,
  Smile,
  Trash2,
  Bell,
  BellOff,
  X,
  Check,
  CheckCheck,
  AlertTriangle,
} from "lucide-react";
import {
  sendChatMessageAction,
  markChatReadAction,
  deleteChatMessageAction,
} from "@/app/_actions/chat";
import { cn } from "@/lib/utils";

export type ChatMessageDTO = {
  id: number;
  senderId: number;
  body: string | null;
  hasImage: boolean;
  deleted: boolean;
  createdAt: string;
  mine: boolean;
  readByOther?: boolean;
};

const EMOJIS = [
  "😀", "😂", "😊", "😍", "😎", "🤔", "😅", "😢", "😡", "🥳",
  "👍", "👏", "🙏", "💪", "🔥", "❤️", "✅", "🎉", "💯", "😴",
  "🏋️", "🥗", "🍗", "💧", "⏰", "📸", "👀", "😮", "🙌", "✨",
];

const LINK_REGEX = /(https?:\/\/[^\s<>"']+)|(\b0\d{8,9}\b)/g;

function renderMessageBody(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  LINK_REGEX.lastIndex = 0;
  while ((match = LINK_REGEX.exec(text))) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    const matched = match[0];
    if (matched.startsWith("http")) {
      parts.push(
        <a
          key={key++}
          href={matched}
          target="_blank"
          rel="noopener noreferrer"
          className="underline break-all"
          onClick={(e) => e.stopPropagation()}
        >
          {matched}
        </a>,
      );
    } else {
      parts.push(
        <a
          key={key++}
          href={`tel:${matched}`}
          className="underline"
          onClick={(e) => e.stopPropagation()}
        >
          {matched}
        </a>,
      );
    }
    lastIndex = match.index + matched.length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

function dayKey(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

function dateDividerLabel(d: Date): string {
  const now = new Date();
  const diffDays = Math.round(
    (new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() -
      new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) /
      86400000,
  );
  if (diffDays === 0) return "วันนี้";
  if (diffDays === 1) return "เมื่อวาน";
  return format(d, "d MMM yyyy");
}

export function ChatThread({
  clientId,
  otherPartyName,
  otherPartyUserId,
  otherPartyAvatarPath,
  initialMessages,
  readOnly = false,
  deleteWindowMin,
  maxMessageLength,
}: {
  clientId: number;
  otherPartyName: string;
  otherPartyUserId: number;
  otherPartyAvatarPath: string | null;
  initialMessages: ChatMessageDTO[];
  /** โหมดดูอย่างเดียว (เช่น เจ้าของระบบเข้ามาตรวจสอบ) — ซ่อนช่องพิมพ์/ปุ่มโต้ตอบทั้งหมด และไม่มาร์กว่าอ่านแล้ว */
  readOnly?: boolean;
  /** จำนวนนาทีที่ลบข้อความของตัวเองได้หลังส่ง — ตั้งค่าได้จากหลังบ้านเจ้าของระบบ (siteSettings.chatDeleteWindowMin) */
  deleteWindowMin: number;
  /** ความยาวข้อความสูงสุด — ตั้งค่าได้จากหลังบ้านเจ้าของระบบ (siteSettings.chatMaxMessageLength) */
  maxMessageLength: number;
}) {
  const [messages, setMessages] = useState<ChatMessageDTO[]>(initialMessages);
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [notifyPermission, setNotifyPermission] = useState<NotificationPermission | "unsupported">(
    "default",
  );
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const countRef = useRef(initialMessages.length);
  const knownIdsRef = useRef(new Set(initialMessages.map((m) => m.id)));

  useEffect(() => {
    setNotifyPermission(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
  }, []);

  async function poll() {
    try {
      const r = await fetch(`/api/chat/${clientId}`, { cache: "no-store" });
      const d = await r.json();
      const msgs: ChatMessageDTO[] = d.messages ?? [];

      // แจ้งเตือนผ่านเบราว์เซอร์ถ้ามีข้อความใหม่จากอีกฝ่าย และแท็บนี้ไม่ได้โฟกัสอยู่
      const newOnes = msgs.filter((m) => !m.mine && !knownIdsRef.current.has(m.id));
      if (
        newOnes.length > 0 &&
        document.visibilityState === "hidden" &&
        typeof Notification !== "undefined" &&
        Notification.permission === "granted"
      ) {
        const last = newOnes[newOnes.length - 1];
        new Notification(`ข้อความใหม่จาก ${otherPartyName}`, {
          body: last.hasImage ? "ส่งรูปภาพมาให้คุณ" : (last.body ?? ""),
        });
      }
      knownIdsRef.current = new Set(msgs.map((m) => m.id));

      setMessages(msgs);
      if (!readOnly && msgs.length > countRef.current) {
        markChatReadAction(clientId);
      }
      countRef.current = msgs.length;
    } catch {
      /* เงียบไว้ — poll รอบถัดไปค่อยลองใหม่ */
    }
  }

  useEffect(() => {
    if (!readOnly) markChatReadAction(clientId);
    const t = setInterval(poll, 4000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  function send() {
    const body = text.trim();
    if (!body) return;
    setText("");
    setShowEmoji(false);
    startTransition(async () => {
      const res = await sendChatMessageAction(clientId, body);
      if (res.error) {
        setText(body); // ส่งไม่สำเร็จ — คืนข้อความกลับช่องพิมพ์
        return;
      }
      poll();
    });
  }

  async function onPickImage(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("clientId", String(clientId));
      fd.append("image", file);
      if (text.trim()) fd.append("caption", text.trim());
      const res = await fetch("/api/chat/upload", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error ?? "ส่งรูปไม่สำเร็จ");
        return;
      }
      setText("");
      poll();
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function requestNotifyPermission() {
    if (typeof Notification === "undefined") return;
    Notification.requestPermission().then((p) => setNotifyPermission(p));
  }

  function requestRemove(id: number) {
    setConfirmDeleteId(id);
  }

  function confirmRemove() {
    const id = confirmDeleteId;
    if (id == null) return;
    setConfirmDeleteId(null);
    startTransition(async () => {
      const res = await deleteChatMessageAction(id);
      if (res.error) {
        alert(res.error);
        return;
      }
      poll();
    });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const lightboxMsg = messages.find((m) => m.id === lightbox);

  return (
    <div className="flex flex-col h-[calc(100vh-220px)] min-h-[420px] rounded-[var(--radius-lg)] border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
        <div className="h-9 w-9 shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold overflow-hidden">
          {otherPartyAvatarPath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/avatar/${otherPartyUserId}`}
              alt={otherPartyName}
              className="h-full w-full object-cover"
            />
          ) : (
            otherPartyName.charAt(0)
          )}
        </div>
        <div className="font-semibold flex-1 min-w-0 truncate">{otherPartyName}</div>
        {readOnly && (
          <span className="text-[11px] text-muted-foreground bg-muted px-2 py-1 rounded-full shrink-0">
            ดูอย่างเดียว
          </span>
        )}
        {!readOnly && notifyPermission !== "unsupported" && (
          <button
            type="button"
            onClick={requestNotifyPermission}
            disabled={notifyPermission !== "default"}
            title={
              notifyPermission === "granted"
                ? "เปิดแจ้งเตือนแล้ว"
                : notifyPermission === "denied"
                  ? "ถูกปิดกั้นแจ้งเตือน — เปิดได้จากการตั้งค่าเบราว์เซอร์"
                  : "เปิดแจ้งเตือนเมื่อมีข้อความใหม่"
            }
            className={cn(
              "p-1.5 rounded-md shrink-0 transition-colors",
              notifyPermission === "granted"
                ? "text-primary"
                : "text-muted-foreground hover:bg-muted disabled:opacity-50",
            )}
          >
            {notifyPermission === "granted" ? (
              <Bell className="size-4" />
            ) : (
              <BellOff className="size-4" />
            )}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-10">
            ยังไม่มีข้อความ — เริ่มทักได้เลย
          </p>
        ) : (
          messages.map((m, i) => {
            const createdAt = new Date(m.createdAt);
            const prev = i > 0 ? new Date(messages[i - 1].createdAt) : null;
            const showDivider = !prev || dayKey(prev) !== dayKey(createdAt);
            const canDelete =
              !readOnly &&
              m.mine &&
              !m.deleted &&
              Date.now() - createdAt.getTime() <= deleteWindowMin * 60 * 1000;

            return (
              <div key={m.id}>
                {showDivider && (
                  <div className="flex items-center justify-center py-2">
                    <span className="text-[11px] text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full">
                      {dateDividerLabel(createdAt)}
                    </span>
                  </div>
                )}
                <div className={cn("group flex items-end gap-1.5", m.mine ? "justify-end" : "justify-start")}>
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => requestRemove(m.id)}
                      disabled={pending}
                      title="ลบข้อความ"
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-muted-foreground hover:text-destructive disabled:opacity-50"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                  <div
                    className={cn(
                      "max-w-[75%] rounded-2xl text-sm",
                      m.deleted
                        ? "px-3.5 py-2 italic text-muted-foreground bg-muted/60 border border-dashed border-border"
                        : m.mine
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-muted text-foreground rounded-bl-sm",
                      !m.deleted && m.hasImage ? "p-1.5" : !m.deleted ? "px-3.5 py-2" : "",
                    )}
                  >
                    {m.deleted ? (
                      "ข้อความนี้ถูกลบแล้ว"
                    ) : (
                      <>
                        {m.hasImage && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={`/api/chat/image/${m.id}`}
                            alt="รูปภาพที่ส่ง"
                            onClick={() => setLightbox(m.id)}
                            className={cn(
                              "rounded-xl max-h-64 object-cover cursor-pointer",
                              m.body && "mb-1.5",
                            )}
                          />
                        )}
                        {m.body && (
                          <div className={cn("whitespace-pre-wrap break-words", m.hasImage && "px-2 pb-1")}>
                            {renderMessageBody(m.body)}
                          </div>
                        )}
                        <div
                          className={cn(
                            "flex items-center gap-1 text-[10px] mt-1 opacity-70",
                            m.mine ? "justify-end" : "justify-start",
                            m.hasImage && "px-2 pb-0.5",
                          )}
                        >
                          {format(createdAt, "HH:mm")}
                          {m.mine &&
                            (m.readByOther ? (
                              <CheckCheck className="size-3" />
                            ) : (
                              <Check className="size-3" />
                            ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {!readOnly && showEmoji && (
        <div className="px-3 pt-2 border-t border-border shrink-0">
          <div className="grid grid-cols-10 gap-1 pb-2">
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setText((t) => t + e)}
                className="text-lg hover:bg-muted rounded p-1"
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      )}

      {!readOnly && (
        <div className={cn("p-3 flex items-end gap-2 shrink-0", !showEmoji && "border-t border-border")}>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            title="ส่งรูปภาพ"
            className="h-10 w-10 shrink-0 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-50"
          >
            <ImageIcon className="size-4.5" />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onPickImage(e.target.files?.[0])}
          />
          <button
            type="button"
            onClick={() => setShowEmoji((v) => !v)}
            title="อีโมจิ"
            className={cn(
              "h-10 w-10 shrink-0 rounded-md border border-border flex items-center justify-center hover:bg-muted",
              showEmoji ? "text-primary bg-primary/10" : "text-muted-foreground",
            )}
          >
            <Smile className="size-4.5" />
          </button>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="พิมพ์ข้อความ... (Enter เพื่อส่ง, Shift+Enter ขึ้นบรรทัดใหม่)"
            rows={1}
            maxLength={maxMessageLength}
            className="flex-1 resize-none min-h-10 max-h-32 px-3 py-2 rounded-md border border-input bg-card text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          />
          <button
            type="button"
            onClick={send}
            disabled={pending || uploading || !text.trim()}
            className="h-10 w-10 shrink-0 rounded-md bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            <Send className="size-4.5" />
          </button>
        </div>
      )}

      {lightboxMsg && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-2"
          >
            <X className="size-6" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/chat/image/${lightboxMsg.id}`}
            alt="รูปภาพ"
            className="max-h-full max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {confirmDeleteId != null && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setConfirmDeleteId(null)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-delete-title"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-[var(--radius-lg)] border border-border bg-card p-5 shadow-lg"
          >
            <div className="flex items-start gap-3">
              <div className="shrink-0 h-10 w-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
                <AlertTriangle className="size-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 id="confirm-delete-title" className="font-semibold">
                  ลบข้อความนี้?
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  ข้อความจะถูกลบสำหรับทุกคนในบทสนทนานี้ และไม่สามารถกู้คืนได้
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="h-9 px-4 rounded-md border border-border text-sm font-medium hover:bg-muted transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={confirmRemove}
                disabled={pending}
                className="h-9 px-4 rounded-md bg-destructive text-destructive-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                ลบข้อความ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
