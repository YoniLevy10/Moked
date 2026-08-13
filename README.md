# MOKED

מוקד תפעולי לעצמאים בישראל — WhatsApp Cloud API + 7 תהליכים לפי גלים.

## קישורים

| | כתובת |
|--|--------|
| נחיתה (`/`) | https://temporary-express-spruce-8f7jo8m.vercel.app |
| Dashboard | …/dashboard |
| Login / Superadmin | …/login · …/superadmin |
| דומיין היסטורי | `moked-ten.vercel.app` — כרגע 404 עד חיבור Vercel מחדש |

פריסה אחת: שער הנחיתה ב־`/` והמערכת ב־`/dashboard`. שמירה לצמיתות: claim ב־Vercel + חיבור הפרויקט ל־GitHub.

מסמכים: [`STATUS.md`](./STATUS.md) · [`docs/MOKED-SUMMIT-PLAN.md`](./docs/MOKED-SUMMIT-PLAN.md)

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
