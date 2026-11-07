/** Beachhead feature flags (env-only). */

/** Wave D end-customer payment links — parked for v1. */
export function customerPaymentsEnabled(): boolean {
  return process.env.MOKED_ENABLE_CUSTOMER_PAYMENTS === "true";
}
