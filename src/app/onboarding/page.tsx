"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { EmbeddedSignupButton } from "@/components/whatsapp/EmbeddedSignupButton";
import { StepRail } from "@/components/onboarding/StepRail";
import {
  APPOINTMENT_KIND_OPTIONS,
  ONBOARDING_VERTICALS,
  TRADE_KIND_OPTIONS,
  type OnboardingStepId,
} from "@/lib/product/onboarding-steps";
import type { Tenant } from "@/lib/types";

type PricingRow = { id?: string; name: string; priceIls: number; description?: string };

type ReadinessReport = {
  ready: boolean;
  mode: string;
  checks: Array<{
    id: string;
    labelHe: string;
    ok: boolean;
    blocking: boolean;
    detail?: string;
  }>;
};

type EscalationView = {
  policy: {
    confidenceReply: number;
    confidenceClarify: number;
    maxTurns: number;
    maxEscalationsPerConversation: number;
    rulesHe: string[];
  };
  answers: { handoff: string; forbidden: string; hours: string };
};

const fieldClass =
  "w-full rounded-2xl border border-line bg-white/80 px-4 py-3 outline-none ring-brand focus:ring-2";
const primaryBtn =
  "w-full rounded-full bg-brand py-3.5 font-semibold text-white hover:bg-brand-deep disabled:opacity-60";
