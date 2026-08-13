import {
  getOrCreateSession,
  addEvent,
  pushMessage,
  updateSession,
  getSessionById,
  resolveApproval,
  getApproval,
} from "../store/memory.js";
import { getWorkflow } from "../workflows/catalog.js";
import { handleLead } from "../workflows/lead.js";
import { handleQuote, buildDiscountReply } from "../workflows/quote.js";
import { handleReminder } from "../workflows/reminder.js";
import { handleStub } from "../workflows/stubs.js";
import { sendWhatsAppText, sendWhatsAppButtons } from "../whatsapp/client.js";

async function makeReply({ businessId, contactPhone, mode }) {
  return async (text, buttons) => {
    pushMessage({
      businessId,
      contactPhone,
      direction: "outbound",
      text,
      buttons: buttons || null,
    });
    addEvent({
      type: "message.outbound",
      businessId,
      contactPhone,
      text,
    });

    if (mode === "live") {
      if (buttons?.length) {
        await sendWhatsAppButtons({ to: contactPhone, body: text, buttons });
      } else {
        await sendWhatsAppText({ to: contactPhone, body: text });
      }
    }
  };
}

/**
 * Route an inbound customer message into the active workflow.
 */
export async function routeInbound({
  businessId,
  contactPhone,
  text,
  buttonId,
  workflow = "lead",
  mode = "sim", // sim | live
}) {
  const wf = getWorkflow(workflow) || getWorkflow("lead");
  const session = getOrCreateSession({
    businessId,
    contactPhone,
    workflow: wf.id,
  });

  pushMessage({
    businessId,
    contactPhone,
    direction: "inbound",
    text: buttonId ? `[${buttonId}] ${text || ""}`.trim() : text,
  });
  addEvent({
    type: "message.inbound",
    businessId,
    contactPhone,
    workflow: wf.id,
    text,
    buttonId: buttonId || null,
  });

  const reply = await makeReply({ businessId, contactPhone, mode });

  if (wf.status === "stub") {
    await handleStub(wf.id, { session, text, buttonId, reply });
    updateSession(session, {});
    return { session, workflow: wf.id };
  }

  if (wf.id === "lead") {
    await handleLead({ session, text, buttonId, reply });
  } else if (wf.id === "quote") {
    await handleQuote({ session, text, buttonId, reply });
  } else if (wf.id === "reminder") {
    await handleReminder({ session, text, buttonId, reply });
  } else {
    await handleStub(wf.id, { session, text, buttonId, reply });
  }

  updateSession(session, {});
  return { session, workflow: wf.id };
}

/**
 * Owner decision on approval — may resume quote conversation.
 */
export async function handleApprovalDecision({
  approvalId,
  decision,
  mode = "sim",
}) {
  const approval = getApproval(approvalId);
  if (!approval) return { ok: false, error: "approval_not_found" };
  if (approval.status !== "pending") {
    return { ok: false, error: "already_resolved", approval };
  }

  resolveApproval(approvalId, decision);
  const session = getSessionById(approval.sessionId);

  if (approval.type === "quote_discount" && session) {
    const amount = approval.payload?.amount || session.data?.amount || 1200;
    const text = buildDiscountReply(decision, amount);
    updateSession(session, {
      step: "await_customer",
      status: "open",
      data: {
        ...session.data,
        amount: decision === "approved" ? Math.round(amount * 0.9) : amount,
      },
    });
    const reply = await makeReply({
      businessId: session.businessId,
      contactPhone: session.contactPhone,
      mode,
    });
    await reply(text, [
      { id: "accept_quote", title: "מאשר/ת" },
      { id: "ask_question", title: "שאלה" },
    ]);
  }

  if (approval.type === "lead_review" && session) {
    updateSession(session, {
      status: decision === "approved" ? "owner_accepted" : "owner_rejected",
    });
  }

  if (approval.type === "reminder_cancel" && session) {
    const reply = await makeReply({
      businessId: session.businessId,
      contactPhone: session.contactPhone,
      mode,
    });
    if (decision === "approved") {
      updateSession(session, { step: "done", status: "cancelled" });
      await reply("התור בוטל לפי בקשתך. נשמח לתאם מועד חדש כשתרצו.");
    } else {
      updateSession(session, { step: "confirm", status: "open" });
      await reply(
        `התור נשאר בתוקף: ${session.data?.topic || "ביקור"} ב־${session.data?.when || "המועד שנקבע"}.`,
        [
          { id: "rem_confirm", title: "מאשר/ת" },
          { id: "rem_snooze", title: "דחו ליום אחר" },
        ]
      );
    }
  }

  return { ok: true, approval: getApproval(approvalId), session };
}
