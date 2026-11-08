import { VerifiedPspWebhook } from "@/lib/integrations/psp";
import { getPsp } from "@/lib/integrations/get-psp";
import {
  addBusinessEvents,
  addMessage,
  claimWebhookEvent,
  getConversationByPaymentExternalId,
  getTenantById,
  getTenantBySubscriptionExternalId,
  updateConversation,
} from "@/lib/store/db";
import { applyBillingEvent } from "@/lib/product/billing";
import { createInvoiceDraft } from "@/lib/integrations/invoicing";
import { customerPaymentsEnabled } from "@/lib/product/flags";

export type PspWebhookHandleResult =
  | { ok: true; replay: true }
  | { ok: true; replay: false; kind: "billing" | "payment"; status: string }
  | {
      ok: false;
      error:
        | "invalid_signature"
        | "not_found"
        | "invalid_status"
        | "customer_payments_disabled";
    };

/**
 * Verify via active PspClient, claim idempotency key, apply by externalId only.
 * Never trusts body tenantId / conversationId.
 * Payment (Wave D) kind stays gated behind MOKED_ENABLE_CUSTOMER_PAYMENTS.
 */
export async function handlePspWebhook(input: {
  rawBody: string;
  signatureHeader: string | null;
  preferredProvider?: string | null;
}): Promise<PspWebhookHandleResult> {
  const psp = getPsp(input.preferredProvider);
  const verified = psp.verifyWebhook(input.rawBody, input.signatureHeader);
  if (!verified) return { ok: false, error: "invalid_signature" };

  if (verified.kind === "billing") {
    return applyBillingWebhook(verified);
  }
  if (!customerPaymentsEnabled()) {
    return { ok: false, error: "customer_payments_disabled" };
  }
  return applyPaymentWebhook(verified);
}

async function applyBillingWebhook(
  verified: VerifiedPspWebhook,
): Promise<PspWebhookHandleResult> {
  if (
    verified.status !== "active" &&
    verified.status !== "past_due" &&
    verified.status !== "canceled"
  ) {
    return { ok: false, error: "invalid_status" };
  }

  const tenant = await getTenantBySubscriptionExternalId(verified.externalId);
  if (!tenant) return { ok: false, error: "not_found" };

  const claimed = await claimWebhookEvent({
    id: verified.eventId,
    tenantId: tenant.id,
    payload: verified as unknown as Record<string, unknown>,
  });
  if (!claimed) return { ok: true, replay: true };

  const result = await applyBillingEvent({
    tenantId: tenant.id,
    status: verified.status,
    externalId: verified.externalId,
    invoiceId: verified.invoiceId,
  });

  if (verified.status === "active") {
    await addBusinessEvents([
      {
        tenantId: tenant.id,
        eventType: "subscription.activated",
        payload: {
          externalId: verified.externalId,
          invoiceId: verified.invoiceId,
          numberStatus: result.number?.status ?? null,
        },
        channel: "system",
      },
    ]);
  }

  return {
    ok: true,
    replay: false,
    kind: "billing",
    status: result.tenant.subscription.status,
  };
}

async function applyPaymentWebhook(
  verified: VerifiedPspWebhook,
): Promise<PspWebhookHandleResult> {
  if (verified.status !== "paid" && verified.status !== "failed") {
    return { ok: false, error: "invalid_status" };
  }

  const conversation = await getConversationByPaymentExternalId(
    verified.externalId,
  );
  if (!conversation) return { ok: false, error: "not_found" };

  const tenant = await getTenantById(conversation.tenantId);
  if (!tenant) return { ok: false, error: "not_found" };

  const claimed = await claimWebhookEvent({
    id: verified.eventId,
    tenantId: tenant.id,
    payload: verified as unknown as Record<string, unknown>,
  });
  if (!claimed) return { ok: true, replay: true };

  if (verified.status === "failed") {
    await updateConversation(conversation.id, {
      payment: { ...conversation.payment, status: "failed" },
    });
    await addBusinessEvents([
      {
        tenantId: tenant.id,
        conversationId: conversation.id,
        eventType: "payment.failed",
        payload: { externalId: verified.externalId },
        channel: "whatsapp",
      },
    ]);
    return { ok: true, replay: false, kind: "payment", status: "failed" };
  }

  const amountIls =
    verified.amountIls ?? conversation.quote?.amountIls ?? 0;

  await updateConversation(conversation.id, {
    payment: { ...conversation.payment, status: "paid" },
    activeProcess: undefined,
  });

  await addBusinessEvents([
    {
      tenantId: tenant.id,
      conversationId: conversation.id,
      eventType: "payment.paid",
      payload: { amountIls, externalId: verified.externalId },
      channel: "whatsapp",
    },
  ]);

  if (tenant.integrations.invoicingProvider !== "none") {
    createInvoiceDraft({
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

  return { ok: true, replay: false, kind: "payment", status: "paid" };
}
