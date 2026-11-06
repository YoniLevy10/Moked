export type CalendarSlot = { label: string; startsAt: string };

/** Upcoming visit slots for Israeli businesses (Asia/Jerusalem). */
export function proposeSlots(now = new Date()): CalendarSlot[] {
  const fmt = new Intl.DateTimeFormat("he-IL", {
    timeZone: "Asia/Jerusalem",
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

  const slots: CalendarSlot[] = [];
  for (let addDays = 1; slots.length < 3; addDays++) {
    const d = new Date(now.getTime() + addDays * 24 * 60 * 60 * 1000);
    const day = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Jerusalem",
      weekday: "short",
    }).format(d);
    if (day === "Sat") continue;
    const hour = day === "Fri" ? 10 : 11;
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Jerusalem",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(d);
    const year = parts.find((part) => part.type === "year")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    const date = parts.find((part) => part.type === "day")?.value;
    const startsAt = atJerusalem(Number(year), Number(month), Number(date), hour);
    slots.push({ label: fmt.format(startsAt), startsAt: startsAt.toISOString() });
  }
  return slots;
}

function atJerusalem(year: number, month: number, day: number, hour: number): Date {
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

export function isCalendarConnected(connected: boolean): boolean {
  return connected;
}
