import { NextRequest, NextResponse } from "next/server";
import {
  listConversations,
  listMessages,
  updateConversation,
} from "@/lib/store/db";
import { requireTenantContext } from "@/lib/auth/tenant-context";

export async function GET(req: NextRequest) {
  const ctx = await requireTenantContext();
  if (!ctx.ok) return ctx.response;
  const conversationId = req.nextUrl.searchParams.get("id");
  if (conversationId) {
    const messages = await listMessages(conversationId);
    return NextResponse.json({ messages });
  }
  const conversations = await listConversations(ctx.tenant.id);
  return NextResponse.json({ conversations });
}

export async function PATCH(req: NextRequest) {
  const ctx = await requireTenantContext();
  if (!ctx.ok) return ctx.response;
  const body = (await req.json()) as {
    id: string;
    status?: "open" | "human_takeover" | "closed";
  };
  const updated = await updateConversation(body.id, {
    status: body.status,
  });
  if (updated.tenantId !== ctx.tenant.id && ctx.user.role !== "superadmin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  return NextResponse.json({ conversation: updated });
}
