import {
  billingMode,
  DemoPspClient,
  normalizePspProvider,
  PspClient,
} from "@/lib/integrations/psp";
import { TranzilaClient } from "@/lib/integrations/tranzila";

/**
 * Provider-agnostic factory. Demo billing → DemoPspClient.
 * Live billing requires MOKED_BILLING_MODE=live (independent of WhatsApp
 * MOKED_PROVIDER_MODE) plus MOKED_BILLING_PROVIDER / preferred adapter.
 * Wave D customer payments remain gated by MOKED_ENABLE_CUSTOMER_PAYMENTS.
 */
export function getPsp(preferred?: string | null): PspClient {
  if (billingMode() !== "live") return new DemoPspClient();
  const provider = normalizePspProvider(
    preferred ?? process.env.MOKED_BILLING_PROVIDER,
  );
  if (provider === "demo") return new DemoPspClient();
  if (provider === "tranzila") return new TranzilaClient();
  throw new Error(`psp_adapter_unavailable:${provider}`);
}
