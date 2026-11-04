import { createHmac, timingSafeEqual } from "crypto";
import { getTenantById, listPhoneNumbers, updateTenant } from "@/lib/store/db";
import { subscriptionPriceIls } from "@/lib/product/model";
import { lockAvailableNumber, parkTenantNumber } from "@/lib/product/pool";

export function billingWebhookSecret(): string | null {
  const secret = process.env.BILLING_WEBHOOK_SECRET?.trim();
  return secret || null;
}

export function verifyBillingSignature(rawBody: string, header: string | null): boolean {
  const secret = billingWebhookSecret();
  if (!secret || !header) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const left = Buffer.from(expected);
  const right = Buffer.from(header.trim());
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export async function startCheckout(tenantId: string) {
  const tenant = await getTenantById(tenantId);
  if (!tenant) throw new Error("tenant_not_found");
  const externalId = `checkout_${Date.now()}`;
  const updated = await updateTenant(tenantId, {
    subscription: {
      ...tenant.subscription,
      status: "pending",
      externalId,
      provider: process.env.MOKED_BILLING_PROVIDER || undefined,
    },
  });
  return {
    status: "pending" as const,
    priceIls: subscriptionPriceIls(),
    externalId,
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
