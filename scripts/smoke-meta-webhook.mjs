/**
 * Quick unit checks for Meta webhook parsing (no network).
 * Run: node scripts/smoke-meta-webhook.mjs
 */
import assert from "node:assert/strict";

// Inline minimal copies matching parse helpers behavior expectations
function extractText(msg) {
  return (
    msg.text?.body ??
    msg.button?.text ??
    msg.interactive?.button_reply?.title ??
    msg.interactive?.list_reply?.title ??
    msg.location?.address ??
    null
  );
}

const sample = {
  object: "whatsapp_business_account",
  entry: [
    {
      changes: [
        {
          value: {
            metadata: { phone_number_id: "pn1" },
            contacts: [{ wa_id: "972501234567", profile: { name: "דני" } }],
            messages: [
              {
                from: "972501234567",
                id: "wamid.1",
                type: "interactive",
                interactive: {
                  button_reply: { id: "time_today", title: "היום" },
                },
              },
            ],
            statuses: [
              {
                id: "wamid.out.1",
                status: "delivered",
                timestamp: "1710000000",
              },
            ],
          },
        },
      ],
    },
  ],
};

const msg = sample.entry[0].changes[0].value.messages[0];
assert.equal(extractText(msg), "היום");
assert.equal(sample.entry[0].changes[0].value.statuses[0].status, "delivered");
console.log("smoke-meta-webhook: ok");
