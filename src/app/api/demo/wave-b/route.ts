import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getConversationById, listConversations } from "@/lib/store/db";
import { triggerReminder, triggerRetention } from "@/lib/processes/engine";
import { requireTenantContext } from "@/lib/auth/tenant-context";

const Schema = z.object({
  action: z.enum(["reminder_t24", "reminder_t2", "retention"]),
  conversationId: z.string().optional(),
});

/** Dashboard triggers for Wave B (no Meta scheduler required in demo). */
export async function POST(req: NextRequest) {
  const ctx = await requireTenantContext();
  if (!ctx.ok) return ctx.response;
  const tenant = ctx.tenant;

  const body = Schema.parse(await req.json());
  let conversation = body.conversationId
    ? await getConversationById(body.conversationId)
    : null;
  if (conversation && conversation.tenantId !== tenant.id) {
    conversation = null;
  }
  if (!conversation) {
    const all = await listConversations(tenant.id);
    conversation =
      all.find((c) => c.booking?.confirmedAt && c.status === "open") ?? null;
  }

  if (!conversation) {
    return NextResponse.json(
      { error: "no_booked_conversation" },
      { status: 404 },
    );
  }

  if (body.action === "retention") {
    const result = await triggerRetention({ tenant, conversation });
    return NextResponse.json(result);
  }

  const result = await triggerReminder({
    tenant,
    conversation,
    kind: body.action === "reminder_t24" ? "t24" : "t2",
  });
  return NextResponse.json(result);
}
