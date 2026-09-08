# MOKED × Meta — מחקר יכולות + שוק ישראל

**תאריך:** 2026-09-08  
**מקורות:** Meta Developer Docs (WhatsApp Business Platform, Embedded Signup v4), תמחור Meta לישראל, מיפוי מתחרים מקומיים/גלובליים  
**הערה:** אין MCP רשמי של Meta בסביבת הסוכן — המחקר נשאב מתיעוד Meta הציבורי + מקורות שוק.

---

## 1. תקציר מנהלים

**מה Meta באמת נותנת (2026):** לא "בוט", אלא פלטפורמת Business Messaging מלאה — Cloud API (הודעות/מדיה/אינטראקטיבי/Flows), Calling, Groups, Templates + Analytics, Marketing Messages API, Embedded Signup v4 (דדליין מיגרציה ~אוק׳ 2026), CTWA Ads + Conversions API, ו־Meta Business Agent.

**מה השוק בישראל קונה היום:**
| שכבה | שחקנים | חולשה |
|------|--------|--------|
| Self-serve עברית זול | AllChat, ZapClick, WBSender, SmartRise (~₪97–350) | בונה־זרימות, לא Process OS |
| AI על WhatsApp | iTeam AI, AnswerForMe | תשובות FAQ, לא 7 תהליכים עסקיים |
| קמפיינים / inbox | Bahasha, Vibrate | Broadcast + צוותים, לא סגירת תור/הצעה/גבייה |
| גלובלי | WATI, Respond.io, ManyChat | אנגלית־ראשון, עברית חלשה, אין PSP ישראלי מובנה |

**פער ש־MOKED יכול לנצח בו:**  
חיבור Meta **ישיר (בלי BSP)** + **תהליכים עסקיים מוכנים בעברית** (Intake→Payment) + תמחור שקוף ל־972 + איכות מספר (quality rating) — לא עוד constructor ולא עוד inbox.

**אזהרה אסטרטגית:** "ליישם את כל מה שיש ל־Meta" בבת אחת = מוצר מנופח שנכשל ב־activation.  
המטרה "הכי חזק בארץ" = **כיסוי Meta מלא בשכבות**, לפי סדר שסוגר Aha לעצמאי ואז מרחיב.

---

## 2. מפת יכולות Meta (קטלוג מלא רלוונטי ל־MOKED)

### 2.1 Onboarding — Embedded Signup

| יכולת | סטטוס Meta | רלוונטיות MOKED | היום במוצר |
|--------|------------|-----------------|------------|
| Embedded Signup v4 (Facebook Login for Business config) | חובה עד ~Oct 2026 (v2 deprecated) | קריטי | ✅ כפתור בסיסי (יש לוודא config = v4) |
| Cloud API product בלבד ב־flow | מומלץ ל־MVP | קריטי | חלקי |
| Coexistence (מספר קיים ב־Business App) | v4 + webhooks history/state-sync | גבוה לאימוץ ישראל | ❌ |
| Multi-product ES (CTWA, MM Lite, CAPI, IG, Messenger) | v4 | Phase 3–4 | ❌ |
| Partner-led Business Verification | Select/Premier partners | עתידי | ❌ |
| הרשאות Advanced: `whatsapp_business_messaging` + `_management` | חובה | קריטי | תלוי App |

### 2.2 Messaging — Cloud API

| סוג הודעה | שימוש ב־MOKED | עדיפות |
|-----------|---------------|--------|
| Text (חלון 24ש) | Intake / Qualification | P0 — יש (דמו+שליחה חיה בסיסית) |
| Interactive reply buttons | בחירת שירות / אישור הגעה | P0 |
| Interactive lists | תפריט שירותים / משבצות | P0 |
| Location request / location | Booking + כתובת | P0 |
| Image / document / audio / video / sticker | הצעות, חוזים, הקלטות | P1 |
| Contacts | שיתוף איש קשר עסק | P2 |
| Reaction / typing indicator / read receipt | Inbox מקצועי | P1 |
| **WhatsApp Flows** | בוקינג / ליד / סקר בטופס מקורי | P0–P1 (יתרון תחרותי) |
| Product / catalog / multi-product | יופי, נדל״ן, חבילות | P2 (ורטיקלים) |
| Order details / payments (לפי מדינה) | גבייה — בישראל בד״כ לינק PSP חיצוני | P2 (גל D) |
| Template: Utility | תזכורות, אישור תור, סטטוס | P0 (גל B) |
| Template: Marketing | Retention / מבצעים | P2 |
| Template: Authentication | OTP התחברות | P2 |
| Marketing Messages API (אופטימיזציות) | קמפיינים | P3 |

