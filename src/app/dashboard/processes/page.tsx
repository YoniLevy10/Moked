"use client";

import { useEffect, useState } from "react";
import { PROCESS_CATALOG, ProcessKey } from "@/lib/types";

type CatalogItem = (typeof PROCESS_CATALOG)[ProcessKey];

export default function ProcessesPage() {
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [enabled, setEnabled] = useState<
    Record<string, { enabled: boolean; config: Record<string, unknown> }>
  >({});
  const [saving, setSaving] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/processes");
    const data = await res.json();
    setCatalog(data.catalog ?? []);
    setEnabled(data.enabled ?? {});
  }

  useEffect(() => {
    void load();
  }, []);

  async function toggle(key: ProcessKey, next: boolean) {
    setSaving(key);
    try {
      const res = await fetch("/api/processes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, enabled: next }),
      });
      const data = await res.json();
      setEnabled(data.processes);
    } finally {
      setSaving(null);
    }
  }

  const waves = ["A", "B", "C", "D"] as const;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="display text-3xl font-bold">7 התהליכים</h1>
        <p className="mt-2 text-muted">
          כל הגלים בנויים במנוע. גל A דלוק כברירת מחדל; תשלומים (גל D) בסוף.
        </p>
      </div>

      {waves.map((wave) => (
        <section key={wave} className="space-y-3">
          <h2 className="display text-lg font-bold text-brand">גל {wave}</h2>
          <div className="space-y-3">
            {catalog
              .filter((p) => p.wave === wave)
              .map((p) => {
                const on = Boolean(enabled[p.key]?.enabled);
                return (
                  <div
                    key={p.key}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-line bg-white/70 px-5 py-4"
                  >
                    <div>
                      <div className="font-bold">
                        {p.order}. {p.nameHe}
                      </div>
                      <div className="mt-1 text-sm text-muted">
                        {p.descriptionHe}
                        {p.requiresExternal.length > 0 && (
                          <span>
                            {" "}
                            · תלויות: {p.requiresExternal.join(", ")}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      disabled={saving === p.key}
                      onClick={() => toggle(p.key, !on)}
                      className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                        on
                          ? "bg-brand text-white"
                          : "border border-line bg-white text-ink"
                      }`}
                    >
                      {saving === p.key ? "..." : on ? "פעיל" : "כבוי"}
                    </button>
                  </div>
                );
              })}
          </div>
        </section>
      ))}
    </div>
  );
}
