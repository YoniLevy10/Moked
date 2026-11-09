# MOKED Meta Release Readiness

**Date:** 2026-11-09  
**Base:** `main` @ `c82a01a`  
**Branch:** `cursor/meta-connection-blockers-2ce9`  
**Verdict:** **NO-GO** for production live WhatsApp  
**Readiness:** **58%** (code defects fixed + mocked gates green; OWNER Meta/Vercel + real E2E still open)

Prior audit (MK-37 / worker `bc-25f18537-1d00-52fa-a5b1-1e41ef5452ea`): NO-GO — Embedded Signup `session?.data?.[0]` vs object-shaped `data`; `registerCloudApiPhone` PIN `123456` warn-not-throw; missing `META_*` = OWNER out of scope for code PR.

---

## 1. Bugs / files fixed

| # | Defect | Files | Fix |
|---|--------|-------|-----|
| 1 | Embedded Signup parsed only array `data[0]` — current Meta docs use object-shaped `data`; CANCEL/ERROR could still proceed if FB returned a code | `src/components/whatsapp/EmbeddedSignupButton.tsx`, `src/lib/whatsapp/embedded-signup-session.ts` (+ test) | Parse object + legacy array; CANCEL / ERROR / FINISH_ONLY_WABA / missing IDs → never call `onConnected`; migrate launch `extras` to **v4** (`version: "v4"`), remove deprecated `sessionInfoVersion: "3"` |
| 2 | `registerCloudApiPhone` hardcoded PIN `123456` and warned on failure (soft-open) | `src/lib/whatsapp/meta-oauth.ts` (+ test) | Require `META_PHONE_REGISTER_PIN` in production; crypto-random PIN only in non-prod; fail-closed; actionable `pin_mismatch` / `register_failed`; already-registered → success |
| 3 | `MOKED_PROVIDER_MODE=live` coupled WhatsApp live to live PSP billing | `src/lib/integrations/psp.ts`, `get-psp.ts`, `src/lib/product/billing.ts`, `src/app/api/billing/checkout/route.ts`, `.env.example` | New `MOKED_BILLING_MODE` + `billingMode()`; WhatsApp live ≠ live billing; customer payments remain `MOKED_ENABLE_CUSTOMER_PAYMENTS=false`; demo default preserved |
| 4 | Webhook verify fell back to public `moked_dev_verify_token` in all envs | `src/app/api/whatsapp/webhook/route.ts`, `src/lib/whatsapp/webhook-verify.ts` (+ test) | Production requires explicit non-default `META_WEBHOOK_VERIFY_TOKEN` (503 if missing); HMAC / idempotency / tenant isolation unchanged |
| 5 | Graph / ES versions scattered hardcodes; ES still on v2-era sessionInfoVersion | `src/lib/whatsapp/graph.ts` + call sites (`client.ts`, `meta-oauth.ts`, `product/meta.ts`, `product/readiness.ts`, `templates/meta-graph.ts`) | Central `META_GRAPH_VERSION=v21.0` (compatible tested pin — not blind bump to v26); `META_EMBEDDED_SIGNUP_VERSION=v4`; documented upgrade path in module comment |
| 6 | Readiness could be misread as LIVE_READY after demo / live-test simulation | `src/lib/product/readiness.ts` (+ test) | Distinct checks: demo vs `meta_creds_configured` vs `phone_registered` vs `subscribed_apps` vs APPROVED display name vs `live_channel_not_simulated`; report adds `liveReady` / `demoReady`; live-test alone never sets `liveReady` |

---

## 2. Tests

| Gate | Result |
|------|--------|
| `npm test` (121 unit tests) | **PASS** (0 fail) |
| Regression: session object/array/CANCEL/ERROR/missing IDs | **PASS** |
| Regression: register success / already-registered / PIN mismatch / fail-closed | **PASS** |
| Mocked full Embedded Signup (`completeEmbeddedSignup`) | **PASS** |
| Billing decoupled from WhatsApp live | **PASS** |
| Webhook verify token prod fail-closed | **PASS** |
| Readiness: simulation ≠ `liveReady` | **PASS** |
| Existing webhook HMAC / idempotency / PSP / auth / agent suites | **PASS** (unchanged green) |
| `tsc --noEmit` | **PASS** |
| `npm run build` (production) | **PASS** |
| Real WhatsApp send / Meta network | **Not run** (by design — mocked only) |

---

## 3. Remaining blockers (OWNER)

