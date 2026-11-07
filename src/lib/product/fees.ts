function feeFromEnv(name: string, fallback: number): number {
  const parsed = Number(process.env[name] ?? fallback);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** Locked beachhead SaaS monthly fee (env overrides Part A ₪249 in the agent spec). */
export function subscriptionPriceIls(): number {
  return feeFromEnv("MOKED_SUBSCRIPTION_ILS", 299);
}

export function setupFeeIls(): number {
  return feeFromEnv("MOKED_SETUP_FEE_ILS", 690);
}

export function annualSubscriptionIls(): number {
  return feeFromEnv("MOKED_ANNUAL_ILS", 2990);
}
