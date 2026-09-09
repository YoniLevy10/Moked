import { Tenant } from "@/lib/types";
import { MessagingChannel } from "@/lib/channels/types";
import { whatsappChannel } from "@/lib/channels/whatsapp";

/**
 * Resolve the outbound channel for a tenant.
 * Today WhatsApp (live or demo) is the only adapter; the process engine
 * depends on MessagingChannel, not Meta APIs.
 */
export function resolveChannel(_tenant: Tenant): MessagingChannel {
  return whatsappChannel;
}
