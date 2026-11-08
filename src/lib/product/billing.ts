import {
  providerMode,
  pspWebhookSecret,
  resolveBillingProvider,
} from "@/lib/integrations/psp";
import { getPsp } from "@/lib/integrations/get-psp";
import { getTenantById, listPhoneNumbers, updateTenant } from "@/lib/store/db";
import {
  setupFeeIls,
  subscriptionPriceIls,
} from "@/lib/product/model";
import { lockAvailableNumber, parkTenantNumber } from "@/lib/product/pool";

/** Prefer PSP secret; keep BILLING_WEBHOOK_SECRET as legacy alias. */
export function billingWebhookSecret(): string | null {
  return (
    pspWebhookSecret() ||
    process.env.BILLING_WEBHOOK_SECRET?.trim() ||
    null
  );
}

export type CheckoutPlan = "monthly" | "setup_plus_monthly";

/**
 * SaaS card checkout (subscription / setup). Wave D customer payments stay
 * behind MOKED_ENABLE_CUSTOMER_PAYMENTS and are not started here.
 */
export async function startCheckout(
  tenantId: string,
  opts?: { plan?: CheckoutPlan; includeSetupFee?: boolean },
) {
  const tenant = await getTenantById(tenantId);
  if (!tenant) throw new Error("tenant_not_found");

  const monthly = subscriptionPriceIls();
  const includeSetup =
    opts?.includeSetupFee === true || opts?.plan === "setup_plus_monthly";
  const setup = includeSetup ? setupFeeIls() : 0;
  const priceIls = monthly + setup;
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
      monthlyIls: monthly,
      setupIls: setup,
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
    description: setup
      ? `MOKED setup ₪${setup} + subscription ₪${monthly} — ${tenant.businessName}`
      : `MOKED subscription ₪${monthly} — ${tenant.businessName}`,
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
    monthlyIls: monthly,
    setupIls: setup,
    externalId: charge.externalId,
    checkoutUrl: charge.hostedUrl,
    billingConnected: Boolean(billingWebhookSecret()),
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
