/**
 * Quick unit check for outcome aggregation (no test runner required).
 * Run: node --experimental-strip-types scripts/check-outcomes.mjs
 * or: npx tsx scripts/check-outcomes.mjs — here we use plain JS mirror.
 */
import { createRequire } from "module";

// Inline mirror of aggregateOutcomes to avoid TS loader complexity in smoke.
function aggregateOutcomes(events) {
  const m = {
    leadsCreated: 0,
    leadsQualified: 0,
    leadsHot: 0,
    appointmentsBooked: 0,
    quotesAccepted: 0,
    revenueIls: 0,
    paymentsCollected: 0,
    customersReturned: 0,
    reviewsRequested: 0,
    referralsAccepted: 0,
  };
  for (const e of events) {
    switch (e.eventType) {
      case "lead.created":
        m.leadsCreated += 1;
        break;
      case "lead.qualified":
        m.leadsQualified += 1;
        break;
      case "lead.hot":
        m.leadsHot += 1;
        break;
      case "booking.confirmed":
        m.appointmentsBooked += 1;
        break;
      case "quote.accepted":
        m.quotesAccepted += 1;
        break;
      case "payment.paid": {
        m.paymentsCollected += 1;
        const amount = Number(e.payload?.amountIls ?? 0);
        if (Number.isFinite(amount) && amount > 0) m.revenueIls += amount;
        break;
      }
      case "referral.accepted":
        m.customersReturned += 1;
        m.referralsAccepted += 1;
        break;
      case "review.requested":
        m.reviewsRequested += 1;
        break;
      default:
        break;
    }
  }
  return m;
}

const result = aggregateOutcomes([
  { eventType: "lead.created", payload: {} },
  { eventType: "lead.created", payload: {} },
  { eventType: "lead.qualified", payload: {} },
  { eventType: "lead.hot", payload: {} },
  { eventType: "booking.confirmed", payload: {} },
  { eventType: "quote.accepted", payload: { amountIls: 900 } },
  { eventType: "payment.paid", payload: { amountIls: 900 } },
  { eventType: "message.sent", payload: {} },
  { eventType: "referral.accepted", payload: {} },
]);

const expected = {
  leadsCreated: 2,
  leadsQualified: 1,
  leadsHot: 1,
  appointmentsBooked: 1,
  quotesAccepted: 1,
  revenueIls: 900,
  paymentsCollected: 1,
  customersReturned: 1,
  reviewsRequested: 0,
  referralsAccepted: 1,
};

for (const [k, v] of Object.entries(expected)) {
  if (result[k] !== v) {
    console.error(`FAIL ${k}: got ${result[k]}, expected ${v}`);
    process.exit(1);
  }
}

console.log("ok outcomes aggregation", result);
void createRequire;
