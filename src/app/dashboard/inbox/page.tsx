"use client";

import { useEffect, useMemo, useState } from "react";
import { Conversation, Message } from "@/lib/types";

type ConvRow = Conversation & { lastMessage?: Message };

function waitLabel(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.max(0, Math.floor(ms / 60000));
  if (mins < 60) return `${mins} דק׳`;
  const hours = Math.floor(mins / 60);
  return `${hours} שע׳`;
}

export default function InboxPage() {
  const [conversations, setConversations] = useState<ConvRow[]>([]);
  const [waiting, setWaiting] = useState<ConvRow[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadList() {
    const res = await fetch("/api/conversations");
    const data = await res.json();
    setConversations(data.conversations ?? []);
    setWaiting(data.waitingForHuman ?? []);
  }

  async function loadMessages(id: string) {
    setSelected(id);
    const res = await fetch(`/api/conversations?id=${id}`);
    const data = await res.json();
    setMessages(data.messages ?? []);
  }

  async function takeover(id: string) {
    await fetch("/api/conversations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "takeover" }),
    });
    await loadList();
    if (selected === id) await loadMessages(id);
  }

  async function resolve(id: string) {
    await fetch("/api/conversations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "resolve" }),
    });
    await loadList();
    if (selected === id) await loadMessages(id);
  }

  async function resumeAutomation(id: string) {
    await fetch("/api/conversations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "open" }),
    });
    await loadList();
    if (selected === id) await loadMessages(id);
  }

  async function sendOwnerReply() {
    if (!selected || !reply.trim()) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selected, body: reply.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "שליחה נכשלה");
      setReply("");
      await loadList();
      await loadMessages(selected);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setSending(false);
    }
  }

  async function runAction(
    action: "send_reminder_t24" | "send_reminder_t2" | "send_retention",
  ) {
    if (!selected) return;
    await fetch("/api/processes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, conversationId: selected }),
    });
    await loadMessages(selected);
    await loadList();
  }

  useEffect(() => {
    void loadList();
  }, []);

  const waitingIds = useMemo(() => new Set(waiting.map((c) => c.id)), [waiting]);

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <aside className="space-y-4">
        <div className="rounded-3xl border border-line bg-white/70 p-3">
          <h1 className="display px-2 pb-2 text-xl font-bold">ממתין לאדם</h1>
          <p className="px-2 pb-3 text-xs text-muted">לפי זמן המתנה</p>
          <div className="max-h-[28vh] space-y-2 overflow-auto">
            {waiting.length === 0 && (
              <p className="px-2 text-sm text-muted">אין שיחות ממתינות.</p>
            )}
            {waiting.map((c) => (
              <button
                key={c.id}
                onClick={() => void loadMessages(c.id)}
                className={`w-full rounded-2xl px-3 py-3 text-right transition ${
                  selected === c.id ? "bg-brand/10" : "hover:bg-paper-2"
                }`}
              >
                <div className="font-semibold">
                  {c.customerName ?? c.customerWaId}
                </div>
                <div className="text-xs text-danger">
                  {c.escalation?.reason} · {waitLabel(c.escalation!.at)}
                </div>
                <div className="mt-2 flex gap-2">
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      void takeover(c.id);
                    }}
                    className="rounded-full border border-line px-2 py-1 text-[11px] font-medium"
                  >
                    השתלטות
                  </span>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      void resolve(c.id);
                    }}
                    className="rounded-full border border-line px-2 py-1 text-[11px] font-medium"
                  >
                    סיום
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-line bg-white/70 p-3">
          <h2 className="display px-2 pb-3 text-lg font-bold">כל השיחות</h2>
          <div className="max-h-[40vh] space-y-2 overflow-auto">
            {conversations.length === 0 && (
              <p className="px-2 text-sm text-muted">
                אין שיחות עדיין — שלחו הודעה מהסימולטור בסקירה.
              </p>
            )}
            {conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => void loadMessages(c.id)}
                className={`w-full rounded-2xl px-3 py-3 text-right transition ${
                  selected === c.id ? "bg-brand/10" : "hover:bg-paper-2"
                }`}
              >
                <div className="font-semibold">
                  {c.customerName ?? c.customerWaId}
                  {waitingIds.has(c.id) ? " · ממתין" : ""}
                </div>
                <div className="truncate text-xs text-muted">
                  {c.lastMessage?.body ?? "—"}
                </div>
                <div className="mt-1 text-[11px] text-brand">
                  {c.activeProcess ?? c.status}
                  {c.leadScore != null ? ` · ציון ${c.leadScore}` : ""}
                </div>
              </button>
            ))}
          </div>
        </div>
      </aside>

      <section className="rounded-3xl border border-line bg-white/70 p-4">
        {!selected ? (
          <p className="text-muted">בחרו שיחה מהרשימה</p>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap gap-2">
              <button
                onClick={() => void takeover(selected)}
                className="rounded-full border border-line px-4 py-2 text-sm font-medium"
              >
                השתלטות אנושית
              </button>
              <button
                onClick={() => void resolve(selected)}
                className="rounded-full border border-line px-4 py-2 text-sm font-medium"
              >
                סיום הסלמה
              </button>
              <button
                onClick={() => void resumeAutomation(selected)}
                className="rounded-full border border-line px-4 py-2 text-sm font-medium"
              >
                החזר לאוטומציה
              </button>
              <button
                onClick={() => void runAction("send_reminder_t24")}
                className="rounded-full border border-line px-4 py-2 text-sm font-medium"
              >
                תזכורת T-24
              </button>
              <button
                onClick={() => void runAction("send_reminder_t2")}
                className="rounded-full border border-line px-4 py-2 text-sm font-medium"
              >
                תזכורת T-2
              </button>
              <button
                onClick={() => void runAction("send_retention")}
                className="rounded-full border border-line px-4 py-2 text-sm font-medium"
              >
                שלח שימור
              </button>
            </div>
            <div className="max-h-[55vh] space-y-3 overflow-auto">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`rounded-2xl px-4 py-3 text-sm ${
                    m.direction === "inbound"
                      ? "bg-paper-2"
                      : "bg-brand/10 text-ink"
                  }`}
                >
                  <div className="mb-1 text-[11px] text-muted">
                    {m.direction === "inbound" ? "לקוח" : "MOKED"} ·{" "}
                    {new Date(m.createdAt).toLocaleString("he-IL")}
                  </div>
                  <div className="whitespace-pre-wrap">{m.body}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-2 border-t border-line pt-4">
              <p className="text-xs text-muted">
                תשובת בעלים — מעבירה ל־human takeover והסוכן שותק עד החזרה
                לאוטומציה.
              </p>
              <textarea
                className="w-full rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm outline-none ring-brand focus:ring-2"
                rows={3}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="כתבו ללקוח…"
              />
              {error ? <p className="text-sm text-danger">{error}</p> : null}
              <button
                type="button"
                disabled={sending || !reply.trim()}
                onClick={() => void sendOwnerReply()}
                className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {sending ? "שולח..." : "שלח כבעלים"}
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
