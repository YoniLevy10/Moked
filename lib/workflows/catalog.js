export const WORKFLOWS = [
  {
    id: "lead",
    name: "ליד שלא נענה",
    description: "קליטת פנייה, זמן מועדף וכתובת — ואז תור לבעל העסק",
    status: "live",
  },
  {
    id: "quote",
    name: "הצעת מחיר",
    description: "מעקב אחרי הצעה + אישור הנחה מבעל העסק",
    status: "live",
  },
  {
    id: "reminder",
    name: "תזכורות",
    description: "תזכורת לפני ביקור / תשלום",
    status: "stub",
  },
  {
    id: "collect",
    name: "גבייה",
    description: "תזכורות תשלום אוטומטיות",
    status: "stub",
  },
  {
    id: "dispatch",
    name: "שיבוץ",
    description: "שיבוץ טכנאי / עובד לפי זמינות",
    status: "stub",
  },
  {
    id: "report",
    name: "דיווח",
    description: "סיכום ביצוע ללקוח ולעסק",
    status: "stub",
  },
  {
    id: "review",
    name: "ביקורת",
    description: "בקשת חוות דעת אחרי סיום",
    status: "stub",
  },
];

export function getWorkflow(id) {
  return WORKFLOWS.find((w) => w.id === id) || null;
}

export const PRINCIPLE = "אוטומטי בשגרה. אנושי בהחלטות.";
export const PLAN_PRICE_ILS = 690;
export const PILOT_WHATSAPP = "972548102688";
