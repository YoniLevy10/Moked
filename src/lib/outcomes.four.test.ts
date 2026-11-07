import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  aggregateOutcomes,
  fourNumbersFromOutcomes,
} from "@/lib/outcomes";

describe("four-number beachhead metrics", () => {
  it("counts inquiries, sub-minute answers, visits, booked value", () => {
    const t0 = "2026-11-07T10:00:00.000Z";
    const t1 = "2026-11-07T10:00:20.000Z";
    const metrics = aggregateOutcomes([
      {
        eventType: "lead.created",
        conversationId: "c1",
        payload: {},
        createdAt: t0,
      },
      {
        eventType: "intake.completed",
        conversationId: "c1",
        payload: {},
        createdAt: t1,
      },
      {
        eventType: "booking.confirmed",
        conversationId: "c1",
        payload: {},
        createdAt: t1,
      },
      {
        eventType: "quote.accepted",
        conversationId: "c1",
        payload: { amountIls: 450 },
        createdAt: t1,
      },
    ]);
    const four = fourNumbersFromOutcomes(metrics);
    assert.equal(four.inquiriesReceived, 1);
    assert.equal(four.answeredUnder1Min, 1);
    assert.equal(four.visitsScheduled, 1);
    assert.equal(four.bookedValueIls, 450);
  });
});
