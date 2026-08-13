# MOKED

מוקד תפעולי לעצמאים בישראל — חיבור WhatsApp Cloud API בלחיצה, וסגירת 7 תהליכים לפי גלים.

## מסמכים

- [תוכנית פסגה CEO/CTO/COO](docs/MOKED-SUMMIT-PLAN.md)

## הרצה מקומית

```bash
npm install
npm run dev
```

פתחו http://localhost:3000

1. `/onboarding` — יצירת עסק + חיבור WhatsApp (דמו)
2. `/dashboard` — סקירה + סימולטור הודעות
3. `/dashboard/processes` — הפעלה/כיבוי לכל 7 התהליכים (גלים A–D)
4. `/dashboard/inbox` — שיחות, השתלטות אנושית, תזכורות ושימור
5. `/dashboard/connections` — WhatsApp + יומן + ספקי גבייה

## גלים

| גל | תהליכים |
|---|---|
| A | Intake, Qualification, Booking |
| B | Reminders, Retention |
| C | Quote |
| D | Payment (אחרון) |

## Meta Live

העתיקו `.env.example` ל־`.env.local` ומלאו:

- `META_APP_ID`
- `META_EMBEDDED_SIGNUP_CONFIG_ID`
- `META_WHATSAPP_TOKEN`
- `META_WEBHOOK_VERIFY_TOKEN`

Webhook: `POST /api/whatsapp/webhook`  
Payment webhook (גל D): `POST /api/payments/webhook`
