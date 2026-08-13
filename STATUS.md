# MOKED — תמונת מצב

**דף נחיתה חי:** https://moked-ten.vercel.app  
**main:** מוזג מ־PR #3  
**פיתוח נוכחי:** בראנץ׳ `cursor/wave-a-harden-cb75`

---

## איפה אנחנו

| שכבה | סטטוס |
|------|--------|
| מונורפו ב־`main` | ✅ אחרי מיזוג PR #3 |
| מערכת `src/` | ✅ onboarding / dashboard / 7 גלים |
| גל A (Intake→Qual→Booking+כתובת) | 🔧 מקשיחים עכשיו + סימולטור «הרץ גל A מלא» |
| דף נחיתה `apps/landing` | ✅ שער דמו + קישור ל־`/onboarding` |
| Meta live | ⏳ דורש מפתחות `META_*` |
| DB קבוע | ⏳ עדיין `.data/` |

---

## החלטות נעולות

1. ישראל בלבד  
2. Meta Cloud API ישיר (בלי BSP)  
3. גלים A→B→C→**D Payment אחרון**  
4. אוטומטי בשגרה · אנושי בהחלטות  
5. פיילוט ₪690 · WA `972548102688` · צבע `#087A55`

---

## הרצה / בדיקה

```bash
npm install && npm run dev
# בדפדפן: /onboarding → חבר WhatsApp דמו → /dashboard → «הרץ גל A מלא»

AUTO_SETUP=1 npm run smoke:wave-a
```
