/**
 * Stub handlers for workflows not yet fully implemented.
 * Order to complete: reminder → collect → dispatch → report → review
 */

const STUB_COPY = {
  collect: {
    greeting:
      "תזכורת תשלום: יש יתרה פתוחה. (תהליך collect בפיתוח)",
  },
  dispatch: {
    greeting:
      "שיבוץ: מחפשים עובד פנוי. (תהליך dispatch בפיתוח)",
  },
  report: {
    greeting:
      "דיווח סיום יישלח אחרי הביצוע. (תהליך report בפיתוח)",
  },
  review: {
    greeting:
      "נשמח לחוות דעת אחרי השירות. (תהליך review בפיתוח)",
  },
};

export async function handleStub(workflowId, { session, reply }) {
  const copy = STUB_COPY[workflowId] || {
    greeting: `תהליך ${workflowId} עדיין לא פעיל בפיילוט.`,
  };
  if (session.step === "start") {
    session.step = "stub";
    session.status = "stub";
  }
  await reply(copy.greeting);
}
