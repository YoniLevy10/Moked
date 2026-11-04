"use client";

import { FormEvent, useEffect, useState } from "react";
import { BotAnswers, Subscription } from "@/lib/types";

type View = {
  priceIls: number;
  subscription: Subscription;
  bot: { draft: string; approved?: string; answers: BotAnswers };
  number: { status: string; national: string } | null;
  billingConnected: boolean;
};

const STATUS_LABEL: Record<Subscription["status"], string> = {
  inactive: "לא הופעל",
  pending: "ממתין לאישור גבייה",
  active: "פעיל",
  past_due: "באיחור",
  canceled: "בוטל",
};

export default function BotPage() {
  const [view, setView] = useState<View | null>(null);
  const [answers, setAnswers] = useState<BotAnswers>({
    what: "",
    hours: "",
    forbidden: "",
    handoff: "",
    pasted: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    const res = await fetch("/api/billing/checkout");
    const data = await res.json();
    if (!res.ok) {
      setError(data.message ?? data.error ?? "שגיאה");
      return;
    }
    setView(data);
    setAnswers(data.bot.answers);
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function checkout() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/billing/checkout", { method: "POST" });
    const data = await res.json();
    if (!res.ok) setError(data.error ?? "שגיאה");
    await refresh();
    setLoading(false);
  }

  async function draft(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/bot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(answers),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error ?? "שגיאה");
    await refresh();
    setLoading(false);
  }

  async function approve() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/bot/approve", { method: "POST" });
    const data = await res.json();
    if (!res.ok) setError(data.error ?? "שגיאה");
    await refresh();
    setLoading(false);
  }

  async function cancel() {
    setLoading(true);
    await fetch("/api/billing/cancel", { method: "POST" });
    await refresh();
    setLoading(false);
  }

  if (!view) return <p className="text-sm text-muted">טוען…</p>;

  const live =
    view.subscription.status === "active" &&
    Boolean(view.bot.approved) &&
    view.number?.status === "live";

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold text-brand">המנוי והבוט</p>
        <h1 className="display text-3xl font-bold">הפעלת הבוט</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          {view.priceIls} ₪ לחודש. הבוט עונה רק אחרי שהמנוי פעיל, יש מספר חי, וההוראות אושרו.
        </p>
      </header>

      <section className="grid gap-3 rounded-3xl border border-line bg-white/80 p-5 sm:grid-cols-3">
        <p>מנוי: {STATUS_LABEL[view.subscription.status]}</p>
        <p>מספר: {view.number ? view.number.status : "אין מספר פנוי במאגר"}</p>
        <p>הוראות: {view.bot.approved ? "מאושרות" : "ממתינות"}</p>
        <p className="sm:col-span-3 text-sm text-muted">
          {live
            ? `הבוט חי על ${view.number?.national}`
            : "הבוט עדיין לא באוויר. גבייה ומאגר המספרים מתחברים בנפרד."}
        </p>
      </section>

      {view.subscription.status !== "active" && (
        <button
          type="button"
          disabled={loading}
          onClick={() => void checkout()}
          className="rounded-full bg-brand px-5 py-3 font-semibold text-white disabled:opacity-60"
        >
          {view.billingConnected ? "המשך לתשלום" : "שמור בקשת מנוי"}
        </button>
      )}
      {!view.billingConnected && view.subscription.status === "pending" && (
        <p className="text-sm text-muted">
          הבקשה ממתינה. ברגע שחיבור הגבייה יאשר תשלום, המנוי יופעל ומספר פנוי יינעל.
        </p>
      )}

      <form onSubmit={draft} className="grid gap-3 rounded-3xl border border-line bg-white/80 p-5">
        <label className="text-sm">
          מה העסק עושה
          <textarea
            className="mt-1 w-full rounded-2xl border border-line px-4 py-3"
            value={answers.what}
            onChange={(e) => setAnswers({ ...answers, what: e.target.value })}
          />
        </label>
        <label className="text-sm">
          שעות
          <input
            className="mt-1 w-full rounded-2xl border border-line px-4 py-3"
            value={answers.hours}
            onChange={(e) => setAnswers({ ...answers, hours: e.target.value })}
          />
        </label>
        <label className="text-sm">
          מה אסור לבוט
          <input
            className="mt-1 w-full rounded-2xl border border-line px-4 py-3"
            value={answers.forbidden}
            onChange={(e) => setAnswers({ ...answers, forbidden: e.target.value })}
          />
        </label>
        <label className="text-sm">
          מתי להעביר לאדם
          <input
            className="mt-1 w-full rounded-2xl border border-line px-4 py-3"
            value={answers.handoff}
            onChange={(e) => setAnswers({ ...answers, handoff: e.target.value })}
          />
        </label>
        <label className="text-sm">
          הוראות חופשיות
          <textarea
            className="mt-1 min-h-28 w-full rounded-2xl border border-line px-4 py-3"
            value={answers.pasted}
            onChange={(e) => setAnswers({ ...answers, pasted: e.target.value })}
          />
        </label>
        <button
          disabled={loading}
          className="rounded-full border border-line bg-white py-3 font-semibold disabled:opacity-60"
        >
          נסח הוראות
        </button>
      </form>

      {view.bot.draft && (
        <section className="rounded-3xl border border-line bg-white/80 p-5">
          <h2 className="font-bold">טיוטה לאישור</h2>
          <pre className="mt-3 whitespace-pre-wrap text-sm">{view.bot.draft}</pre>
          <button
            type="button"
            disabled={loading}
            onClick={() => void approve()}
            className="mt-4 rounded-full bg-brand px-5 py-3 font-semibold text-white disabled:opacity-60"
          >
            אשר הוראות
          </button>
        </section>
      )}

      {view.subscription.status === "active" && (
        <button type="button" onClick={() => void cancel()} className="text-sm text-danger underline">
          בטל מנוי
        </button>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
