import {
  providerMode,
  pspWebhookSecret,
  resolveBillingProvider,
} from "@/lib/integrations/psp";
import { getPsp } from "@/lib/integrations/get-psp";
import { getTenantById, listPhoneNumbers, updateTenant } from "@/lib/store/db";
import { subscriptionPriceIls } from "@/lib/product/model";
import { lockAvailableNumber, parkTenantNumber } from "@/lib/product/pool";

/** @deprecated Prefer pspWebhookSecret — kept for any residual callers. */
export function billingWebhookSecret(): string | null {
  return pspWebhookSecret();
}

export async function startCheckout(tenantId: string) {
  const tenant = await getTenantById(tenantId);
  if (!tenant) throw new Error("tenant_not_found");

  const priceIls = subscriptionPriceIls();
  const mode = providerMode();

  if (mode !== "live") {
    const externalId = `checkout_demo_${Date.now()}`;
    const updated = await updateTenant(tenantId, {
      subscription: {
        ...tenant.subscription,
        status: "pending",
        externalId,
        provider: "demo",
      },
    });
    return {
      status: "pending" as const,
      priceIls,
      externalId,
      checkoutUrl: null as string | null,
      billingConnected: false,
      tenant: updated,
    };
  }

  const billingProvider = resolveBillingProvider();
  const psp = getPsp(billingProvider);
  const charge = await psp.createHostedCharge({
    amountIls: priceIls,
    description: `MOKED subscription — ${tenant.businessName}`,
    tenantId,
  });
  const updated = await updateTenant(tenantId, {
    subscription: {
      ...tenant.subscription,
      status: "pending",
      externalId: charge.externalId,
      provider: charge.provider,
    },
  });
  return {
    status: "pending" as const,
    priceIls,
    externalId: charge.externalId,
    checkoutUrl: charge.hostedUrl,
    billingConnected: Boolean(pspWebhookSecret()),
    tenant: updated,
  };
}

export async function applyBillingEvent(input: {
  tenantId: string;
  status: "active" | "past_due" | "canceled";
  externalId?: string;
  invoiceId?: string;
}) {
  const tenant = await getTenantById(input.tenantId);
  if (!tenant) throw new Error("tenant_not_found");
  if (input.status === "active") {
    const renewsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const updated = await updateTenant(tenant.id, {
      subscription: {
        ...tenant.subscription,
        status: "active",
        renewsAt,
        externalId: input.externalId ?? tenant.subscription.externalId,
        invoiceId: input.invoiceId ?? tenant.subscription.invoiceId,
      },
    });
    const number = await lockAvailableNumber(tenant.id);
    return { tenant: updated, number };
  }
  if (input.status === "canceled" || input.status === "past_due") {
    await parkTenantNumber(tenant.id);
    const updated = await updateTenant(tenant.id, {
      subscription: {
        ...tenant.subscription,
        status: input.status,
      },
      whatsapp: { ...tenant.whatsapp, connected: false },
    });
    return { tenant: updated, number: null };
  }
  return { tenant, number: null };
}

export async function cancelSubscription(tenantId: string) {
  return applyBillingEvent({ tenantId, status: "canceled" });
}

export async function heldNumberFor(tenantId: string) {
  const numbers = await listPhoneNumbers();
  return (
    numbers.find(
      (phone) =>
        phone.tenantId === tenantId &&
        phone.status !== "available" &&
        phone.status !== "cooldown" &&
        phone.status !== "banned",
    ) ?? null
  );
}
