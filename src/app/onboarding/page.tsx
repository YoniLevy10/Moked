"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { EmbeddedSignupButton } from "@/components/whatsapp/EmbeddedSignupButton";

const VERTICALS = [
  { id: "clinic", label: "קליניקה / טיפול" },
  { id: "trades", label: "בעלי מקצוע" },
  { id: "coach", label: "ייעוץ / אימון" },
  { id: "beauty", label: "יופי / טיפוח" },
  { id: "realty", label: "נדל״ן" },
  { id: "other", label: "אחר" },
] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    businessName: "",
    ownerName: "",
    phone: "",
    vertical: "trades" as (typeof VERTICALS)[number]["id"],
  });

  async function createTenant(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "already_has_tenant") {
          setStep(2);
          return;
        }
        throw new Error(data.message ?? data.error ?? "יצירת העסק נכשלה");
      }
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  async function connectWhatsAppDemo() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/whatsapp/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "demo" }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message ?? data.error ?? "חיבור נכשל");
      }
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-6 py-10">
      <Link href="/" className="display mb-10 text-2xl font-extrabold text-brand-deep">
        MOKED
      </Link>

      {step === 1 ? (
        <form onSubmit={createTenant} className="animate-rise space-y-5">
          <h1 className="display text-3xl font-bold">הקמת העסק</h1>
          <p className="text-muted">דקה אחת — ואז מחברים WhatsApp.</p>

          <label className="block space-y-2">
            <span className="text-sm font-medium">שם העסק</span>
            <input
              required
              className="w-full rounded-2xl border border-line bg-white/80 px-4 py-3 outline-none ring-brand focus:ring-2"
              value={form.businessName}
              onChange={(e) =>
                setForm((f) => ({ ...f, businessName: e.target.value }))
              }
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium">שם בעל העסק</span>
            <input
              required
              className="w-full rounded-2xl border border-line bg-white/80 px-4 py-3 outline-none ring-brand focus:ring-2"
              value={form.ownerName}
              onChange={(e) =>
                setForm((f) => ({ ...f, ownerName: e.target.value }))
              }
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium">טלפון</span>
            <input
              required
              className="w-full rounded-2xl border border-line bg-white/80 px-4 py-3 outline-none ring-brand focus:ring-2"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="05..."
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium">תחום</span>
            <select
              className="w-full rounded-2xl border border-line bg-white/80 px-4 py-3 outline-none ring-brand focus:ring-2"
              value={form.vertical}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  vertical: e.target.value as typeof form.vertical,
                }))
              }
            >
              {VERTICALS.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
          </label>

          {error && <p className="text-sm text-danger">{error}</p>}

          <button
            disabled={loading}
            className="w-full rounded-full bg-brand py-3.5 font-semibold text-white hover:bg-brand-deep disabled:opacity-60"
          >
            {loading ? "שומר..." : "המשך לחיבור WhatsApp"}
          </button>
        </form>
      ) : (
        <div className="animate-rise space-y-6">
          <h1 className="display text-3xl font-bold">חבר WhatsApp</h1>
          <p className="text-muted leading-relaxed">
            מומלץ: חיבור חי ל-Meta Cloud API (Embedded Signup).
            <br />
            לדמו מקומי בלי Meta — השתמשו בכפתור הדמו.
          </p>

          <EmbeddedSignupButton
            disabled={loading}
            onConnected={() => router.push("/dashboard")}
            onError={setError}
            className="w-full rounded-full bg-brand py-3.5 font-semibold text-white hover:bg-brand-deep disabled:opacity-60"
            label="חבר WhatsApp חי דרך Meta"
          />

          <button
            disabled={loading}
            onClick={() => void connectWhatsAppDemo()}
            className="w-full rounded-full border border-line bg-white/70 py-3.5 font-semibold hover:bg-white disabled:opacity-60"
          >
            {loading ? "מחבר..." : "חבר במצב דמו (בלי Meta)"}
          </button>

          {error && <p className="text-sm text-danger">{error}</p>}
        </div>
      )}
    </main>
  );
}
