import { NextRequest, NextResponse } from "next/server";
import { requireTenantContext } from "@/lib/auth/tenant-context";
import { heldNumberFor, startCheckout } from "@/lib/product/billing";
import {
  publicNumber,
  setupFeeIls,
  subscriptionPriceIls,
} from "@/lib/product/model";
import { billingMode } from "@/lib/integrations/psp";
import { billingWebhookSecret } from "@/lib/product/billing";

export async function GET() {
  const ctx = await requireTenantContext();
  if (!ctx.ok) return ctx.response;
  const number = await heldNumberFor(ctx.tenant.id);
  return NextResponse.json({
    priceIls: subscriptionPriceIls(),
    setupFeeIls: setupFeeIls(),
    subscription: ctx.tenant.subscription,
    bot: ctx.tenant.bot,
    number: number ? publicNumber(number, false) : null,
    billingConnected:
      billingMode() === "live" && Boolean(billingWebhookSecret()),
    metaConfigured: Boolean(
      process.env.META_WABA_ID && process.env.META_SYSTEM_USER_TOKEN,
    ),
  });
}

export async function POST(req: NextRequest) {
  const ctx = await requireTenantContext();
  if (!ctx.ok) return ctx.response;
  let includeSetupFee = false;
  try {
    const body = (await req.json()) as { includeSetupFee?: boolean };
    includeSetupFee = Boolean(body?.includeSetupFee);
  } catch {
    includeSetupFee = false;
  }
  try {
    const checkout = await startCheckout(ctx.tenant.id, { includeSetupFee });
    return NextResponse.json({
      status: checkout.status,
      priceIls: checkout.priceIls,
      monthlyIls: checkout.monthlyIls,
      setupIls: checkout.setupIls,
      billingConnected: checkout.billingConnected,
      checkoutUrl: checkout.checkoutUrl,
      externalId: checkout.externalId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "checkout_failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
