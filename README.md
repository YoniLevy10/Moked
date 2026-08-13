# מוקד (MOKED)

שכבת תפעול לעסקים קטנים **בוואטסאפ** — לא צ׳אטבוט כללי.

**אוטומטי בשגרה. אנושי בהחלטות.**

מנוי פיילוט: **₪690**/חודש · WhatsApp: **972548102688**

## מבנה (monorepo)

| נתיב | תוכן |
|------|------|
| `app/` + `lib/` | מערכת Next.js — מנוע sessions, workflows, סימולציה, WhatsApp webhook |
| `apps/landing/` | דף נחיתה / דמו מכירה |
| `public/moked-logo.svg` | לוגו (מ ירוק `#087A55`) |

## מה עובד

| רכיב | סטטוס |
|------|--------|
| Catalog של 7 workflows | ✅ `lib/workflows/catalog.js` |
| מנוע sessions + events | ✅ `lib/engine/router.js` |
| Store בזיכרון (MVP) | ✅ `lib/store/memory.js` |
| WhatsApp Cloud API + webhook | ✅ `lib/whatsapp/client.js`, `/api/whatsapp/webhook` |
| `lead` — פנייה שלא נענתה | ✅ חי בסימולציה |
| `quote` — הצעה + אישור הנחה | ✅ חי בסימולציה |
| `reminder` — תזכורת ביקור | ✅ חי בסימולציה |
| `collect` / `dispatch` / `report` / `review` | 🟡 stubs |
| Onboarding | ✅ `/onboarding` |
| דשבורד סימולציה | ✅ `/` + `POST /api/admin` |
| Approvals API | ✅ `/api/approvals` |
| Landing | ✅ `apps/landing` |

## הרצה

### מערכת (פורט 3000)

```bash
npm install
npm run dev
```

פתחו http://localhost:3000  
חיבור עסק → סימולציית WhatsApp.

**סימולציית lead לדוגמה**

1. `יש נזילה במטבח`
2. כפתור `היום אחה״צ`
3. `רמב״ן 14, ירושלים`

### דף נחיתה (פורט 3001)

```bash
cd apps/landing && npm install && npm run dev
```

http://localhost:3001

## WhatsApp חי (Meta)

צרו `.env.local` בשורש:

```bash
WHATSAPP_TOKEN=...
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_VERIFY_TOKEN=moked_verify
```

Webhook: `GET/POST /api/whatsapp/webhook`

## סדר המשך

1. חיבור Meta WhatsApp אמיתי  
2. השלמת workflow `reminder`  
3. `collect` → `dispatch` → `report` → `review`  
4. DB קבוע (Supabase/Postgres) + multi-tenant  

## עקרון מוצר

שבעה תהליכים סגורים (ליד, הצעה, תזכורת, גבייה, שיבוץ, דיווח, ביקורת).  
שגרה רצה אוטומטית; הנחות / מחיר / אישור בעלים — תמיד אנושי.
