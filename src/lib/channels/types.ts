import { Tenant } from "@/lib/types";

/** Replaceable delivery channel — business logic must not depend on Meta/WhatsApp. */
export type ChannelKind = "whatsapp" | "demo" | "sms" | "web";

export type ChannelSendInput = {
  tenant: Tenant;
  /** External identity on this channel (phone, session id, etc.) */
  to: string;
  body: string;
  type?: "text" | "template" | "interactive";
};

export type ChannelSendResult = {
  ok: boolean;
  id?: string;
  demo?: boolean;
  channel: ChannelKind;
};

export type MessagingChannel = {
  kind: ChannelKind;
  sendText: (input: ChannelSendInput) => Promise<ChannelSendResult>;
};
