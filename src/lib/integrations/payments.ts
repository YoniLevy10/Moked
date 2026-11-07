import { providerMode, PspProvider } from "@/lib/integrations/psp";
import { getPsp } from "@/lib/integrations/get-psp";

export type PaymentProvider = PspProvider | "none";

/**
 * Wave D — conversation payment link.
 * Demo keeps moked.local URLs; live uses the configured PspClient adapter.
 */
export async function createPaymentLink(input: {
  provider: PaymentProvider;
  amountIls: number;
  description: string;
  tenantId: string;
  conversationId: string;
}): Promise<{ url: string; externalId: string; provider: PspProvider }> {
  const requested: PspProvider =
    input.provider === "none" ? "demo" : input.provider;

  if (providerMode() !== "live" || requested === "demo") {
    const externalId = `demo_${input.conversationId}_${Date.now()}`;
    return {
      url: `https://moked.local/demo-pay?amount=${input.amountIls}&ref=${externalId}`,
      externalId,
      provider: "demo",
    };
  }

  const psp = getPsp(requested);
  const charge = await psp.createHostedCharge({
    amountIls: input.amountIls,
    description: input.description,
    tenantId: input.tenantId,
    conversationId: input.conversationId,
  });
  return {
    url: charge.hostedUrl,
    externalId: charge.externalId,
    provider: charge.provider,
  };
}
