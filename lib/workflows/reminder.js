import {
  addEvent,
  createApproval,
  updateSession,
} from "../store/memory.js";

/**
 * Reminder workflow — visit / payment reminder (pilot: simplest after lead)
 *
 * Steps:
 *  start → confirm_channel → scheduled → (optional snooze) → done
 *  Owner can cancel via approval if customer asks to cancel.
 */
export async function handleReminder({ session, text, buttonId, reply }) {
  const t = (text || "").trim();

  if (session.step === "start") {
    const when = session.data.when || "מחר ב־10:00";
    const topic = session.data.topic || "ביקור טכנאי";
    updateSession(session, {
      step: "confirm",
      data: { ...session.data, when, topic },
    });
    addEvent({
      type: "reminder.sent",
      sessionId: session.id,
      businessId: session.businessId,
      when,
      topic,
    });
    await reply(
      `תזכורת: ${topic} מתוכנן ל־${when}. מאשרים?`,
      [
        { id: "rem_confirm", title: "מאשר/ת" },
        { id: "rem_snooze", title: "דחו ליום אחר" },
        { id: "rem_cancel", title: "בטל תור" },
      ]
    );
    return;
  }

  if (session.step === "confirm") {
    if (buttonId === "rem_confirm" || /מאשר|כן|ok/i.test(t)) {
      updateSession(session, { step: "done", status: "confirmed" });
      addEvent({
        type: "reminder.confirmed",
        sessionId: session.id,
        businessId: session.businessId,
      });
      await reply("מצוין — נתראה במועד. אם משהו משתנה, כתבו כאן.");
      return;
    }

    if (buttonId === "rem_snooze" || /דח|יום אחר|מחר/i.test(t)) {
      updateSession(session, { step: "reschedule" });
      await reply("לאיזה יום להעביר?", [
        { id: "rem_day_tomorrow", title: "מחר" },
        { id: "rem_day_2", title: "מחרתיים" },
        { id: "rem_day_week", title: "בעוד שבוע" },
      ]);
      return;
    }

    if (buttonId === "rem_cancel" || /בטל|לא יכול/i.test(t)) {
      updateSession(session, { step: "waiting_owner", status: "cancel_requested" });
      createApproval({
        sessionId: session.id,
        businessId: session.businessId,
        type: "reminder_cancel",
        title: "בקשת ביטול תור",
        payload: {
          topic: session.data.topic,
          when: session.data.when,
          contactPhone: session.contactPhone,
        },
      });
      addEvent({
        type: "reminder.cancel_requested",
        sessionId: session.id,
        businessId: session.businessId,
      });
      await reply("קיבלתי. מעביר לבעל העסק לאישור הביטול.");
      return;
    }

    await reply("בחרו אחת מהאפשרויות:", [
      { id: "rem_confirm", title: "מאשר/ת" },
      { id: "rem_snooze", title: "דחו ליום אחר" },
      { id: "rem_cancel", title: "בטל תור" },
    ]);
    return;
  }

  if (session.step === "reschedule") {
    let when = t;
    if (buttonId === "rem_day_tomorrow") when = "מחר ב־10:00";
    if (buttonId === "rem_day_2") when = "מחרתיים ב־10:00";
    if (buttonId === "rem_day_week") when = "בעוד שבוע ב־10:00";
    if (!when) {
      await reply("בחרו מועד חדש מהכפתורים.");
      return;
    }
    updateSession(session, {
      step: "done",
      status: "rescheduled",
      data: { ...session.data, when },
    });
    addEvent({
      type: "reminder.rescheduled",
      sessionId: session.id,
      businessId: session.businessId,
      when,
    });
    await reply(`עודכן: ${session.data.topic || "הביקור"} ל־${when}. נשלח תזכורת לפני המועד.`);
    return;
  }

  if (session.step === "waiting_owner") {
    await reply("עדיין ממתין להחלטת בעל העסק על הביטול.");
    return;
  }

  await reply("התזכורת כבר טופלה. אפשר לפתוח תזכורת חדשה מהדשבורד.");
}
