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

## תמחור SaaS (סביבה בלבד)

| רכיב | Env | ברירת מחדל |
|------|-----|------------|
| הקמה | `MOKED_SETUP_FEE_ILS` | ₪690 |
| חודשי | `MOKED_SUBSCRIPTION_ILS` | ₪299 |
| שנתי | `MOKED_ANNUAL_ILS` | ₪2,990 |

עשרת הלקוחות הראשונים: הקמה בחינם תמורת המלצה + רפרנס; חיוב ידני. **Checkout מלא של מנוי MOKED — אחרי go-live** (לא חוסם beachhead).

גביית לקוח קצה (Wave D): מוסתרת מאחורי `MOKED_ENABLE_CUSTOMER_PAYMENTS=false`.

## Agent layer

ראו [`docs/AGENT.md`](./docs/AGENT.md) + [`docs/MOKED-AGENT-SPEC-EN.md`](./docs/MOKED-AGENT-SPEC-EN.md). `npm run eval:agent` חייב ירוק.

## איפה אנחנו בפיתוח

| גל | תהליכים | סטטוס |
|----|----------|--------|
| A | Intake → Qualification → Booking+כתובת | ✅ |
| B | Reminders + Retention | ✅ |
| C | Quote (+ הנחה אנושית) | ✅ |
| D | Payment (`demo`) | ⏸ מוסתר ב־v1 (`MOKED_ENABLE_CUSTOMER_PAYMENTS`) |
| Agent | classify + grounding + eval | 🚧 |
| Auth + מחיצות משטחים | — | ✅ |
| Meta Embedded Signup | — | ✅ קוד מוכן (דורש credentials) |
| **Postgres (Supabase)** | `pgsmselyieizacwdsdjl` | ✅ סכמה + חיבור קוד |
| **Business events + Outcomes** | `/api/outcomes` | ✅ אירועים מתמשכים + KPI בדשבורד |
| Channel adapter | `src/lib/channels` | ✅ מנוע לא תלוי ישירות ב־Meta |
| **מנוע לידים (פנימי)** | `/superadmin/prospects` | ✅ רשימה + wa.me + משפך עניין לוולידציה |

DB: כשיש `SUPABASE_SERVICE_ROLE_KEY` האפליקציה כותבת ל־Supabase במקום `.data/db.json`.
מיגרציית אירועים: `supabase/migrations/20260908225400_business_events.sql`
מיגרציית לידים: `supabase/migrations/20260909095800_prospects.sql`

---

## הרצה מקומית

```bash
npm i && npm run dev                 # :3000 — נחיתה + מערכת
AUTO_SETUP=1 npm run smoke:wave-a
```
