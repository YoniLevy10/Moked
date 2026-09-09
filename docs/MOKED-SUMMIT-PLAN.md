# MOKED — תוכנית פסגה CEO / CTO / COO
## חיבור עצמאים בלחיצת כפתור + גישה ל-WhatsApp ל־7 תהליכים

**סטטוס:** מסמך החלטות — עודכן אחרי פסגה  
**מוצר:** MOKED  
**שוק:** ישראל בלבד  
### עקרון מנחה (בידול)
MOKED אינו בוט AI לוואטסאפ — זו מערכת תפעולית שממירה שיחות לתוצאות עסקיות מדידות.
WhatsApp/Meta הם ערוץ תקשורת שניתן להחלפה; הלוגיקה, הנתונים והלקוחות בבעלות MOKED.
ה־Dashboard מציג לידים / תורים / הכנסות / שימור — לא ספירת הודעות.
ראו [`MOKED-DIFFERENTIATION.md`](./MOKED-DIFFERENTIATION.md).

**עקרון onboarding:** Zero-friction → ערוץ תקשורת (WhatsApp היום) → סגירת 7 תהליכים בלי שהלקוח יבנה אוטומציות בעצמו

### החלטות פסגה שננעלו
| # | החלטה | סטטוס |
|---|---|---|
| 1 | השוק = **ישראל** (עצמאים ועסקים קטנים מקומיים) | ✅ נעול |
| 2 | חיבור WhatsApp = **Cloud API ישיר מול Meta** (בלי BSP מתווך) | ✅ נעול |
| 3 | תעדוף תהליכים = **קודם מה שפשוט ומהיר דרך Meta**; תשלומים וסיבוכים חיצוניים = **בסוף** | ✅ נעול |

---

## 1. תקציר מנהלים (CEO)

### מה אנחנו בונים
מוקד תפעולי לעסקים קטנים ועצמאים **בישראל**, שמתחבר ל-WhatsApp שלהם **בלחיצה אחת**, ומריץ עבורם 7 תהליכים עסקיים מקצה לקצה — בלי Zapier, בלי הגדרות, בלי צוות IT.

### למה עכשיו
- WhatsApp הוא ערוץ ברירת המחדל של לקוחות מול עסק בישראל.
- עצמאים לא מצליחים לסגור לידים / תורים / מעקב — לא בגלל חוסר רצון, אלא בגלל עומס ובלגן.
- Meta מאפשרת **Embedded Signup + Cloud API** — onboarding רשמי בלי מתווך, בלי תלות ב-BSP.
- מי ששולט בחיבור + בתהליכים — שולט ב־retention וב־ARPU.

### הצעת הערך במשפט אחד
> "תחבר את הוואטסאפ שלך פעם אחת — אנחנו סוגרים לך את העסק."

### מה לא בונים (בשלב 1)
- לא עוד chatbot כללי.
- לא עוד CRM כבד.
- לא דורשים מהלקוח לחבר 12 כלים.
- לא מסתמכים על ספריות לא־רשמיות של WhatsApp Web (סיכון חסימה משפטי/טכני).
- לא BSP / מתווך WhatsApp — קשר ישיר ל-Meta בלבד.
- לא גבייה/תשלומים ב-MVP — נדחה לסוף הרשימה.
---

## 2. הבעיה והפתרון

| כאב של העצמאי | מה קורה היום | מה MOKED עושה |
|---|---|---|
| ליד מגיע בוואטסאפ ב־23:00 | לא עונים / עונים מאוחר | תגובה ראשונה + סינון אוטומטי |
| תיאום תור | הודעות הלוך־חזור | בוקינג ישיר בשיחה |
| הצעת מחיר | שוכחים / שולחים מאוחר | הצעה מובנית + מעקב |
| גבייה | "אשלח קישור מחר" | לינק תשלום בשיחה |
| No-show | אין תזכורות | תזכורות + אישור הגעה |
| שירות אחרי מכירה | נעלם | רצף follow-up אוטומטי |
| המלצות / חזרתיות | לא מבקשים | בקשת ביקורת + הפניה |

---

## 3. שבעת התהליכים — לפי תעדוף פסגה

