import { ProcessContext, ProcessResult } from "@/lib/processes/types";

export function handleRetention(ctx: ProcessContext): ProcessResult {
  const state = ctx.conversation.processState ?? {};
  const reviewUrl =
    ctx.tenant.integrations.googleReviewsUrl ??
    "https://g.page/r/REVIEW_PLACEHOLDER";

  if (state.retentionSent && !state.retentionFollowupDone) {
    const t = ctx.inboundText.trim();
    if (/כן|אשמח|הפניה|מכיר|חבר/i.test(t)) {
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
    if (/לא|אחר כך|מאוחר/i.test(t)) {
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

  return {
    handled: true,
    replies: [
      {
        body: `תודה שבחרת ב־${ctx.tenant.businessName}!\nאם חווית שירות טוב — נשמח לביקורת קצרה:\n${reviewUrl}\n\nמכיר/ה מישהו שצריך אותנו? השב/י "כן" להפניה.`,
        type: "template",
        processKey: "retention",
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
