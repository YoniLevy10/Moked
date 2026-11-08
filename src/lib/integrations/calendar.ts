import type { Tenant, TenantAvailability } from "@/lib/types";
import {
  normalizeAvailability,
  proposeVisitSlots,
  type VisitSlot,
} from "@/lib/trades/slots";

export type CalendarSlot = VisitSlot;

/**
 * Upcoming visit slots from owner-configured availability.
 * Google Calendar OAuth remains P2 — `googleCalendar` is optional enrichment only.
 */
export function proposeSlots(
  availability?: TenantAvailability | null,
  options?: { now?: Date; count?: number; bookedStartsAt?: string[] },
): CalendarSlot[] {
  return proposeVisitSlots({
    availability: normalizeAvailability(availability),
    now: options?.now,
    count: options?.count ?? 3,
    bookedStartsAt: options?.bookedStartsAt,
  });
}

export function proposeSlotsForTenant(
  tenant: Pick<Tenant, "availability">,
  options?: { now?: Date; count?: number; bookedStartsAt?: string[] },
): CalendarSlot[] {
  return proposeSlots(tenant.availability, options);
}

export function isCalendarConnected(connected: boolean): boolean {
  return connected;
}
