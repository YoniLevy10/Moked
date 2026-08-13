/** Wave D stub for Israeli invoicing providers. */
export function createInvoiceDraft(input: {
  provider: "icount" | "morning" | "greeninvoice";
  customerName: string;
  amountIls: number;
}): { draftId: string; status: "draft" } {
  return {
    draftId: `${input.provider}_${Date.now()}`,
    status: "draft",
  };
}
