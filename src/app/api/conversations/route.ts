import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  addMessage,
  getConversationById,
  listConversations,
  listMessages,
  updateConversation,
} from "@/lib/store/db";
import { conversationVisibleToTenant } from "@/lib/auth/conversation-access";
import { requireTenantContext } from "@/lib/auth/tenant-context";
import {
  maybeRenotifyEscalation,
  resolveEscalation,
  takeoverConversation,
  waitingForHuman,
} from "@/lib/processes/escalation";
import { sendWhatsAppText } from "@/lib/whatsapp/client";

export async function GET(req: NextRequest) {
  const ctx = await requireTenantContext();
  if (!ctx.ok) return ctx.response;
  const conversationId = req.nextUrl.searchParams.get("id");
  if (conversationId) {
    const conversation = await getConversationById(conversationId);
    if (
      !conversationVisibleToTenant(
        conversation,
        ctx.tenant.id,
        ctx.user.role,
      )
    ) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
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

const ReplySchema = z.object({
  id: z.string().min(1),
  body: z.string().min(1).max(4000),
});

/** Owner human reply while conversation is in takeover (agent stays silent). */
export async function POST(req: NextRequest) {
  const ctx = await requireTenantContext();
  if (!ctx.ok) return ctx.response;
  const body = ReplySchema.parse(await req.json());

  const current = await getConversationById(body.id);
  if (
    !conversationVisibleToTenant(current, ctx.tenant.id, ctx.user.role)
  ) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (!current) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  let conversation = current;
  if (conversation.status !== "human_takeover") {
    conversation = await takeoverConversation(conversation.id);
  }

  const send = await sendWhatsAppText({
    tenant: ctx.tenant,
    to: conversation.customerWaId,
    body: body.body.trim(),
  });

  const message = await addMessage({
    conversationId: conversation.id,
    tenantId: ctx.tenant.id,
    direction: "outbound",
    body: body.body.trim(),
    type: "text",
    metaMessageId: send.id,
  });

  return NextResponse.json({ conversation, message, send });
}
