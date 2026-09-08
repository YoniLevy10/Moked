import { ProcessContext, ProcessResult } from "@/lib/processes/types";
import { HE_TEMPLATES } from "@/lib/whatsapp/he-templates";

export function handleRetention(ctx: ProcessContext): ProcessResult {
  const state = ctx.conversation.processState ?? {};
  const reviewUrl =
    ctx.tenant.integrations.googleReviewsUrl ??
    "https://g.page/r/REVIEW_PLACEHOLDER";

  if (state.retentionSent && !state.retentionFollowupDone) {
    const t = ctx.inboundText.trim();
    const id = ctx.interactiveId;
    if (id === "referral_yes" || /כן|אשמח|הפניה|מכיר|חבר/i.test(t)) {
      return {
        handled: true,
        replies: [
          {
            body: "תודה! שלחו לנו שם + טלפון של ההפניה, או פשוט תייגו אותם כאן.",
            processKey: "retention",
          },
        ],
        conversationPatch: {
          processState: {
            ...state,
            retentionFollowupDone: true,
            referralInterest: true,
          },
        },
        events: ["referral.accepted"],
      };
    }
    if (id === "referral_no" || /לא|אחר כך|מאוחר/i.test(t)) {
      return {
        handled: true,
        replies: [
          {
            body: "הכל טוב — תודה שוב על האמון. אנחנו כאן כשצריך.",
            processKey: "retention",
          },
        ],
        conversationPatch: {
          activeProcess: undefined,
          processState: {
            ...state,
            retentionFollowupDone: true,
            referralInterest: false,
          },
        },
        events: ["referral.declined"],
      };
    }
  }

  const tpl = HE_TEMPLATES.review_request;
  return {
    handled: true,
    replies: [
      {
        body: `תודה שבחרת ב־${ctx.tenant.businessName}!\nאם חווית שירות טוב — נשמח לביקורת קצרה:\n${reviewUrl}`,
        type: "template",
        processKey: "retention",
        template: {
          name: tpl.name,
          languageCode: "he",
          bodyParameters: [ctx.tenant.businessName, reviewUrl],
        },
      },
      {
        body: "מכיר/ה מישהו שצריך אותנו?",
        type: "interactive",
        processKey: "retention",
        interactive: {
          kind: "buttons",
          buttons: [
            { id: "referral_yes", title: "כן להפניה" },
            { id: "referral_no", title: "לא תודה" },
          ],
        },
      },
    ],
    conversationPatch: {
      activeProcess: "retention",
      processState: {
        ...state,
        retentionSent: true,
      },
    },
    events: ["review.requested", "referral.requested"],
  };
}
