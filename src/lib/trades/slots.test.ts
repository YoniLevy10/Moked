import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  defaultTradesAvailability,
  normalizeAvailability,
  proposeVisitSlots,
} from "@/lib/trades/slots";
import { proposeSlots, proposeSlotsForTenant } from "@/lib/integrations/calendar";
import { defaultAvailability } from "@/lib/types";

describe("proposeVisitSlots availability rules", () => {
  const now = new Date("2026-11-08T08:00:00Z"); // Sunday morning UTC

  it("returns no slots when windows empty", () => {
    assert.deepEqual(
      proposeVisitSlots({
        availability: defaultAvailability(),
        now,
      }),
      [],
    );
  });

  it("returns no slots when dailyCapacity is 0", () => {
    assert.deepEqual(
      proposeVisitSlots({
        availability: {
          timezone: "Asia/Jerusalem",
          windows: [{ day: 0, startHour: 8, endHour: 18 }],
          dailyCapacity: 0,
        },
        now,
      }),
      [],
    );
  });

  it("proposes slots only inside configured windows", () => {
    const availability = {
      timezone: "Asia/Jerusalem",
      windows: [
        { day: 1, startHour: 10, endHour: 12 }, // Monday only 10–12
      ],
      dailyCapacity: 3,
    };
    const slots = proposeVisitSlots({ availability, now, count: 3 });
    assert.ok(slots.length > 0);
    for (const slot of slots) {
      const local = new Date(slot.startsAt);
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Jerusalem",
        weekday: "short",
        hour: "numeric",
        hour12: false,
      }).formatToParts(local);
      const weekday = parts.find((p) => p.type === "weekday")?.value;
      const hour = Number(parts.find((p) => p.type === "hour")?.value);
      assert.equal(weekday, "Mon");
      assert.ok(hour >= 10 && hour < 12, `hour ${hour} outside window`);
    }
  });

  it("respects dailyCapacity against existing bookings", () => {
    const availability = {
      timezone: "Asia/Jerusalem",
      windows: [{ day: 1, startHour: 9, endHour: 17 }],
      dailyCapacity: 1,
    };
    // Book Monday 2026-11-09 (next day after Sunday Nov 8) fully.
    const monday = proposeVisitSlots({ availability, now, count: 1 });
    assert.equal(monday.length, 1);
    const full = proposeVisitSlots({
      availability,
      now,
      count: 3,
      bookedStartsAt: [monday[0]!.startsAt],
    });
    // First Monday is full; later Mondays may still appear within 21-day look-ahead.
    for (const slot of full) {
      assert.notEqual(slot.startsAt, monday[0]!.startsAt);
      const day = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Jerusalem",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(slot.startsAt));
      const bookedDay = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Jerusalem",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(monday[0]!.startsAt));
      assert.notEqual(day, bookedDay);
    }
  });

  it("calendar helpers forward tenant availability", () => {
    const empty = proposeSlots(defaultAvailability(), { now });
    assert.deepEqual(empty, []);
    const packed = defaultTradesAvailability();
    const slots = proposeSlotsForTenant({ availability: packed }, { now, count: 3 });
    assert.equal(slots.length, 3);
    assert.deepEqual(proposeSlots(packed, { now, count: 3 }), slots);
  });

  it("normalizeAvailability drops invalid windows", () => {
    const normalized = normalizeAvailability({
      timezone: "Asia/Jerusalem",
      windows: [
        { day: 1, startHour: 9, endHour: 12 },
        { day: 9, startHour: 9, endHour: 12 },
        { day: 2, startHour: 14, endHour: 10 },
      ],
      dailyCapacity: 2.7 as unknown as number,
    });
    assert.equal(normalized.windows.length, 1);
    assert.equal(normalized.dailyCapacity, 2);
  });
});