**עקרון תעדוף:** קודם כל מה שרץ בפשטות ובמהירות על **Meta Cloud API בלבד** (שיחה נכנסת, תשובות, כפתורים, templates).  
כל מה שדורש ספקי תשלום / חשבוניות / אינטגרציות כבדות — **בסוף הרשימה**.

| עדיפות | תהליך | תלות | גל |
|---|---|---|---|
| 1 | Intake — קליטת פנייה | Meta בלבד (חלון 24ש) | A — MVP |
| 2 | Qualification — סינון ליד | Meta בלבד (שיחה) | A — MVP |
| 3 | Booking — תיאום תור | Meta + יומן פשוט (אופציונלי בהתחלה) | A — MVP |
| 4 | Reminders / Ops — תזכורות | Meta Templates | B |
| 5 | Retention — ביקורות והפניות | Meta Templates + קישור Google | B |
| 6 | Quote → Close — הצעת מחיר | Meta + קונפיג מחירון | C |
| 7 | Payment — גבייה | ספקי תשלום ישראליים + חשבוניות | D — אחרון |

### תהליך 1 — קליטת פנייה ראשונה (Intake) · גל A
**מטרה:** אף הודעה לא נופלת בין הכיסאות.  
**למה ראשון:** עובד מיד על הודעה נכנסת, בלי templates ובלי ספקים חיצוניים.  
**זרימה:** הודעה נכנסת → סיווג כוונה (מכירה / תמיכה / ספאם) → תשובה מיידית ממותגת בעברית → יצירת כרטיס ליד + התראה לבעל העסק.  
**מדד:** Time-to-first-reply < 30 שניות, % לידים מסווגים.

### תהליך 2 — סינון וכיול (Qualification) · גל A
**מטרה:** לדעת מי חם ומי לא, בלי שיחה ארוכה.  
**למה שני:** עדיין שיחה טהורה בתוך חלון ה־24 שעות של Meta.  
**זרימה:** 2–5 שאלות דינמיות (שירות, תקציב, מועד, אזור) → ציון ליד → ניתוב לאוטומציה או לאדם.  
**מדד:** % לידים מוסמכים, חיסכון בזמן בעל העסק.

### תהליך 3 — תיאום תור / פגישה (Booking) · גל A
**מטרה:** לסגור מועד בתוך השיחה.  
**למה שלישי:** ערך עסקי גבוה; גרסת MVP יכולה לאסוף מועד מועדף ב-WhatsApp ואז לאשר מול בעל העסק — בלי יומן מלא בהתחלה.  
**זרימה (MVP קל):** הצעת משבצות / בקשת מועד → אישור → סיכום בשיחה → (אופציונלי) כתיבה ל-Google Calendar.  
**מדד:** % שיחות שהסתיימו במועד סגור.

### תהליך 4 — תזכורות ותפעול שירות (Reminders / Ops) · גל B
**מטרה:** להקטין No-show ולשמור על חוויית לקוח.  
**למה כאן:** דורש Message Templates מאושרים ב-Meta — עדיין בלי ספקים חיצוניים, אבל עם עבודת אישור templates.  
**זרימה:** T-24h / T-2h תזכורות → אישור הגעה → עדכון סטטוס שירות.  
**מדד:** no-show %, % אישורי הגעה.

### תהליך 5 — שימור, ביקורות והפניות (Retention) · גל B
**מטרה:** להפוך לקוח חד־פעמי למנוע צמיחה.  
**למה כאן:** template + קישור ל-Google Reviews — עדיין פשוט יחסית, בלי תשלומים.  
**זרימה:** אחרי השירות → בקשת ביקורת → בקשת הפניה.  
**מדד:** % ביקורות, % הפניות.

### תהליך 6 — הצעת מחיר וסגירה (Quote → Close) · גל C
**מטרה:** להפוך עניין להצעה ואז לעסקה.  
**למה מאוחר יותר:** דורש מחירון / חבילות לפי ורטיקל + לוגיקת מעקב — יותר קונפיגורציה ממוצר.  
**זרימה:** בחירת שירות → הצעת מחיר ב-WhatsApp → תזכורות → סטטוס אושר/נדחה.  
**מדד:** conversion ליד→הצעה→עסקה.

