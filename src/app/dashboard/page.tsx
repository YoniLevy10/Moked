"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PROCESS_CATALOG, ProcessKey, Tenant } from "@/lib/types";
import type { OutcomeMetrics } from "@/lib/outcomes";

type Status = {
  connected: boolean;
  mode?: string;
  displayPhone?: string;
};

type SimStep = {
  inbound: string;
  replies: string[];
  activeProcess?: string;
  events?: string[];
  leadScore?: number;
};

type OutcomesResponse = {
  outcomes: OutcomeMetrics;
  recentEvents: Array<{
    id: string;
    eventType: string;
    createdAt: string;
    payload: Record<string, unknown>;
  }>;
  eventCount: number;
};

const EVENT_LABELS: Record<string, string> = {
  "lead.created": "ליד נוצר",
  "lead.qualified": "ליד סונן",
  "lead.hot": "ליד חם",
  "booking.confirmed": "תור נקבע",
  "quote.accepted": "הצעה אושרה",
  "payment.paid": "תשלום התקבל",
  "referral.accepted": "לקוח חזר / הפניה",
  "review.requested": "ביקורת התבקשה",
  "wave_a.completed": "גל A הושלם",
};

function formatIls(n: number) {
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function DashboardHome() {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [outcomes, setOutcomes] = useState<OutcomeMetrics | null>(null);
  const [recentEvents, setRecentEvents] = useState<
    OutcomesResponse["recentEvents"]
  >([]);
  const [simText, setSimText] = useState("יש נזילה במטבח. אפשר להגיע היום?");
  const [simLog, setSimLog] = useState<string[]>([]);
  const [waveSteps, setWaveSteps] = useState<SimStep[]>([]);
  const [loading, setLoading] = useState(false);
  const [showLab, setShowLab] = useState(false);

  async function refreshOutcomes() {
    const res = await fetch("/api/outcomes");
    if (!res.ok) return;
    const data = (await res.json()) as OutcomesResponse;
    setOutcomes(data.outcomes);
    setRecentEvents(data.recentEvents ?? []);
  }

  async function refresh() {
    const [tRes, sRes] = await Promise.all([
      fetch("/api/tenants"),
      fetch("/api/whatsapp/status"),
    ]);
    const tData = await tRes.json();
    const sData = await sRes.json();
    setTenant(tData.active);
    setStatus(sData);
    if (tData.active) await refreshOutcomes();
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function simulate() {
    setLoading(true);
    try {
      const res = await fetch("/api/demo/simulate-inbound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: simText, name: "לקוח דמו" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "שגיאה");
      const replies = (data.replies ?? [])
        .map((r: { body: string }) => r.body)
        .join("\n---\n");
      const events = (data.events as string[] | undefined)?.join(", ") ?? "—";
      setSimLog((prev) => [
        `את/ה: ${simText}`,
        `מוקד (${data.activeProcess ?? "—"} · score ${data.leadScore ?? "—"}):\n${replies || "(ללא תשובה)"}\nאירועים: ${events}`,
        ...prev,
      ]);
      setSimText("");
      await refreshOutcomes();
    } catch (e) {
      setSimLog((prev) => [
        e instanceof Error ? e.message : "שגיאה",
        ...prev,
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function runWaveA() {
    setLoading(true);
    setWaveSteps([]);
    try {
      const res = await fetch("/api/demo/wave-a", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "שגיאה");
      setWaveSteps(data.steps ?? []);
      setSimLog((prev) => [
        data.waveADone
          ? `✓ גל A הושלם · כתובת: ${data.address} · תור נקבע`
          : `גל A לא הושלם במלואו`,
        ...prev,
      ]);
      await refreshOutcomes();
    } catch (e) {
      setSimLog((prev) => [
        e instanceof Error ? e.message : "שגיאה",
        ...prev,
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function runWaveB(action: "reminder_t24" | "reminder_t2" | "retention") {
    setLoading(true);
    try {
      const res = await fetch("/api/demo/wave-b", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "שגיאה");
      setSimLog((prev) => [
        data.skipped
          ? `גל B: דולג (${action})`
          : `✓ גל B ${action} נשלח`,
        ...prev,
      ]);
      await refreshOutcomes();
    } catch (e) {
      setSimLog((prev) => [
        e instanceof Error ? e.message : "שגיאה",
        ...prev,
      ]);
    } finally {
      setLoading(false);
    }
  }

  if (!tenant) {
    return (
      <div className="rounded-3xl border border-line bg-white/70 p-8">
        <h1 className="display text-2xl font-bold">אין עסק פעיל</h1>
        <p className="mt-2 text-muted">התחל בהקמה וחיבור ערוץ תקשורת.</p>
        <Link
          href="/onboarding"
          className="mt-6 inline-block rounded-full bg-brand px-5 py-2.5 font-semibold text-white"
        >
          להקמה
        </Link>
      </div>
    );
  }

  const processes = Object.values(PROCESS_CATALOG).sort(
    (a, b) => a.order - b.order,
  );

  const kpiCards: Array<{
    label: string;
    value: string;
    hint: string;
  }> = [
    {
      label: "לידים שנוצרו",
      value: String(outcomes?.leadsCreated ?? 0),
      hint: "פניות שהפכו לליד",
    },
    {
      label: "לידים שסוננו",
      value: String(outcomes?.leadsQualified ?? 0),
      hint: `${outcomes?.leadsHot ?? 0} חמים`,
    },
    {
      label: "תורים שנקבעו",
      value: String(outcomes?.appointmentsBooked ?? 0),
      hint: "סגירות מועד",
    },
    {
      label: "הצעות שאושרו",
      value: String(outcomes?.quotesAccepted ?? 0),
      hint: "המרה להצעה",
    },
    {
      label: "הכנסות",
      value: formatIls(outcomes?.revenueIls ?? 0),
      hint: `${outcomes?.paymentsCollected ?? 0} תשלומים`,
    },
    {
      label: "לקוחות שחזרו",
      value: String(outcomes?.customersReturned ?? 0),
      hint: `${outcomes?.reviewsRequested ?? 0} בקשות ביקורת`,
    },
  ];

  return (
    <div className="space-y-8">
      <section className="animate-rise">
        <p className="text-sm font-medium text-brand">תוצאות עסקיות</p>
        <h1 className="display mt-1 text-3xl font-bold sm:text-4xl">
          {tenant.businessName}
        </h1>
        <p className="mt-2 text-muted">
          שלום {tenant.ownerName} · ערוץ{" "}
          {status?.connected ? (
            <span className="font-semibold text-ok">
              מחובר
              {status.mode ? ` (${status.mode}` : ""}
              {status.displayPhone ? ` · ${status.displayPhone}` : ""}
              {status.mode ? ")" : ""}
            </span>
          ) : (
            <span className="font-semibold text-danger">לא מחובר</span>
          )}
        </p>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          לא כמה הודעות נשלחו — כמה לידים נסגרו, תורים נקבעו, הכנסות נוצרו
          ולקוחות הוחזרו.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {kpiCards.map((card) => (
          <div
            key={card.label}
            className="rounded-3xl border border-line bg-white/70 p-5"
          >
            <div className="text-sm font-semibold text-brand">{card.label}</div>
            <div className="mt-2 display text-3xl font-bold">{card.value}</div>
            <div className="mt-1 text-sm text-muted">{card.hint}</div>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-line bg-white/70 p-6">
          <h2 className="display text-xl font-bold">אירועים אחרונים</h2>
          <p className="mt-1 text-sm text-muted">
            כל שיחה הופכת לאירועים עסקיים מדידים.
          </p>
          {recentEvents.length === 0 ? (
            <p className="mt-6 text-sm text-muted">
              עדיין אין אירועים. הריצו סימולציה או חכו לפנייה נכנסת.
            </p>
          ) : (
            <ul className="mt-4 max-h-72 space-y-2 overflow-auto">
              {recentEvents.map((e) => (
                <li
                  key={e.id}
                  className="flex items-baseline justify-between gap-3 border-b border-line/60 py-2 text-sm last:border-0"
                >
                  <span className="font-medium">
                    {EVENT_LABELS[e.eventType] ?? e.eventType}
                  </span>
                  <span className="shrink-0 text-xs text-muted">
                    {new Date(e.createdAt).toLocaleString("he-IL")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-3xl border border-line bg-white/70 p-6">
          <h2 className="display text-xl font-bold">תהליכים פעילים</h2>
          <p className="mt-1 text-sm text-muted">
            משפך תפעולי מקליטה עד שימור — לא בוט צ׳אט גנרי.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {(["A", "B", "C", "D"] as const).map((wave) => {
              const items = processes.filter((p) => p.wave === wave);
              const on = items.filter(
                (p) => tenant.processes[p.key as ProcessKey]?.enabled,
              ).length;
              return (
                <div key={wave} className="rounded-2xl bg-paper/80 p-3">
                  <div className="text-xs font-semibold text-brand">
                    גל {wave}
                  </div>
                  <div className="mt-1 text-lg font-bold">
                    {on}/{items.length}
                  </div>
                  <ul className="mt-2 space-y-0.5 text-xs text-muted">
                    {items.map((p) => (
                      <li key={p.key}>
                        {tenant.processes[p.key]?.enabled ? "●" : "○"}{" "}
                        {p.nameHe}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <Link href="/dashboard/inbox" className="text-brand underline">
              תיבת שיחות
            </Link>
            <Link href="/dashboard/processes" className="text-brand underline">
              ניהול תהליכים
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-line bg-white/70 p-6">
        <button
          type="button"
          onClick={() => setShowLab((v) => !v)}
          className="flex w-full items-center justify-between text-start"
        >
          <div>
            <h2 className="display text-xl font-bold">מעבדת תהליכים</h2>
            <p className="mt-1 text-sm text-muted">
              סימולציה לפיתוח — לא מדד מוצר.
            </p>
          </div>
          <span className="text-sm font-semibold text-brand">
            {showLab ? "הסתר" : "הצג"}
          </span>
        </button>

        {showLab && (
          <div className="mt-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <input
                className="min-w-[12rem] flex-1 rounded-2xl border border-line bg-white px-4 py-3 outline-none ring-brand focus:ring-2"
                value={simText}
                onChange={(e) => setSimText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void simulate();
                }}
                placeholder="הודעת לקוח…"
              />
              <button
                onClick={() => void simulate()}
                disabled={loading || !status?.connected || !simText.trim()}
                className="rounded-full bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-deep disabled:opacity-50"
              >
                {loading ? "שולח..." : "שלח הודעה"}
              </button>
              <button
                onClick={() => void runWaveA()}
                disabled={loading || !status?.connected}
                className="rounded-full border border-brand bg-white px-6 py-3 font-semibold text-brand hover:bg-brand/5 disabled:opacity-50"
              >
                הרץ גל A מלא
              </button>
              <button
                onClick={() => void runWaveB("reminder_t24")}
                disabled={loading || !status?.connected}
                className="rounded-full border border-line bg-white px-4 py-3 text-sm font-semibold disabled:opacity-50"
              >
                תזכורת T-24
              </button>
              <button
                onClick={() => void runWaveB("retention")}
                disabled={loading || !status?.connected}
                className="rounded-full border border-line bg-white px-4 py-3 text-sm font-semibold disabled:opacity-50"
              >
                שימור
              </button>
            </div>

            {waveSteps.length > 0 && (
              <div className="mt-5 space-y-3 rounded-2xl bg-paper/80 p-4">
                <div className="text-sm font-bold text-brand">תסריט גל A</div>
                {waveSteps.map((step, i) => (
                  <div key={`${step.inbound}-${i}`} className="text-sm">
                    <div className="font-semibold">לקוח: {step.inbound}</div>
                    {step.replies.map((r) => (
                      <div
                        key={r}
                        className="mt-1 whitespace-pre-wrap text-muted"
                      >
                        מוקד: {r}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {simLog.length > 0 && (
              <pre className="mt-4 max-h-64 overflow-auto whitespace-pre-wrap rounded-2xl bg-ink px-4 py-3 text-sm text-white/90">
                {simLog.join("\n\n")}
              </pre>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
