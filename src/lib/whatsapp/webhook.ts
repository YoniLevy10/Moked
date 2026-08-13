import { z } from "zod";

/** Minimal Meta Cloud API webhook payload (messages). */
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
                        button: z.object({ text: z.string() }).optional(),
                        interactive: z
                          .object({
                            button_reply: z
                              .object({ title: z.string() })
                              .optional(),
                            list_reply: z
                              .object({ title: z.string() })
                              .optional(),
                          })
                          .optional(),
                      }),
                    )
                    .optional(),
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
        const text =
          msg.text?.body ??
          msg.button?.text ??
          msg.interactive?.button_reply?.title ??
          msg.interactive?.list_reply?.title;
        if (!text) continue;
        out.push({
          phoneNumberId,
          from: msg.from,
          name: nameByWa.get(msg.from),
          text,
          messageId: msg.id,
        });
      }
    }
  }
  return out;
}
