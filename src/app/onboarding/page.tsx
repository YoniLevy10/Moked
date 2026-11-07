"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const VERTICALS = [
  { id: "trades", label: "בעלי מקצוע (מומלץ — beachhead)" },
  { id: "other", label: "אחר" },
] as const;

const TRADE_KINDS = [
  { id: "plumbing", label: "אינסטלציה" },
  { id: "electrical", label: "חשמל" },
  { id: "hvac", label: "מיזוג" },
  { id: "renovation", label: "שיפוצים" },
  { id: "handyman", label: "הנדימן" },
] as const;

type LiveStatus = {
  connected?: boolean;
  displayPhone?: string;
  waLink?: string | null;
  botApproved?: boolean;
  subscriptionActive?: boolean;
  positioning?: string;
};

type LiveResult = {
  ok: boolean;
  displayPhone?: string;
  waLink?: string | null;
  replies?: string[];
  message?: string;
  error?: string;
  positioning?: string;
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState<LiveStatus | null>(null);
  const [liveResult, setLiveResult] = useState<LiveResult | null>(null);
  const [form, setForm] = useState({
    businessName: "",
    ownerName: "",
    phone: "",
    vertical: "trades" as (typeof VERTICALS)[number]["id"],
    tradeKind: "plumbing" as (typeof TRADE_KINDS)[number]["id"],
  });

  async function refreshLive() {
    const res = await fetch("/api/onboarding/live-test");
    if (!res.ok) return;
    setLive((await res.json()) as LiveStatus);
  }

  useEffect(() => {
    if (step === 3) void refreshLive();
  }, [step]);

  async function createTenant(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "already_has_tenant") {
          setStep(2);
          return;
        }
        throw new Error(data.message ?? data.error ?? "יצירת העסק נכשלה");
      }
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  async function prepareBotForLive() {
    setLoading(true);
    setError(null);
    try {
      const tRes = await fetch("/api/tenants");
      const tData = await tRes.json();
      const answers = tData.active?.bot?.answers ?? {};
      const draftRes = await fetch("/api/bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          what: answers.what ?? "",
          hours: answers.hours ?? "",
          forbidden: answers.forbidden ?? "",
          handoff: answers.handoff ?? "",
          pasted:
            answers.pasted ||
            "מענה בעברית, קביעת ביקור, והעברה לאדם כשמבקשים.",
        }),
      });
      if (!draftRes.ok) {
        const data = await draftRes.json();
        throw new Error(data.error ?? "ניסוח הוראות נכשל");
      }
      const approveRes = await fetch("/api/bot/approve", { method: "POST" });
      if (!approveRes.ok) {
        const data = await approveRes.json();
        throw new Error(data.error ?? "אישור הוראות נכשל");
      }
      await fetch("/api/billing/checkout", { method: "POST" });
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  async function runLiveShalom() {
    setLoading(true);
    setError(null);
    setLiveResult(null);
    try {
      const res = await fetch("/api/onboarding/live-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ensureDemoNumber: true, text: "שלום" }),
      });
      const data = (await res.json()) as LiveResult;
      if (!res.ok) {
        setError(data.message ?? data.error ?? "בדיקת שלום נכשלה");
        setLiveResult(data);
        return;
      }
      setLiveResult(data);
      await refreshLive();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-6 py-10">
      <Link href="/" className="display mb-10 text-2xl font-extrabold text-brand-deep">
        MOKED
      </Link>

      {step === 1 ? (
        <form onSubmit={createTenant} className="animate-rise space-y-5">
          <h1 className="display text-3xl font-bold">הקמת העסק</h1>
          <p className="text-muted">
            מספר WhatsApp חדש לפרסום / נחיתה — המספר האישי שלכם לא נוגע ולא
            מועבר (בלי Coexistence).
          </p>

          <label className="block space-y-2">
            <span className="text-sm font-medium">שם העסק</span>
            <input
              required
              className="w-full rounded-2xl border border-line bg-white/80 px-4 py-3 outline-none ring-brand focus:ring-2"
              value={form.businessName}
              onChange={(e) =>
                setForm((f) => ({ ...f, businessName: e.target.value }))
              }
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium">שם בעל העסק</span>
            <input
              required
              className="w-full rounded-2xl border border-line bg-white/80 px-4 py-3 outline-none ring-brand focus:ring-2"
              value={form.ownerName}
              onChange={(e) =>
                setForm((f) => ({ ...f, ownerName: e.target.value }))
              }
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium">טלפון</span>
            <input
              required
              className="w-full rounded-2xl border border-line bg-white/80 px-4 py-3 outline-none ring-brand focus:ring-2"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="05..."
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium">תחום</span>
            <select
              className="w-full rounded-2xl border border-line bg-white/80 px-4 py-3 outline-none ring-brand focus:ring-2"
              value={form.vertical}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  vertical: e.target.value as typeof form.vertical,
                }))
              }
            >
              {VERTICALS.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
          </label>

          {form.vertical === "trades" && (
            <label className="block space-y-2">
              <span className="text-sm font-medium">התמחות</span>
              <select
                className="w-full rounded-2xl border border-line bg-white/80 px-4 py-3 outline-none ring-brand focus:ring-2"
                value={form.tradeKind}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    tradeKind: e.target.value as typeof form.tradeKind,
                  }))
                }
              >
                {TRADE_KINDS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          {error && <p className="text-sm text-danger">{error}</p>}

          <button
            disabled={loading}
            className="w-full rounded-full bg-brand py-3.5 font-semibold text-white hover:bg-brand-deep disabled:opacity-60"
          >
            {loading ? "שומר..." : "המשך למנוי ולהוראות"}
          </button>
        </form>
      ) : null}

      {step === 2 ? (
        <div className="animate-rise space-y-6">
          <h1 className="display text-3xl font-bold">מנוי + הוראות בוט</h1>
          <p className="text-muted leading-relaxed">
            מאשרים הוראות בעברית ומפעילים מנוי. אחר כך מחברים{" "}
            <strong>מספר חדש לפרסום</strong> ובודקים מענה לשלום מהטלפון שלכם.
          </p>
          <button
            type="button"
            disabled={loading}
            onClick={() => void prepareBotForLive()}
            className="w-full rounded-full bg-brand py-3.5 font-semibold text-white hover:bg-brand-deep disabled:opacity-60"
          >
            {loading ? "מכין..." : "הכן בוט והמשך לבדיקת מספר חדש"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/dashboard/bot")}
            className="w-full rounded-full border border-line py-3.5 font-semibold"
          >
            עריכה מלאה של הוראות ומנוי
          </button>
          {error && <p className="text-sm text-danger">{error}</p>}
        </div>
      ) : null}

      {step === 3 ? (
        <div className="animate-rise space-y-6">
          <h1 className="display text-3xl font-bold">בדיקת שלום חיה</h1>
          <p className="text-muted leading-relaxed">
            {live?.positioning ??
              "שלחו «שלום» למספר החדש לפרסום — הבוט עונה עם פרטי העסק. המספר האישי לא מועבר."}
          </p>

          {live?.waLink ? (
            <a
              href={live.waLink}
              target="_blank"
              rel="noreferrer"
              className="block w-full rounded-full border border-line py-3.5 text-center font-semibold"
            >
              פתיחת WhatsApp למספר החדש
              {live.displayPhone ? ` (${live.displayPhone})` : ""}
            </a>
          ) : null}

          <button
            type="button"
            disabled={loading}
            onClick={() => void runLiveShalom()}
            className="w-full rounded-full bg-brand py-3.5 font-semibold text-white hover:bg-brand-deep disabled:opacity-60"
          >
            {loading ? "שולח שלום..." : "הרץ בדיקת שלום (דמו / חי)"}
          </button>

          {liveResult ? (
            <div
              className={`rounded-3xl border p-5 text-sm ${
                liveResult.ok
                  ? "border-ok/40 bg-ok/5"
                  : "border-danger/40 bg-danger/5"
              }`}
            >
              <p className="font-semibold">
                {liveResult.ok ? "הבוט ענה ✓" : "הבדיקה לא עברה"}
              </p>
              {liveResult.replies?.map((r, i) => (
                <p key={i} className="mt-2 whitespace-pre-wrap text-muted">
                  {r}
                </p>
              ))}
              {liveResult.displayPhone ? (
                <p className="mt-3 text-muted" dir="ltr">
                  {liveResult.displayPhone}
                </p>
              ) : null}
            </div>
          ) : null}

          {liveResult?.ok ? (
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="w-full rounded-full bg-brand py-3.5 font-semibold text-white"
            >
              לדשבורד ארבעת המספרים
            </button>
          ) : null}

          {error && <p className="text-sm text-danger">{error}</p>}
        </div>
      ) : null}
    </main>
  );
}