### 2.3 Webhooks (חובה למוצר אמין)

| אירוע | למה |
|-------|-----|
| `messages` inbound | ליבת התהליכים |
| `statuses` (sent/delivered/read/failed) | אמינות + אנליטיקה + retry |
| errors / async failures | Ops console |
| history / smb_* (coexistence) | סנכרון אחרי ES עם Business App |
| account_update / phone_number quality | Quality rating alerts |
| template status | אישור/דחייה תבניות |

**היום:** webhook בסיסי ל־inbound טקסט. חסר: statuses, media download, idempotency מלאה מול `webhook_events`, coexistence.

### 2.4 Business Management API

| יכולת | שימוש |
|-------|--------|
| CRUD Message Templates | ספריית עברית לפי ורטיקל מתוך MOKED |
| Phone numbers / display name | Onboarding + multi-number |
| Analytics: messaging / pricing / template | Dashboard עלויות ₪ לבעל עסק |
| Subscribed apps | רישום webhook אחרי ES |
| Quality rating / messaging limits | התראות "המספר צהוב" |

### 2.5 Calling + Groups

| יכולת | מתי ב־MOKED |
|-------|-------------|
| WhatsApp Calling (VoIP in/out) | Phase מאוחר — קליניקות / נדל״ן |
| Groups API | צוותי שירות / קהילות — לא ליבת עצמאי |

### 2.6 Ads + measurement (צמיחה)

| יכולת | ערך לישראל |
|-------|------------|
| Click-to-WhatsApp Ads | לידים ישר מתורגם ל־Intake |
| Conversions API for CTWA | אופטימיזציית מודעות לפי תור/תשלום |
| Automatic Events API | אירועי CTWA אוטומטיים |

### 2.7 Meta Business Agent

סוכן AI של Meta (~$0.04–0.05 / interaction בישראל לפי דיווחים מקומיים) — **מתחרה פוטנציאלי** ל־AI שכבה שלנו.  
המלצה: לא לבנות עליו כליבה; לשמור Process Engine של MOKED + AI מבוקר (confidence + human takeover). אפשרות עתידית: connector אופציונלי.

---

## 3. תמחור ו־compliance בישראל (קריטי למוצר)

### 3.1 מודל חיוב (מ־2025: per-message, לא per-conversation)

סדרי גודל לישראל (972) לפי דיווחי שוק 2026 — **לאמת מול rate card חי של Meta לפני תמחור ללקוח:**

| סוג | כיוון עלות |
|-----|------------|
| Marketing template | ~$0.035 / הודעה (~₪0.10) |
| Utility / Auth | ~$0.0053 (~₪0.016) |
| Service בחלון 24ש | משתנה — Meta מעבירה לחיוב הדרגתי ב־2026; לבדוק תאריך עדכני |
| Incoming | חינם |
| Meta Business Agent | יקר יחסית להודעת שירות |

**מוצר חזק בארץ חייב:** מונה עלויות Meta ב־₪ בדשבורד + ברירת מחדל Utility לתזכורות (לא Marketing).

### 3.2 רגולציה מקומית

- חוק הספאם / תקשורת — הסכמה (opt-in) לפני templates יזומים
- חוק הגנת הפרטיות (תיקון 13) — יומן, מחיקה, בידוד טננט
- מספר עסקי פעיל ≠ כלי לא־רשמי (Baileys וכו׳) — **אסור** (כבר נעול בפסגה)

### 3.3 Quality rating

Green / Yellow / Red כל ~6 שעות.  
מוצר "הכי חזק" = ניטור + עצירת broadcast אוטומטית + חינוך תוכן בעברית — לא רק שליחה.

---

## 4. מחקר שוק ישראל — איך מנצחים

### 4.1 מפת תחרות (לפי הבטחה)

```
                    תהליכים עסקיים עמוקים
                              ▲
                     MOKED (יעד)
                              │
         DMly-like ───────────┼────────── Interakt-like
                              │
   Inbox/CS  ◄────────────────┼────────────────►  Broadcast
   Respond.io / Bahasha       │              AiSensy / Vibrate
                              │
                     Chatbot constructor
                     WATI / AllChat / ZapClick
                              ▼
```

### 4.2 טבלת השוואה (רלוונטי לעצמאי ישראלי)

