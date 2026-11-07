import { NextRequest, NextResponse } from "next/server";
import {
  getConversationById,
  listConversations,
  listMessages,
  updateConversation,
} from "@/lib/store/db";
import { requireTenantContext } from "@/lib/auth/tenant-context";
import {
  maybeRenotifyEscalation,
  resolveEscalation,
  takeoverConversation,
  waitingForHuman,
} from "@/lib/processes/escalation";

export async function GET(req: NextRequest) {
  const ctx = await requireTenantContext();
  if (!ctx.ok) return ctx.response;
  const conversationId = req.nextUrl.searchParams.get("id");
  if (conversationId) {
    const messages = await listMessages(conversationId);
    return NextResponse.json({ messages });
  }
  let conversations = await listConversations(ctx.tenant.id);
  // Opportunistic re-notify while owner is looking at the inbox.
  for (const row of conversations) {
    if (row.escalation && !row.escalation.resolvedAt) {
      await maybeRenotifyEscalation({
        tenant: ctx.tenant,
        conversation: row,
      });
    }
  }
  conversations = await listConversations(ctx.tenant.id);
  const waiting = waitingForHuman(conversations);
  return NextResponse.json({ conversations, waitingForHuman: waiting });
}

export async function PATCH(req: NextRequest) {
  const ctx = await requireTenantContext();
  if (!ctx.ok) return ctx.response;
  const body = (await req.json()) as {
    id: string;
    status?: "open" | "human_takeover" | "closed";
    action?: "takeover" | "resolve";
  };

  const current = await getConversationById(body.id);
  if (!current) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (current.tenantId !== ctx.tenant.id && ctx.user.role !== "superadmin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let updated = current;
  if (body.action === "takeover" || body.status === "human_takeover") {
    updated = await takeoverConversation(body.id);
  } else if (body.action === "resolve") {
    updated = await resolveEscalation(body.id, current);
  } else {
    updated = await updateConversation(body.id, { status: body.status });
  }

  return NextResponse.json({ conversation: updated });
}
