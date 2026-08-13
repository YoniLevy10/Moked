# MOKED

מוקד תפעולי לעצמאים בישראל — WhatsApp Cloud API + 7 תהליכים לפי גלים.

## קישורים

| | מקומי | חי (דוגמה) |
|--|--------|------------|
| דף נחיתה | http://localhost:3001 (`apps/landing`) | https://moked-ten.vercel.app |
| מערכת / Dashboard | http://localhost:3000 | פריסת האפליקציה ב־Vercel |
| Superadmin | http://localhost:3000/superadmin | אותו דומיין מערכת |
| כניסת מייל | http://localhost:3000/login | אותו דומיין מערכת |

מסמכים: [`STATUS.md`](./STATUS.md) · [`docs/MOKED-SUMMIT-PLAN.md`](./docs/MOKED-SUMMIT-PLAN.md)

## הרצה

```bash
npm install && npm run dev
cd apps/landing && npm install && npm run dev
```

### Superadmin (יצירת לקוחות)

ב־`.env.local`:

```bash
ADMIN_EMAILS=you@mail.com
ADMIN_BOOTSTRAP_PASSWORD=moked-admin-change-me
```

ואז `/login` עם אותו מייל → `/superadmin`.

אופציונלי (כמו Fixly): `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## גלים

| גל | תהליכים |
|---|---|
| A | Intake, Qualification, Booking |
| B | Reminders, Retention |
| C | Quote |
| D | Payment (אחרון; ספק `demo` לסימולציה) |

```bash
AUTO_SETUP=1 npm run smoke:wave-a
```
