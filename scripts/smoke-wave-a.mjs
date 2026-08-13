#!/usr/bin/env node
/**
 * Smoke: Wave A end-to-end against a running dev server.
 * Usage: node scripts/smoke-wave-a.mjs
 * Requires: npm run dev
 *           AUTO_SETUP=1 creates owner session + tenant + demo WA
 */
const BASE = process.env.MOKED_BASE_URL || "http://localhost:3000";

const jar = { cookie: "" };

function storeCookies(res) {
  const raw = res.headers.getSetCookie?.() || [];
  if (!raw.length) {
    const single = res.headers.get("set-cookie");
    if (single) raw.push(single);
  }
  for (const c of raw) {
    const part = c.split(";")[0];
    if (part.startsWith("moked_session=")) jar.cookie = part;
  }
}

async function json(path, init = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(jar.cookie ? { Cookie: jar.cookie } : {}),
      ...(init.headers || {}),
    },
  });
  storeCookies(res);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || res.statusText || "request_failed");
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function ensureSession() {
  const me = await json("/api/auth");
  if (me.user) return me.user;

  if (process.env.AUTO_SETUP !== "1") {
    throw new Error("Not logged in. Re-run with AUTO_SETUP=1");
  }

  const email = `smoke_${Date.now()}@moked.local`;
  const password = "smoke1234";
  try {
    await json("/api/auth", {
      method: "POST",
      body: JSON.stringify({
        action: "register",
        email,
        password,
        name: "Smoke Owner",
      }),
    });
  } catch {
    await json("/api/auth", {
      method: "POST",
      body: JSON.stringify({ action: "login", email, password }),
    });
  }
  const again = await json("/api/auth");
  if (!again.user) throw new Error("auth_failed");
  return again.user;
}

async function ensureTenant() {
  await ensureSession();
  const tenants = await json("/api/tenants");
  if (tenants.active?.whatsapp?.connected) return tenants.active;

  if (process.env.AUTO_SETUP !== "1") {
    throw new Error(
      "No connected tenant. Open /onboarding or re-run with AUTO_SETUP=1",
    );
  }

  if (!tenants.active) {
    await json("/api/tenants", {
      method: "POST",
      body: JSON.stringify({
        businessName: "אינסטלציה כהן",
        ownerName: "יוסי",
        phone: "0500000000",
        vertical: "trades",
      }),
    });
  }
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
