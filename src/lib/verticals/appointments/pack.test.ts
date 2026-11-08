import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  APPOINTMENT_PACKS,
  applyAppointmentsPackToTenant,
  appointmentsKnowledgeRows,
  appointmentsProcessPreset,
  defaultAppointmentsAvailability,
} from "@/lib/verticals/appointments/pack";
import { APPOINTMENTS_EVAL_FIXTURES } from "@/lib/verticals/appointments/eval-fixtures";
import { proposeVisitSlots } from "@/lib/trades/slots";
import { defaultAvailability, type Tenant } from "@/lib/types";

function baseTenant(): Tenant {
  return {
    id: "t-appt",
    businessName: "סטודיו בדיקה",
    ownerName: "נועה",
    phone: "0501111111",
    vertical: "other",
    locale: "he-IL",
    createdAt: new Date().toISOString(),
    whatsapp: { connected: false, mode: "demo" },
    processes: appointmentsProcessPreset(),
    integrations: {
      googleCalendar: false,
      paymentsProvider: "none",
      invoicingProvider: "none",
    },
    availability: defaultAvailability(),
    pricing: [],
    subscription: {
      status: "inactive",
      monthlyOutboundCap: 1000,
      outboundCount: 0,
    },
    bot: {
      draft: "",
      answers: {
        what: "",
        hours: "",
        forbidden: "",
        handoff: "",
        pasted: "",
      },
    },
  };
}

describe("appointments knowledge pack", () => {
  it("covers beauty + coach niches only (no clinics)", () => {
    assert.deepEqual(Object.keys(APPOINTMENT_PACKS).sort(), [
      "beauty",
      "coach",
    ]);
    for (const pack of Object.values(APPOINTMENT_PACKS)) {
      assert.ok(pack.pricing.length >= 2);
      assert.ok(pack.questions.length >= 3);
      assert.ok(!/מרפא|קליניק|רופא|clinic/i.test(pack.what));
      assert.match(pack.forbidden, /רפואי/);
    }
  });

  it("applies beauty pack with appointment availability + payment off", () => {
    const packed = applyAppointmentsPackToTenant(baseTenant(), "beauty");
    assert.equal(packed.vertical, "beauty");
    assert.equal(packed.processes.payment.enabled, false);
    assert.equal(packed.processes.booking.enabled, true);
    assert.ok(packed.pricing.some((p) => p.name.includes("תספורת")));
    assert.match(packed.bot.answers.what ?? "", /תספורות|טיפולי/);
    assert.equal(packed.availability.dailyCapacity, 10);
    assert.ok(packed.availability.windows.length > 0);
  });

  it("seeds knowledge with appointment booking model", () => {
    const rows = appointmentsKnowledgeRows("t1", "coach");
    assert.ok(rows.some((r) => r.kind === "faq"));
    assert.ok(rows.some((r) => r.kind === "forbidden"));
    assert.ok(
      rows.some(
        (r) =>
          r.label === "booking_model" &&
          r.meta?.bookingModel === "appointment",
      ),
    );
  });

  it("proposes appointment slots from pack availability", () => {
    const now = new Date("2026-11-08T08:00:00Z");
    const availability = defaultAppointmentsAvailability();
    const slots = proposeVisitSlots({ availability, now, count: 3 });
    assert.equal(slots.length, 3);
  });

  it("ships appointments eval fixtures tagged for the pack", () => {
    assert.ok(APPOINTMENTS_EVAL_FIXTURES.length >= 3);
    assert.ok(
      APPOINTMENTS_EVAL_FIXTURES.every((c) => c.id.startsWith("appt-")),
    );
  });
});
