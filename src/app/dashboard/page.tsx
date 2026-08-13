"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PROCESS_CATALOG, ProcessKey, Tenant } from "@/lib/types";

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

export default function DashboardHome() {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [simText, setSimText] = useState("יש נזילה במטבח. אפשר להגיע היום?");
  const [simLog, setSimLog] = useState<string[]>([]);
  const [waveSteps, setWaveSteps] = useState<SimStep[]>([]);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    const [tRes, sRes] = await Promise.all([
      fetch("/api/tenants"),
      fetch("/api/whatsapp/status"),
    ]);
    const tData = await tRes.json();
    const sData = await sRes.json();
    setTenant(tData.active);
    setStatus(sData);
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
      setSimLog((prev) => [
        `את/ה: ${simText}`,
        `מוקד (${data.activeProcess ?? "—"} · score ${data.leadScore ?? "—"}):\n${replies || "(ללא תשובה)"}`,
        ...prev,
      ]);
      setSimText("");
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
          ? `✓ גל A הושלם · כתובת: ${data.address} · הודעות: ${data.messageCount}`
          : `גל A לא הושלם במלואו`,
        ...prev,
      ]);
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
        <p className="mt-2 text-muted">התחל בהקמה וחיבור WhatsApp.</p>
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

  return (
    <div className="space-y-8">
      <section className="animate-rise">
        <p className="text-sm font-medium text-brand">לוח בקרה</p>
        <h1 className="display mt-1 text-3xl font-bold sm:text-4xl">
          {tenant.businessName}
        </h1>
        <p className="mt-2 text-muted">
          שלום {tenant.ownerName} · WhatsApp{" "}
          {status?.connected ? (
            <span className="font-semibold text-ok">
              מחובר ({status.mode}
              {status.displayPhone ? ` · ${status.displayPhone}` : ""})
            </span>
          ) : (
            <span className="font-semibold text-danger">לא מחובר</span>
          )}
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {(["A", "B", "C", "D"] as const).map((wave) => {
          const items = processes.filter((p) => p.wave === wave);
          const on = items.filter(
            (p) => tenant.processes[p.key as ProcessKey]?.enabled,
          ).length;
          return (
            <div
              key={wave}
              className="rounded-3xl border border-line bg-white/70 p-5"
            >
              <div className="text-sm font-semibold text-brand">גל {wave}</div>
              <div className="mt-2 display text-2xl font-bold">
                {on}/{items.length} פעילים
              </div>
              <ul className="mt-3 space-y-1 text-sm text-muted">
                {items.map((p) => (
                  <li key={p.key}>
                    {tenant.processes[p.key]?.enabled ? "●" : "○"} {p.nameHe}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>

      <section className="rounded-3xl border border-line bg-white/70 p-6">
        <h2 className="display text-xl font-bold">סימולטור לקוח (דמו)</h2>
        <p className="mt-2 text-sm text-muted">
          שולח הודעה נכנסת ומריץ את מנוע התהליכים. גל A: קליטה → סינון → תור+כתובת.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            className="flex-1 rounded-2xl border border-line bg-white px-4 py-3 outline-none ring-brand focus:ring-2"
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

        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <Link href="/dashboard/inbox" className="text-brand underline">
            לתיבת השיחות
          </Link>
          <Link href="/dashboard/processes" className="text-brand underline">
            לניהול תהליכים
          </Link>
        </div>
      </section>
    </div>
  );
}
