import { Conversation, Tenant } from "@/lib/types";
import { toE164Il } from "@/lib/product/model";
import { sendWhatsAppText } from "@/lib/whatsapp/client";

/** Templated owner notify for agent escalations (max 2 enforced by runAgentTurn). */
export async function notifyOwnerFromAgent(input: {
  tenant: Tenant;
  conversation: Conversation;
  reason: string;
  inboundText: string;
}): Promise<boolean> {
  const to = toE164Il(input.tenant.phone);
  const who =
    input.conversation.customerName || input.conversation.customerWaId;
  const body = `ממתין לאדם · ${input.tenant.businessName}\nסיבה: ${input.reason}\nלקוח: ${who}\n${input.inboundText.slice(0, 120)}`;
  if (!to) {
    console.info("[moked:agent:escalation:email-stub]", body);
    return true;
  }
  await sendWhatsAppText({
    tenant: input.tenant,
    to,
    body,
  });
  return true;
}