### תהליך 7 — גבייה (Payment) · גל D — אחרון
**מטרה:** כסף נכנס בלי רדיפה.  
**למה אחרון (החלטת פסגה):** הכי מסובך תפעולית לישראל — ספקי סליקה, webhooks, קבלות/חשבוניות, התאמות. לא חוסם Aha moment.  
**זרימה (עתידי):** לינק תשלום (Grow / PayPlus / Tranzila / Cardcom) → שליחה בשיחה → אישור → חשבונית.  
**מדד:** % גבייה אוטומטית, DSO.

---

## 4. חיבור WhatsApp בלחיצת כפתור (CTO — ארכיטקטורה)

### 4.1 העיקרון
הלקוח **לא** צריך להבין Meta Business Manager, WABA, phone number ID, או webhooks.  
הוא לוחץ "חבר WhatsApp" → עובר Embedded Signup של Meta → חוזר ל-MOKED מחובר.

### 4.2 מסלול מומלץ (Production-grade)

```
[לקוח עצמאי]
    │  כפתור "חבר WhatsApp"
    ▼
[MOKED Frontend — Embedded Signup]
    │  Facebook Login + WhatsApp Embedded Signup
    ▼
[Meta Graph API]
    │  access token + WABA ID + Phone Number ID
    ▼
[MOKED Backend — Connection Service]
    │  שמירת credentials מוצפנים, רישום webhooks
    ▼
[Message Orchestrator]
    │  inbound/outbound + templates + media
    ▼
[Process Engine]  ←── 7 playbooks
    │
    ▼
[Integrations Layer]  ←── יומן, תשלומים, CRM, Zapier/Make (אופציונלי)
```

### 4.3 מה כן ומה לא

| אפשרות | החלטה | סיבה |
|---|---|---|
| **WhatsApp Cloud API + Embedded Signup (ישיר ל-Meta)** | ✅ **נעול** | שליטה מלאה, פחות תלות, פחות בעיות מתווך |
| **BSP (360dialog / Twilio / Gupshup)** | ❌ נדחה | תלות + עמלות + נקודת כשל מיותרת |
| **WhatsApp Business App (לא API)** | ❌ לא למוצר ליבה | אין שליטה אמיתית באוטומציה |
| **ספריות לא־רשמיות (Baileys / whatsapp-web.js)** | ❌ אסור במוצר | חסימות, ToS, סיכון משפטי ללקוחות |

### 4.4 Onboarding בלחיצה — חוויית משתמש

1. הרשמה ל-MOKED (טלפון / Google).
2. בחירת סוג עסק + תבנית תהליכים (למשל: קליניקה / שיפוצים / יועץ / מספרה).
3. כפתור **חבר WhatsApp** → Embedded Signup.
4. אימות מספר (אם נדרש) + בחירת שם תצוגה.
5. בדיקת חיבור: שליחת הודעת בדיקה לבעל העסק.
6. הפעלת תהליכי גל A (Intake / Qualification / Booking) עם defaults בעברית.
7. Go-live בתוך **< 10 דקות**.

### 4.5 דרישות טכניות קריטיות
- Meta App + WhatsApp product + Embedded Signup config.
- Webhook endpoint מאובטח (verify token + signature validation).
- ניהול **Message Templates** (אישורים מ-Meta להודעות יזומות מחוץ לחלון 24 שעות).
- תור הודעות (Queue) + retry + idempotency — WhatsApp אינו סולח לכפילויות/איבודים.
- הצפנת tokens במנוחה (KMS), הרשאות per-tenant.
- Rate limits + circuit breakers מול Graph API.
- Media storage (תמונות/מסמכים/הקלטות) עם TTL ומדיניות פרטיות.

### 4.6 מודל Multi-tenant
כל עצמאי = Tenant:
- WABA / Phone Number משלו (או מספר משותף במודל managed — לא מומלץ ל־brand).
- Playbooks משלו + overrides.
- בידוד נתונים מוחלט (RLS / schema-per-tenant לפי בחירת DB).

---

## 5. שכבת אוטומציה וחיבורים (CTO + COO)

### 5.1 עמדת הפסגה (חשוב)
**Zapier/Make אינם הליבה.**  
הם שכבת הרחבה ללקוחות שכבר חיים ב-Google Sheets / HubSpot / Monday.  
הליבה של MOKED חייבת לעבוד **גם בלי שום כלי חיצוני**.

