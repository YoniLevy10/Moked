"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BotAnswers, Subscription } from "@/lib/types";

type View = {
  priceIls: number;
  subscription: Subscription;
  bot: { draft: string; approved?: string; answers: BotAnswers };
  number: { status: string; national: string } | null;
  billingConnected: boolean;
};

type Readiness = { ready: boolean };

const STATUS_LABEL: Record<Subscription["status"], string> = {
  inactive: "לא הופעל",
  pending: "ממתין לאישור גבייה",
  active: "פעיל",
  past_due: "באיחור",
  canceled: "בוטל",
};

function wishFrom(answers: BotAnswers): string {
  const parts = [answers.what, answers.hours, answers.forbidden, answers.handoff, answers.pasted]
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.join("\n");
}

export default function BotPage() {
  const router = useRouter();
  const [view, setView] = useState<View | null>(null);
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [wish, setWish] = useState("");
  const [polished, setPolished] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    const [res, readyRes] = await Promise.all([
      fetch("/api/billing/checkout"),
      fetch("/api/tenants/readiness"),
    ]);
    const data = await res.json();
    if (!res.ok) {
      setError(data.message ?? data.error ?? "שגיאה");
      return;
    }
    setView(data);
    setWish(wishFrom(data.bot.answers));
    setPolished(data.bot.draft ?? "");
    if (readyRes.ok) {
      setReadiness((await readyRes.json()) as Readiness);
    }
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
    else if (typeof data.checkoutUrl === "string" && data.checkoutUrl) {
      window.location.href = data.checkoutUrl;
      return;
    }
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
      body: JSON.stringify({
        what: "",
        hours: "",
        forbidden: "",
        handoff: "",
        pasted: wish,
      }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error ?? "שגיאה");
    else setPolished(data.draft ?? "");
    setLoading(false);
  }

  async function approve() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/bot/approve", { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "שגיאה");
      setLoading(false);
      return;
    }
    router.push("/dashboard");
  }

  async function cancel() {
    setLoading(true);
    await fetch("/api/billing/cancel", { method: "POST" });
    await refresh();
    setLoading(false);
  }

  if (!view) return <p className="text-sm text-muted">טוען…</p>;

  const live =
    readiness?.ready === true &&
    view.subscription.status === "active" &&
    Boolean(view.bot.approved) &&
    view.number?.status === "live";

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold text-brand">המנוי והבוט</p>
        <h1 className="display text-3xl font-bold">מה הבוט צריך לעשות</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          כותבים בשפה חופשית. «נסח הוראות» משפר את הניסוח, ואחרי אישור ממשיכים.
        </p>
      </header>

      <section className="grid gap-3 rounded-3xl border border-line bg-white p-5 sm:grid-cols-3">
        <p>מנוי: {STATUS_LABEL[view.subscription.status]}</p>
        <p>מספר: {view.number ? view.number.status : "אין מספר פנוי במאגר"}</p>
        <p>הוראות: {view.bot.approved ? "מאושרות" : "ממתינות"}</p>
        <p className="sm:col-span-3 text-sm text-muted">
          {live
            ? `הבוט חי על ${view.number?.national}`
            : readiness?.ready === false
              ? "לא מסמנים «חי» — יש שלב חוסם ברשימת המוכנות."
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

      <form onSubmit={draft} className="grid gap-3 rounded-3xl border border-line bg-white p-5">
        <label className="text-sm font-semibold text-ink">
          מה אתה רוצה שהבוט יעשה
          <textarea
            required
            className="mt-2 min-h-40 w-full rounded-2xl border border-line px-4 py-3 font-normal"
            value={wish}
            onChange={(e) => setWish(e.target.value)}
            placeholder="לדוגמה: לענות ללקוחות, לקבוע תור בין 8 ל-17, ולא לתת מחיר בלי בדיקה."
          />
        </label>
        <button
          disabled={loading || wish.trim().length < 2}
          className="rounded-full border border-line bg-white py-3 font-semibold disabled:opacity-60"
        >
          {loading ? "מנסח…" : "נסח הוראות"}
        </button>
        {polished && (
          <div className="rounded-2xl border border-line bg-paper p-4">
            <h2 className="font-bold">ניסוח לאישור</h2>
            <pre className="mt-3 whitespace-pre-wrap text-sm text-ink">{polished}</pre>
            <button
              type="button"
              disabled={loading}
              onClick={() => void approve()}
              className="mt-4 rounded-full bg-brand px-5 py-3 font-semibold text-white disabled:opacity-60"
            >
              אשר והמשך
            </button>
          </div>
        )}
      </form>

      {view.subscription.status === "active" && (
        <button type="button" onClick={() => void cancel()} className="text-sm text-danger underline">
          בטל מנוי
        </button>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
