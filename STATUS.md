# MOKED — תמונת מצב

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
| Dashboard | בעל עסק / superadmin על טננט פעיל | תפעול, תהליכים, חיבורים |
| Superadmin | `ADMIN_EMAILS` בלבד | יצירת לקוחות + חשבון בעלים + מעבר לדשבורד |

---

## Meta Connectivity (מוצר חי)

1. Vercel / `.env.local`: `META_APP_ID`, `META_APP_SECRET`, `META_EMBEDDED_SIGNUP_CONFIG_ID`, `META_WEBHOOK_VERIFY_TOKEN` (+ אופציונלי `META_DATASET_ID`, `USD_ILS_RATE`)
2. Meta App: Embedded Signup **v4**, domains, Webhook → `/api/whatsapp/webhook` (subscribe `messages`)
3. הרץ מיגרציה: `supabase/migrations/20260908220000_meta_connectivity.sql`
4. דשבורד → חיבורים → **חבר WhatsApp חי** → הגש תבניות עברית

| שכבה | יכולת | סטטוס קוד |
|------|--------|-----------|
| 0 | Webhook statuses + idempotency + ES v4 | ✅ |
| 1 | Buttons / Lists / Location / Flows / Media client | ✅ |
| 2 | Templates he + Quality monitor | ✅ |
| 3 | Pricing analytics ₪ + CTWA scaffolding | ✅ |
| 4 | Calling / Groups / Meta Agent (flags כבויים) | ✅ stubs |

דמו נשאר זמין בלי Meta.

---

## איפה אנחנו בפיתוח

| גל | תהליכים | סטטוס |
|----|----------|--------|
| A | Intake → Qualification → Booking+כתובת | ✅ (+ interactive) |
| B | Reminders + Retention | ✅ (+ templates) |
| C | Quote (+ הנחה אנושית) | ✅ |
| D | Payment (`demo`) | ✅ סימולציה |
| Auth + מחיצות משטחים | — | ✅ |
| **Postgres (Supabase)** | `pgsmselyieizacwdsdjl` | ✅ |
| **Meta Connectivity** | שכבות 0–4 | ✅ קוד (דורש credentials ל־Pilot) |

DB: כשיש `SUPABASE_SERVICE_ROLE_KEY` האפליקציה כותבת ל־Supabase במקום `.data/db.json`.

---

## הרצה מקומית

```bash
npm i && npm run dev                 # :3000 — נחיתה + מערכת
AUTO_SETUP=1 npm run smoke:wave-a
```
