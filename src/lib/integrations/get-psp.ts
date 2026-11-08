import {
  DemoPspClient,
  normalizePspProvider,
  providerMode,
  PspClient,
} from "@/lib/integrations/psp";
import { TranzilaClient } from "@/lib/integrations/tranzila";

/**
 * Provider-agnostic factory. Demo mode → DemoPspClient.
 * Live mode → adapter for MOKED_BILLING_PROVIDER / preferred payments provider.
 * Adding Grow/PayPlus/Cardcom = new adapter file + one branch here.
 */
export function getPsp(preferred?: string | null): PspClient {
  if (providerMode() !== "live") return new DemoPspClient();
  const provider = normalizePspProvider(
    preferred ?? process.env.MOKED_BILLING_PROVIDER,
  );
  if (provider === "demo") return new DemoPspClient();
  if (provider === "tranzila") return new TranzilaClient();
  throw new Error(`psp_adapter_unavailable:${provider}`);
}
