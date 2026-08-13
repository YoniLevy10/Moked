# MOKED — תמונת מצב

## שני הקישורים (נכון)

| מה | כתובת | תפקיד |
|----|--------|--------|
| **דף נחיתה / מכירה** | https://moked-ten.vercel.app · בקוד: `apps/landing` (:3001) | שער דמו ללקוחות פוטנציאליים |
| **מערכת מלאה / Dashboard** | פריסת Vercel של האפליקציה · בקוד: `src/` (:3000) | onboarding, inbox, תהליכים, סימולטור |
| **Superadmin** | `/superadmin` (אחרי כניסת מייל) | יצירת לקוחות מהירה בשבילך |
| **כניסה** | `/login` | מייל+סיסמה (Supabase כשמוגדר / מקומי בפיתוח) |

---

## איפה אנחנו בפיתוח

| גל | תהליכים | סטטוס |
|----|----------|--------|
| A | Intake → Qualification → Booking+כתובת | ✅ |
| B | Reminders (אישור/דחייה/ביטול) + Retention | ✅ מחוזק |
| C | Quote (+ בקשת הנחה אנושית) | ✅ מחוזק |
| D | Payment (ספק `demo` בדמו) | ✅ מחוזק לסימולציה |

---

## החלטות נעולות

1. ישראל בלבד  
2. Meta Cloud API ישיר (בלי BSP)  
3. Payment אחרון  
4. אוטומטי בשגרה · אנושי בהחלטות  
5. Superadmin לפי `ADMIN_EMAILS` (כמו Fixly)

---

## הרצה

```bash
# מערכת
npm i && npm run dev                 # :3000

# נחיתה
cd apps/landing && npm i && npm run dev   # :3001

# Superadmin מקומי
# ב-.env.local: ADMIN_EMAILS=you@mail.com + ADMIN_BOOTSTRAP_PASSWORD=...
# ואז /login עם אותו מייל
```
