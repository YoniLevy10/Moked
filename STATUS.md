# MOKED — תמונת מצב

## בידול (חובה)

ראו [`docs/MOKED-DIFFERENTIATION.md`](./docs/MOKED-DIFFERENTIATION.md): MOKED = מערכת תפעולית לתוצאות עסקיות, לא בוט WhatsApp. הדשבורד מציג לידים / תורים / הכנסות / שימור — לא ספירת הודעות.

## קישורים חיים

| מה | כתובת |
|----|--------|
| **נחיתה** | https://moked-ten.vercel.app |
| Dashboard (בעל עסק) | https://moked-ten.vercel.app/dashboard |
| Login | https://moked-ten.vercel.app/login |
| Onboarding | https://moked-ten.vercel.app/onboarding |
| Superadmin | https://moked-ten.vercel.app/superadmin |

פריסה אחת: `/` = שער נחיתה (ציבורי). `/dashboard`, `/onboarding`, `/superadmin` דורשים התחברות.

---

## הפרדת משטחים

| משטח | מי | מה |
|------|-----|-----|
| נחיתה `/` | כולם | דמו שיווקי + CTAs להתחברות |
| Onboarding | בעל עסק מחובר | הקמת עסק + חיבור WhatsApp (Meta / דמו) |
| Dashboard | בעל עסק / superadmin על טננט פעיל | תוצאות עסקיות, תהליכים, חיבורים |
| Superadmin | `ADMIN_EMAILS` בלבד | יצירת לקוחות + **מנוע לידים לוולידציה** (`/superadmin/prospects`) |

---

## Meta (מוצר חי)

1. הגדירו ב־Vercel / `.env.local`: `META_APP_ID`, `META_APP_SECRET`, `META_EMBEDDED_SIGNUP_CONFIG_ID`, `META_WEBHOOK_VERIFY_TOKEN`
2. ב־Meta App: Allowed domains + Webhook → `https://…/api/whatsapp/webhook`
3. בדשבורד → חיבורים → **חבר WhatsApp חי (Embedded Signup)**

דמו נשאר זמין לפיתוח בלי Meta.

---

## איפה אנחנו בפיתוח

| גל | תהליכים | סטטוס |
|----|----------|--------|
| A | Intake → Qualification → Booking+כתובת | ✅ |
| B | Reminders + Retention | ✅ |
| C | Quote (+ הנחה אנושית) | ✅ |
| D | Payment (`demo`) | ✅ סימולציה |
| **P0.1 PSP billing** | `PspClient` + Demo + Tranzila adapter | ✅ דמו מלא; live דרך מתאם (Tranzila ראשון, Grow/PayPlus/Cardcom בהמשך) |
| Auth + מחיצות משטחים | — | ✅ |
| Meta Embedded Signup | — | ✅ קוד מוכן (דורש credentials) |
| **Postgres (Supabase)** | `pgsmselyieizacwdsdjl` | ✅ סכמה + חיבור קוד |
| **Business events + Outcomes** | `/api/outcomes` | ✅ אירועים מתמשכים + KPI בדשבורד |
| Channel adapter | `src/lib/channels` | ✅ מנוע לא תלוי ישירות ב־Meta |
| **מנוע לידים (פנימי)** | `/superadmin/prospects` | ✅ רשימה + wa.me + משפך עניין לוולידציה |

DB: כשיש `SUPABASE_SERVICE_ROLE_KEY` האפליקציה כותבת ל־Supabase במקום `.data/db.json`.
מיגרציית אירועים: `supabase/migrations/20260908225400_business_events.sql`
מיגרציית לידים: `supabase/migrations/20260909095800_prospects.sql`
מיגרציית מנוי: `supabase/migrations/20260909120000_subscription_columns.sql`

### P0.3 — Readiness gate

- `src/lib/product/readiness.ts` + `GET /api/tenants/readiness` + `POST /api/admin/tenants/[id]/go-live`
- Engine חוסם עם `tenant.blocked` כשיש בדיקה חוסמת
- דמו: בלי Graph; עדיין דורש WhatsApp / מנוי / הוראות (חיבור דמו מסמן lab-ready)
- Live: גם token / webhook / display name דרך Graph
- UI: רשימת מוכנות בדשבורד; לא מסמנים «חי» כש־`ready === false`

### P0.2 — Meta webhook hardening

- `statuses[]` + `message_template_status_update` ב־`webhook.ts`
- עמודות `delivered_at` / `read_at` / `failed_at` / `error_code` על messages
- טבלת `templates` דקה לעדכוני סטטוס (P0.5 ישלים submit/seed)
- Idempotency ב־`webhook_events`; חתימת Meta fail-closed ב־live; `MOKED_META_SIGNATURE_BYPASS=1` ללוקאל בלבד

### P0.1 — חיוב PSP (ספק-אגנוסטי)

- חוזה: `PspClient` ב־`src/lib/integrations/psp.ts`; בחירה ב־`getPsp()` לפי `MOKED_PROVIDER_MODE` + `MOKED_BILLING_PROVIDER`.
- דמו: `DemoPspClient` (בלי רשת). Live ראשון: `TranzilaClient` ב־`tranzila.ts` בלבד.
- Webhooks: `psp-webhook.ts` → `verifyWebhook` + lookup לפי `externalId` + `webhook_events` idempotency.
- Env: `PSP_WEBHOOK_SECRET` (גנרי); `TRANZILA_*` רק למתאם Tranzila.
- **עדיין נדרש מבעלים:** בחירת ספק סופית + credentials בדשבורד הספק (Tranzila או אחר) כשעוברים ל־`MOKED_PROVIDER_MODE=live`.

---

## הרצה מקומית

```bash
npm i && npm run dev                 # :3000 — נחיתה + מערכת
AUTO_SETUP=1 npm run smoke:wave-a
```
