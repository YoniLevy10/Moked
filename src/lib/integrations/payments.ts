export type PaymentProvider = "grow" | "payplus" | "tranzila" | "cardcom";

/** Wave D stub — real provider SDKs plug in here later. */
export function createPaymentLink(input: {
  provider: PaymentProvider;
  amountIls: number;
  description: string;
  tenantId: string;
  conversationId: string;
}): { url: string; externalId: string } {
  const externalId = `${input.provider}_${input.conversationId}_${Date.now()}`;
  const url = `https://pay.moked.local/${input.provider}/checkout?amount=${input.amountIls}&ref=${externalId}`;
  return { url, externalId };
}
