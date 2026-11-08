"use client";

import { FormEvent, useEffect, useState } from "react";

const fieldClass =
  "w-full rounded-2xl border border-line bg-white/80 px-4 py-3 outline-none ring-brand focus:ring-2";

type Policy = {
  confidenceReply: number;
  confidenceClarify: number;
  maxTurns: number;
  maxEscalationsPerConversation: number;
  rulesHe: string[];
};

export default function EscalationEditorPage() {
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [handoff, setHandoff] = useState("");
  const [forbidden, setForbidden] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    const res = await fetch("/api/escalation");
    const data = await res.json();
    if (!res.ok) {
      setError(data.message ?? data.error ?? "שגיאה");
      return;
    }
    setPolicy(data.policy);
    setHandoff(data.answers.handoff ?? "");
    setForbidden(data.answers.forbidden ?? "");
  }

  useEffect(() => {
    void load();
  }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMsg(null);
    const res = await fetch("/api/escalation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ handoff, forbidden }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error ?? "שמירה נכשלה");
    else {
      setPolicy(data.policy);
      setMsg("כללי הסלמה נשמרו");
    }
    setLoading(false);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="display text-3xl font-bold">כללי הסלמה</h1>
        <p className="mt-2 text-muted">
          הספיים קבועים במפרט הסוכן (SoT) — מוצגים לקריאה בלבד. עורכים רק נוסח.
        </p>
      </div>

      {policy ? (
        <section className="rounded-3xl border border-line bg-white/70 p-5 text-sm">
          <p className="font-semibold">
            סף מענה {policy.confidenceReply} · סף הבהרה {policy.confidenceClarify}{" "}
            · מקס׳ תורות {policy.maxTurns} · מקס׳ התראות{" "}
            {policy.maxEscalationsPerConversation}
          </p>
          <ul className="mt-3 list-disc space-y-1 pr-5 text-muted">
            {policy.rulesHe.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <form onSubmit={save} className="space-y-4">
        <label className="block space-y-2">
          <span className="text-sm font-medium">נוסח העברה לאדם</span>
          <textarea
            rows={3}
            className={fieldClass}
            value={handoff}
            onChange={(e) => setHandoff(e.target.value)}
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium">נושאים אסורים / הסלמה מיידית</span>
          <textarea
            rows={3}
            className={fieldClass}
            value={forbidden}
            onChange={(e) => setForbidden(e.target.value)}
          />
        </label>
        <button
          disabled={loading}
          className="rounded-full bg-brand px-5 py-3 font-semibold text-white disabled:opacity-60"
        >
          {loading ? "שומר..." : "שמור"}
        </button>
      </form>

      {msg ? <p className="text-sm text-ok">{msg}</p> : null}
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}
