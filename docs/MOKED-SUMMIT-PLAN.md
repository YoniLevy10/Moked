# MOKED — תוכנית פסגה CEO / CTO / COO
## חיבור עצמאים בלחיצת כפתור + גישה ל-WhatsApp ל־7 תהליכים

**סטטוס:** מסמך החלטות לפסגה  
**מוצר:** MOKED  
**עקרון מנחה:** Zero-friction onboarding → WhatsApp כערוץ תפעול → סגירת 7 תהליכים בלי שהלקוח יבנה אוטומציות בעצמו

---

## 1. תקציר מנהלים (CEO)

### מה אנחנו בונים
מוקד תפעולי לעסקים קטנים ועצמאים, שמתחבר ל-WhatsApp שלהם **בלחיצה אחת**, ומריץ עבורם 7 תהליכים עסקיים מקצה לקצה — בלי Zapier, בלי הגדרות, בלי צוות IT.

### למה עכשיו
- WhatsApp הוא ערוץ ברירת המחדל של לקוחות מול עסק בישראל.
- עצמאים לא מצליחים לסגור לידים / תורים / תשלומים / מעקב — לא בגלל חוסר רצון, אלא בגלל עומס ובלגן.
- Meta מאפשרת **Embedded Signup** — onboarding רשמי של Business API בדקות, בלי BSP מורכב ללקוח הקצה.
- מי ששולט בחיבור + בתהליכים — שולט ב־retention וב־ARPU.

### הצעת הערך במשפט אחד
> "תחבר את הוואטסאפ שלך פעם אחת — אנחנו סוגרים לך את העסק."

### מה לא בונים (בשלב 1)
- לא עוד chatbot כללי.
- לא עוד CRM כבד.
- לא דורשים מהלקוח לחבר 12 כלים.
- לא מסתמכים על ספריות לא־רשמיות של WhatsApp Web (סיכון חסימה משפטי/טכני).

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

## 3. שבעת התהליכים (Product Core)

אלה התהליכים ש-MOKED סוגר "מחוץ לקופסה". כל תהליך = playbook מוכן + מצב (state machine) + מדידה.

### תהליך 1 — קליטת פנייה ראשונה (Intake)
**מטרה:** אף הודעה לא נופלת בין הכיסאות.  
**זרימה:** הודעה נכנסת → סיווג כוונה (מכירה / תמיכה / ספאם) → תשובה מיידית ממותגת → יצירת כרטיס ליד.  
**מדד:** Time-to-first-reply < 30 שניות, % לידים מסווגים.

### תהליך 2 — סינון וכיול (Qualification)
**מטרה:** לדעת מי חם ומי לא, בלי שיחה ארוכה.  
**זרימה:** 2–5 שאלות דינמיות (שירות, תקציב, מועד, מיקום) → ציון ליד → ניתוב לאוטומציה או לאדם.  
**מדד:** % לידים מוסמכים, עלות זמן בעל העסק לליד.

### תהליך 3 — תיאום תור / פגישה (Booking)
**מטרה:** לסגור מועד בתוך השיחה.  
**זרימה:** הצעת משבצות פנויות → אישור → כתיבה ליומן → שליחת סיכום.  
**אינטגרציות:** Google Calendar / Outlook (native), אוטומציה חיצונית רק כ־fallback.  
**מדד:** % שיחות שהסתיימו במועד סגור, no-show rate.

### תהליך 4 — הצעת מחיר וסגירה (Quote → Close)
**מטרה:** להפוך עניין להצעה ואז לעסקה.  
**זרימה:** בחירת חבילה/שירות → הצעת מחיר ב-WhatsApp → תזכורות עדינות → סטטוס "אושר/נדחה/ממתין".  
**מדד:** conversion ליד→הצעה→עסקה, זמן מחזור מכירה.

