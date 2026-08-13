#!/usr/bin/env node
/**
 * Smoke: Wave A end-to-end against a running dev server.
 * Usage: node scripts/smoke-wave-a.mjs
 * Requires: npm run dev + tenant with demo WhatsApp connected
 *           (or pass AUTO_SETUP=1 to create via API)
 */
const BASE = process.env.MOKED_BASE_URL || "http://localhost:3000";

async function json(path, init) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || res.statusText || "request_failed");
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function ensureTenant() {
  const tenants = await json("/api/tenants");
  if (tenants.active?.whatsapp?.connected) return tenants.active;

  if (process.env.AUTO_SETUP !== "1") {
    throw new Error(
      "No connected tenant. Open /onboarding or re-run with AUTO_SETUP=1",
    );
  }

  await json("/api/tenants", {
    method: "POST",
    body: JSON.stringify({
      businessName: "אינסטלציה כהן",
      ownerName: "יוסי",
      phone: "0500000000",
      vertical: "trades",
    }),
  });
  await json("/api/whatsapp/connect", {
    method: "POST",
    body: JSON.stringify({ mode: "demo" }),
  });
  const again = await json("/api/tenants");
  return again.active;
}

async function main() {
  console.log("MOKED Wave A smoke →", BASE);
  await ensureTenant();
  const result = await json("/api/demo/wave-a", {
    method: "POST",
    body: JSON.stringify({ script: true }),
  });

  if (!result.waveADone) {
    console.error("FAIL: waveADone=false", JSON.stringify(result, null, 2));
    process.exit(1);
  }
  if (!String(result.address || "").includes("רמב")) {
    console.error("FAIL: expected address", result.address);
    process.exit(1);
  }

  console.log("OK wave A completed");
  console.log("  address:", result.address);
  console.log("  preferTime:", result.preferTime);
  console.log("  steps:", result.steps?.length);
  console.log("  messages:", result.messageCount);
}

main().catch((e) => {
  console.error("FAIL", e.message, e.data || "");
  process.exit(1);
});
