/** Demo / stub calendar slots for Israeli businesses (Asia/Jerusalem). */
export function proposeSlots(now = new Date()): string[] {
  const fmt = new Intl.DateTimeFormat("he-IL", {
    timeZone: "Asia/Jerusalem",
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

  const slots: string[] = [];
  for (let addDays = 1; slots.length < 3; addDays++) {
    const d = new Date(now.getTime() + addDays * 24 * 60 * 60 * 1000);
    // Skip Friday evening / Saturday roughly: Fri=5 Sat=6 in JS (local — demo)
    const day = d.getDay();
    if (day === 6) continue;
    d.setHours(day === 5 ? 10 : 11, 0, 0, 0);
    slots.push(fmt.format(d));
  }
  return slots;
}

export function isCalendarConnected(connected: boolean): boolean {
  return connected;
}
