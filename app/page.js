"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const DEMO_PHONE = "972500000001";

export default function SimulationPage() {
  const [state, setState] = useState(null);
  const [businessId, setBusinessId] = useState("");
  const [workflow, setWorkflow] = useState("lead");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    const res = await fetch("/api/admin");
    const data = await res.json();
    setState(data);
    if (!businessId && data.businesses?.[0]?.id) {
      setBusinessId(data.businesses[0].id);
    }
  }, [businessId]);

  useEffect(() => {
    refresh().catch((e) => setError(String(e.message || e)));
  }, [refresh]);

  const messages = useMemo(() => {
    if (!state?.messages) return [];
    return state.messages.filter(
      (m) =>
        (!businessId || m.businessId === businessId) &&
        m.contactPhone === DEMO_PHONE
    );
  }, [state, businessId]);

  const approvals = useMemo(() => {
    if (!state?.approvals) return [];
    return state.approvals.filter(
      (a) => (!businessId || a.businessId === businessId) && a.status === "pending"
    );
  }, [state, businessId]);

  async function ensureBusiness() {
    if (businessId) return businessId;
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create_business",
        name: "עסק סימולציה",
        field: "אינסטלציה",
      }),
    });
    const data = await res.json();
    setBusinessId(data.business.id);
    return data.business.id;
  }

  async function sendMessage(payload = {}) {
    setBusy(true);
    setError("");
    try {
      const bid = await ensureBusiness();
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sim_message",
          businessId: bid,
          contactPhone: DEMO_PHONE,
          workflow,
          text: payload.text ?? text,
          buttonId: payload.buttonId || null,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "שגיאה");
      setText("");
      await refresh();
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function decide(approvalId, decision) {
    setBusy(true);
    try {
      await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalId, decision, mode: "sim" }),
      });
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function resetAll() {
    setBusy(true);
    try {
      await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" }),
      });
      setBusinessId("");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  const lastOutboundButtons = [...messages]
    .reverse()
    .find((m) => m.direction === "outbound" && m.buttons?.length)?.buttons;

  return (
    <main className="grid grid-2">
      <section className="panel">
        <h2>סימולציית WhatsApp</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          אוטומטי בשגרה. אנושי בהחלטות. · מנוי ₪{state?.planPriceIls || 690}
          {state?.whatsappConfigured ? " · WhatsApp חי מחובר" : " · מצב סימולציה (בלי Meta)"}
        </p>

        <div className="row" style={{ marginBottom: "0.75rem" }}>
          <select value={workflow} onChange={(e) => setWorkflow(e.target.value)}>
            {(state?.workflows || []).map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} {w.status === "stub" ? "(stub)" : ""}
              </option>
            ))}
          </select>
          <button className="btn secondary" type="button" onClick={resetAll} disabled={busy}>
            איפוס
          </button>
        </div>

        <div className="chat">
          {messages.length === 0 && (
            <div className="muted">
              נסו ליד: «יש נזילה במטבח» → «היום אחה״צ» → «רמב״ן 14, ירושלים»
            </div>
          )}
          {messages.map((m) => (
            <div key={m.id} className={`bubble ${m.direction === "inbound" ? "in" : "out"}`}>
              {m.text}
              {m.buttons?.length ? (
                <div className="chips">
                  {m.buttons.map((b) => (
                    <span key={b.id} className="chip">
                      {b.title}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>

        {lastOutboundButtons?.length ? (
          <div className="chips" style={{ marginTop: "0.75rem" }}>
            {lastOutboundButtons.map((b) => (
              <button
                key={b.id}
                type="button"
                className="chip"
                disabled={busy}
                onClick={() => sendMessage({ text: b.title, buttonId: b.id })}
              >
                {b.title}
              </button>
            ))}
          </div>
        ) : null}

        <div className="row" style={{ marginTop: "0.85rem" }}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="הודעת לקוח…"
            onKeyDown={(e) => {
              if (e.key === "Enter") sendMessage();
            }}
          />
          <button className="btn" type="button" disabled={busy || !text.trim()} onClick={() => sendMessage()}>
            שליחה
          </button>
        </div>
        {error ? <p style={{ color: "var(--danger)" }}>{error}</p> : null}
      </section>

      <aside className="grid">
        <section className="panel">
          <h2>אישורים ממתינים</h2>
          <div className="list">
            {approvals.length === 0 && <div className="muted">אין אישורים כרגע</div>}
            {approvals.map((a) => (
              <div key={a.id} className="item">
                <div style={{ fontWeight: 700 }}>{a.title}</div>
                <div className="muted" style={{ margin: "0.35rem 0" }}>
                  {a.type}
                  {a.payload?.issue ? ` · ${a.payload.issue}` : ""}
                  {a.payload?.address ? ` · ${a.payload.address}` : ""}
                  {a.payload?.amount ? ` · ₪${a.payload.amount}` : ""}
                </div>
                <div className="row">
                  <button className="btn small" type="button" disabled={busy} onClick={() => decide(a.id, "approved")}>
                    אישור
                  </button>
                  <button
                    className="btn small danger"
                    type="button"
                    disabled={busy}
                    onClick={() => decide(a.id, "rejected")}
                  >
                    דחייה
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <h2>7 תהליכים</h2>
          <div className="list">
            {(state?.workflows || []).map((w) => (
              <div key={w.id} className="item" style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
                <div>
                  <strong>{w.name}</strong>
                  <div className="muted">{w.description}</div>
                </div>
                <span className={`badge ${w.status === "stub" ? "stub" : ""}`}>
                  {w.status === "live" ? "חי" : "stub"}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <h2>אירועים אחרונים</h2>
          <div className="list">
            {(state?.events || []).slice(0, 8).map((e) => (
              <div key={e.id} className="item">
                <span className="badge">{e.type}</span>
                <div className="muted" style={{ marginTop: "0.25rem" }}>
                  {new Date(e.at).toLocaleString("he-IL")}
                </div>
              </div>
            ))}
          </div>
        </section>
      </aside>
    </main>
  );
}
