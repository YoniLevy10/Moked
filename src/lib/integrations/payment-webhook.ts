import { createHmac, timingSafeEqual } from "crypto";

/** Shared secret for Wave D conversation payment provider callbacks. */
export function paymentsWebhookSecret(): string | null {
  const secret = process.env.PAYMENTS_WEBHOOK_SECRET?.trim();
  return secret || null;
}

/**
 * Verify HMAC-SHA256 hex of the raw body (header `x-moked-signature`).
 * Fail-closed when secret or header is missing.
 */
export function verifyPaymentsSignature(
  rawBody: string,
  header: string | null,
): boolean {
  const secret = paymentsWebhookSecret();
  if (!secret || !header) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const left = Buffer.from(expected);
  const right = Buffer.from(header.trim());
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
