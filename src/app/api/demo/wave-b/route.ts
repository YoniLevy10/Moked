import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getActiveTenant, getDb } from "@/lib/store/db";
import { triggerReminder, triggerRetention } from "@/lib/processes/engine";

const Schema = z.object({
  action: z.enum(["reminder_t24", "reminder_t2", "retention"]),
  conversationId: z.string().optional(),
});

/** Dashboard triggers for Wave B (no Meta scheduler required in demo). */
export async function POST(req: NextRequest) {
  const tenant = await getActiveTenant();
  if (!tenant) {
    return NextResponse.json({ error: "no_tenant" }, { status: 400 });
  }

  const body = Schema.parse(await req.json());
  const db = await getDb();
  const conversation =
    (body.conversationId
      ? db.conversations.find((c) => c.id === body.conversationId)
      : db.conversations.find(
          (c) =>
            c.tenantId === tenant.id &&
            c.booking?.confirmedAt &&
            c.status === "open",
        )) ?? null;

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