| צורך | גלובלי | מקומי טיפוסי | MOKED צריך |
|------|--------|--------------|------------|
| חיבור בלחיצה | חלקי / BSP | חלקי | ES v4 + coexistence |
| עברית אמיתית (סלנג/שגיאות) | חלש | בינוני–חזק | AI + playbooks he-IL |
| תור + כתובת + תזכורת | אינטגרציות | נדיר כמוצר ליבה | גל A/B מקורי |
| הצעת מחיר → גבייה ₪ | נדיר | חלקי | גל C/D + Grow/PayPlus |
| שקיפות עלות Meta | נדיר | נדיר | Pricing analytics |
| בלי Zapier כדי לעבוד | לא | לפעמים | Native-first (פסגה) |

### 4.3 מה "הכי חזק בארץ" באמת אומר

לא מספר ה־API endpoints — אלא:

1. **Time-to-first-live-message < 10 דק׳** (קריטריון הפסגה)
2. **תהליך אחד נסגר אוטומטית** ביום הראשון (Aha)
3. **מספר לא נשרף** (quality + templates נכונים)
4. **עלות צפויה ב־₪**
5. **כיסוי Meta שלא דורש מהעצמאי להבין WABA**

---

## 5. Gap analysis — MOKED היום מול מטרה

| שכבה | יש | חסר לפער תחרותי |
|------|-----|------------------|
| ES + token exchange | ✅ | v4 config מאומת, coexistence, PLBV |
| שליחת טקסט חי | ✅ | buttons/lists/Flows/media/templates |
| Webhook inbound | ✅ חלקי | statuses, media, history, signature קשיח בפרוד |
| Process engine A–D | ✅ לוגיקה | על גבי interactive + templates אמיתיים |
| Templates עברית | ❌ | ספרייה לפי ורטיקל + API submit |
| Quality / analytics | ❌ | webhooks + BMA analytics |
| CTWA + CAPI | ❌ | אחרי שיש ליבת messaging |
| Calling / Groups | ❌ | לא בנתיב MVP |
| Meta Business Agent | ❌ | אופציונלי / הימנעות כליבה |

---

## 6. Roadmap יישום — "כיסוי Meta מלא" בשכבות

### שכבה 0 — Go-live Pilot (עכשיו)
1. Meta App + ES **v4** config + Advanced Access  
2. Env ב־Vercel (4 מפתחות)  
3. Webhook verify + signature + `messages` + `statuses`  
4. חיבור חי → הודעת בדיקה → Intake על מספר אמיתי  

### שכבה 1 — Conversations חזקות (יתרון מיידי)
5. Interactive buttons + lists בכל גל A  
6. Location request לכתובת  
7. Media in/out + אחסון  
8. Typing/read ב־inbox  
9. WhatsApp Flows ל־Booking / Qualification (טופס מקורי)  

### שכבה 2 — יזום אמין (גל B)
10. Template lifecycle API + ספריית he utility  
11. תזכורות T-24/T-2 על templates מאושרים  
12. Quality rating monitor + kill-switch  

### שכבה 3 — צמיחה ואופטימיזציה
13. Pricing analytics בדשבורד (₪)  
14. CTWA + Conversions API  
15. Marketing Messages API (אופציונלי)  
16. Multi-number / multi-WABA  

### שכבה 4 — הרחבות Meta (רק אחרי ליבה יציבה)
17. Catalogs לורטיקלים מתאימים  
18. Calling  
19. Groups  
20. Meta Business Agent כ־addon (לא חובה)

---

## 7. המלצת פסגה מעודכנת

**כן לבנות "Meta Connectivity Layer" הכי חזק בארץ** — כלומר שכבת חיבור/הודעות/templates/quality/analytics שמכסה את הקטלוג.  

**לא** לחשוף את כל הקטלוג ללקוח ביום 1.  
הלקוח רואה: "חבר WhatsApp" + 7 תהליכים.  
מתחת למכסה: מימוש Meta מלא לפי השכבות למעלה.

### הצעד הבא המיידי (לא מחקר)
1. להשלים Meta credentials ב־Vercel  
2. לאמת Embedded Signup **v4**  
3. לחזק webhook (statuses + idempotency)  
4. Pilot על מספר אחד  

---

## מקורות עיקריים
- https://developers.facebook.com/documentation/business-messaging/whatsapp/about-the-platform  
- https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/version-4  
- https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages  
- תמחור / שוק ישראל: דיווחי Whale, Fullness, Times of Israel market map; מתחרים: iTeam, Bahasha, WATI, Respond.io  
