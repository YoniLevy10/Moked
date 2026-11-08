import { defaultAvailability, type TenantAvailability } from "@/lib/types";

export type VisitSlot = { label: string; startsAt: string };

export type ProposeSlotsInput = {
  availability?: TenantAvailability | null;
  now?: Date;
  count?: number;
  /** Existing booking startsAt ISO strings — count against dailyCapacity. */
  bookedStartsAt?: string[];
};

/**
 * Propose visit slots inside owner-configured windows only.
 * Empty windows or dailyCapacity 0 → no inventable slots.
 */
export function proposeVisitSlots(input: ProposeSlotsInput = {}): VisitSlot[] {
  const availability = normalizeAvailability(input.availability);
  const now = input.now ?? new Date();
  const count = input.count ?? 3;
  const booked = input.bookedStartsAt ?? [];

  if (
    availability.windows.length === 0 ||
    availability.dailyCapacity <= 0 ||
    count <= 0
  ) {
    return [];
  }

  const fmt = new Intl.DateTimeFormat("he-IL", {
    timeZone: availability.timezone,
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

  const slots: VisitSlot[] = [];
  for (let addDays = 1; slots.length < count && addDays < 21; addDays++) {
    const d = new Date(now.getTime() + addDays * 24 * 60 * 60 * 1000);
    const parts = jerusalemDateParts(d, availability.timezone);
    const dayWindows = availability.windows.filter((w) => w.day === parts.weekday);
    if (dayWindows.length === 0) continue;

    const dayKey = `${parts.year}-${parts.month}-${parts.day}`;
    const bookedThatDay = booked.filter((iso) => {
      const p = jerusalemDateParts(new Date(iso), availability.timezone);
      return `${p.year}-${p.month}-${p.day}` === dayKey;
    }).length;
    const remaining = availability.dailyCapacity - bookedThatDay;
    if (remaining <= 0) continue;

    const hours = candidateHours(dayWindows);
    for (const hour of hours) {
      if (slots.length >= count) break;
      if (bookedThatDay + slots.filter((s) => {
        const p = jerusalemDateParts(new Date(s.startsAt), availability.timezone);
        return `${p.year}-${p.month}-${p.day}` === dayKey;
      }).length >= availability.dailyCapacity) {
        break;
      }
      const startsAt = atZone(
        parts.year,
        parts.month,
        parts.day,
        hour,
        availability.timezone,
      );
      if (startsAt.getTime() <= now.getTime()) continue;
      // Deduplicate identical startsAt
      if (slots.some((s) => s.startsAt === startsAt.toISOString())) continue;
      slots.push({
        label: fmt.format(startsAt),
        startsAt: startsAt.toISOString(),
      });
    }
  }
  return slots;
}

export function normalizeAvailability(
  value?: TenantAvailability | null,
): TenantAvailability {
  const base = defaultAvailability();
  if (!value) return base;
  const windows = (value.windows ?? [])
    .filter(
      (w) =>
        Number.isInteger(w.day) &&
        w.day >= 0 &&
        w.day <= 6 &&
        Number.isInteger(w.startHour) &&
        Number.isInteger(w.endHour) &&
        w.startHour >= 0 &&
        w.endHour > w.startHour &&
        w.endHour <= 24,
    )
    .map((w) => ({
      day: w.day,
      startHour: w.startHour,
      endHour: w.endHour,
    }));
  return {
    timezone: value.timezone?.trim() || base.timezone,
    windows,
    dailyCapacity: Math.max(0, Math.floor(Number(value.dailyCapacity) || 0)),
  };
}

/** Default trades beachhead windows: Sun–Thu 08–18, Fri 08–13, capacity 4. */
export function defaultTradesAvailability(): TenantAvailability {
  const weekday = [0, 1, 2, 3, 4].map((day) => ({
    day,
    startHour: 8,
    endHour: 18,
  }));
  return {
    timezone: "Asia/Jerusalem",
    windows: [...weekday, { day: 5, startHour: 8, endHour: 13 }],
    dailyCapacity: 4,
  };
}

function candidateHours(
  windows: Array<{ startHour: number; endHour: number }>,
): number[] {
  const hours = new Set<number>();
  for (const w of windows) {
    // Morning / midday / afternoon samples inside the open interval.
    const span = w.endHour - w.startHour;
    const samples =
      span <= 2
        ? [w.startHour]
        : span <= 4
          ? [w.startHour, w.startHour + Math.floor(span / 2)]
          : [
              w.startHour,
              w.startHour + Math.floor(span / 2),
              Math.max(w.startHour, w.endHour - 3),
            ];
    for (const h of samples) {
      if (h >= w.startHour && h < w.endHour) hours.add(h);
    }
  }
  return [...hours].sort((a, b) => a - b);
}

function jerusalemDateParts(
  date: Date,
  timeZone: string,
): { year: number; month: number; day: number; weekday: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(date);
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);
  const weekdayName = parts.find((p) => p.type === "weekday")?.value ?? "Sun";
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return { year, month, day, weekday: map[weekdayName] ?? 0 };
}

function atZone(
  year: number,
  month: number,
  day: number,
  hour: number,
  timeZone: string,
): Date {
  const guess = new Date(Date.UTC(year, month - 1, day, hour, 0, 0));
  return new Date(guess.getTime() - zoneOffsetMinutes(guess, timeZone) * 60_000);
}

function zoneOffsetMinutes(date: Date, timeZone: string): number {
  const name =
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "shortOffset",
      hour: "2-digit",
    })
      .formatToParts(date)
      .find((part) => part.type === "timeZoneName")?.value ?? "GMT+2";
  const match = name.match(/GMT([+-])(\d+)(?::(\d+))?/);
  if (!match) return 120;
  const sign = match[1] === "-" ? -1 : 1;
  return sign * (Number(match[2]) * 60 + Number(match[3] ?? 0));
}
