import { z } from "zod";

/** Meta Cloud API webhook payload (messages + statuses). */
export const MetaWebhookSchema = z.object({
  object: z.string().optional(),
  entry: z
    .array(
      z.object({
        id: z.string().optional(),
        changes: z
          .array(
            z.object({
              value: z
                .object({
                  metadata: z
                    .object({
                      phone_number_id: z.string().optional(),
                      display_phone_number: z.string().optional(),
                    })
                    .optional(),
                  contacts: z
                    .array(
                      z.object({
                        wa_id: z.string(),
                        profile: z
                          .object({ name: z.string().optional() })
                          .optional(),
                      }),
                    )
                    .optional(),
                  messages: z
                    .array(
                      z.object({
                        from: z.string(),
                        id: z.string(),
                        timestamp: z.string().optional(),
                        type: z.string().optional(),
                        text: z.object({ body: z.string() }).optional(),
                        button: z
                          .object({
                            text: z.string().optional(),
                            payload: z.string().optional(),
                          })
                          .optional(),
                        interactive: z
                          .object({
                            type: z.string().optional(),
                            button_reply: z
                              .object({
                                id: z.string().optional(),
                                title: z.string(),
                              })
                              .optional(),
                            list_reply: z
                              .object({
                                id: z.string().optional(),
                                title: z.string(),
                              })
                              .optional(),
                            nfm_reply: z
                              .object({
                                response_json: z.string().optional(),
                                body: z.string().optional(),
                                name: z.string().optional(),
                              })
                              .optional(),
                          })
                          .optional(),
                        location: z
                          .object({
                            latitude: z.number().optional(),
                            longitude: z.number().optional(),
                            name: z.string().optional(),
                            address: z.string().optional(),
                          })
                          .optional(),
                        image: z
                          .object({
                            id: z.string().optional(),
                            mime_type: z.string().optional(),
                            caption: z.string().optional(),
                          })
                          .optional(),
                        audio: z
                          .object({
                            id: z.string().optional(),
                            mime_type: z.string().optional(),
                          })
                          .optional(),
                        video: z
                          .object({
                            id: z.string().optional(),
                            mime_type: z.string().optional(),
                            caption: z.string().optional(),
                          })
                          .optional(),
                        document: z
                          .object({
                            id: z.string().optional(),
                            mime_type: z.string().optional(),
                            filename: z.string().optional(),
                            caption: z.string().optional(),
                          })
                          .optional(),
                        referral: z
                          .object({
                            source_url: z.string().optional(),
                            source_type: z.string().optional(),
                            source_id: z.string().optional(),
                            body: z.string().optional(),
                            headline: z.string().optional(),
                          })
                          .optional(),
                      }),
                    )
                    .optional(),
                  statuses: z
                    .array(
                      z.object({
                        id: z.string(),
                        status: z.string(),
                        timestamp: z.string().optional(),
                        recipient_id: z.string().optional(),
                        errors: z
                          .array(
                            z.object({
                              code: z.number().optional(),
                              title: z.string().optional(),
                              message: z.string().optional(),
                            }),
                          )
                          .optional(),
                      }),
                    )
                    .optional(),
                  errors: z.array(z.unknown()).optional(),
                })
                .passthrough(),
              field: z.string().optional(),
            }),
          )
          .optional(),
      }),
    )
    .optional(),
});

export type ParsedInbound = {
  phoneNumberId: string;
  from: string;
  name?: string;
  text: string;
  messageId: string;
  type: string;
  interactiveId?: string;
  mediaId?: string;
  mediaMime?: string;
  location?: {
    latitude?: number;
    longitude?: number;
    name?: string;
    address?: string;
  };
  referral?: {
    sourceUrl?: string;
    sourceType?: string;
    sourceId?: string;
    body?: string;
    headline?: string;
  };
  flowResponseJson?: string;
};

export type ParsedStatus = {
  phoneNumberId: string;
  metaMessageId: string;
  status: "sent" | "delivered" | "read" | "failed" | string;
  timestamp?: string;
  recipientId?: string;
  errorMessage?: string;
};

export function parseInboundMessages(payload: unknown): ParsedInbound[] {
  const parsed = MetaWebhookSchema.safeParse(payload);
  if (!parsed.success) return [];

  const out: ParsedInbound[] = [];
  for (const entry of parsed.data.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      const phoneNumberId = value.metadata?.phone_number_id ?? "";
      const nameByWa = new Map(
        (value.contacts ?? []).map((c) => [c.wa_id, c.profile?.name]),
      );
      for (const msg of value.messages ?? []) {
        const interactiveId =
          msg.interactive?.button_reply?.id ??
          msg.interactive?.list_reply?.id;
        const text =
          msg.text?.body ??
          msg.button?.text ??
          msg.button?.payload ??
          msg.interactive?.button_reply?.title ??
          msg.interactive?.list_reply?.title ??
          msg.interactive?.nfm_reply?.body ??
          msg.location?.address ??
          msg.location?.name ??
          msg.image?.caption ??
          msg.document?.caption ??
          (msg.image?.id ? "[תמונה]" : undefined) ??
          (msg.audio?.id ? "[אודיו]" : undefined) ??
          (msg.video?.id ? "[וידאו]" : undefined) ??
          (msg.document?.id ? "[מסמך]" : undefined) ??
          (msg.location ? "[מיקום]" : undefined);

        if (!text && !msg.interactive?.nfm_reply?.response_json) continue;

        const media =
          msg.image ?? msg.audio ?? msg.video ?? msg.document ?? undefined;

        out.push({
          phoneNumberId,
          from: msg.from,
          name: nameByWa.get(msg.from),
          text: text ?? msg.interactive?.nfm_reply?.response_json ?? "",
          messageId: msg.id,
          type: msg.type ?? "text",
          interactiveId,
          mediaId: media?.id,
          mediaMime: media && "mime_type" in media ? media.mime_type : undefined,
          location: msg.location,
          referral: msg.referral
            ? {
                sourceUrl: msg.referral.source_url,
                sourceType: msg.referral.source_type,
                sourceId: msg.referral.source_id,
                body: msg.referral.body,
                headline: msg.referral.headline,
              }
            : undefined,
          flowResponseJson: msg.interactive?.nfm_reply?.response_json,
        });
      }
    }
  }
  return out;
}

export function parseStatusUpdates(payload: unknown): ParsedStatus[] {
  const parsed = MetaWebhookSchema.safeParse(payload);
  if (!parsed.success) return [];

  const out: ParsedStatus[] = [];
  for (const entry of parsed.data.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      const phoneNumberId = value.metadata?.phone_number_id ?? "";
      for (const st of value.statuses ?? []) {
        out.push({
          phoneNumberId,
          metaMessageId: st.id,
          status: st.status,
          timestamp: st.timestamp,
          recipientId: st.recipient_id,
          errorMessage: st.errors?.[0]?.message ?? st.errors?.[0]?.title,
        });
      }
    }
  }
  return out;
}
