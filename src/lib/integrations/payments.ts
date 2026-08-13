export type PaymentProvider =
  | "demo"
  | "grow"
  | "payplus"
  | "tranzila"
  | "cardcom";

/** Wave D — demo provider works without Israeli PSP keys. */
export function createPaymentLink(input: {
  provider: PaymentProvider | "none";
  amountIls: number;
  description: string;
  tenantId: string;
  conversationId: string;
}): { url: string; externalId: string } {
  const provider = input.provider === "none" ? "demo" : input.provider;
  const externalId = `${provider}_${input.conversationId}_${Date.now()}`;
  if (provider === "demo") {
    return {
      url: `https://moked.local/demo-pay?amount=${input.amountIls}&ref=${externalId}`,
      externalId,
    };
  }
  const url = `https://pay.moked.local/${provider}/checkout?amount=${input.amountIls}&ref=${externalId}`;
  return { url, externalId };
}
