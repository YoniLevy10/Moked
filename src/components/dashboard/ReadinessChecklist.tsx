"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Check = {
  id: string;
  labelHe: string;
  ok: boolean;
  blocking: boolean;
  fixHref: string;
  detail?: string;
};

type Report = {
  ready: boolean;
  mode: "demo" | "live";
  checks: Check[];
};

export function ReadinessChecklist() {
  const [report, setReport] = useState<Report | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/tenants/readiness");
      if (!res.ok) return;
      setReport((await res.json()) as Report);
    })();
  }, []);

  if (!report) return null;

  const failing = report.checks.filter((c) => c.blocking && !c.ok);

  return (
    <section className="rounded-3xl border border-line bg-white/70 p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="display text-xl font-bold">מוכנות לאוויר</h2>
        <p
          className={`text-sm font-semibold ${report.ready ? "text-ok" : "text-danger"}`}
        >
          {report.ready ? "מוכן" : "לא מוכן ל־live"}
          {report.mode === "demo" ? " · מצב דמו" : ""}
        </p>
      </div>
      <p className="mt-1 text-sm text-muted">
        לא מסמנים «חי» כל עוד יש שלב חוסם. תקנו את הצעד שנכשל.
      </p>
      <ul className="mt-4 space-y-2">
        {report.checks.map((check) => (
          <li
            key={check.id}
            className="flex flex-wrap items-center justify-between gap-2 text-sm"
          >
            <span>
              <span className={check.ok ? "text-ok" : "text-danger"}>
                {check.ok ? "✓" : "✗"}
              </span>{" "}
              {check.labelHe}
              {!check.blocking ? (
                <span className="text-muted"> (לא חוסם)</span>
              ) : null}
            </span>
            {!check.ok ? (
              <Link href={check.fixHref} className="font-semibold text-brand underline">
                תקן
              </Link>
            ) : null}
          </li>
        ))}
      </ul>
      {failing[0] ? (
        <p className="mt-4 text-sm text-danger">
          הצעד הבא: {failing[0].labelHe}
          {failing[0].detail ? ` — ${failing[0].detail}` : ""}
        </p>
      ) : null}
    </section>
  );
}
