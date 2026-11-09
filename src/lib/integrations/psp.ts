import { createHmac, timingSafeEqual } from "crypto";

export type PspProvider =
  | "demo"
  | "tranzila"
  | "grow"
  | "payplus"
  | "cardcom";

export type CreateHostedChargeInput = {
  amountIls: number;
  description: string;
  tenantId: string;
  conversationId?: string;
  successUrl?: string;
  cancelUrl?: string;
};

export type CreateHostedChargeResult = {
  hostedUrl: string;
  externalId: string;
  provider: PspProvider;
};

export type ChargeTokenInput = {
  token: string;
  amountIls: number;
  description: string;
  tenantId: string;
};

export type ChargeTokenResult = {
  success: boolean;
  externalId: string;
  provider: PspProvider;
};

export type VerifiedPspWebhook = {
  eventId: string;
  externalId: string;
  status: "active" | "past_due" | "canceled" | "paid" | "failed";
  invoiceId?: string;
  amountIls?: number;
  kind: "billing" | "payment";
};

/** Shared contract — any Israeli PSP (Tranzila, Grow, PayPlus, Cardcom) implements this. */
export interface PspClient {
  readonly provider: PspProvider;
  createHostedCharge(
    input: CreateHostedChargeInput,
  ): Promise<CreateHostedChargeResult>;
  chargeToken(input: ChargeTokenInput): Promise<ChargeTokenResult>;
  verifyWebhook(
    rawBody: string,
    signatureHeader: string | null,
  ): VerifiedPspWebhook | null;
}

/**
 * SaaS billing mode — intentionally separate from WhatsApp live.
 * `MOKED_PROVIDER_MODE=live` (WhatsApp) must NOT enable live card checkout.
 * Set `MOKED_BILLING_MODE=live` (+ MOKED_BILLING_PROVIDER) for live PSP.
 * Wave D customer payments stay behind MOKED_ENABLE_CUSTOMER_PAYMENTS.
 */
export function billingMode(): "demo" | "live" {
  return process.env.MOKED_BILLING_MODE?.trim() === "live" ? "live" : "demo";
}

/**
 * @deprecated Prefer billingMode() for PSP and providerMode() from readiness
 * for WhatsApp. Kept as an alias of billingMode so existing billing imports
 * do not silently re-couple to MOKED_PROVIDER_MODE.
 */
export function providerMode(): "demo" | "live" {
  return billingMode();
}

/** Shared notify secret for demo + adapters that use HMAC body signing. */
export function pspWebhookSecret(): string | null {
  const generic = process.env.PSP_WEBHOOK_SECRET?.trim();
  if (generic) return generic;
  // Legacy aliases used before PSP-agnostic rename / early billing HMAC.
  const tranzila = process.env.TRANZILA_WEBHOOK_SECRET?.trim();
  if (tranzila) return tranzila;
  const billing = process.env.BILLING_WEBHOOK_SECRET?.trim();
  return billing || null;
}

export function hmacHex(secret: string, rawBody: string): string {
  return createHmac("sha256", secret).update(rawBody).digest("hex");
}

export function safeEqualHex(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right.trim());
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function parseSignedWebhookBody(
  rawBody: string,
): VerifiedPspWebhook | null {
  try {
    const body = JSON.parse(rawBody) as Partial<VerifiedPspWebhook>;
    if (
      !body.eventId ||
      !body.externalId ||
      !body.status ||
      (body.kind !== "billing" && body.kind !== "payment")
    ) {
      return null;
    }
    const allowed = [
      "active",
      "past_due",
      "canceled",
      "paid",
      "failed",
    ] as const;
    if (!allowed.includes(body.status as (typeof allowed)[number])) return null;
    return {
      eventId: body.eventId,
      externalId: body.externalId,
      status: body.status as VerifiedPspWebhook["status"],
      invoiceId: body.invoiceId,
      amountIls: body.amountIls,
      kind: body.kind,
    };
  } catch {
    return null;
  }
}

/** Deterministic PSP for local/demo — no network. */
export class DemoPspClient implements PspClient {
  readonly provider: PspProvider = "demo";

  async createHostedCharge(
    input: CreateHostedChargeInput,
  ): Promise<CreateHostedChargeResult> {
    const scope = input.conversationId ?? input.tenantId;
    const externalId = `demo_${scope}_${Date.now()}`;
    const hostedUrl = `https://moked.local/demo-pay?amount=${input.amountIls}&ref=${externalId}`;
    return { hostedUrl, externalId, provider: "demo" };
  }

  async chargeToken(input: ChargeTokenInput): Promise<ChargeTokenResult> {
    const externalId = `demo_token_${input.tenantId}_${Date.now()}`;
    return {
      success: Boolean(input.token),
      externalId,
      provider: "demo",
    };
  }

  verifyWebhook(
    rawBody: string,
    signatureHeader: string | null,
  ): VerifiedPspWebhook | null {
    const secret = pspWebhookSecret();
    if (!secret || !signatureHeader) return null;
    const expected = hmacHex(secret, rawBody);
    if (!safeEqualHex(expected, signatureHeader)) return null;
    return parseSignedWebhookBody(rawBody);
  }
}

function normalizeProvider(raw: string | undefined | null): PspProvider {
  const value = (raw ?? "demo").trim().toLowerCase();
  if (
    value === "tranzila" ||
    value === "grow" ||
    value === "payplus" ||
    value === "cardcom" ||
    value === "demo"
  ) {
    return value;
  }
  if (value === "none" || value === "") return "demo";
  return "demo";
}

/**
 * Resolve which live adapter to use. Demo mode always returns DemoPspClient.
 * Live mode picks by MOKED_BILLING_PROVIDER (SaaS) or optional override.
 * Grow/PayPlus/Cardcom adapters are not implemented yet — callers get a clear error.
 */
export function resolveBillingProvider(): PspProvider {
  return normalizeProvider(process.env.MOKED_BILLING_PROVIDER);
}

export function normalizePspProvider(
  raw: string | undefined | null,
): PspProvider {
  return normalizeProvider(raw);
}

export function signPspWebhook(rawBody: string): string {
  const secret = pspWebhookSecret();
  if (!secret) throw new Error("psp_webhook_secret_missing");
  return hmacHex(secret, rawBody);
}
