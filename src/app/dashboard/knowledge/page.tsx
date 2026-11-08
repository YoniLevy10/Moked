"use client";

import { FormEvent, useEffect, useState } from "react";
import type { KnowledgeKind, TenantKnowledgeRow } from "@/lib/agent/types";

const KINDS: Array<{ id: KnowledgeKind; labelHe: string }> = [
  { id: "faq", labelHe: "שאלות נפוצות" },
  { id: "service", labelHe: "שירות" },
  { id: "price", labelHe: "מחיר (מראה ידע)" },
  { id: "hours", labelHe: "שעות" },
  { id: "area", labelHe: "אזור שירות" },
  { id: "policy", labelHe: "מדיניות" },
  { id: "forbidden", labelHe: "אסור" },
];

const fieldClass =
  "w-full rounded-2xl border border-line bg-white/80 px-4 py-3 outline-none ring-brand focus:ring-2";

export default function KnowledgeEditorPage() {
  const [rows, setRows] = useState<TenantKnowledgeRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState({
    kind: "faq" as KnowledgeKind,
    label: "",
    body: "",
  });

  async function load() {
    const res = await fetch("/api/knowledge");
    const data = await res.json();
    if (!res.ok) {
      setError(data.message ?? data.error ?? "שגיאה");
      return;
    }
    setRows(data.knowledge ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMsg(null);
    try {
      const res = await fetch("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "שמירה נכשלה");
      setDraft({ kind: "faq", label: "", body: "" });
      setMsg("נשמר");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  async function remove(id: string) {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/knowledge", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "מחיקה נכשלה");
    }
    await load();
    setLoading(false);
  }

  async function reseed() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/knowledge", { method: "PUT" });
    const data = await res.json();
    if (!res.ok) setError(data.error ?? "סנכון נכשל");
    else {
      setRows(data.knowledge ?? []);
      setMsg("סונכרן ממחירון ומדיניות");
    }
    setLoading(false);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="display text-3xl font-bold">ידע עסקי</h1>
        <p className="mt-2 text-muted">
          אותו API לבעלים ול־Managed — בלי מסלול קוד נפרד. מחירים סופיים תמיד מ־
          מחירון.
        </p>
      </div>

      <form onSubmit={save} className="space-y-4 rounded-3xl border border-line bg-white/70 p-5">
        <label className="block space-y-2">
          <span className="text-sm font-medium">סוג</span>
          <select
            className={fieldClass}
            value={draft.kind}
            onChange={(e) =>
              setDraft((d) => ({ ...d, kind: e.target.value as KnowledgeKind }))
            }
          >
            {KINDS.map((k) => (
              <option key={k.id} value={k.id}>
                {k.labelHe}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium">תווית</span>
          <input
            required
            className={fieldClass}
            value={draft.label}
            onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium">תוכן</span>
          <textarea
            required
            rows={3}
            className={fieldClass}
            value={draft.body}
            onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
          />
        </label>
        <button
          disabled={loading}
          className="rounded-full bg-brand px-5 py-3 font-semibold text-white disabled:opacity-60"
        >
          {loading ? "שומר..." : "הוסף / עדכן"}
        </button>
      </form>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void reseed()}
          className="rounded-full border border-line px-4 py-2 text-sm font-semibold"
        >
          סנכון מ־pack / מחירון
        </button>
        {msg ? <p className="text-sm text-ok">{msg}</p> : null}
        {error ? <p className="text-sm text-danger">{error}</p> : null}
      </div>

      <ul className="space-y-3">
        {rows.length === 0 ? (
          <li className="text-muted">אין רשומות ידע עדיין.</li>
        ) : null}
        {rows.map((row) => (
          <li
            key={row.id}
            className="rounded-3xl border border-line bg-white/70 px-5 py-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-brand">
                  {row.kind} · {row.label}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm">{row.body}</p>
              </div>
              <button
                type="button"
                onClick={() => void remove(row.id)}
                className="rounded-full border border-line px-3 py-1 text-xs font-semibold"
              >
                מחק
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
