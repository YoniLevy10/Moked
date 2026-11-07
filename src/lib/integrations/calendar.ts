import {
  proposeVisitSlots,
  type VisitSlot,
} from "@/lib/trades/slots";

export type CalendarSlot = VisitSlot;

/**
 * Upcoming visit slots. Trades beachhead uses the slot scheduler and does
 * **not** require Google Calendar — `googleCalendar` is optional enrichment only.
 */
export function proposeSlots(now = new Date()): CalendarSlot[] {
  return proposeVisitSlots(now, 3);
}

export function isCalendarConnected(connected: boolean): boolean {
  return connected;
}
