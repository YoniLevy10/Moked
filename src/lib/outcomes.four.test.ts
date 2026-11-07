import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  aggregateOutcomes,
  emptyOutcomeMetrics,
  fourNumbersFromOutcomes,
  tenantShowsDemoDataBadge,
} from "@/lib/outcomes";

describe("four-number beachhead metrics", () => {
  it("counts inquiries, sub-minute answers, visits, booked value from events", () => {
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

  it("returns zeros with no events — no hardcoded showcase figures", () => {
    const four = fourNumbersFromOutcomes(aggregateOutcomes([]));
    assert.deepEqual(four, {
      inquiriesReceived: 0,
      answeredUnder1Min: 0,
      visitsScheduled: 0,
      bookedValueIls: 0,
    });
    assert.deepEqual(fourNumbersFromOutcomes(emptyOutcomeMetrics()), four);
  });

  it("counts lead.qualified within a minute as answered", () => {
    const metrics = aggregateOutcomes([
      {
        eventType: "lead.created",
        conversationId: "c2",
        payload: {},
        createdAt: "2026-11-07T10:00:00.000Z",
      },
      {
        eventType: "lead.qualified",
        conversationId: "c2",
        payload: {},
        createdAt: "2026-11-07T10:00:45.000Z",
      },
    ]);
    assert.equal(metrics.answeredUnder1Min, 1);
    assert.equal(metrics.leadsQualified, 1);
  });

  it("does not count answers slower than 60s", () => {
    const metrics = aggregateOutcomes([
      {
        eventType: "lead.created",
        conversationId: "c3",
        payload: {},
        createdAt: "2026-11-07T10:00:00.000Z",
      },
      {
        eventType: "message.sent",
        conversationId: "c3",
        payload: {},
        createdAt: "2026-11-07T10:02:00.000Z",
      },
    ]);
    assert.equal(metrics.answeredUnder1Min, 0);
  });

  it("shows demo-data badge only for demo WhatsApp tenants", () => {
    assert.equal(tenantShowsDemoDataBadge({ whatsapp: { mode: "demo" } }), true);
    assert.equal(tenantShowsDemoDataBadge({ whatsapp: { mode: "live" } }), false);
    assert.equal(tenantShowsDemoDataBadge({}), true);
  });
});