### תהליך 5 — גבייה (Payment)
**מטרה:** כסף נכנס בלי רדיפה.  
**זרימה:** יצירת לינק תשלום (Grow/Tranzila/Stripe/PayPlus וכו') → שליחה בשיחה → אישור קבלה → קבלה/חשבונית.  
**מדד:** % חשבונות שנגבו אוטומטית, DSO (ימי גבייה).

### תהליך 6 — תזכורות ותפעול שירות (Fulfillment Ops)
**מטרה:** להקטין No-show ולשמור על חוויית לקוח.  
**זרימה:** T-24h / T-2h תזכורות → אישור הגעה → עדכון סטטוס שירות → הודעת "הכל מוכן".  
**מדד:** no-show %, CSAT אחרי שירות.

### תהליך 7 — שימור, ביקורות והפניות (Retention & Referrals)
**מטרה:** להפוך לקוח חד־פעמי למנוע צמיחה.  
**זרימה:** אחרי השירות → בקשת ביקורת (Google) → הצעת חבילת המשך → בקשת הפניה + תמריץ.  
**מדד:** % ביקורות, % הפניות, LTV.

> **החלטת פסגה נדרשת:** לאשר את רשימת ה־7 הזו כ־MVP, או להחליף תהליך אחד (למשל Inventory / הזמנות מוצר) לפי קהל היעד הראשון (שירותים vs מסחר).

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

| אפשרות | המלצה | סיבה |
|---|---|---|
| **WhatsApp Cloud API + Embedded Signup** | ✅ ברירת מחדל | רשמי, scalable, מתאים ל־SaaS |
| **BSP (360dialog / Twilio / Gupshup)** | ⚠️ אופציה אם רוצים מהירות/תמיכה | עמלות נוספות, תלות ספק |
| **WhatsApp Business App (לא API)** | ❌ לא למוצר ליבה | אין שליטה אמיתית באוטומציה |
| **ספריות לא־רשמיות (Baileys / whatsapp-web.js)** | ❌ אסור במוצר | חסימות, ToS, סיכון משפטי ללקוחות |

### 4.4 Onboarding בלחיצה — חוויית משתמש

1. הרשמה ל-MOKED (טלפון / Google).
2. בחירת סוג עסק + תבנית תהליכים (למשל: קליניקה / שיפוצים / יועץ / מספרה).
3. כפתור **חבר WhatsApp** → Embedded Signup.
4. אימות מספר (אם נדרש) + בחירת שם תצוגה.
5. בדיקת חיבור: שליחת הודעת בדיקה לבעל העסק.
6. הפעלת 7 התהליכים עם defaults חכמים (ניתן לכבות/לכוון).
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

#### שכבה A — Native (חובה ל־MVP)
| קטגוריה | ספקים מומלצים לישראל/גלובלי | למה |
|---|---|---|
| יומן | Google Calendar, Microsoft Outlook | תהליך Booking |
| תשלומים | Grow, PayPlus, Tranzila, Cardcom, Stripe | תהליך Payment |
| חשבוניות | iCount, Morning, Green Invoice, QuickBooks | אחרי גבייה |
| זהות | Phone OTP + Google OAuth | onboarding מהיר |
| ביקורות | Google Business Profile link | תהליך Retention |

#### שכבה B — Automation bridges (Phase 2)
| כלי | מתי משתמשים | תפקיד |
|---|---|---|
| **Make.com** | לקוחות power-users | תרחישים מורכבים בלי קוד |
| **Zapier** | חדירה לשוק US/EU + familiarity | "אם קורה X ב-MOKED → עדכן Y" |
| **n8n** (self-host / cloud) | שליטה בעלות + לוגיקה פנימית | אוטומציות פנימיות של MOKED / enterprise |
| **Pipedream** | אינטגרציות developer-centric | webhooks מותאמים |

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
- מחיקת נתונים לפי בקשת tenant (GDPR/חוק הגנת הפרטיות).
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

### 8.1 ICP ראשוני (מומלץ)
עצמאים ועסקים קטנים מבוססי **שירות + תיאום**:
- קליניקות / מטפלים
- בעלי מקצוע (שיפוץ, מיזוג, חשמל)
- יועצים / מאמנים
- מספרות / קוסמטיקה
- סוכני נדל"ן קטנים

סיבה: WhatsApp כבר ה־CRM שלהם, וה־7 תהליכים מתאימים 1:1.

### 8.2 אריזה מוצרית
- **MOKED Start** — חיבור WhatsApp + 3 תהליכים ליבה (Intake, Booking, Reminders).
- **MOKED Pro** — כל ה־7 + תשלומים + אנליטיקה.
- **MOKED Scale** — מספרים מרובים, צוות, אינטגרציות Zapier/Make, API.

### 8.3 תמחור (כיוון לדיון)
- Subscription חודשי לפי תוכנית.
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

## 9. Roadmap ביצוע (החלטות פסגה)

### Phase 0 — Foundation (הקמה)
- Meta Business App + Embedded Signup sandbox.
- Tenant model + auth.
- Webhook pipeline + message store.
- UX: כפתור חיבור + מסך סטטוס חיבור.

### Phase 1 — MVP (Time-to-value)
- תהליכים 1, 3, 6 (Intake, Booking, Reminders) — הכי מהירים ל־Aha.
- Google Calendar native.
- Inbox בסיסי + human takeover.
- דוח יומי לבעל העסק.

### Phase 2 — Full 7
- Qualification, Quote, Payment, Retention.
- ספקי תשלום ישראליים.
- Template library לפי ורטיקל.
- אנליטיקת funnel.

### Phase 3 — Platform
- Zapier / Make connectors.
- Webhooks + public API.
- Multi-number / צוותים.
- Marketplace ורטיקלים.

---

## 10. החלטות שחייבות לצאת מהפסגה היום

### CEO
1. האם ICP ראשון = שירותים מקומיים בישראל בלבד?
2. האם המותג מבטיח "סגירת תהליכים" או "עוזר לסגור"? (רמת הבטחה משפטית/שיווקית)
3. תמחור: flat vs usage-hybrid?

### CTO
1. Cloud API ישיר מול Meta מול BSP כמתווך?
2. האם AI כותב תשובות אוטומטית כברירת מחדל, או רק מציע?
3. בחירת durable workflow engine לתזכורות ותהליכים ארוכים.

### COO
1. מי מאשר templates ומטפל ב־quality rating?
2. מה ה־SLA לחיבור WhatsApp שנכשל?
3. האם בשבועיים הראשונים יש onboarding אנושי מלווה (white-glove) לכל לקוח משלם?

### שלושתם יחד
1. לאשר את רשימת 7 התהליכים כ־MVP scope.
2. לאשר עיקרון: **Native-first, Zapier-second**.
3. לאשר איסור מוחלט על חיבורי WhatsApp לא־רשמיים.

---

## 11. המלצת הפסגה (Verdict)

**לבנות MOKED כ־Process Operating System על WhatsApp**, לא כ־chatbot ולא כ־integration hub.

1. חיבור בלחיצה דרך **Meta Embedded Signup + Cloud API**.
2. ליבת ערך = **7 playbooks** עם state machine ומדידה.
3. אינטגרציות native ליומן/תשלום/חשבונית קודם.
4. Zapier / Make / n8n כשכבת הרחבה בלבד.
5. MVP ממוקד ב־3 תהליכים שמייצרים Aha מהר, ואז השלמה ל־7.

אם מממשים את זה — העצמאי מקבל בדיוק מה שהוא רוצה:  
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
