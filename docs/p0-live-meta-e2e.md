# P0 Live Meta E2E checklist

**Main SHA:** `ab5a161533641dd76df24a76a49796a2f8eeebd9`  
**Purpose:** Concrete runbook for connect → inbound → agent → booking (DB availability) → reminder template.  
**This machine (2026-11-08):** live Meta steps are **BLOCKED** — no Meta secrets / number pool / live phone. Offline demo + unit coverage executed where possible. Do not treat any live step as PASS without a real Graph/WhatsApp round-trip.

## Env matrix (blockers)

| Variable | Needed for | This VM | Vercel `moked` project (`prj_nnzEQWdsND4QDf5w6jUzwKiWkI0Z`) |
|---|---|---|---|
| `META_APP_ID` | Embedded Signup + `subscribed_apps` readiness | missing | **missing** |
| `META_APP_SECRET` | Signup OAuth + webhook HMAC | missing | **missing** |
| `META_EMBEDDED_SIGNUP_CONFIG_ID` | Embedded Signup button | missing | **missing** |
| `META_WABA_ID` | Number pool Graph ops | missing | **missing** |
| `META_SYSTEM_USER_TOKEN` | Pool register / verify | missing | **missing** |
| `META_WHATSAPP_TOKEN` | Fallback send token | missing | **missing** |
| `META_WEBHOOK_VERIFY_TOKEN` | Webhook verify handshake | missing (default only in `.env.example`) | **missing** |
| `META_TEMPLATE_SUBMIT_ENABLED` | Live template create/refresh | missing | **missing** |
| `CRON_SECRET` | `GET /api/cron/reminders` in prod | missing | **missing** |
| `O19_SMS_WEBHOOK_SECRET` | Pool SMS verify inbound | missing | **missing** |
| `MOKED_PROVIDER_MODE=live` | Live provider mode | unset (defaults demo) | **missing** |
| `DATABASE_URL` | Postgres tenant/booking persist | missing (file DB locally) | present (prod/preview) |
| Number pool rows + physical SIM/SMS | Pool registration | none | unknown / not probed live |
| Approved HE templates in BM | Live reminder send | none | unknown / not probed live |

Cursor app secrets for this workspace: **none listed**. Local `.env` / `.env.local`: **absent**.

---

## Runbook

### 0. Preconditions

1. Deploy / run app on `ab5a161+` with Meta + DB env above.
2. Owner account + Trades tenant with bot answers approved, pricing seeded, `availability.windows` + `dailyCapacity` set (pack seeds Sun–Thu 08–18 / Fri 08–13, capacity 4).
3. Reminders process enabled only after utility templates can be approved (`booking_confirm`, `reminder_t24` — readiness blocks otherwise).
4. Public HTTPS webhook URL → `POST /api/whatsapp/webhook` with Meta app subscribed (`subscribed_apps` must include `META_APP_ID`).

**This machine:** **BLOCKED** — Meta + pool env absent; cannot complete live preconditions.

### 1. Connect — Embedded Signup (live)

| | |
|---|---|
| **UI** | `/dashboard/connections` → `EmbeddedSignupButton` |
| **API** | `GET/POST /api/whatsapp/connect` (`mode: "live"`, then `code` + `wabaId` + `phoneNumberId`) |
| **Code** | `src/app/api/whatsapp/connect/route.ts`, `src/lib/whatsapp/meta-oauth.ts`, `getEmbeddedSignupConfig()` |
| **Expect** | `embeddedSignup.ready === true`; FB SDK login returns code; `connectWhatsAppLive` stores token + phone; tenant `whatsapp.mode === "live"` |
| **Status** | **BLOCKED** — `META_APP_ID` / `META_APP_SECRET` / `META_EMBEDDED_SIGNUP_CONFIG_ID` unset here and absent from Vercel project env list. `getEmbeddedSignupConfig().ready` cannot be true. |

**Demo substitute (offline):** `POST /api/whatsapp/connect` `{ "mode": "demo" }` — **PASS** via Wave A smoke (below).

### 2. Number pool (managed path, optional vs Embedded Signup)

| | |
|---|---|
| **API** | Superadmin `/api/superadmin/numbers` + `src/lib/product/pool.ts` / `meta.ts` |
| **Expect** | Add E.164 → reserve → `createBusinessPhone` → SMS code (`O19` webhook) → `registerPoolPhone` |
| **Status** | **BLOCKED** — needs `META_WABA_ID` + `META_SYSTEM_USER_TOKEN` + `O19_SMS_WEBHOOK_SECRET` + unused pool number + SMS delivery. None available on this VM. |

### 3. Inbound WhatsApp → webhook

