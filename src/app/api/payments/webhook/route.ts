import { NextRequest, NextResponse } from "next/server";
import { getDb, updateConversation, addMessage } from "@/lib/store/db";
import { createInvoiceDraft } from "@/lib/integrations/invoicing";

/**
 * Wave D — payment provider webhook stub.
 * Providers (Grow/PayPlus/Tranzila/Cardcom) will POST here on payment success.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    conversationId?: string;
    status?: "paid" | "failed";
    amountIls?: number;
  };

  if (!body.conversationId) {
    return NextResponse.json({ error: "missing_conversationId" }, { status: 400 });
  }

  const db = await getDb();
  const conversation = db.conversations.find((c) => c.id === body.conversationId);
  if (!conversation) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const tenant = db.tenants.find((t) => t.id === conversation.tenantId);
  if (!tenant) {
    return NextResponse.json({ error: "tenant_missing" }, { status: 400 });
  }

  if (body.status === "failed") {
    await updateConversation(conversation.id, {
      payment: { ...conversation.payment, status: "failed" },
    });
    return NextResponse.json({ ok: true, event: "payment.failed" });
  }

  await updateConversation(conversation.id, {
    payment: { ...conversation.payment, status: "paid" },
    activeProcess: undefined,
  });

  let invoice: { draftId: string; status: "draft" } | null = null;
  if (tenant.integrations.invoicingProvider !== "none") {
    invoice = createInvoiceDraft({
      provider: tenant.integrations.invoicingProvider,
      customerName: conversation.customerName ?? conversation.customerWaId,
      amountIls: body.amountIls ?? conversation.quote?.amountIls ?? 0,
    });
  }

  await addMessage({
    conversationId: conversation.id,
    tenantId: tenant.id,
    direction: "outbound",
    body: "התשלום התקבל בהצלחה. תודה!",
    type: "system",
    processKey: "payment",
  });

  return NextResponse.json({
    ok: true,
    event: "payment.paid",
    invoice,
  });
}
