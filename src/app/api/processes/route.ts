import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, setProcessEnabled } from "@/lib/store/db";
import { PROCESS_CATALOG, ProcessKeySchema } from "@/lib/types";
import {
  triggerReminder,
  triggerRetention,
} from "@/lib/processes/engine";
import { requireTenantContext } from "@/lib/auth/tenant-context";

export async function GET() {
  const ctx = await requireTenantContext();
  if (!ctx.ok) return ctx.response;
  const catalog = Object.values(PROCESS_CATALOG).sort(
    (a, b) => a.order - b.order,
  );
  return NextResponse.json({
    catalog,
    enabled: ctx.tenant.processes,
  });
}

const PatchSchema = z.object({
  key: ProcessKeySchema,
  enabled: z.boolean(),
});

export async function PATCH(req: NextRequest) {
  const ctx = await requireTenantContext();
  if (!ctx.ok) return ctx.response;
  const body = PatchSchema.parse(await req.json());
  const updated = await setProcessEnabled(
    ctx.tenant.id,
    body.key,
    body.enabled,
  );
  return NextResponse.json({ processes: updated.processes });
}

const ActionSchema = z.object({
  action: z.enum(["send_reminder_t24", "send_reminder_t2", "send_retention"]),
  conversationId: z.string(),
});

export async function POST(req: NextRequest) {
  const ctx = await requireTenantContext();
  if (!ctx.ok) return ctx.response;
  const body = ActionSchema.parse(await req.json());
  const db = await getDb();
  const conversation = db.conversations.find(
    (c) => c.id === body.conversationId && c.tenantId === ctx.tenant.id,
  );
  if (!conversation) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (body.action === "send_retention") {
    const result = await triggerRetention({
      tenant: ctx.tenant,
      conversation,
    });
    return NextResponse.json(result);
  }

  const kind = body.action === "send_reminder_t24" ? "t24" : "t2";
  const result = await triggerReminder({
    tenant: ctx.tenant,
    conversation,
    kind,
  });
  return NextResponse.json(result);
}
