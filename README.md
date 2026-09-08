# MOKED

מוקד תפעולי לעצמאים בישראל — ממיר שיחות לתוצאות עסקיות מדידות (לידים, תורים, הכנסות, שימור). WhatsApp הוא ערוץ תקשורת; הלוגיקה והנתונים בבעלות MOKED.

## קישורים

| | כתובת |
|--|--------|
| נחיתה (`/`) | https://moked-ten.vercel.app |
| Dashboard | https://moked-ten.vercel.app/dashboard |
| Login / Superadmin | …/login · …/superadmin |

פריסה אחת: שער הנחיתה ב־`/` והמערכת ב־`/dashboard`.

מסמכים: [`STATUS.md`](./STATUS.md) · [`docs/MOKED-DIFFERENTIATION.md`](./docs/MOKED-DIFFERENTIATION.md) · [`docs/MOKED-SUMMIT-PLAN.md`](./docs/MOKED-SUMMIT-PLAN.md)

## הרצה

```bash
npm install && npm run dev
```

### Superadmin

ב־`.env.local`:

```bash
ADMIN_EMAILS=you@mail.com
ADMIN_BOOTSTRAP_PASSWORD=moked-admin-change-me
AUTH_SECRET=change-me
```

ואז `/login` → `/superadmin`.

## גלים

| גל | תהליכים |
|---|---|
| A | Intake, Qualification, Booking |
| B | Reminders, Retention |
| C | Quote |
| D | Payment (אחרון; ספק `demo`) |

```bash
AUTO_SETUP=1 npm run smoke:wave-a
```
