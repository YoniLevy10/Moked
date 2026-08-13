"use client";

import { useEffect, useState } from "react";
import { Conversation, Message } from "@/lib/types";

type ConvRow = Conversation & { lastMessage?: Message };

export default function InboxPage() {
  const [conversations, setConversations] = useState<ConvRow[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  async function loadList() {
    const res = await fetch("/api/conversations");
    const data = await res.json();
    setConversations(data.conversations ?? []);
  }

  async function loadMessages(id: string) {
    setSelected(id);
    const res = await fetch(`/api/conversations?id=${id}`);
    const data = await res.json();
    setMessages(data.messages ?? []);
  }

  async function takeover(id: string, status: "human_takeover" | "open") {
    await fetch("/api/conversations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    await loadList();
    if (selected === id) await loadMessages(id);
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

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <aside className="rounded-3xl border border-line bg-white/70 p-3">
        <h1 className="display px-2 pb-3 text-xl font-bold">שיחות</h1>
        <div className="max-h-[70vh] space-y-2 overflow-auto">
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
      </aside>

      <section className="rounded-3xl border border-line bg-white/70 p-4">
        {!selected ? (
          <p className="text-muted">בחרו שיחה מהרשימה</p>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap gap-2">
              <button
                onClick={() => void takeover(selected, "human_takeover")}
                className="rounded-full border border-line px-4 py-2 text-sm font-medium"
              >
                השתלטות אנושית
              </button>
              <button
                onClick={() => void takeover(selected, "open")}
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
            <div className="flex max-h-[65vh] flex-col gap-3 overflow-auto">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    m.direction === "inbound"
                      ? "self-start bg-paper-2"
                      : "self-end bg-brand text-white"
                  }`}
                >
                  <div className="whitespace-pre-wrap">{m.body}</div>
                  <div
                    className={`mt-1 text-[10px] ${
                      m.direction === "inbound"
                        ? "text-muted"
                        : "text-white/70"
                    }`}
                  >
                    {m.processKey ?? m.type} ·{" "}
                    {new Date(m.createdAt).toLocaleString("he-IL")}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
