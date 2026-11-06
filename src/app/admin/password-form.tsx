"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function AdminPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/gate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      setError("הסיסמה לא נכונה");
      setLoading(false);
      return;
    }
    setPassword("");
    router.refresh();
  }

  return (
    <main className="admin-screen mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4">
      <h1 className="display text-3xl font-bold text-ink">ניהול מוקד</h1>
      <p className="mt-2 text-sm text-ink">הכניסה למסך הזה נעולה בסיסמה.</p>
      <form onSubmit={onSubmit} className="mt-6 space-y-3">
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-2xl border border-line bg-white px-4 py-3"
          placeholder="סיסמה"
        />
        <button
          disabled={loading || password.length === 0}
          className="w-full rounded-full bg-brand py-3 font-semibold text-white disabled:opacity-60"
        >
          {loading ? "בודק…" : "כניסה"}
        </button>
        {error && <p className="text-sm text-danger">{error}</p>}
      </form>
    </main>
  );
}
