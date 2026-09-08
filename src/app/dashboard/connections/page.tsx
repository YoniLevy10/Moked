"use client";

import { useEffect, useState } from "react";
import { Tenant } from "@/lib/types";
import { EmbeddedSignupButton } from "@/components/whatsapp/EmbeddedSignupButton";

type MetaStatus = {
  live?: boolean;
  whatsapp?: Tenant["whatsapp"];
  templates?: Array<{ name: string; status?: string }>;
  analytics?: {
    delivered?: number;
    costIls?: number;
    error?: string;
  };
  metaBusinessAgent?: { enabled: boolean; note: string };
  embeddedSignup?: { ready: boolean; version?: string };
};

export default function ConnectionsPage() {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [meta, setMeta] = useState<MetaStatus | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/tenants");
    const data = await res.json();
    if (!res.ok) {
      setError(data.message ?? data.error ?? "שגיאה");
      return;
    }
    setTenant(data.active);
  }

  async function loadMeta() {
    const res = await fetch("/api/whatsapp/meta");
    if (!res.ok) return;
    setMeta(await res.json());
  }

  useEffect(() => {
    void load();
    void loadMeta();
  }, []);

  async function connectDemo() {
    setError(null);
    const res = await fetch("/api/whatsapp/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "demo" }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.message ?? data.error);
      return;
    }
    setTenant(data.tenant);
    setMsg("WhatsApp מחובר במצב דמו");
  }

  async function patchIntegrations(patch: Partial<Tenant["integrations"]>) {
    if (!tenant) return;
    const res = await fetch("/api/tenants", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ integrations: patch }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error ?? "שמירה נכשלה");
      return;
    }
    setTenant(data.tenant);
    setMsg("החיבור עודכן");
  }

  async function ensureTemplates() {
    const res = await fetch("/api/whatsapp/meta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "ensure_templates" }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "שגיאה");
      return;
    }
    setMsg("נשלחו תבניות עברית לאישור Meta (או כבר קיימות)");
    void loadMeta();
  }

  async function refreshQuality() {
    await fetch("/api/whatsapp/meta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "refresh_quality" }),
    });
    void loadMeta();
    void load();
  }

  if (error && !tenant) {
    return (
      <div className="rounded-3xl border border-line bg-white/70 p-8">
        <p className="text-danger">{error}</p>
      </div>
    );
  }

  if (!tenant) {
    return <p className="text-muted">טוען…</p>;
  }

  const quality =
    meta?.whatsapp?.qualityRating ?? tenant.whatsapp.qualityRating ?? "—";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="display text-3xl font-bold">חיבורים</h1>
        <p className="mt-2 text-muted">
          WhatsApp Cloud API ישיר ל-Meta · אינטגרציות לפי גלים
        </p>
      </div>

      {quality === "YELLOW" || quality === "RED" ? (
        <div className="rounded-3xl border border-danger/40 bg-danger/10 p-4 text-sm">
          דירוג איכות המספר: <strong>{quality}</strong>
          {quality === "RED"
            ? " — שליחה יזומה (templates) חסומה עד שיפור."
            : " — הגבילו שידורים והקפידו על תוכן."}
          <button
            type="button"
            className="mr-3 underline"
            onClick={() => void refreshQuality()}
          >
            רענן
          </button>
        </div>
      ) : null}

      <section className="rounded-3xl border border-line bg-white/70 p-6">
        <h2 className="display text-xl font-bold">WhatsApp</h2>
        <p className="mt-2 text-sm text-muted">
          סטטוס:{" "}
          {tenant.whatsapp.connected
            ? `מחובר (${tenant.whatsapp.mode}${
                tenant.whatsapp.displayPhone
                  ? ` · ${tenant.whatsapp.displayPhone}`
                  : ""
              })`
            : "לא מחובר"}
          {meta?.embeddedSignup?.version
            ? ` · ES ${meta.embeddedSignup.version}`
            : ""}
          {` · Quality ${quality}`}
        </p>

        <div className="mt-4 flex flex-col gap-3 sm:max-w-md">
          <EmbeddedSignupButton
            onConnected={() => {
              setMsg("WhatsApp מחובר במצב חי ל-Meta");
              void load();
              void loadMeta();
            }}
            onError={setError}
            className="rounded-full bg-brand px-5 py-2.5 font-semibold text-white disabled:opacity-60"
            label={
              tenant.whatsapp.connected && tenant.whatsapp.mode === "live"
                ? "חבר מחדש ל-Meta"
                : "חבר WhatsApp חי (Meta Embedded Signup)"
            }
          />
          {(!tenant.whatsapp.connected || tenant.whatsapp.mode === "demo") && (
            <button
              onClick={() => void connectDemo()}
              className="rounded-full border border-line px-5 py-2.5 font-semibold"
            >
              {tenant.whatsapp.connected
                ? "השאר בדמו"
                : "חבר בדמו (בלי Meta)"}
            </button>
          )}
          {tenant.whatsapp.mode === "live" && (
            <button
              type="button"
              onClick={() => void ensureTemplates()}
              className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold"
            >
              הגש תבניות עברית ל־Meta
            </button>
          )}
        </div>

        <div className="mt-4 grid gap-3 text-sm text-muted md:grid-cols-2">
          <div className="rounded-2xl bg-paper-2 p-4">
            Webhook:{" "}
            <code dir="ltr">
              {(typeof window !== "undefined"
                ? window.location.origin
                : process.env.NEXT_PUBLIC_APP_URL) ?? ""}
              /api/whatsapp/webhook
            </code>
            <br />
            Verify: <code>META_WEBHOOK_VERIFY_TOKEN</code>
          </div>
          <div className="rounded-2xl bg-paper-2 p-4">
            Templates: {meta?.templates?.length ?? 0}
            <br />
            עלות משוערת 7 ימים:{" "}
            {meta?.analytics?.costIls != null
              ? `₪${meta.analytics.costIls}`
              : meta?.analytics?.error ?? "—"}
            <br />
            {meta?.metaBusinessAgent?.note}
          </div>
        </div>
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-line bg-white/70 p-6">
          <h2 className="display text-lg font-bold">גל A/B — יומן וביקורות</h2>
          <p className="mt-2 text-sm text-muted">
            Google Calendar:{" "}
            {tenant.integrations.googleCalendar ? "מחובר" : "לא מחובר"}
          </p>
          <button
            className="mt-4 rounded-full border border-line px-4 py-2 text-sm font-medium"
            onClick={() =>
              void patchIntegrations({
                googleCalendar: !tenant.integrations.googleCalendar,
              })
            }
          >
            הפוך יומן (UI)
          </button>
          <p className="mt-3 text-sm text-muted">
            קישור ביקורות:{" "}
            {tenant.integrations.googleReviewsUrl ?? "ברירת מחדל / placeholder"}
          </p>
        </div>

        <div className="rounded-3xl border border-line bg-white/70 p-6">
          <h2 className="display text-lg font-bold">גל D — תשלומים (אחרון)</h2>
          <p className="mt-2 text-sm text-muted">
            ספק נוכחי: {tenant.integrations.paymentsProvider}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {(
              ["none", "demo", "grow", "payplus", "tranzila", "cardcom"] as const
            ).map((p) => (
              <button
                key={p}
                onClick={() => void patchIntegrations({ paymentsProvider: p })}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  tenant.integrations.paymentsProvider === p
                    ? "bg-brand text-white"
                    : "border border-line"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted">
            Webhook מוכן ב־`/api/payments/webhook` לקבלת אישורי סליקה.
          </p>
        </div>
      </section>

      {msg && <p className="text-sm text-warn">{msg}</p>}
    </div>
  );
}
