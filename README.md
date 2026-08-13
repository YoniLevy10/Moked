# MOKED

מוקד תפעולי לעצמאים בישראל — חיבור WhatsApp Cloud API בלחיצה, וסגירת 7 תהליכים לפי גלים.

**דף נחיתה חי:** https://moked-ten.vercel.app  
**סטטוס מלא + החלטות:** [`STATUS.md`](./STATUS.md) · **תוכנית פסגה:** [`docs/MOKED-SUMMIT-PLAN.md`](./docs/MOKED-SUMMIT-PLAN.md)

## מבנה

| נתיב | תוכן |
|------|------|
| `src/` | אפליקציית המוצר (onboarding, dashboard, 7 גלים, WhatsApp APIs) |
| `apps/landing/` | דף נחיתה (שער דמו) |
| `public/brand/` | לוגו mark + wordmark |
| `docs/` | תוכנית פסגה |

## הרצה

```bash
npm install && npm run dev
```

1. `/onboarding` — יצירת עסק + חיבור WhatsApp (דמו)
2. `/dashboard` — סקירה + סימולטור
3. `/dashboard/processes` — 7 התהליכים (גלים A–D)
4. `/dashboard/inbox` — שיחות / השתלטות אנושית
5. `/dashboard/connections` — WhatsApp + יומן + גבייה

דף נחיתה בנפרד:

```bash
cd apps/landing && npm install && npm run dev
```

## גלים (נעול)

| גל | תהליכים |
|---|---|
| A | Intake, Qualification, Booking |
| B | Reminders, Retention |
| C | Quote |
| D | Payment (**אחרון**) |

## Meta Live

העתיקו `.env.example` ל־`.env.local` (ראו משתני `META_*`).

## בדיקת גל A

```bash
# אחרי npm run dev + חיבור דמו, או:
AUTO_SETUP=1 npm run smoke:wave-a
```
