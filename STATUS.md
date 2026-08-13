# MOKED — תמונת מצב סוכנים (13.08.2026)

מסמך תיאום כדי שלא נבנה במקביל אותו דבר פעמיים.

## מי עשה מה

| סוכן | PR / בראנץ׳ | מה יצא | סטטוס |
|------|-------------|--------|--------|
| **לוגו + דף נחיתה** `bc-019ffb9b…29f8` | [#2](https://github.com/YoniLevy10/MOKED-/pull/2) `cursor/moked-landing-logo-29f8` | דף נחיתה מעוצב (RTL, Heebo/Outfit) + נכסי מותג | **מקור אמת לדף הנחיתה** — יובא ל־`apps/landing` |
| **תוכנית פסגה WhatsApp** `bc-019ffba5…e822` | [#1](https://github.com/YoniLevy10/MOKED-/pull/1) `cursor/moked-whatsapp-onboarding-plan-e822` | `docs/MOKED-SUMMIT-PLAN.md` — החלטות נעולות | **מקור אמת לאסטרטגיה** — יובא ל־`docs/` |
| **ייבוא מערכת + מונורפו** (הסוכן הזה) `bc-019ffb8c…cb75` | [#3](https://github.com/YoniLevy10/MOKED-/pull/3) `cursor/import-from-cloud-agent-cb75` | מנוע workflows, סימולציה, webhook, reminder | **מקור אמת למערכת** בשורש `app/` + `lib/` |
| סוכן ראשון `bc-019ffb10…` | — | סשן בלי GitHub; סיכום הועבר ידנית | לא נגיש ישירות |

## החלטות מוצר שנעלו (פסגה)

- שוק: **ישראל בלבד**
- WhatsApp: **Meta Cloud API ישיר** (בלי BSP; בלי Baileys/web.js)
- סדר גלים: Intake→Qual→Booking → Reminders→Retention → Quote → **Payment אחרון**
- עקרון: אוטומטי בשגרה · אנושי בהחלטות
- מנוי פיילוט: ₪690 · WA: 972548102688

## מבנה מונורפו אחרי האיחוד

```
apps/landing/     ← דף הנחיתה מ־PR #2 (לא לבנות מחדש)
app/ + lib/       ← מערכת הסימולציה + workflows
docs/             ← תוכנית הפסגה
public/brand/     ← לוגו mark + wordmark + apple-touch-icon
```

## לוגו

- `public/brand/moked-mark-green.png` — סימן לאתר / hero
- `public/apple-touch-icon.png` — Apple icon
- `public/brand/moked-logo-wordmark.png` — wordmark ל־nav

> אם יש קבצי מקור סופיים מהמשתמש — להחליף את הקבצים בנתיבים האלה (בלי לשנות מבנה).

## מה לא לעשות

- לא לפתוח עוד דף נחיתה בשורש הריפו
- לא לשנות את סדר הגלים מתוכנית הפסגה
- לא לחבר BSP / ספריות WhatsApp לא־רשמיות

## הצעד הבא בפיתוח

1. החלפת לוגו במקורות המשתמש (אם שונים מהקיימים)
2. יישור שמות ה־7 workflows במערכת לפי גלי הפסגה (Intake/Qual/Booking…)
3. Embedded Signup של Meta (דורש מפתחות)
4. השלמת גל A בסימולציה ואז חי
