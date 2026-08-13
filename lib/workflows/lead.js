import {
  createApproval,
  addEvent,
  pushMessage,
  updateSession,
} from "../store/memory.js";

/**
 * Lead workflow — unanswered inquiry
 * Steps: start → prefer_time → address → done (owner queue)
 */
export async function handleLead({ session, text, buttonId, reply }) {
  const t = (text || "").trim();

  if (session.step === "start") {
    if (!t) {
      await reply(
        "שלום! קיבלתי את הפנייה. אפשר לתאר בקצרה מה קרה?",
        null
      );
      return;
    }
    updateSession(session, {
      step: "prefer_time",
      data: { ...session.data, issue: t },
    });
    addEvent({
      type: "lead.issue",
      sessionId: session.id,
      businessId: session.businessId,
      issue: t,
    });
    await reply("מתי נוח שנתאם ביקור?", [
      { id: "today_afternoon", title: "היום אחה״צ" },
      { id: "tomorrow_morning", title: "מחר בבוקר" },
      { id: "other_time", title: "זמן אחר" },
    ]);
    return;
  }

  if (session.step === "prefer_time") {
    let prefer = t;
    if (buttonId === "today_afternoon") prefer = "היום אחה״צ";
    if (buttonId === "tomorrow_morning") prefer = "מחר בבוקר";
    if (buttonId === "other_time") prefer = "זמן אחר";
    if (!prefer) {
      await reply("בחרו זמן מועדף מהכפתורים, או כתבו חופשי.", [
        { id: "today_afternoon", title: "היום אחה״צ" },
        { id: "tomorrow_morning", title: "מחר בבוקר" },
        { id: "other_time", title: "זמן אחר" },
      ]);
      return;
    }
    updateSession(session, {
      step: "address",
      data: { ...session.data, preferTime: prefer },
    });
    await reply("מה הכתובת המלאה?");
    return;
  }

  if (session.step === "address") {
    if (!t) {
      await reply("צריך כתובת כדי לשבץ. לדוגמה: רמב״ן 14, ירושלים");
      return;
    }
    updateSession(session, {
      step: "done",
      status: "waiting_owner",
      data: { ...session.data, address: t },
    });
    createApproval({
      sessionId: session.id,
      businessId: session.businessId,
      type: "lead_review",
      title: "ליד חדש לטיפול",
      payload: {
        issue: session.data.issue,
        preferTime: session.data.preferTime,
        address: t,
        contactPhone: session.contactPhone,
      },
    });
    addEvent({
      type: "lead.ready",
      sessionId: session.id,
      businessId: session.businessId,
      address: t,
    });
    await reply(
      "תודה! קיבלתי הכל. בעל העסק יחזור אליך בהקדם עם תיאום."
    );
    return;
  }

  await reply("הפנייה כבר נקלטה. ניצור קשר בהקדם.");
}

export function leadDemoScript() {
  return [
    { role: "customer", text: "יש נזילה במטבח" },
    { role: "system", text: "מתי נוח שנתאם ביקור?", buttons: ["היום אחה״צ"] },
    { role: "customer", text: "היום אחה״צ", via: "button" },
    { role: "system", text: "מה הכתובת המלאה?" },
    { role: "customer", text: "רמב״ן 14, ירושלים" },
    {
      role: "system",
      text: "תודה! קיבלתי הכל. בעל העסק יחזור אליך בהקדם עם תיאום.",
    },
  ];
}
