import { NextResponse } from "next/server";
import { requireTenantContext } from "@/lib/auth/tenant-context";
import { listBusinessEvents } from "@/lib/store/db";
import {
  aggregateOutcomes,
  fourNumbersFromOutcomes,
  tenantShowsDemoDataBadge,
} from "@/lib/outcomes";

/**
 * Owner dashboard outcomes — always from real tenant business_events rows.
 * Never returns hardcoded showcase figures. Demo tenants get demoData=true
 * so the UI can show a visible "demo data" badge.
 */
export async function GET() {
  const ctx = await requireTenantContext();
  if (!ctx.ok) return ctx.response;

  const events = await listBusinessEvents(ctx.tenant.id);
  const outcomes = aggregateOutcomes(events);
  const fourNumbers = fourNumbersFromOutcomes(outcomes);

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
    /** Provenance: metrics are aggregates of stored tenant records only. */
    source: "tenant_records" as const,
    demoData: tenantShowsDemoDataBadge(ctx.tenant),
    outcomes,
    fourNumbers,
    recentEvents: recent,
    eventCount: events.length,
  });
}
