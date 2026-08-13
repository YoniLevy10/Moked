import {
  createApproval,
  addEvent,
  updateSession,
  getApproval,
  resolveApproval,
} from "../store/memory.js";

/**
 * Quote workflow — proposal follow-up + owner approval for discount
 * Steps: start → await_customer → discount_request → waiting_owner → done
 */
export async function handleQuote({ session, text, buttonId, reply }) {
  const t = (text || "").trim();

  if (session.step === "start") {
    const amount = Number(session.data.amount) || 1200;
    updateSession(session, {
      step: "await_customer",
      data: { ...session.data, amount, currency: "ILS" },
    });
    await reply(
      `שלום! מצורפת הצעת מחיר על סך ₪${amount}. מה תרצו לעשות?`,
      [
        { id: "accept_quote", title: "מאשר/ת" },
        { id: "ask_discount", title: "מבקש/ת הנחה" },
        { id: "ask_question", title: "שאלה" },
      ]
    );
    return;
  }

  if (session.step === "await_customer") {
    if (buttonId === "accept_quote" || /מאשר|מסכים|ok|כן/i.test(t)) {
      updateSession(session, { step: "done", status: "accepted" });
      addEvent({
        type: "quote.accepted",
        sessionId: session.id,
        businessId: session.businessId,
      });
      await reply("מעולה! ההצעה אושרה. ניצור קשר לתיאום ביצוע.");
      return;
    }

    if (buttonId === "ask_discount" || /הנחה|זול|מחיר/i.test(t)) {
      updateSession(session, { step: "waiting_owner", status: "needs_decision" });
      const approval = createApproval({
        sessionId: session.id,
        businessId: session.businessId,
        type: "quote_discount",
        title: "בקשת הנחה על הצעת מחיר",
        payload: {
          amount: session.data.amount,
          contactPhone: session.contactPhone,
          customerNote: t || "מבקש הנחה",
        },
      });
      addEvent({
        type: "quote.discount_requested",
        sessionId: session.id,
        businessId: session.businessId,
        approvalId: approval.id,
      });
      await reply(
        "קיבלתי. מעביר לבעל העסק לאישור הנחה — אחזור אליך מיד אחרי ההחלטה."
      );
      return;
    }

    if (buttonId === "ask_question" || t) {
      await reply(
        "תודה על השאלה — בעל העסק יענה בהקדם. בינתיים אפשר לאשר או לבקש הנחה.",
        [
          { id: "accept_quote", title: "מאשר/ת" },
          { id: "ask_discount", title: "מבקש/ת הנחה" },
        ]
      );
      return;
    }

    await reply("בחרו אחת מהאפשרויות:", [
      { id: "accept_quote", title: "מאשר/ת" },
      { id: "ask_discount", title: "מבקש/ת הנחה" },
      { id: "ask_question", title: "שאלה" },
    ]);
    return;
  }

  if (session.step === "waiting_owner") {
    await reply("עדיין ממתין להחלטת בעל העסק על ההנחה.");
    return;
  }

  await reply("תהליך ההצעה הסתיים. אפשר לפתוח הצעה חדשה מהדשבורד.");
}

export async function applyQuoteApprovalDecision(approvalId, decision, replyFn) {
  const approval = getApproval(approvalId);
  if (!approval || approval.type !== "quote_discount") return null;
  resolveApproval(approvalId, decision);

  // Session update is handled by caller via session lookup
  return { approval, decision };
}

export function buildDiscountReply(decision, amount) {
  if (decision === "approved") {
    const discounted = Math.round(amount * 0.9);
    return `בעל העסק אישר הנחה של 10%. המחיר החדש: ₪${discounted}. מאשרים?`;
  }
  return `בעל העסק לא יכול להציע הנחה כרגע. ההצעה נשארת ₪${amount}. מאשרים?`;
}
