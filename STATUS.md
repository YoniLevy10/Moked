# MOKED — תמונת מצב

## קישורים חיים (עכשיו)

> `moked-ten.vercel.app` מחזיר **404** — אין פריסת production מחוברת לחשבון Vercel.
> פורסמה פריסה זמנית (תוקף ~שעה) עד שתתחבר מחדש / תמסור `VERCEL_TOKEN`.

| מה | כתובת |
|----|--------|
| **נחיתה + מערכת (אותו דומיין)** | https://temporary-express-spruce-8f7jo8m.vercel.app |
| Dashboard | https://temporary-express-spruce-8f7jo8m.vercel.app/dashboard |
| Login | https://temporary-express-spruce-8f7jo8m.vercel.app/login |
| Superadmin | https://temporary-express-spruce-8f7jo8m.vercel.app/superadmin |
| **לשמור לצמיתות** | [Claim deployment](https://vercel.com/claim-deployment?code=6fffe406-815e-43c2-b678-4590b1037ac6) → ואז לחבר דומיין `moked-ten.vercel.app` |

במונורפו: `/` = שער נחיתה, `/dashboard` = מערכת מלאה (פריסה אחת).

---

## איפה אנחנו בפיתוח

| גל | תהליכים | סטטוס |
|----|----------|--------|
| A | Intake → Qualification → Booking+כתובת | ✅ |
| B | Reminders + Retention | ✅ |
| C | Quote (+ הנחה אנושית) | ✅ |
| D | Payment (`demo`) | ✅ סימולציה |

---

## החלטות נעולות

1. ישראל בלבד  
2. Meta Cloud API ישיר (בלי BSP)  
3. Payment אחרון  
4. אוטומטי בשגרה · אנושי בהחלטות  
5. Superadmin לפי `ADMIN_EMAILS` (כמו Fixly)

---

## הרצה מקומית

```bash
npm i && npm run dev                 # :3000 — נחיתה + מערכת
# אופציונלי: apps/landing על :3001 (אותו שער)
```
