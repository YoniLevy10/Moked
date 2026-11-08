import { NextRequest, NextResponse } from "next/server";
import {
  addBusinessEvents,
  addMessage,
  getConversationById,
  getTenantById,
  updateConversation,
} from "@/lib/store/db";
import { createInvoiceDraft } from "@/lib/integrations/invoicing";
import { verifyPaymentsSignature } from "@/lib/integrations/payment-webhook";
import { customerPaymentsEnabled } from "@/lib/product/flags";

/**
 * Wave D — payment provider webhook.
 * Requires PAYMENTS_WEBHOOK_SECRET + x-moked-signature HMAC.
 * Fail-closed (410) when MOKED_ENABLE_CUSTOMER_PAYMENTS is not true.
 */
export async function POST(req: NextRequest) {
  if (!customerPaymentsEnabled()) {
    return NextResponse.json(
      { error: "customer_payments_disabled" },
      { status: 410 },
    );
  }

  const raw = await req.text();
  if (!verifyPaymentsSignature(raw, req.headers.get("x-moked-signature"))) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  let body: {
    conversationId?: string;
    status?: "paid" | "failed";
    amountIls?: number;
  };
  try {
    body = JSON.parse(raw) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

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
