import { sendWhatsAppText } from "@/lib/whatsapp/client";
import {
  ChannelSendInput,
  ChannelSendResult,
  MessagingChannel,
} from "@/lib/channels/types";

/** WhatsApp Cloud API adapter — one of possibly many channels. */
export const whatsappChannel: MessagingChannel = {
  kind: "whatsapp",
  async sendText(input: ChannelSendInput): Promise<ChannelSendResult> {
    const result = await sendWhatsAppText({
      tenant: input.tenant,
      to: input.to,
      body: input.body,
    });
    return {
      ok: result.ok,
      id: result.id,
      demo: result.demo,
      channel: result.demo ? "demo" : "whatsapp",
    };
  },
};
