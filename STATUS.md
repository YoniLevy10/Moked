# MOKED — תמונת מצב

## קישורים חיים

| מה | כתובת |
|----|--------|
| **נחיתה + מערכת** | https://moked-ten.vercel.app |
| Dashboard | https://moked-ten.vercel.app/dashboard |
| Login | https://moked-ten.vercel.app/login |
| Superadmin | https://moked-ten.vercel.app/superadmin |

פריסה אחת: `/` = שער נחיתה, `/dashboard` = מערכת מלאה.

> **הערה (תוקן 13.08):** הפרויקט היה עם `framework: null` ולכן deployment עלה Ready בלי output → 404. הוגדר `nextjs` ונפרס מחדש מ־`main`.

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
