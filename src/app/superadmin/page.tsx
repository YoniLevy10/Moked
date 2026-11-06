"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Tenant } from "@/lib/types";

type Me = {
  id: string;
  email: string;
  name: string;
  role: string;
};

export default function SuperadminPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [activeTenantId, setActiveTenantId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [businessName, setBusinessName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("0500000000");
  const [vertical, setVertical] = useState<Tenant["vertical"]>("trades");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("demo1234");
  const [enableWaveB, setEnableWaveB] = useState(false);
  const [connectDemo, setConnectDemo] = useState(true);

  async function refresh() {
    const auth = await fetch("/api/auth").then((r) => r.json());
    if (auth.user?.role === "superadmin") setMe(auth.user);
    const res = await fetch("/api/superadmin/tenants");
    if (res.status === 403 || res.status === 401) {
      setError("forbidden");
      return;
    }
    const data = await res.json();
    setTenants(data.tenants ?? []);
    setActiveTenantId(data.activeTenantId ?? null);
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function createClient(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setOk(null);
    try {
      if (!ownerEmail.trim()) {
        throw new Error("מייל בעלים נדרש ל־onboarding");
      }
      const res = await fetch("/api/superadmin/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName,
          ownerName,
          phone,
          vertical,
          ownerEmail,
          ownerPassword,
          connectDemoWhatsapp: connectDemo,
          enableWaveA: true,
          enableWaveB,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");
      const note =
        data.ownerNote === "linked_existing_user"
          ? " (יוזר קיים קושר)"
          : data.ownerNote === "created_owner"
            ? " (נוצר יוזר בעלים)"
            : data.ownerNote
              ? ` (${data.ownerNote})`
              : "";
      setOk(`נוצר: ${data.tenant.businessName}${note}`);
      setBusinessName("");
      setOwnerName("");
      setOwnerEmail("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  async function openDashboard(tenantId: string) {
    setError(null);
    const res = await fetch("/api/superadmin/tenants", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "activate", tenantId }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "לא ניתן להחליף טננט");
      return;
    }
    setActiveTenantId(tenantId);
  }

  async function logout() {
    await fetch("/api/admin/gate", { method: "DELETE" });
    router.push("/admin");
    router.refresh();
  }

  if (me && me.role !== "superadmin") {
    return (
      <main className="mx-auto w-full max-w-lg px-4 py-16 text-center">
        <h1 className="display text-2xl font-bold">אין הרשאה</h1>
        <p className="mt-2 text-muted">{error}</p>
        <Link href="/admin" className="mt-6 inline-block text-brand underline">
          חזרה ללקוחות
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-brand">Superadmin</p>
          <h1 className="display text-3xl font-bold">Onboarding לקוחות</h1>
          {me && (
            <p className="mt-1 text-sm text-muted">
              {me.name} · {me.email} ·{" "}
              <Link href="/admin/prospects" className="text-brand underline">
                וולידציה / לידים
              </Link>
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/prospects"
            className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white"
          >
            מנוע לידים
          </Link>
          <Link
            href="/admin/numbers"
            className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold"
          >
            מאגר מספרים
          </Link>
          <button
            type="button"
            onClick={() => void logout()}
            className="rounded-full border border-line bg-white px-4 py-2 text-sm"
          >
            יציאה
          </button>
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

      <form
        onSubmit={createClient}
        className="grid gap-3 rounded-3xl border border-line bg-white/80 p-6 md:grid-cols-2"
      >
        <p className="md:col-span-2 text-sm text-muted">
          יצירת עסק + חשבון בעלים. בעל העסק מתחבר ומפעיל את המנוי ואת הוראות הבוט.
        </p>
        <label className="text-sm md:col-span-2">
          שם העסק
          <input
            required
            className="mt-1 w-full rounded-2xl border border-line px-4 py-3"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
          />
        </label>
        <label className="text-sm">
          שם בעלים
          <input
            required
            className="mt-1 w-full rounded-2xl border border-line px-4 py-3"
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
          />
        </label>
        <label className="text-sm">
          טלפון
          <input
            required
            dir="ltr"
            className="mt-1 w-full rounded-2xl border border-line px-4 py-3"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </label>
        <label className="text-sm">
          ורטיקל
          <select
            className="mt-1 w-full rounded-2xl border border-line px-4 py-3"
            value={vertical}
            onChange={(e) => setVertical(e.target.value as Tenant["vertical"])}
          >
            <option value="trades">בעלי מקצוע</option>
            <option value="clinic">קליניקה</option>
            <option value="beauty">יופי</option>
            <option value="coach">ייעוץ</option>
            <option value="realty">נדל״ן</option>
            <option value="other">אחר</option>
          </select>
        </label>
        <label className="text-sm">
          מייל בעלים (חובה — ליצירת / קישור יוזר)
          <input
            type="email"
            required
            dir="ltr"
            className="mt-1 w-full rounded-2xl border border-line px-4 py-3"
            value={ownerEmail}
            onChange={(e) => setOwnerEmail(e.target.value)}
          />
        </label>
        <label className="text-sm">
          סיסמת בעלים (ליוזר חדש)
          <input
            type="password"
            required
            className="mt-1 w-full rounded-2xl border border-line px-4 py-3"
            value={ownerPassword}
            onChange={(e) => setOwnerPassword(e.target.value)}
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={connectDemo}
            onChange={(e) => setConnectDemo(e.target.checked)}
          />
          חבר WhatsApp דמו עכשיו (אפשר להחליף ל־Meta בדשבורד)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={enableWaveB}
            onChange={(e) => setEnableWaveB(e.target.checked)}
          />
          הפעל גם גל B (תזכורות + שימור)
        </label>
        <button
          type="submit"
          disabled={loading}
          className="md:col-span-2 rounded-full bg-brand py-3 font-semibold text-white disabled:opacity-50"
        >
          {loading ? "יוצר…" : "צור לקוח + חשבון בעלים + גל A"}
        </button>
      </form>

      <section className="mt-8">
        <h2 className="display text-xl font-bold">לקוחות ({tenants.length})</h2>
        <div className="mt-3 space-y-2">
          {tenants.map((t) => (
            <div
              key={t.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line bg-white/70 px-4 py-3"
            >
              <div>
                <div className="font-semibold">
                  {t.businessName}
                  {activeTenantId === t.id ? (
                    <span className="mr-2 text-xs font-medium text-brand">
                      · פעיל
                    </span>
                  ) : null}
                </div>
                <div className="text-sm text-muted">
                  {t.ownerName} · {t.phone} · WhatsApp{" "}
                  {t.whatsapp.connected
                    ? `מחובר (${t.whatsapp.mode})`
                    : "לא"}
                </div>
              </div>
              <button
                type="button"
                onClick={() => void openDashboard(t.id)}
                className="text-sm font-semibold text-brand underline"
              >
                סמן כלקוח פעיל
              </button>
            </div>
          ))}
          {tenants.length === 0 && (
            <p className="text-sm text-muted">עדיין אין לקוחות.</p>
          )}
        </div>
      </section>
    </main>
  );
}
