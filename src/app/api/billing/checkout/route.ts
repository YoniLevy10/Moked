import { NextResponse } from "next/server";
import { requireTenantContext } from "@/lib/auth/tenant-context";
import { heldNumberFor, startCheckout } from "@/lib/product/billing";
import { publicNumber, subscriptionPriceIls } from "@/lib/product/model";

export async function GET() {
  const ctx = await requireTenantContext();
  if (!ctx.ok) return ctx.response;
  const number = await heldNumberFor(ctx.tenant.id);
  return NextResponse.json({
    priceIls: subscriptionPriceIls(),
    subscription: ctx.tenant.subscription,
    bot: ctx.tenant.bot,
    number: number ? publicNumber(number, false) : null,
    billingConnected: Boolean(process.env.BILLING_WEBHOOK_SECRET),
    metaConfigured: Boolean(process.env.META_WABA_ID && process.env.META_SYSTEM_USER_TOKEN),
  });
}

export async function POST() {
  const ctx = await requireTenantContext();
  if (!ctx.ok) return ctx.response;
  const checkout = await startCheckout(ctx.tenant.id);
  return NextResponse.json({
    status: checkout.status,
    priceIls: checkout.priceIls,
    billingConnected: checkout.billingConnected,
  });
}
