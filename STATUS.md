# MOKED — תמונת מצב (מעודכן)

**דף נחיתה חי:** https://moked-ten.vercel.app  
**PR מאוחד:** https://github.com/YoniLevy10/MOKED-/pull/3  
**PRs שנסגרו אחרי איחוד:** #1 (תוכנית+אפליקציה), #2 (לוגו/landing ישן)

---

## איפה אנחנו עכשיו

| שכבה | מה יש | איפה |
|------|--------|------|
| דף נחיתה חי | שער שם־עסק+תחום+דילוג → דמו מותאם | https://moked-ten.vercel.app |
| דף נחיתה בקוד | פורט של חוויית השער + לוגו חדש | `apps/landing` |
| מערכת מוצר | Next.js + 7 גלים + onboarding/dashboard/inbox | `src/` (מ־PR #1) |
| תוכנית פסגה | החלטות נעולות | `docs/MOKED-SUMMIT-PLAN.md` |
| מותג | Apple icon + wordmark/mark | `public/brand/`, `public/apple-touch-icon.png` |

---

## החלטות שנעלו (לא לפתוח מחדש בלי פסגה)

1. **שוק:** ישראל בלבד (עצמאים / עסקים קטנים)
2. **WhatsApp:** Meta **Cloud API ישיר** + Embedded Signup — **בלי BSP**, בלי Baileys/web.js
3. **סדר גלים:**  
   A Intake→Qualification→Booking → B Reminders→Retention → C Quote → **D Payment אחרון**
4. **עקרון מוצר:** אוטומטי בשגרה · אנושי בהחלטות · לא צ׳אטבוט כללי
5. **פיילוט:** מנוי ₪690 · WhatsApp `972548102688`
6. **צבע מותג:** `#087A55`

---

## מה נסגר / מה לא לגעת

- לא לפתוח עוד PR מקביל לאותו ריפו בלי תיאום
- לא לבנות דף נחיתה חלופי לדף החי
- לא להקדים גבייה (גל D) לפני שיש Aha בגל A

---

## הצעד הבא בפיתוח

1. לחבר את `apps/landing` לפריסה (או להחליף את הפרויקט ב־Vercel למונורפו)
2. Meta live: `META_APP_ID` / Embedded Signup / webhook
3. להקשיח גל A בסימולציה ואז בחי
4. DB קבוע (Postgres) במקום `.data/`

## הרצה מקומית

```bash
npm install && npm run dev                 # מערכת :3000
cd apps/landing && npm install && npm run dev  # נחיתה :3001
```
