import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyOwnerProfilePatch,
  escalationPolicySnapshot,
  OwnerProfilePatchSchema,
} from "@/lib/product/owner-profile";
import {
  inferOnboardingStep,
  ONBOARDING_STEPS,
  ONBOARDING_VERTICALS,
} from "@/lib/product/onboarding-steps";
import type { Tenant } from "@/lib/types";
import {
  confidenceClarifyThreshold,
  confidenceReplyThreshold,
} from "@/lib/agent/policy";

function baseTenant(): Tenant {
  return {
    id: "t1",
    businessName: "בדיקה",
    ownerName: "יוסי",
    phone: "0501111111",
    vertical: "trades",
    locale: "he-IL",
    createdAt: new Date().toISOString(),
    whatsapp: { connected: false, mode: "demo" },
    processes: {
      intake: { enabled: true, config: {} },
      qualification: { enabled: true, config: {} },
      booking: { enabled: true, config: {} },
      reminders: { enabled: false, config: {} },
      retention: { enabled: false, config: {} },
      quote: { enabled: true, config: {} },
      payment: { enabled: false, config: {} },
    },
    integrations: {
      googleCalendar: false,
      paymentsProvider: "none",
      invoicingProvider: "none",
    },
    availability: {
      timezone: "Asia/Jerusalem",
      windows: [],
      dailyCapacity: 4,
    },
    pricing: [{ id: "p1", name: "ביקור", priceIls: 180 }],
    subscription: {
      status: "inactive",
      monthlyOutboundCap: 1000,
      outboundCount: 0,
    },
    bot: {
      draft: "",
      answers: {
        what: "תיקונים",
        hours: "א׳–ה׳",
        forbidden: "בלי הנחות",
        handoff: "הצפה",
        pasted: "",
      },
    },
  };
}

describe("owner profile patch", () => {
  it("updates pricing and preserves unanswered bot fields", () => {
    const tenant = baseTenant();
    const patch = OwnerProfilePatchSchema.parse({
      pricing: [{ name: "סתימה", priceIls: 320, description: "סטנדרט" }],
      botAnswers: { handoff: "חירום בלבד" },
    });
    const next = applyOwnerProfilePatch(tenant, patch);
    assert.equal(next.pricing?.[0]?.name, "סתימה");
    assert.ok(next.pricing?.[0]?.id);
    assert.equal(next.bot?.answers.handoff, "חירום בלבד");
    assert.equal(next.bot?.answers.forbidden, "בלי הנחות");
    assert.equal(next.bot?.answers.what, "תיקונים");
  });
});

describe("escalation policy snapshot", () => {
  it("exposes SoT thresholds without inventing new ones", () => {
    const snap = escalationPolicySnapshot();
    assert.equal(snap.confidenceReply, confidenceReplyThreshold());
    assert.equal(snap.confidenceClarify, confidenceClarifyThreshold());
    assert.equal(snap.maxEscalationsPerConversation, 2);
    assert.ok(snap.rulesHe.length >= 3);
  });
});

describe("onboarding steps catalog", () => {
  it("has exactly 10 Hebrew steps and appointments grayed", () => {
    assert.equal(ONBOARDING_STEPS.length, 10);
    assert.equal(ONBOARDING_STEPS[0]?.key, "register");
    assert.equal(ONBOARDING_STEPS[9]?.key, "reedit");
    const appointments = ONBOARDING_VERTICALS.find(
      (v) => v.id === "appointments",
    );
    assert.equal(appointments?.selectable, false);
    const trades = ONBOARDING_VERTICALS.find((v) => v.id === "trades");
    assert.equal(trades?.selectable, true);
  });

  it("infers resume step from tenant state", () => {
    assert.equal(
      inferOnboardingStep({
        hasTenant: false,
        botApproved: false,
        whatsappConnected: false,
        ready: false,
      }),
      1,
    );
    assert.equal(
      inferOnboardingStep({
        hasTenant: true,
        botApproved: true,
        whatsappConnected: true,
        ready: true,
        wentLive: true,
      }),
      10,
    );
  });
});
