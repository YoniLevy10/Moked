import { sendWhatsAppText, sendWhatsAppTemplate } from "@/lib/whatsapp/client";
import {
  ChannelSendInput,
  ChannelSendResult,
  MessagingChannel,
} from "@/lib/channels/types";
import { findApprovedTemplate } from "@/lib/templates/service";

/** WhatsApp Cloud API adapter — one of possibly many channels. */
export const whatsappChannel: MessagingChannel = {
  kind: "whatsapp",
  async sendText(input: ChannelSendInput): Promise<ChannelSendResult> {
    if (input.type === "template" && input.templateName) {
      const approved = await findApprovedTemplate(
        input.tenant.id,
        input.templateName,
      );
      if (approved) {
        const result = await sendWhatsAppTemplate({
          tenant: input.tenant,
          to: input.to,
          templateName: approved.name,
          language: approved.language,
          bodyParameters: input.templateParams,
          fallbackBody: input.body,
        });
        return {
          ok: result.ok,
          id: result.id,
          demo: result.demo,
          channel: result.demo ? "demo" : "whatsapp",
        };
      }
      // Demo / unapproved: keep text fallback labelled demo in body path.
    }
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
