# MOKED — בידול מוצר (חובה בכל החלטה)

עקרון יחיד שמנחה מוצר, עיצוב, ארכיטקטורה ופיתוח.
**אין להוסיף פיצ׳רים גנריים שאינם מחזקים את הבידול.**

## הבידול

MOKED אינו “בוט AI לוואטסאפ”.

MOKED הוא **מערכת תפעולית** שממירה שיחות לתוצאות עסקיות מדידות:

פנייה נכנסת → קליטת ליד → סינון והתאמה → קביעת תור → הצעת מחיר → תזכורת → תשלום → ביקורת → שימור.

| שייך ל־MOKED (ליבה) | ניתן להחלפה (ערוץ) |
|---|---|
| לוגיקה עסקית, תהליכים, נתונים, לקוחות | WhatsApp / Meta (או SMS / Web בעתיד) |
| אירועים עסקיים מדידים | ספק שליחת הודעות |
| Dashboard של תוצאות | Inbox / סימולטור |

## אירועים עסקיים (לא ספירת הודעות)

כל שיחה חייבת להפיק אירועים כמו:

- `lead.created` / `lead.qualified`
- `booking.confirmed`
- `quote.accepted`
- `payment.paid`
- `referral.accepted` (לקוח שחזר)

נשמרים ב־`business_events` ומניעים את `/api/outcomes`.

## Dashboard

בעל העסק רואה:

- כמה לידים נסגרו / סוננו
- כמה תורים נקבעו
- כמה הכנסות נוצרו
- כמה לקוחות הוחזרו

**לא** כמה הודעות נשלחו.

## ארכיטקטורה

```
Inbound (channel adapter)
    → Process Engine (channel-agnostic)
    → Business Events (persisted)
    → Outcomes / Dashboard
Outbound ← MessagingChannel (WhatsApp today)
```

המנוע ב־`src/lib/processes/engine.ts` שולח דרך `resolveChannel()` —
לא דרך Meta API ישירות.
