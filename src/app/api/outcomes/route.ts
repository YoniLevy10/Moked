import { NextResponse } from "next/server";
import { requireTenantContext } from "@/lib/auth/tenant-context";
import { listBusinessEvents } from "@/lib/store/db";
import { aggregateOutcomes } from "@/lib/outcomes";

/** Owner dashboard outcomes — business results, not message volume. */
export async function GET() {
  const ctx = await requireTenantContext();
  if (!ctx.ok) return ctx.response;

  const events = await listBusinessEvents(ctx.tenant.id);
  const outcomes = aggregateOutcomes(events);

  const recent = events.slice(0, 20).map((e) => ({
    id: e.id,
    eventType: e.eventType,
    conversationId: e.conversationId,
    payload: e.payload,
    channel: e.channel,
    createdAt: e.createdAt,
  }));

  return NextResponse.json({
    tenantId: ctx.tenant.id,
    outcomes,
    recentEvents: recent,
    eventCount: events.length,
  });
}