### 5.2 מפת אינטגרציות מומלצת

#### שכבה A — Native לגל A/B (ישראל)
| קטגוריה | ספקים | מתי |
|---|---|---|
| זהות | Phone OTP (ישראל) + Google OAuth | Day 0 |
| יומן | Google Calendar | גל A (אופציונלי ב-MVP הקל) |
| ביקורות | קישור Google Business Profile | גל B |

#### שכבה A2 — Native לגל D בלבד (נדחה לסוף)
| קטגוריה | ספקים ישראליים | מתי |
|---|---|---|
| תשלומים | Grow, PayPlus, Tranzila, Cardcom | גל D — אחרון |
| חשבוניות | iCount, Morning, Green Invoice | גל D — אחרון |

#### שכבה B — Automation bridges (אחרי שיש ליבה חיה בישראל)
| כלי | מתי משתמשים | תפקיד |
|---|---|---|
| **Make.com** | לקוחות power-users | תרחישים מורכבים בלי קוד |
| **Zapier** | מי שכבר חי שם | "אם קורה X ב-MOKED → עדכן Y" |
| **n8n** | שליטה בעלות / לוגיקה פנימית | אוטומציות פנימיות של MOKED |

#### שכבה C — CRM / Ops (Phase 2–3)
- HubSpot / Salesforce / Monday / Pipedrive — sync דו־כיווני של לידים וסטטוסים.
- Slack / Email — התראות לבעל העסק על לידים חמים.

### 5.3 מודל חיבור "בלחיצה" גם לכלים חיצוניים
לאחר חיבור WhatsApp:
- מסך **חיבורים** עם כפתורי OAuth לכל native.
- כפתור **חיבור Zapier/Make** דרך Embedded App / Invite link + API key scoped.
- Webhooks יוצאים מתועדים (`lead.created`, `booking.confirmed`, `payment.paid`...).

### 5.4 המלצת ארכיטקטורה לאינטגרציות
```
Process Engine
   └─ Integration Bus (events)
         ├─ Native Adapters (Calendar, Payments, Invoicing)
         ├─ Outbound Webhooks
         └─ Zapier/Make Connector (iPaaS)
```
עקרון: **Event-driven**. התהליכים מפיקים אירועים; מתאמים מאזינים. כך לא ננעלים לספק אחד.

---

## 6. ארכיטקטורת מערכת מומלצת (CTO)

### 6.1 רכיבים
1. **Web App** — onboarding, הגדרות תהליכים, inbox משלים, אנליטיקה.
2. **API Gateway** — auth, rate limit, tenant context.
3. **Connection Service** — WhatsApp Embedded Signup + token lifecycle.
4. **Messaging Service** — send/receive, templates, media.
5. **Process Engine** — state machines ל־7 התהליכים (durable workflows).
6. **AI Layer** — סיווג כוונה, חילוץ ישויות, ניסוח תשובות, שמירה על טון המותג.
7. **Integration Bus** — native + iPaaS.
8. **Admin / Ops Console** — תמיכה, ניטור Meta errors, template approvals.
9. **Data & Analytics** — funnel per process, cohort retention.

### 6.2 המלצות טכנולוגיות (כיוון, לא דוגמה)
- Frontend: Next.js (App Router)
- Backend: Node.js / TypeScript על Fluid Compute (או שירות durable נפרד ל־workflows ארוכים)
- DB: Postgres (Supabase/Neon) + RLS
- Queue/Workflows: Inngest / Trigger.dev / Temporal / Vercel Workflow — חובה ל־reminders ו־retries
- AI: Gateway אחיד למודלים (סיווג + generation) עם guardrails
- Observability: structured logs + traces per message_id / conversation_id

### 6.3 AI — איפה כן ואיפה בזהירות
**כן:** סיווג, סיכום, הצעת תשובה, חילוץ שדות, זיהוי כוונת רכישה.  
**בזהירות:** הבטחות מחיר/זמינות בלי מקור אמת; שליחת הודעות יזומות בלי template מאושר; פנייה רפואית/משפטית רגישה בלי human-in-the-loop.