| | |
|---|---|
| **API** | Meta → `GET` verify (`META_WEBHOOK_VERIFY_TOKEN`) → `POST /api/whatsapp/webhook` |
| **Expect** | Valid `X-Hub-Signature-256`; inbound claimed once (`meta_message_id` idempotency); statuses persisted without agent turn |
| **Status** | **BLOCKED** — no live WABA subscription, no `META_APP_SECRET` for HMAC, no real inbound. |
| **Offline evidence** | Unit suite **PASS**: signature fail-closed, parse inbound/status, delivery + idempotency (`src/lib/whatsapp/webhook.test.ts`, client signature tests). |

### 4. Agent turn

| | |
|---|---|
| **Path** | Webhook → `handleInboundMessage` → classifier / process engine |
| **Expect** | Hebrew reply grounded in tenant knowledge/pricing; **0 invented prices**; escalate only when policy requires |
| **Status (live)** | **BLOCKED** — no live inbound. |
| **Offline** | **PASS** — `npm run eval:agent` invented prices 0; Wave A smoke completed 6 steps / 14 messages on local file DB; eval gate doc [`p0-eval-gate.md`](./p0-eval-gate.md). |

### 5. Booking with DB availability

| | |
|---|---|
| **Path** | Booking wave → `proposeSlotsForTenant` → `tenant.availability` windows + `dailyCapacity` |
| **Expect** | Proposed slots inside windows; empty windows / capacity 0 → `booking.no_availability` (no invented slots); confirm + address |
| **Status (live)** | **BLOCKED** — no live WA conversation. |
| **Offline** | **PASS** — `proposeVisitSlots` unit tests (empty/capacity/window/booked); Wave A smoke `OK wave A completed` with address `רמב״ן 14, ירושלים` against `http://127.0.0.1:3000` (demo WA, file DB). |

### 6. Reminder template path

| | |
|---|---|
| **Path** | Enable `reminders` → seed/submit HE utilities (`POST /api/templates`) → Meta approve `booking_confirm` + `reminder_t24` → book future visit → `GET /api/cron/reminders` with `Authorization: Bearer $CRON_SECRET` → `sendWhatsAppTemplate` |
| **Code** | `src/lib/processes/waves/reminders.ts` (`templateName` `reminder_t24` / `booking_confirm`), `src/app/api/cron/reminders/route.ts`, `sendWhatsAppTemplate` in `src/lib/whatsapp/client.ts` |
| **Expect** | Live send uses approved template (`usedTemplate: true`); demo falls back to labelled text without Graph |
| **Status (live)** | **BLOCKED** — `META_TEMPLATE_SUBMIT_ENABLED`, live token, BM-approved templates, `CRON_SECRET`, and a timed booking all missing. |
| **Offline** | **PASS (demo only)** — template lifecycle unit test (submit→pending→approved mock); cron route + reminder builders exist; readiness requires those two names when reminders enabled. |

### 7. Readiness / go-live gate (live)

| | |
|---|---|
| **Expect** | Live `webhook_subscribed` greens only via WABA `subscribed_apps` containing `META_APP_ID`; display name `APPROVED`; go-live uses `forceLive: true` |
| **Status** | **BLOCKED** on this VM. Unit coverage **PASS** on main (`readiness.test.ts`, `meta-oauth.test.ts`). |

---

## Execution log (this agent)

| Step | Mode | Result |
|---|---|---|
| Sync main to `ab5a161` | git | PASS |
| `npm run eval:agent` | offline | PASS (0 invented prices; 0 unexpected escalations) |
| `npm test` | offline | PASS 56/56 |
| `AUTO_SETUP=1 npm run smoke:wave-a` vs local `next dev` | demo / file DB | PASS (Wave A booking E2E) |
| Embedded Signup live | live Meta | **BLOCKED** — Meta signup trio unset |
| Pool register | live Meta | **BLOCKED** — WABA/system token/SMS pool unset |
| Live inbound webhook | live Meta | **BLOCKED** — no secrets / subscription / phone |
| Live reminder template send | live Meta | **BLOCKED** — templates + cron + live token unset |

## How to finish live (operator)

1. Set all Meta + `CRON_SECRET` (+ optional pool) on Vercel production — currently **no `META_*` keys** on the `moked` project env list.
2. Subscribe app to WABA; confirm `subscribed_apps` includes `META_APP_ID`.
3. Run Embedded Signup (or pool register) for a dedicated ad number.
4. Phone → WhatsApp “שלום” → confirm agent reply → book visit inside hours → wait / force cron for T-24 → confirm template delivery in Meta + conversation.
5. Re-check this checklist; flip steps 1–6/7 to PASS only with captured message IDs / Graph evidence.

## Related

- Eval gate: [`docs/p0-eval-gate.md`](./p0-eval-gate.md)
- Readiness/availability merge: [`internal/p0-readiness-availability.md`](../internal/p0-readiness-availability.md)
- Preferences: do not invent live success; do not tune synthetic escalate rate
