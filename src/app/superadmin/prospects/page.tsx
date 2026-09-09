"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  OUTREACH_TEMPLATES,
  PROSPECT_STATUS_LABELS,
  PROSPECT_VERTICAL_LABELS,
  Prospect,
  ProspectFunnelStats,
  ProspectStatus,
  ProspectVertical,
  emptyFunnelStats,
} from "@/lib/prospects";

type Template = (typeof OUTREACH_TEMPLATES)[number];

const STATUSES = Object.keys(PROSPECT_STATUS_LABELS) as ProspectStatus[];

export default function ProspectsPage() {
  const router = useRouter();
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [funnel, setFunnel] = useState<ProspectFunnelStats>(emptyFunnelStats());
  const [templates, setTemplates] = useState<Template[]>([...OUTREACH_TEMPLATES]);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<ProspectStatus | "all">("all");
  const [templateId, setTemplateId] = useState<string>(OUTREACH_TEMPLATES[0].id);
  const [outreachPreview, setOutreachPreview] = useState<{
    prospectId: string;
    message: string;
    waLink: string;
  } | null>(null);

  const [businessName, setBusinessName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [vertical, setVertical] = useState<ProspectVertical>("trades");
  const [source, setSource] = useState("manual");
  const [notes, setNotes] = useState("");
  const [bulk, setBulk] = useState("");

  async function refresh() {
    const auth = await fetch("/api/auth").then((r) => r.json());
    if (!auth.user) {
      router.replace("/login?next=/superadmin/prospects");
      return;
    }
    if (auth.user.role !== "superadmin") {
      setError("אין הרשאת superadmin");
      return;
    }
    const res = await fetch("/api/superadmin/prospects");
    if (!res.ok) {
      setError("לא ניתן לטעון לידים");
      return;
    }
    const data = await res.json();
    setProspects(data.prospects ?? []);
    setFunnel(data.funnel ?? emptyFunnelStats());
    if (data.templates?.length) setTemplates(data.templates);
  }

  useEffect(() => {
    void refresh();
  }, []);

  const visible = useMemo(
    () =>
      filter === "all"
        ? prospects
        : prospects.filter((p) => p.status === filter),
    [prospects, filter],
  );

  async function createOne(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setOk(null);
    try {
      const res = await fetch("/api/superadmin/prospects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName,
          contactName: contactName || undefined,
          phone,
          vertical,
          source,
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");
      setOk(`נוסף: ${data.prospect.businessName}`);
      setBusinessName("");
      setContactName("");
      setPhone("");
      setNotes("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  async function importBulk(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setOk(null);
    try {
      const res = await fetch("/api/superadmin/prospects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "bulk",
          lines: bulk,
          defaultVertical: vertical,
          defaultSource: source || "bulk",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");
      setOk(`יובאו ${data.count} לידים`);
      setBulk("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  async function setStatus(id: string, status: ProspectStatus) {
    setError(null);
    const res = await fetch("/api/superadmin/prospects", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "update", status }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "עדכון נכשל");
      return;
    }
    await refresh();
  }

  async function prepareOutreach(id: string, mark = false) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/superadmin/prospects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          action: mark ? "mark_contacted" : "prepare_outreach",
          templateId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");
      setOutreachPreview({
        prospectId: id,
        message: data.message,
        waLink: data.waLink,
      });
      await refresh();
      if (mark && data.waLink) {
        window.open(data.waLink, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("למחוק ליד?")) return;
    await fetch("/api/superadmin/prospects", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await refresh();
  }

  const kpi = [
    { label: "סה״כ לידים", value: funnel.total },
    { label: "נוצר קשר", value: funnel.contacted },
    { label: "מעוניינים+", value: funnel.interested },
    { label: "פיילוט/המרה", value: funnel.pilots },
    { label: "% עניין מבין שנוצר קשר", value: `${funnel.conversionRate}%` },
  ];

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-brand">Superadmin · פנימי</p>
          <h1 className="display text-3xl font-bold">מנוע לידים — וולידציה</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            כלי רכישה לצוות MOKED בלבד: לרשום עסקים פוטנציאליים, לשלוח הודעת
            WhatsApp (דרך wa.me), ולסמן אם יש עניין — לפני בניית עוד פיצ׳רים.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/superadmin"
            className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold"
          >
            Onboarding לקוחות
          </Link>
          <Link
            href="/dashboard"
            className="rounded-full border border-line bg-white px-4 py-2 text-sm"
          >
            דשבורד
          </Link>
        </div>
      </header>

      {error && (
        <p className="mb-4 rounded-2xl border border-danger/30 bg-white px-4 py-3 text-danger">
          {error}
        </p>
      )}
      {ok && (
        <p className="mb-4 rounded-2xl border border-ok/30 bg-white px-4 py-3 text-ok">
          {ok}
        </p>
      )}

      <section className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {kpi.map((k) => (
          <div
            key={k.label}
            className="rounded-3xl border border-line bg-white/80 p-4"
          >
            <div className="text-xs font-semibold text-brand">{k.label}</div>
            <div className="mt-1 display text-2xl font-bold">{k.value}</div>
          </div>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <form
          onSubmit={createOne}
          className="space-y-3 rounded-3xl border border-line bg-white/80 p-6"
        >
          <h2 className="display text-xl font-bold">הוספת ליד</h2>
          <label className="block text-sm">
            שם העסק
            <input
              required
              className="mt-1 w-full rounded-2xl border border-line px-4 py-3"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            איש קשר
            <input
              className="mt-1 w-full rounded-2xl border border-line px-4 py-3"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            טלפון (WhatsApp)
            <input
              required
              dir="ltr"
              className="mt-1 w-full rounded-2xl border border-line px-4 py-3"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0501234567"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              ורטיקל
              <select
                className="mt-1 w-full rounded-2xl border border-line px-4 py-3"
                value={vertical}
                onChange={(e) =>
                  setVertical(e.target.value as ProspectVertical)
                }
              >
                {Object.entries(PROSPECT_VERTICAL_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              מקור
              <input
                className="mt-1 w-full rounded-2xl border border-line px-4 py-3"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="חבר / גוגל / ידני"
              />
            </label>
          </div>
          <label className="block text-sm">
            הערות
            <textarea
              className="mt-1 w-full rounded-2xl border border-line px-4 py-3"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-brand py-3 font-semibold text-white disabled:opacity-50"
          >
            הוסף ליד
          </button>
        </form>

        <form
          onSubmit={importBulk}
          className="space-y-3 rounded-3xl border border-line bg-white/80 p-6"
        >
          <h2 className="display text-xl font-bold">ייבוא מרובה</h2>
          <p className="text-sm text-muted">
            שורה לכל ליד:{" "}
            <code className="text-xs">
              שם עסק | טלפון | איש קשר | ורטיקל | מקור
            </code>
          </p>
          <textarea
            required
            dir="rtl"
            className="w-full rounded-2xl border border-line px-4 py-3 font-mono text-sm"
            rows={10}
            value={bulk}
            onChange={(e) => setBulk(e.target.value)}
            placeholder={`שירותי אינסטלציה כהן | 0501234567 | יוסי | trades | google\nקליניקת שיניים נווה | 0527654321 | מיכל | clinic | referral`}
          />
          <button
            type="submit"
            disabled={loading || !bulk.trim()}
            className="w-full rounded-full border border-brand bg-white py-3 font-semibold text-brand disabled:opacity-50"
          >
            ייבא לידים
          </button>
        </form>
      </div>

      <section className="mt-8 rounded-3xl border border-line bg-white/80 p-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="display text-xl font-bold">
              רשימת לידים ({visible.length})
            </h2>
            <p className="text-sm text-muted">
              בחר תבנית, הכן הודעה, ושלח דרך WhatsApp (נפתח wa.me).
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="text-sm">
              תבנית
              <select
                className="mr-2 mt-1 rounded-full border border-line bg-white px-3 py-2"
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nameHe}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              סינון
              <select
                className="mr-2 mt-1 rounded-full border border-line bg-white px-3 py-2"
                value={filter}
                onChange={(e) =>
                  setFilter(e.target.value as ProspectStatus | "all")
                }
              >
                <option value="all">הכל</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {PROSPECT_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {outreachPreview && (
          <div className="mb-4 rounded-2xl border border-brand/30 bg-brand/5 p-4">
            <div className="text-sm font-semibold text-brand">תצוגת הודעה</div>
            <pre className="mt-2 whitespace-pre-wrap text-sm">
              {outreachPreview.message}
            </pre>
            <a
              href={outreachPreview.waLink}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white"
              onClick={() =>
                void prepareOutreach(outreachPreview.prospectId, true)
              }
            >
              פתח WhatsApp וסמן נוצר קשר
            </a>
          </div>
        )}

        <div className="space-y-3">
          {visible.map((p) => (
            <div
              key={p.id}
              className="rounded-2xl border border-line bg-paper/50 px-4 py-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">
                    {p.businessName}
                    <span className="mr-2 text-xs font-medium text-muted">
                      · {PROSPECT_VERTICAL_LABELS[p.vertical]}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-muted" dir="ltr">
                    {p.contactName ? `${p.contactName} · ` : ""}
                    {p.phone}
                    {p.source ? ` · ${p.source}` : ""}
                  </div>
                  {p.notes ? (
                    <p className="mt-1 text-sm text-muted">{p.notes}</p>
                  ) : null}
                  {p.lastOutreachAt ? (
                    <p className="mt-1 text-xs text-muted">
                      פנייה אחרונה:{" "}
                      {new Date(p.lastOutreachAt).toLocaleString("he-IL")}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    className="rounded-full border border-line bg-white px-3 py-1.5 text-sm"
                    value={p.status}
                    onChange={(e) =>
                      void setStatus(p.id, e.target.value as ProspectStatus)
                    }
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {PROSPECT_STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => void prepareOutreach(p.id, false)}
                    className="rounded-full border border-line bg-white px-3 py-1.5 text-sm font-semibold"
                  >
                    הכן הודעה
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => void prepareOutreach(p.id, true)}
                    className="rounded-full bg-brand px-3 py-1.5 text-sm font-semibold text-white"
                  >
                    שלח WA
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(p.id)}
                    className="rounded-full px-3 py-1.5 text-sm text-danger"
                  >
                    מחק
                  </button>
                </div>
              </div>
            </div>
          ))}
          {visible.length === 0 && (
            <p className="text-sm text-muted">
              אין לידים עדיין. הוסיפו ידנית או בייבוא — ואז בדקו עניין בוואטסאפ.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