### 6.4 Compliance & Trust
- מדיניות פרטיות ברורה + הסכמת לקוח קצה (opt-in) היכן שנדרש.
- יומן ביקורת: מי שלח מה ומתי.
- מחיקת נתונים לפי בקשת tenant (חוק הגנת הפרטיות הישראלי; GDPR אם רלוונטי ללקוחות עם נתוני EU).
- הפרדת נתוני שיחה בין טננטים.
- Meta Business Verification מוקדם — חוסם הפתעות בהיקף.

---

## 7. מודל תפעול (COO)

### 7.1 Customer Journey תפעולי
1. Acquisition → Landing + דמו 2 דקות.
2. Activation → חיבור WhatsApp + תהליך ראשון חי.
3. Aha moment → ליד ראשון שנסגר / תור ראשון שתואם אוטומטית.
4. Habit → Inbox יומי + דוח בוקר בוואטסאפ לבעל העסק.
5. Expansion → הוספת תהליכים / סניף / מספר נוסף / אינטגרציות.

### 7.2 Success Metrics (North Star + Supporting)
- **North Star:** מספר תהליכים שנסגרו אוטומטית לשבוע (Closed Process Actions).
- Activation: % משתמשים שמחברים WhatsApp בתוך 24 שעות.
- Time-to-value: דקות עד הודעה ראשונה אוטומטית.
- Retention: D30 / D90 לפי עסקים פעילים (שלחו/קיבלו הודעות).
- Gross margin: עלות Meta + AI + support מול ARPU.

### 7.3 תמיכה ו־Ops
- Playbooks מוכנים לפי ורטיקל (לא קונפיגורציה חופשית בהתחלה).
- "Human takeover" בלחיצה — בעל העסק משתלט על שיחה.
- Escalation לצוות MOKED רק על כשלי חיבור Meta / תשלומים / באגים.
- Template operations: תהליך פנימי לאישור תבניות מול Meta לכל ורטיקל.

### 7.4 סיכונים תפעוליים
| סיכון | השפעה | mitigation |
|---|---|---|
| עיכוב אישור Templates | תהליכים יזומים נעצרים | ספריית templates מוכנה מראש לכל ורטיקל |
| חסימת מספר / quality rating נמוך | פגיעה בלקוח | ניטור quality, הגבלת broadcast, חינוך תוכן |
| Onboarding נתקע ב-Meta | נטישה | guided UX + support hotline בשבוע הראשון |
| תלות ב-AI לא מדויק | נזק מוניטין | confidence thresholds + escalation לאדם |

---

## 8. Go-to-Market ומודל עסקי (CEO + COO)

### 8.1 ICP — ישראל בלבד (נעול)
עצמאים ועסקים קטנים מבוססי **שירות + תיאום** בישראל:
- קליניקות / מטפלים
- בעלי מקצוע (שיפוץ, מיזוג, חשמל)
- יועצים / מאמנים
- מספרות / קוסמטיקה
- סוכני נדל"ן קטנים

שפה: עברית כברירת מחדל בכל ה-UX, templates, והודעות מערכת.  
אין GTM לחו״ל בשלב הנוכחי.

### 8.2 אריזה מוצרית
- **MOKED Start** — חיבור WhatsApp + גל A (Intake, Qualification, Booking).
- **MOKED Pro** — + גל B/C (Reminders, Retention, Quote).
- **MOKED Scale** — + גל D (תשלומים), צוותים, מספרים מרובים, אינטגרציות.

### 8.3 תמחור (כיוון לדיון — ₪)
- Subscription חודשי בשקלים לפי תוכנית.
- Usage component קל (שיחות פעילות / הודעות template) — בשקיפות.
- לא לסבסד הודעות Meta ללא הגבלה (שולי רווח נשחקים מהר).

### 8.4 תחרות
| סוג מתחרה | דוגמאות | איך מנצחים |
|---|---|---|
| Inbox / Chat tools | Respond.io, WATI, Interakt | תהליכים עסקיים מוכנים, לא רק תיבת דואר |
| אוטומציה כללית | Make + WhatsApp | אנחנו מביאים outcome, לא constructor |
| CRM כבד | HubSpot | פשטות לעצמאי + WhatsApp-native |
| סוכנויות | ניהול ידני | מוצר self-serve + מחיר SaaS |

---

## 9. Roadmap ביצוע (מעודכן לפי תעדוף)

