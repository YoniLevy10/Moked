import { ProcessContext, ProcessResult } from "@/lib/processes/types";

export function handleRetention(ctx: ProcessContext): ProcessResult {
  const reviewUrl =
    ctx.tenant.integrations.googleReviewsUrl ??
    "https://g.page/r/REVIEW_PLACEHOLDER";

  return {
    handled: true,
    replies: [
      {
        body: `תודה שבחרת ב־${ctx.tenant.businessName}!\nאם חווית שירות טוב — נשמח לביקורת קצרה:\n${reviewUrl}\n\nמכיר/ה מישהו שצריך אותנו? נשמח להפניה 🙏`,
        type: "template",
        processKey: "retention",
      },
    ],
    conversationPatch: {
      processState: {
        ...ctx.conversation.processState,
        retentionSent: true,
      },
    },
    events: ["review.requested", "referral.requested"],
  };
}
