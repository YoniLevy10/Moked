import { NextRequest, NextResponse } from "next/server";
import {
  getActiveTenant,
  listConversations,
  listMessages,
  updateConversation,
} from "@/lib/store/db";

export async function GET(req: NextRequest) {
  const tenant = await getActiveTenant();
  if (!tenant) {
    return NextResponse.json({ conversations: [] });
  }
  const conversationId = req.nextUrl.searchParams.get("id");
  if (conversationId) {
    const messages = await listMessages(conversationId);
    return NextResponse.json({ messages });
  }
  const conversations = await listConversations(tenant.id);
  return NextResponse.json({ conversations });
}

export async function PATCH(req: NextRequest) {
  const tenant = await getActiveTenant();
  if (!tenant) {
    return NextResponse.json({ error: "no_tenant" }, { status: 400 });
  }
  const body = (await req.json()) as {
    id: string;
    status?: "open" | "human_takeover" | "closed";
  };
  const updated = await updateConversation(body.id, {
    status: body.status,
  });
  return NextResponse.json({ conversation: updated });
}
