import { Suspense } from "react";
import LoginPage from "./login-client";

export default function LoginRoute() {
  return (
    <Suspense fallback={<main className="p-8 text-muted">טוען…</main>}>
      <LoginPage />
    </Suspense>
  );
}
