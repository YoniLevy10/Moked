"use client";

import { useEffect, useState } from "react";
import type { Tenant } from "@/lib/types";

type Row = { id?: string; name: string; priceIls: number; description?: string };

const fieldClass =
  "w-full rounded-2xl border border-line bg-white/80 px-4 py-3 outline-none ring-brand focus:ring-2";

export default function PricingEditorPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    const res = await fetch("/api/tenants");
    const data = await res.json();
    if (!res.ok) {
      setError(data.message ?? data.error ?? "שגיאה");
      return;
    }
    const tenant = data.active as Tenant | null;
    setRows(
      (tenant?.pricing ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        priceIls: p.priceIls,
        description: p.description,
      })),
    );
  }

  useEffect(() => {
    void load();
  }, []);

  async function save() {
    setLoading(true);
    setError(null);
    setMsg(null);
    const res = await fetch("/api/tenants", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pricing: rows }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error ?? "שמירה נכשלה");
    else {
      setMsg("המחירון נשמר וסונכרן לידע");
      const tenant = data.tenant as Tenant;
      setRows(
        (tenant.pricing ?? []).map((p) => ({
          id: p.id,
          name: p.name,
          priceIls: p.priceIls,
          description: p.description,
        })),
      );
    }
    setLoading(false);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="display text-3xl font-bold">מחירון</h1>
        <p className="mt-2 text-muted">
          מקור המחיר היחיד לסוכן — אין מחירים מומצאים. Managed משתמש באותו{" "}
          <code className="text-xs">PATCH /api/tenants</code>.
        </p>
      </div>

      <div className="space-y-3">
        {rows.map((row, idx) => (
          <div key={row.id ?? idx} className="grid gap-2 sm:grid-cols-3">
            <input
              className={fieldClass}
              value={row.name}
              onChange={(e) =>
                setRows((all) =>
                  all.map((r, i) =>
                    i === idx ? { ...r, name: e.target.value } : r,
                  ),
                )
              }
              placeholder="שם שירות"
            />
            <input
              type="number"
              className={fieldClass}
              value={row.priceIls}
              onChange={(e) =>
                setRows((all) =>
                  all.map((r, i) =>
                    i === idx
                      ? { ...r, priceIls: Number(e.target.value) || 0 }
                      : r,
                  ),
                )
              }
              placeholder="₪"
            />
            <div className="flex gap-2">
              <input
                className={fieldClass}
                value={row.description ?? ""}
                onChange={(e) =>
                  setRows((all) =>
                    all.map((r, i) =>
                      i === idx ? { ...r, description: e.target.value } : r,
                    ),
                  )
                }
                placeholder="תיאור"
              />
              <button
                type="button"
                className="rounded-full border border-line px-3 text-sm"
                onClick={() =>
                  setRows((all) => all.filter((_, i) => i !== idx))
                }
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="rounded-full border border-line px-4 py-2 text-sm font-semibold"
          onClick={() =>
            setRows((all) => [
              ...all,
              { name: "שירות חדש", priceIls: 0, description: "" },
            ])
          }
        >
          + פריט
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => void save()}
          className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? "שומר..." : "שמור מחירון"}
        </button>
        {msg ? <p className="text-sm text-ok">{msg}</p> : null}
        {error ? <p className="text-sm text-danger">{error}</p> : null}
      </div>
    </div>
  );
}