const secondaryBtn =
  "w-full rounded-full border border-line py-3.5 font-semibold disabled:opacity-60";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<OnboardingStepId>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [readiness, setReadiness] = useState<ReadinessReport | null>(null);
  const [escalation, setEscalation] = useState<EscalationView | null>(null);
  const [simText, setSimText] = useState("יש נזילה במטבח. כמה זה עולה?");
  const [simLog, setSimLog] = useState<string[]>([]);
  const [goLiveOk, setGoLiveOk] = useState(false);

  const [form, setForm] = useState({
    businessName: "",
    ownerName: "",
    phone: "",
    vertical: "trades" as (typeof ONBOARDING_VERTICALS)[number]["id"],
    tradeKind: "plumbing" as (typeof TRADE_KIND_OPTIONS)[number]["id"],
    appointmentKind: "beauty" as (typeof APPOINTMENT_KIND_OPTIONS)[number]["id"],
  });
  const [pricing, setPricing] = useState<PricingRow[]>([]);
  const [hours, setHours] = useState("");
  const [what, setWhat] = useState("");
  const [forbidden, setForbidden] = useState("");
  const [handoff, setHandoff] = useState("");
  const [dailyCapacity, setDailyCapacity] = useState(4);

  async function loadTenant() {
    const res = await fetch("/api/tenants");
    if (!res.ok) return null;
    const data = await res.json();
    const active = data.active as Tenant | null;
    if (active) {
      setTenant(active);
      setForm((f) => ({
        ...f,
        businessName: active.businessName,
        ownerName: active.ownerName,
        phone: active.phone,
        vertical: active.vertical === "trades" ? "trades" : "other",
      }));
      setPricing(
        (active.pricing ?? []).map((p) => ({
          id: p.id,
          name: p.name,
          priceIls: p.priceIls,
          description: p.description,
        })),
      );
      setHours(active.bot.answers.hours ?? "");
      setWhat(active.bot.answers.what ?? "");
      setForbidden(active.bot.answers.forbidden ?? "");
      setHandoff(active.bot.answers.handoff ?? "");
      setDailyCapacity(active.availability?.dailyCapacity ?? 4);
      if (active.bot.approved && active.whatsapp.connected) setStep((s) => (s < 6 ? 6 : s));
      else if (active.bot.approved) setStep((s) => (s < 4 ? 4 : s));
      else if (active.id) setStep((s) => (s < 2 ? 2 : s));
    }
    return active;
  }

  async function loadReadiness() {
    const res = await fetch("/api/tenants/readiness");
    if (!res.ok) return;
    setReadiness((await res.json()) as ReadinessReport);
  }

  async function loadEscalation() {
    const res = await fetch("/api/escalation");
    if (!res.ok) return;
    const data = (await res.json()) as EscalationView;
    setEscalation(data);
    setHandoff(data.answers.handoff);
    setForbidden(data.answers.forbidden);
  }

  useEffect(() => {
    void loadTenant();
  }, []);

  useEffect(() => {
    if (step === 5) void loadEscalation();
    if (step === 8 || step === 9) void loadReadiness();
  }, [step]);

  function continueRegistration(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.businessName.trim() || !form.ownerName.trim() || !form.phone.trim()) {
      setError("מלאו את כל השדות");
      return;
    }
    setStep(2);
  }

  async function createTenantWithVertical() {
    setLoading(true);
    setError(null);
    try {
      if (tenant) {
        setStep(3);
        return;
      }
      // UI catalog uses "appointments"; API/DB store beauty|coach (pack aliases).
      const payload =
        form.vertical === "appointments"
          ? {
              businessName: form.businessName,
              ownerName: form.ownerName,
              phone: form.phone,
              vertical: form.appointmentKind,
              tradeKind: form.appointmentKind,
            }
          : {
              businessName: form.businessName,
              ownerName: form.ownerName,
              phone: form.phone,
              vertical: form.vertical,
              ...(form.vertical === "trades"
                ? { tradeKind: form.tradeKind }
                : {}),
            };
      const res = await fetch("/api/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "already_has_tenant") {
          await loadTenant();
          setStep(3);
          return;
        }
        throw new Error(data.message ?? data.error ?? "יצירת העסק נכשלה");
      }
      await loadTenant();
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  async function saveBusiness() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/tenants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: form.businessName,
          ownerName: form.ownerName,
          phone: form.phone,
          pricing,
          botAnswers: { what, hours },
          availability: {
            dailyCapacity,
            windows: tenant?.availability?.windows,
            timezone: tenant?.availability?.timezone ?? "Asia/Jerusalem",
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? data.error ?? "שמירה נכשלה");
      setTenant(data.tenant);
      setStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  async function savePolicyAndApprove() {
    setLoading(true);
    setError(null);
    try {
      const pol = await fetch("/api/bot/policy", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          what,
          hours,
          forbidden,
          handoff,
          pasted: "מענה בעברית, קביעת ביקור, והעברה לאדם כשמבקשים.",
          rewrite: true,
        }),
      });
      if (!pol.ok) {
        const data = await pol.json();
        throw new Error(data.error ?? "שמירת מדיניות נכשלה");
      }
      const approve = await fetch("/api/bot/approve", { method: "POST" });
      if (!approve.ok) {
        const data = await approve.json();
        throw new Error(data.error ?? "אישור הוראות נכשל");
      }
      const checkoutRes = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (checkoutRes.ok) {
        const checkout = (await checkoutRes.json()) as {
          checkoutUrl?: string | null;
        };
        if (checkout.checkoutUrl) {
          window.location.href = checkout.checkoutUrl;
          return;
        }
      }
      await loadTenant();
      setStep(5);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  async function saveEscalation() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/escalation", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handoff, forbidden }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "שמירה נכשלה");
      setEscalation(data);
      setStep(6);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  async function connectDemo() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/whatsapp/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "demo" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? data.error ?? "חיבור נכשל");
      setTenant(data.tenant);
      setStep(7);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  async function runSimulator() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/demo/simulate-inbound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: simText, name: "לקוח דמו" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "סימולציה נכשלה");
      const replies = (data.replies ?? [])
        .map((r: { body: string }) => r.body)
        .join("\n---\n");
      setSimLog((prev) => [
        `את/ה: ${simText}`,
        `מוקד:\n${replies || "(ללא תשובה)"}`,
        ...prev,
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  async function runGoLive() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/tenants/go-live", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setReadiness(data.report ?? readiness);
        throw new Error(
          data.error === "tenant_not_ready"
            ? "עדיין לא מוכן — תקנו את בדיקות המוכנות"
            : (data.message ?? data.error ?? "עלייה לאוויר נכשלה"),
        );
      }
      setGoLiveOk(true);
      setTenant(data.tenant);
      setReadiness(data.report);
      setStep(10);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-10">
      <Link href="/" className="display mb-6 text-2xl font-extrabold text-brand-deep">
        MOKED
      </Link>
      <StepRail step={step} onJump={(id) => setStep(id)} />

      {step === 1 ? (
        <form onSubmit={continueRegistration} className="animate-rise space-y-5">
          <h1 className="display text-3xl font-bold">1 · הרשמה</h1>
          <p className="text-muted">
            מספר WhatsApp חדש לפרסום — המספר האישי לא נוגע ולא מועבר.
          </p>
          <label className="block space-y-2">
            <span className="text-sm font-medium">שם העסק</span>
            <input
              required
              className={fieldClass}
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
              className={fieldClass}
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
              className={fieldClass}
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="05..."
            />
          </label>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button className={primaryBtn}>המשך לבחירת תחום</button>
        </form>
      ) : null}

      {step === 2 ? (
        <div className="animate-rise space-y-6">
          <h1 className="display text-3xl font-bold">2 · בחירת תחום</h1>
          <p className="text-muted">
            ברירות מחדל מגיעות מ־Vertical Pack (בעלי מקצוע או תורים).
          </p>
          <div className="space-y-3">
            {ONBOARDING_VERTICALS.map((v) => (
              <button
                key={v.id}
                type="button"
                disabled={!v.selectable}
                onClick={() => {
                  if (!v.selectable) return;
                  setForm((f) => ({ ...f, vertical: v.id }));
                }}
                className={`w-full rounded-3xl border px-5 py-4 text-right transition ${
                  form.vertical === v.id
                    ? "border-brand bg-brand/10"
                    : "border-line bg-white/70"
                } ${!v.selectable ? "cursor-not-allowed opacity-50" : ""}`}
              >
                <div className="font-semibold">{v.labelHe}</div>
                <div className="mt-1 text-sm text-muted">{v.hintHe}</div>
              </button>
            ))}
          </div>
          {form.vertical === "trades" ? (
            <label className="block space-y-2">
              <span className="text-sm font-medium">התמחות</span>
              <select
                className={fieldClass}
                value={form.tradeKind}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    tradeKind: e.target.value as typeof form.tradeKind,
                  }))
                }
              >
                {TRADE_KIND_OPTIONS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.labelHe}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted">
                אם העסק כבר נוצר, ההתמחות כבר נזרעה מה־pack. אפשר לערוך מחירים
                בשלב הבא.
              </p>
            </label>
          ) : null}
          {form.vertical === "appointments" ? (
            <label className="block space-y-2">
              <span className="text-sm font-medium">סוג עסק תורים</span>
              <select
                className={fieldClass}
                value={form.appointmentKind}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    appointmentKind: e.target
                      .value as typeof form.appointmentKind,
                  }))
                }
              >
                {APPOINTMENT_KIND_OPTIONS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.labelHe}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted">
                יופי ואימון בלבד — בלי קליניקות רפואיות. נשמר כ־beauty|coach.
              </p>
            </label>
          ) : null}
          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            type="button"
            className={primaryBtn}
            onClick={() => void createTenantWithVertical()}
            disabled={
              loading ||
              (form.vertical !== "trades" && form.vertical !== "appointments")
            }
          >
            {loading ? "יוצר עסק..." : "צור עסק עם ברירות מחדל מה־pack"}
          </button>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="animate-rise space-y-5">
          <h1 className="display text-3xl font-bold">3 · עסק · שירותים · מחירים</h1>
          <p className="text-muted">ערכו את ברירות המחדל מה־pack לפני מדיניות הסוכן.</p>
          <label className="block space-y-2">
            <span className="text-sm font-medium">מה העסק עושה</span>
            <textarea
              className={fieldClass}
              rows={3}
              value={what}
              onChange={(e) => setWhat(e.target.value)}
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium">שעות פעילות (טקסט ללקוח)</span>
            <input
              className={fieldClass}
              value={hours}
              onChange={(e) => setHours(e.target.value)}
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium">קיבולת ביקורים ליום</span>
            <input
              type="number"
              min={0}
              className={fieldClass}
              value={dailyCapacity}
              onChange={(e) => setDailyCapacity(Number(e.target.value) || 0)}
            />
          </label>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">מחירון</h2>
              <button
                type="button"
                className="text-sm font-semibold text-brand"
                onClick={() =>
                  setPricing((rows) => [
                    ...rows,
                    { name: "שירות חדש", priceIls: 0, description: "" },
                  ])
                }
              >
                + פריט
              </button>
            </div>
            {pricing.map((row, idx) => (
              <div key={row.id ?? idx} className="grid gap-2 sm:grid-cols-3">
                <input
                  className={fieldClass}
                  value={row.name}
                  onChange={(e) =>
                    setPricing((rows) =>
                      rows.map((r, i) =>
                        i === idx ? { ...r, name: e.target.value } : r,
                      ),
                    )
                  }
                  placeholder="שם"
                />
                <input
                  type="number"
                  className={fieldClass}
                  value={row.priceIls}
                  onChange={(e) =>
                    setPricing((rows) =>
                      rows.map((r, i) =>
                        i === idx
                          ? { ...r, priceIls: Number(e.target.value) || 0 }
                          : r,
                      ),
                    )
                  }
                  placeholder="מחיר ₪"
                />
                <input
                  className={fieldClass}
                  value={row.description ?? ""}
                  onChange={(e) =>
                    setPricing((rows) =>
                      rows.map((r, i) =>
                        i === idx ? { ...r, description: e.target.value } : r,
                      ),
                    )
                  }
                  placeholder="תיאור"
                />
              </div>
            ))}
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            type="button"
            disabled={loading}
            onClick={() => void saveBusiness()}
            className={primaryBtn}
          >
            {loading ? "שומר..." : "שמור והמשך למדיניות"}
          </button>
        </div>
      ) : null}

      {step === 4 ? (
        <div className="animate-rise space-y-5">
          <h1 className="display text-3xl font-bold">4 · מדיניות סוכן</h1>
          <p className="text-muted">
            מה מותר להגיד, מה אסור, ומתי מעבירים לאדם. אחרי שמירה מאשרים הוראות.
          </p>
          <label className="block space-y-2">
            <span className="text-sm font-medium">מה מציעים ללקוח</span>
            <textarea
              className={fieldClass}
              rows={3}
              value={what}
              onChange={(e) => setWhat(e.target.value)}
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium">אסור להגיד / להבטיח</span>
            <textarea
              className={fieldClass}
              rows={2}
              value={forbidden}
              onChange={(e) => setForbidden(e.target.value)}
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium">מתי להעביר לאדם</span>
            <textarea
              className={fieldClass}
              rows={2}
              value={handoff}
              onChange={(e) => setHandoff(e.target.value)}
            />
          </label>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            type="button"
            disabled={loading}
            onClick={() => void savePolicyAndApprove()}
            className={primaryBtn}
          >
            {loading ? "מאשר..." : "אשר מדיניות והמשך"}
          </button>
        </div>
      ) : null}

      {step === 5 ? (
        <div className="animate-rise space-y-5">
          <h1 className="display text-3xl font-bold">5 · כללי הסלמה</h1>
          <p className="text-muted">
            הספיים קבועים במפרט הסוכן — לא משנים אותם כאן. עורכים רק את נוסח
            ההעברה והאיסורים.
          </p>
          {escalation ? (
            <div className="rounded-3xl border border-line bg-white/70 p-5 text-sm">
              <p>
                סף מענה: {escalation.policy.confidenceReply} · סף הבהרה:{" "}
                {escalation.policy.confidenceClarify} · מקס׳ תורות:{" "}
                {escalation.policy.maxTurns} · מקס׳ התראות:{" "}
                {escalation.policy.maxEscalationsPerConversation}
              </p>
              <ul className="mt-3 list-disc space-y-1 pr-5 text-muted">
                {escalation.policy.rulesHe.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-muted">טוען כללים…</p>
          )}
          <label className="block space-y-2">
            <span className="text-sm font-medium">נוסח העברה לאדם</span>
            <textarea
              className={fieldClass}
              rows={2}
              value={handoff}
              onChange={(e) => setHandoff(e.target.value)}
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium">נושאים אסורים / הסלמה מיידית</span>
            <textarea
              className={fieldClass}
              rows={2}
              value={forbidden}
              onChange={(e) => setForbidden(e.target.value)}
            />
          </label>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            type="button"
            disabled={loading}
            onClick={() => void saveEscalation()}
            className={primaryBtn}
          >
            {loading ? "שומר..." : "שמור והמשך לחיבור WhatsApp"}
          </button>
        </div>
      ) : null}

      {step === 6 ? (
        <div className="animate-rise space-y-5">
          <h1 className="display text-3xl font-bold">6 · Meta Embedded Signup</h1>
          <p className="text-muted">
            חברו מספר חדש לפרסום. בדמו אפשר להמשיך עם מספר בדיקה.
          </p>
          <EmbeddedSignupButton
            onConnected={() => {
              void loadTenant().then(() => setStep(7));
            }}
            onError={(message) => setError(message)}
            className={primaryBtn}
            label="חיבור חי דרך Meta Embedded Signup"
          />
          <button
            type="button"
            disabled={loading}
            onClick={() => void connectDemo()}
            className={secondaryBtn}
          >
            {loading ? "מחבר..." : "המשך עם מספר דמו"}
          </button>
          {tenant?.whatsapp.connected ? (
            <button type="button" className={primaryBtn} onClick={() => setStep(7)}>
              כבר מחובר — המשך לסימולטור
            </button>
          ) : null}
          {error && <p className="text-sm text-danger">{error}</p>}
        </div>
      ) : null}

      {step === 7 ? (
        <div className="animate-rise space-y-5">
          <h1 className="display text-3xl font-bold">7 · סימולטור</h1>
          <p className="text-muted">בדקו תשובה לפני עלייה לאוויר — בלי Meta חי.</p>
          <textarea
            className={fieldClass}
            rows={3}
            value={simText}
            onChange={(e) => setSimText(e.target.value)}
          />
          <button
            type="button"
            disabled={loading}
            onClick={() => void runSimulator()}
            className={primaryBtn}
          >
            {loading ? "שולח..." : "שלח לסימולטור"}
          </button>
          <div className="max-h-64 space-y-2 overflow-auto text-sm">
            {simLog.map((line, i) => (
              <pre
                key={i}
                className="whitespace-pre-wrap rounded-2xl bg-paper-2 px-4 py-3"
              >
                {line}
              </pre>
            ))}
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button type="button" className={secondaryBtn} onClick={() => setStep(8)}>
            המשך לבדיקת מוכנות
          </button>
        </div>
      ) : null}

      {step === 8 ? (
        <div className="animate-rise space-y-5">
          <h1 className="display text-3xl font-bold">8 · מוכנות אמיתית</h1>
          <p className="text-muted">אין סימון ידני — רק בדיקות מערכת.</p>
          {readiness ? (
            <ul className="space-y-2 rounded-3xl border border-line bg-white/70 p-5">
              {readiness.checks.map((c) => (
                <li key={c.id} className="flex justify-between gap-3 text-sm">
                  <span>
                    <span className={c.ok ? "text-ok" : "text-danger"}>
                      {c.ok ? "✓" : "✗"}
                    </span>{" "}
                    {c.labelHe}
                  </span>
                  {!c.blocking ? (
                    <span className="text-muted">לא חוסם</span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted">בודק…</p>
          )}
          <button
            type="button"
            className={secondaryBtn}
            onClick={() => void loadReadiness()}
          >
            רענון בדיקות
          </button>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            type="button"
            className={primaryBtn}
            disabled={!readiness?.ready}
            onClick={() => setStep(9)}
          >
            {readiness?.ready ? "מוכן — המשך לעלייה לאוויר" : "עדיין לא מוכן"}
          </button>
        </div>
      ) : null}

      {step === 9 ? (
        <div className="animate-rise space-y-5">
          <h1 className="display text-3xl font-bold">9 · עלייה לאוויר</h1>
          <p className="text-muted">
            לחיצה אחת אחרי מוכנות ירוקה — בלי פעולת מפתח נסתרת.
          </p>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            type="button"
            disabled={loading}
            onClick={() => void runGoLive()}
            className={primaryBtn}
          >
            {loading ? "מפעיל..." : "הפעל עכשיו"}
          </button>
        </div>
      ) : null}

      {step === 10 ? (
        <div className="animate-rise space-y-5">
          <h1 className="display text-3xl font-bold">10 · עריכה חוזרת</h1>
          <p className="text-muted">
            {goLiveOk ? "העסק באוויר. " : ""}
            כל עריכה חוזרת דרך אותם מסכים — בלי מהנדס.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { href: "/dashboard/knowledge", label: "ידע" },
              { href: "/dashboard/pricing", label: "מחירים" },
              { href: "/dashboard/policy", label: "מדיניות" },
              { href: "/dashboard/escalation", label: "הסלמה" },
              { href: "/dashboard/inbox", label: "תיבת שיחות" },
              { href: "/dashboard", label: "דשבורד" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-3xl border border-line bg-white/70 px-5 py-4 font-semibold"
              >
                {item.label}
              </Link>
            ))}
          </div>
          <button
            type="button"
            className={primaryBtn}
            onClick={() => router.push("/dashboard")}
          >
            לדשבורד
          </button>
        </div>
      ) : null}
    </main>
  );
}
