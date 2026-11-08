# P0 — Managed path: first paying Trades customer

**Code baseline:** `origin/main` @ `7971d5e` (Vertical Pack interface — #40)  
**Prior gates:** security freeze #37 · webhook statuses/idempotency #38 · readiness + DB availability #39 · pack interface #40 · eval PASS ([`p0-eval-gate.md`](./p0-eval-gate.md))  
**Related live Meta checklist:** [`p0-live-meta-e2e.md`](./p0-live-meta-e2e.md) — do **not** mark Meta steps PASS without real Graph/WhatsApp evidence.  
**Scope:** Moked team onboards one Trades customer end-to-end via **managed** path + **manual invoice**. No card checkout (P1). No P1 self-service expansion.

---

## Who does what

| Role | Account | Where |
|---|---|---|
| Moked operator | Superadmin (`ADMIN_EMAILS` / admin gate) | `/admin` (= superadmin onboarding UI) |
| Business owner | Owner email+password created in step 1 | `/dashboard`, `/onboarding`, `/dashboard/connections` |
| Rule | After tenant create, **do owner steps logged in as the owner** — do not rely on “סמן כלקוח פעיל” alone on Postgres (see gaps). |

Managed = same product APIs as self-service; operator fills them for the customer.

---

## Preconditions (before creating the tenant)

1. Production deploy is on `7971d5e` or newer.
2. Vercel env: fees already set; **`META_*` must be set for live** (today they are still missing — see §8). Until Meta is set, only the **demo** WhatsApp path works; that is **not** first paying customer DoD.
3. Have ready: business legal name, owner name, owner email, phone, trade niche (plumbing / electrical / hvac / renovation / handyman), agreed hours if different from pack default, and whether setup ₪690 is waived for testimonial+reference.
4. Leave Wave B (reminders/retention) **off** until HE utility templates `booking_confirm` + `reminder_t24` are Meta-approved.
5. Keep `MOKED_ENABLE_CUSTOMER_PAYMENTS=false` (Wave D parked).

---

## 1. Superadmin create tenant (trades pack)

1. Open production `/admin` → unlock with admin gate → Superadmin **Onboarding לקוחות**.
2. Fill form:
   - **שם העסק** · **שם בעלים** · **טלפון**
   - **ורטיקל:** `בעלי מקצוע` (`trades`) — required for pack seeds
   - **מייל בעלים** + **סיסמת בעלים** (required for new owner)
   - **חבר WhatsApp דמו עכשיו:** checked OK as temporary; replace with live in §4
   - **הפעל גם גל B:** leave **unchecked** until templates approved
3. Submit **צור לקוח + חשבון בעלים + גל A**.
4. Confirm success note: `(נוצר יוזר בעלים)` or `(יוזר קיים קושר)`.

**What the code seeds automatically** (`createTenant` → `applyPackToTenant` / trades pack on `7971d5e`):

- Wave A processes: intake · qualification · booking · quote **on**; reminders/retention/payment **off**
- Default niche when UI does not send `tradeKind`: **plumbing** pricing + bot answers
- Availability: Sun–Thu 08–18, Fri 08–13, `dailyCapacity: 4`, `Asia/Jerusalem`
- Payment provider: `none`

**Niche other than plumbing:** Superadmin UI does **not** send `tradeKind` today. Prefer creating the owner first, then having them use `/onboarding` **only if they have no tenant yet** — once linked, owner cannot create another tenant. Practical workaround for non-plumbing first customer: either (a) create via owner `/onboarding` with tradeKind instead of superadmin form, or (b) create as trades/plumbing then rewrite bot answers + accept plumbing catalog until a pricing editor lands. Document the niche chosen on the invoice notes.

API equivalent: `POST /api/superadmin/tenants` with `{ businessName, ownerName, phone, vertical: "trades", ownerEmail, ownerPassword, connectDemoWhatsapp, enableWaveA: true, enableWaveB: false }`.

---

## 2. Seed pricing / hours / availability

**Default path (no custom catalog):** pack defaults from step 1 are enough for a first demo visit booking. Confirm on owner session:

1. Log in as **owner** (email/password from step 1).
2. Open `/dashboard/bot` — bot answers should show trades copy (what / hours / forbidden / handoff).
3. Optionally refine free-text instructions → **נסח הוראות** → **אשר והמשך** (`POST /api/bot` then `POST /api/bot/approve`). Bot approval is **blocking** for readiness.

**Custom hours/capacity (operator-visible API, no dashboard UI yet):**

```http
PATCH /api/tenants
Authorization: owner session cookie
Content-Type: application/json

{
  "availability": {
    "timezone": "Asia/Jerusalem",
    "windows": [
      { "day": 0, "startHour": 8, "endHour": 18 },
      { "day": 1, "startHour": 8, "endHour": 18 },
      { "day": 2, "startHour": 8, "endHour": 18 },
      { "day": 3, "startHour": 8, "endHour": 18 },
      { "day": 4, "startHour": 8, "endHour": 18 },
      { "day": 5, "startHour": 8, "endHour": 13 }
    ],
    "dailyCapacity": 4
  }
}
```

(`day`: 0=Sun … 6=Sat.) Empty windows or `dailyCapacity: 0` → agent correctly returns no slots (no invented availability).

**Custom list prices:** there is **no** owner API/UI to rewrite `pricing_items` after create. Use pack prices for P0 first customer, or stop and ask engineering before promising custom catalog amounts (zero invented prices rule).

**Knowledge mirror:** owner self-serve `POST /api/tenants` also calls `seedKnowledgeFromTenant`. Superadmin create does **not**. Prices still resolve from `tenant.pricing`; FAQ rows may be thinner. Acceptable for first managed customer if bot answers are approved.

---

## 3. Owner account link

Already done in step 1 when `ownerEmail` + password succeed.

Verify:

1. Log out of admin.
2. Sign in as owner → `/dashboard` loads that business (not another tenant).
3. If link failed (`owner_password_required_for_new_user` / create error): recreate with password ≥6 chars, or link existing user by creating with that email and empty new password path (existing users link without password).

Do **not** operate the rest of this runbook solely as gate-only superadmin on Postgres — `getActiveTenant()` still returns `tenants[0]` remotely; owner `tenantId` is the reliable isolation key for P0.

---

## 4. WhatsApp Embedded Signup / demo path

### Demo (offline rehearsal only — not DoD)

1. Owner → `/dashboard/connections` → **חבר בדמו (בלי Meta)**  
   or `POST /api/whatsapp/connect` `{ "mode": "demo" }`.
2. Run §6 demo שלום. Mark clearly as **demo**, not live.

### Live (required for first paying customer)

1. Confirm §8 Meta env on Vercel production + Meta App webhook:
   - Callback URL: `https://<prod-host>/api/whatsapp/webhook`
   - Verify token = `META_WEBHOOK_VERIFY_TOKEN`
2. Owner → `/dashboard/connections` → **חבר WhatsApp חי (Meta Embedded Signup)**  
   (`EmbeddedSignupButton` → `GET/POST /api/whatsapp/connect` live).
3. Expect: `whatsapp.connected === true`, `whatsapp.mode === "live"`, display phone present.
4. **Managed number pool (optional alternative):** `/admin/numbers` → add E.164 → reserve → Meta register → SMS verify (`META_WABA_ID`, `META_SYSTEM_USER_TOKEN`, `O19_SMS_WEBHOOK_SECRET`). Prefer Embedded Signup when the customer brings/creates the WABA phone in-product.

Positioning (locked preference): **new dedicated ads/landing number**; customer’s personal WhatsApp stays untouched; no Coexistence.

---

## 5. Readiness checklist (post-#39 real probes)

Owner dashboard shows **מוכנות לאוויר** (`GET /api/tenants/readiness` → `evaluateReadiness`).

### Always blocking (demo + live)

| Check id | Meaning | Fix |
|---|---|---|
| `whatsapp_connected` | WA linked | `/dashboard/connections` |
| `subscription_active` | SaaS sub active | Activate via §6 live-test side-effect **or** signed `POST /api/billing/webhook` after manual invoice (§7) — checkout alone only sets `pending` |
| `bot_instructions_approved` | Bot draft approved | `/dashboard/bot` → אשר |
| `templates_approved` | Needed only if reminders/retention on | Keep Wave B off **or** approve `booking_confirm` + `reminder_t24` |

### Live probes (when `MOKED_PROVIDER_MODE=live` **or** go-live `forceLive`)

| Check id | Meaning | Fix |
|---|---|---|
| `token_valid` | Graph phone node OK with tenant token | Re-run Embedded Signup |
| `webhook_subscribed` | WABA `subscribed_apps` contains `META_APP_ID` | Subscribe app in Meta BM; set `META_APP_ID` |
| `display_name_approved` | `name_status === APPROVED` | Finish Meta display-name approval |

**Go-live (superadmin):** `POST /api/admin/tenants/<tenantId>/go-live` always runs **forceLive** probes — demo-relaxed green must not unlock live. On success, flips `whatsapp.mode` to `live` if connected.

**Operator rule:** dashboard readiness in `MOKED_PROVIDER_MODE=demo` skips Graph probes. For paying live customer, set provider mode live **and/or** pass go-live; do not trust demo-relaxed “מוכן” alone.

---

## 6. Live שלום test

### In-app rehearsal (also activates subscription if inactive)

1. Owner → `/onboarding` step 3 **or** `POST /api/onboarding/live-test`  
   `{ "ensureDemoNumber": true, "text": "שלום" }` (demo) / omit ensure for live-only.
2. Expect `ok: true`, Hebrew reply mentioning business / greeting; returns `waLink` + `displayPhone`.
3. Note: this route **auto-sets `subscription.status = active`** when not already active — that is the supported managed activation until P1 card checkout / billing webhook is wired for invoices.

### Real phone (required for DoD)

1. From a personal phone, open the returned `waLink` or WhatsApp the **new ad number**.
2. Send **שלום**.
3. Confirm inbound hits `POST /api/whatsapp/webhook` (signed), one agent turn (idempotent on `meta_message_id`), Hebrew reply grounded — **no invented prices**.
4. Optionally continue: ask for a visit → slots inside availability windows → confirm with address.
5. Capture: display phone, Meta message id(s), screenshot of reply. Without these, do **not** claim live PASS ([`p0-live-meta-e2e.md`](./p0-live-meta-e2e.md)).

---

## 7. Manual invoice (₪690 waived option + ₪299/mo)

Card checkout is **P1**. First ten customers: invoice manually (preferences).

1. Issue invoice outside the app (iCount / Morning / GreenInvoice / bank transfer — operator’s tools):
   - **Setup:** ₪690 **or waived** in exchange for testimonial + reference (note waiver on the invoice / CRM).
   - **Monthly:** ₪299 (`MOKED_SUBSCRIPTION_ILS`) — or annual ₪2,990 if agreed (`MOKED_ANNUAL_ILS`).
2. Record: tenant id, business name, owner email, invoice id, paid-at, waiver yes/no.
3. Activate SaaS entitlement in product (pick one):
   - **Preferred for managed P0:** run owner live-test (§6) so subscription becomes `active`, **or**
   - If `BILLING_WEBHOOK_SECRET` is set: `POST /api/billing/webhook` with `x-moked-signature` HMAC-SHA256 of raw body and payload activating that `tenantId` (`applyBillingEvent` → `active` + optional number lock from pool).
4. Do **not** enable Wave D / customer payment links (`MOKED_ENABLE_CUSTOMER_PAYMENTS` stays `false`).
5. Dashboard **שמור בקשת מנוי** alone leaves status `pending` — insufficient for readiness.

---

## 8. What must be set in Vercel

Project: `moked` (`prj_nnzEQWdsND4QDf5w6jUzwKiWkI0Z`). Re-checked 2026-11-08 via Vercel env list (names only).

### Already set (OK for commercial fees + Wave D park)

| Key | Notes |
|---|---|
| `MOKED_SETUP_FEE_ILS` | `690` |
| `MOKED_SUBSCRIPTION_ILS` | `299` |
| `MOKED_ANNUAL_ILS` | `2990` |
| `MOKED_ENABLE_CUSTOMER_PAYMENTS` | `false` |
| `DATABASE_URL` | prod |
| `AUTH_SECRET` | prod/preview |
| `ADMIN_GATE_PASSWORD` | prod/preview/dev |
| Supabase URL/keys | present (legacy; data path prefers `DATABASE_URL`) |

### Must set for **live** first customer (currently **missing**)

| Key | Why |
|---|---|
| `META_APP_ID` | Embedded Signup + `subscribed_apps` readiness probe |
| `META_APP_SECRET` | OAuth + webhook HMAC fail-closed |
| `META_EMBEDDED_SIGNUP_CONFIG_ID` | Signup button ready |
| `META_WEBHOOK_VERIFY_TOKEN` | Meta verify handshake |
| `META_WHATSAPP_TOKEN` | Optional fallback send token |
| `MOKED_PROVIDER_MODE` | Set `live` for production live tenants |
| `CRON_SECRET` | Reminder cron when Wave B on |
| `META_TEMPLATE_SUBMIT_ENABLED` | Live template submit when enabling reminders |

### Optional (number pool managed path)

`META_WABA_ID` · `META_SYSTEM_USER_TOKEN` · `O19_SMS_WEBHOOK_SECRET`

### Optional (manual invoice → webhook activate)

`BILLING_WEBHOOK_SECRET` · `MOKED_BILLING_PROVIDER`

### Do not turn on for P0

`MOKED_ENABLE_CUSTOMER_PAYMENTS=true` · Wave D · card SaaS checkout UI as the only activation path.

---

## 9. Definition of done — “first paying customer live”

All of the following must be true (no fake Meta claims):

1. **Tenant** exists with `vertical: "trades"`, owner can log in and open `/dashboard`.
2. **Bot approved** + **subscription `active`** after real payment or documented waiver+invoice.
3. **WhatsApp live** on a **dedicated ads number** (`mode: "live"`, connected); personal number untouched.
4. **Readiness** passes with **live** probes (`token_valid`, `webhook_subscribed` with real `subscribed_apps`, `display_name_approved`) — go-live 200 or equivalent evidence.
5. **Real phone שלום** answered in Hebrew with business grounding; message ids / screenshot filed; **0 invented prices** in that thread.
6. **Manual invoice** filed (₪299/mo + ₪690 or waiver noted); MRR attributed to this tenant in operator CRM.
7. Dashboard **four beachhead numbers** show from this tenant’s real conversations (not empty demo-only fiction); demo badge only if still in demo (must not be demo at DoD).
8. Reminders still off **or** templates approved before Wave B on.

Until §8 Meta env is on Vercel and steps 3–5 have real Graph evidence, status remains **BLOCKED for live DoD** even if demo onboarding is green.

---

## Remaining code gaps that affect managed onboarding

**No crash-level blocker on `7971d5e` for a plumbing trades customer** who accepts pack default prices/hours, works as the **owner** session, activates sub via live-test/billing webhook, and has Meta env configured. Eval + unit gates are green on prior SHA; pack interface is on main.

**Friction / follow-ups (not fixed in this docs task — not starting P1):**

1. **Ops (hard for live):** all `META_*` (+ provider mode / cron / templates) still unset on Vercel — blocks live DoD.
2. **Superadmin create** does not accept `tradeKind` and does not call `seedKnowledgeFromTenant` (owner `POST /api/tenants` does).
3. **No pricing update API/UI** after create — custom catalogs need engineering or wait for P1 editors.
4. **No availability editor UI** — `PATCH /api/tenants` works; dashboard processes page toggles waves only.
5. **No “mark invoice paid → activate” button** — activation is live-test side-effect or billing webhook.
6. **Postgres superadmin active tenant** still effectively `tenants[0]` / session link — mitigate by always using the owner login for tenant work.
7. **Card SaaS checkout** intentionally absent until P1.

**Code PR from this pass:** none — docs-only; no small blocking bug found that prevented documenting a workable managed path.

---

## Quick operator checklist (copy)

- [ ] Meta + fees env verified on Vercel (§8)
- [ ] `/admin` create trades tenant + owner (§1)
- [ ] Owner login; bot approve; availability OK (§2–3)
- [ ] Live Embedded Signup (or pool) (§4)
- [ ] Readiness live probes green / go-live 200 (§5)
- [ ] Phone שלום + evidence (§6)
- [ ] Manual invoice ₪299 (+ ₪690 or waiver) + sub active (§7)
- [ ] DoD §9 all checked — first paying Trades customer live
