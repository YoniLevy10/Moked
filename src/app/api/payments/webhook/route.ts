import { NextRequest, NextResponse } from "next/server";
import {
  addBusinessEvents,
  addMessage,
  getConversationById,
  getTenantById,
  updateConversation,
} from "@/lib/store/db";
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

  const conversation = await getConversationById(body.conversationId);
  if (!conversation) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const tenant = await getTenantById(conversation.tenantId);
  if (!tenant) {
    return NextResponse.json({ error: "tenant_missing" }, { status: 400 });
  }

  if (body.status === "failed") {
    await updateConversation(conversation.id, {
      payment: { ...conversation.payment, status: "failed" },
    });
    await addBusinessEvents([
      {
        tenantId: tenant.id,
        conversationId: conversation.id,
        eventType: "payment.failed",
        payload: {},
        channel: "whatsapp",
      },
    ]);
    return NextResponse.json({ ok: true, event: "payment.failed" });
  }

  const amountIls = body.amountIls ?? conversation.quote?.amountIls ?? 0;

  await updateConversation(conversation.id, {
    payment: { ...conversation.payment, status: "paid" },
    activeProcess: undefined,
  });

  await addBusinessEvents([
    {
      tenantId: tenant.id,
      conversationId: conversation.id,
      eventType: "payment.paid",
      payload: { amountIls },
      channel: "whatsapp",
    },
  ]);

  let invoice: { draftId: string; status: "draft" } | null = null;
  if (tenant.integrations.invoicingProvider !== "none") {
    invoice = createInvoiceDraft({
      provider: tenant.integrations.invoicingProvider,
      customerName: conversation.customerName ?? conversation.customerWaId,
      amountIls,
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