1. Set production Meta app credentials on Vercel (names in §4) — still missing → Embedded Signup `ready=false`.
2. Create / confirm Facebook Login for Business configuration for **Embedded Signup v4** products; set `META_EMBEDDED_SIGNUP_CONFIG_ID`.
3. Set secure unique `META_WEBHOOK_VERIFY_TOKEN` and `META_PHONE_REGISTER_PIN` (6 digits; never `123456`).
4. Configure Meta webhook URL → `/api/whatsapp/webhook` with matching verify token; confirm WABA `subscribed_apps` includes `META_APP_ID` after connect.
5. Complete real Embedded Signup E2E on a test number; confirm display name `APPROVED`; prove real inbound + outbound (not `/api/onboarding/live-test` / demo simulate).
6. Keep `MOKED_BILLING_MODE=demo` and `MOKED_ENABLE_CUSTOMER_PAYMENTS=false` until SaaS live billing is intentionally enabled.
7. Do **not** treat dashboard “מוכן · מצב דמו” or live-test OK as production LIVE_READY — require `forceLive` / `liveReady=true`.

---

## 4. Env names only (no values)

**Required for live WhatsApp connect + webhooks**

- `META_APP_ID`
- `META_APP_SECRET`
- `META_EMBEDDED_SIGNUP_CONFIG_ID`
- `META_WEBHOOK_VERIFY_TOKEN`
- `META_PHONE_REGISTER_PIN`

**WhatsApp mode (independent of billing)**

- `MOKED_PROVIDER_MODE` (`demo` \| `live`)

**Billing (keep demo for Meta go-live)**

- `MOKED_BILLING_MODE` (`demo` \| `live`)
- `MOKED_BILLING_PROVIDER`
- `MOKED_ENABLE_CUSTOMER_PAYMENTS` (must stay unset/`false`)
- `PSP_WEBHOOK_SECRET` / Tranzila vars (only when billing live)

**Optional / existing**

- `META_WHATSAPP_TOKEN`, `META_WABA_ID`, `META_SYSTEM_USER_TOKEN`, `META_TEMPLATE_SUBMIT_ENABLED`
- `MOKED_META_SIGNATURE_BYPASS` (local only — refused in prod/live)

---

## 5. Owner Meta / Vercel steps

1. Meta Developer App → add WhatsApp product; create **Login for Business** config selecting Cloud API products (v4).
2. Copy App ID / App Secret / Config ID into Vercel Production (+ Preview if needed).
3. Generate strong webhook verify token → Vercel `META_WEBHOOK_VERIFY_TOKEN` → Meta webhook callback verify.
4. Choose secure 6-digit register PIN → `META_PHONE_REGISTER_PIN` (or reset PIN in WhatsApp Manager if number already has one).
5. Set callback URL `https://<prod-host>/api/whatsapp/webhook`; subscribe to `messages` (and statuses as already supported).
6. Set `MOKED_PROVIDER_MODE=live` only after §5.1–5.5; leave `MOKED_BILLING_MODE=demo`.
7. Redeploy; run owner Embedded Signup from `/dashboard/connections` or onboarding; do **not** send real customer messages until §6 PASS.

---

## 6. E2E PASS evidence

| Step | Status |
|------|--------|
| Unit + mocked signup / register / readiness / webhook verify | **PASS** (this PR) |
| Production build | **PASS** |
| Real Embedded Signup in Meta UI | **BLOCKED** — OWNER env |
| Real inbound webhook + HMAC | **BLOCKED** — OWNER env |
| Real outbound Cloud API send | **NOT RUN** — policy: no real WA sends in this agent |
| Display name APPROVED + subscribed_apps | **BLOCKED** — OWNER after connect |

---

## 7. Readiness %

| Layer | Score | Notes |
|-------|-------|-------|
| Code correctness (known defects) | 95% | Session parse, PIN, webhook verify, billing split, readiness distinctions |
| Test / build gates | 100% | 121/121 + tsc + production build |
| Config / Meta app (OWNER) | 0% | `META_*` still unset in production |
| Real Meta E2E | 0% | No live send/receive evidence this run |
| **Overall release readiness** | **58%** | Weighted: code+tests solid; live channel unproven |

---

## 8. GO / NO-GO

### **NO-GO**

Ship this PR for code hardening only. Do **not** merge-as-go-live, do not enable customer payments, do not claim LIVE_READY until OWNER completes §3–§5 and records real inbound/outbound evidence in a follow-up audit.

**Re-check for GO:** `liveReady=true` via `forceLive` with real Graph evidence + documented E2E screenshot/log (no demo / live-test simulation).
