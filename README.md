# מוקד (MOKED)

שכבת תפעול לעסקים קטנים **בוואטסאפ** — לא צ׳אטבוט כללי.

**אוטומטי בשגרה. אנושי בהחלטות.** · שוק: ישראל · מנוי פיילוט: **₪690**

> תמונת מצב סוכנים + מה לא לדרוס: [`STATUS.md`](./STATUS.md)  
> תוכנית פסגה (החלטות נעולות): [`docs/MOKED-SUMMIT-PLAN.md`](./docs/MOKED-SUMMIT-PLAN.md)

## מבנה (monorepo)

| נתיב | תוכן | מקור |
|------|------|------|
| `apps/landing/` | דף נחיתה מעוצב | PR #2 (לוגו + landing) |
| `app/` + `lib/` | מערכת Next.js — מנוע, workflows, סימולציה, webhook | PR #3 |
| `docs/` | תוכנית פסגה CEO/CTO/COO | PR #1 |
| `public/brand/` | mark ירוק + wordmark + apple icon | PR #2 |

## הרצה

```bash
# מערכת (סימולציה) — :3000
npm install && npm run dev

# דף נחיתה — :3001
cd apps/landing && npm install && npm run dev
```

סימולציית lead: `יש נזילה במטבח` → `היום אחה״צ` → `רמב״ן 14, ירושלים`

## WhatsApp חי

`.env.local` בשורש (ראו גם `.env.example`):

```bash
WHATSAPP_TOKEN=...
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_VERIFY_TOKEN=moked_verify
```

Webhook: `/api/whatsapp/webhook` · חיבור ייצור לפי הפסגה: **Embedded Signup ישיר מול Meta** (בלי BSP).

## סטטוס workflows במערכת

| id | סטטוס |
|----|--------|
| lead, quote, reminder | חי בסימולציה |
| collect, dispatch, report, review | stubs |

יישור לשמות גלי הפסגה (Intake / Qualification / Booking…) — הצעד הבא בפיתוח.
