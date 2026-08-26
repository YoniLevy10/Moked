"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

type Mode = "login" | "register";

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) router.replace(next);
        if (d.mode === "local") {
          setInfo(
            "מצב מקומי (בלי Supabase). Superadmin: המייל ב־ADMIN_EMAILS + סיסמת bootstrap.",
          );
        }
      })
      .catch(() => undefined);
  }, [next, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: mode === "login" ? "login" : "register",
          email,
          password,
          name,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאת התחברות");
      const dest =
        data.user?.role === "superadmin" &&
        (next === "/dashboard" || !params.get("next"))
          ? "/superadmin"
          : next;
      router.replace(dest);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[80vh] w-full max-w-md flex-col justify-center px-4">
      <Link href="/" className="mb-6 display text-2xl font-extrabold text-brand-deep">
        MOKED
      </Link>
      <h1 className="display text-3xl font-bold">כניסה במייל</h1>
      <p className="mt-2 text-sm text-muted">
        כמו ב־Fixly / OpsBrain — מייל + סיסמה. עם Supabase כשמוגדר, אחרת אחסון מקומי לפיתוח.
      </p>

      <div className="mt-6 flex gap-2">
        <button
          type="button"
          className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold ${mode === "login" ? "bg-brand text-white" : "border border-line bg-white"}`}
          onClick={() => setMode("login")}
        >
          התחברות
        </button>
        <button
          type="button"
          className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold ${mode === "register" ? "bg-brand text-white" : "border border-line bg-white"}`}
          onClick={() => setMode("register")}
        >
          הרשמה
        </button>
      </div>

      <form onSubmit={onSubmit} className="mt-4 space-y-3 rounded-3xl border border-line bg-white/80 p-5">
        {mode === "register" && (
          <label className="block text-sm">
            שם
            <input
              className="mt-1 w-full rounded-2xl border border-line px-4 py-3"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
        )}
        <label className="block text-sm">
          אימייל
          <input
            type="email"
            dir="ltr"
            required
            className="mt-1 w-full rounded-2xl border border-line px-4 py-3"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          סיסמה
          <input
            type="password"
            required
            minLength={6}
            className="mt-1 w-full rounded-2xl border border-line px-4 py-3"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && <p className="text-sm text-danger">{error}</p>}
        {info && <p className="text-xs text-muted">{info}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-brand py-3 font-semibold text-white disabled:opacity-50"
        >
          {loading ? "רגע…" : mode === "login" ? "כניסה" : "יצירת חשבון"}
        </button>
      </form>
    </main>
  );
}
