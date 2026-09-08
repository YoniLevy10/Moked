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
| Auth + מחיצות משטחים | — | ✅ |
| Meta Embedded Signup | — | ✅ קוד מוכן (דורש credentials) |
| **Postgres (Supabase)** | `pgsmselyieizacwdsdjl` | ✅ סכמה + חיבור קוד |

DB: כשיש `SUPABASE_SERVICE_ROLE_KEY` האפליקציה כותבת ל־Supabase במקום `.data/db.json`.

---

## הרצה מקומית

```bash
npm i && npm run dev                 # :3000 — נחיתה + מערכת
AUTO_SETUP=1 npm run smoke:wave-a
```
