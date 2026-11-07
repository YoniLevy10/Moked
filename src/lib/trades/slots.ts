export type VisitSlot = { label: string; startsAt: string };

/**
 * Slot-based visit scheduler for trades owners without Google Calendar.
 * Proposes morning + afternoon windows on the next Sun–Fri days (Asia/Jerusalem).
 */
export function proposeVisitSlots(
  now = new Date(),
  count = 3,
): VisitSlot[] {
  const fmt = new Intl.DateTimeFormat("he-IL", {
    timeZone: "Asia/Jerusalem",
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

  const slots: VisitSlot[] = [];
  for (let addDays = 1; slots.length < count && addDays < 14; addDays++) {
    const d = new Date(now.getTime() + addDays * 24 * 60 * 60 * 1000);
    const day = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Jerusalem",
      weekday: "short",
    }).format(d);
    if (day === "Sat") continue;

    const hours =
      day === "Fri"
        ? [9, 11]
        : [9, 12, 15];

    for (const hour of hours) {
      if (slots.length >= count) break;
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Jerusalem",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).formatToParts(d);
      const year = Number(parts.find((p) => p.type === "year")?.value);
      const month = Number(parts.find((p) => p.type === "month")?.value);
      const date = Number(parts.find((p) => p.type === "day")?.value);
      const startsAt = atJerusalem(year, month, date, hour);
      if (startsAt.getTime() <= now.getTime()) continue;
      slots.push({
        label: fmt.format(startsAt),
        startsAt: startsAt.toISOString(),
      });
    }
  }
  return slots;
}

function atJerusalem(
  year: number,
  month: number,
  day: number,
  hour: number,
): Date {
  const guess = new Date(Date.UTC(year, month - 1, day, hour, 0, 0));
  return new Date(guess.getTime() - jerusalemOffsetMinutes(guess) * 60_000);
}

function jerusalemOffsetMinutes(date: Date): number {
  const name =
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Jerusalem",
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