### Phase 0 — Foundation
- Meta App + **Cloud API ישיר** + Embedded Signup (sandbox → production).
- Tenant model + auth בעברית.
- Webhook pipeline + message store.
- UX: כפתור "חבר WhatsApp" + מסך סטטוס חיבור.

### Phase 1 — גל A (MVP / Time-to-value)
- **Intake + Qualification + Booking (קל)**.
- הכל על Meta בלבד; יומן Google אופציונלי.
- Inbox בסיסי + human takeover.
- דוח בוקר לבעל העסק בוואטסאפ / במייל.

### Phase 2 — גל B
- **Reminders / Ops** + ספריית Message Templates בעברית.
- **Retention** (ביקורת Google + הפניה).
- ניטור quality rating של מספרי WhatsApp.

### Phase 3 — גל C
- **Quote → Close** + מחירונים לפי ורטיקל ישראלי.
- אנליטיקת funnel מלאה.

### Phase 4 — גל D (אחרון)
- **Payment** מול ספקי סליקה ישראליים.
- חשבוניות (iCount / Morning וכו').
- Zapier / Make / API ציבורי — רק אחרי שהליבה יציבה.

---

## 10. החלטות פסגה — סטטוס

### ננעלו
| נושא | החלטה |
|---|---|
| שוק | **ישראל בלבד** |
| חיבור WhatsApp | **Cloud API ישיר ל-Meta** (בלי BSP) |
| סדר תהליכים | Meta-simple קודם; **Payment אחרון** |
| עקרון אינטגרציות | Native-first, Zapier-second |
| חיבורים לא־רשמיים | אסורים לחלוטין |

### עדיין פתוחות לדיון
### CEO
1. האם המותג מבטיח "סגירת תהליכים" או "עוזר לסגור"?
2. תמחור: flat ₪ vs usage-hybrid?

### CTO
1. האם AI כותב תשובות אוטומטית כברירת מחדל, או רק מציע?
2. בחירת durable workflow engine לתזכורות (גל B).

### COO
1. מי מאשר templates בעברית ומטפל ב־quality rating?
2. מה ה־SLA לחיבור WhatsApp שנכשל?
3. האם בשבועיים הראשונים יש onboarding אנושי מלווה לכל לקוח משלם?

---

## 11. המלצת הפסגה (Verdict — מעודכן)

**לבנות MOKED כ־Process Operating System על WhatsApp לשוק הישראלי**, עם קשר ישיר ל-Meta.

1. שוק = **ישראל**, UX ו-templates בעברית.
2. חיבור בלחיצה = **Embedded Signup + Cloud API ישיר** (בלי BSP).
3. סדר בניה = **Intake → Qualification → Booking → Reminders → Retention → Quote → Payment**.
4. MVP = גל A בלבד (3 תהליכים ראשונים) — Aha בלי סליקה.
5. תשלומים וחשבוניות = גל אחרון, לא על הנתיב הקריטי.

אם מממשים את זה — העצמאי הישראלי מקבל:  
**לחיצה אחת, בלי סיבוכים, והעסק רץ על הוואטסאפ.**

---

## נספח A — אירועי מערכת מרכזיים (לאינטגרציות)

- `whatsapp.connected`
- `message.received` / `message.sent`
- `lead.created` / `lead.qualified`
- `booking.proposed` / `booking.confirmed` / `booking.cancelled`
- `quote.sent` / `quote.accepted`
- `payment.link_sent` / `payment.paid` / `payment.failed`
- `reminder.sent` / `attendance.confirmed`
- `review.requested` / `referral.requested`
- `human.takeover.started` / `human.takeover.ended`

## נספח B — הגדרת "לחיצת כפתור" (Acceptance Criteria)

ה-onboarding נחשב מוצלח רק אם:
1. משתמש חדש בלי ידע טכני מחבר מספר WhatsApp תוך ≤ 10 דקות.
2. הודעת בדיקה עוברת דו־כיוונית.
3. לפחות תהליך אחד רץ אוטומטית על הודעת לקוח אמיתית.
4. אין צורך בפתיחת Meta Business Manager ידנית (מעבר למה ש-Embedded Signup דורש).
5. במקרה כשל — מסך מסביר בעברית פשוטה מה לתקן + כפתור "נסה שוב" / "הזעק תמיכה".
