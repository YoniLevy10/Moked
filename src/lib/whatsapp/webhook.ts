import { z } from "zod";

const StatusSchema = z.object({
  id: z.string(),
  status: z.string(),
  timestamp: z.string().optional(),
  recipient_id: z.string().optional(),
  errors: z
    .array(
      z.object({
        code: z.union([z.number(), z.string()]).optional(),
        title: z.string().optional(),
        message: z.string().optional(),
      }),
    )
    .optional(),
});

const TemplateStatusUpdateSchema = z.object({
  event: z.string().optional(),
  message_template_id: z.union([z.string(), z.number()]).optional(),
  message_template_name: z.string().optional(),
  message_template_language: z.string().optional(),
  reason: z.string().optional(),
});

/** Meta Cloud API webhook — messages, statuses, template status updates. */
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
                  statuses: z.array(StatusSchema).optional(),
                  message_template_status_update:
                    TemplateStatusUpdateSchema.optional(),
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
  entryId?: string;
};

export type ParsedStatus = {
  phoneNumberId: string;
  metaMessageId: string;
  status: string;
  timestamp?: string;
  errorCode?: string;
  entryId?: string;
};

export type ParsedTemplateStatus = {
  phoneNumberId: string;
  metaId?: string;
  name?: string;
  language?: string;
  event?: string;
  reason?: string;
  entryId?: string;
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
          entryId: entry.id,
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
      for (const status of value.statuses ?? []) {
        const err = status.errors?.[0];
        out.push({
          phoneNumberId,
          metaMessageId: status.id,
          status: status.status,
          timestamp: status.timestamp,
          errorCode:
            err?.code != null
              ? String(err.code)
              : err?.title || err?.message || undefined,
          entryId: entry.id,
        });
      }
    }
  }
  return out;
}

export function parseTemplateStatusUpdates(
  payload: unknown,
): ParsedTemplateStatus[] {
  const parsed = MetaWebhookSchema.safeParse(payload);
  if (!parsed.success) return [];
  const out: ParsedTemplateStatus[] = [];
  for (const entry of parsed.data.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      const update = value.message_template_status_update;
      if (!update) continue;
      out.push({
        phoneNumberId: value.metadata?.phone_number_id ?? "",
        metaId:
          update.message_template_id != null
            ? String(update.message_template_id)
            : undefined,
        name: update.message_template_name,
        language: update.message_template_language,
        event: update.event,
        reason: update.reason,
        entryId: entry.id,
      });
    }
  }
  return out;
}

export function webhookIdempotencyKey(
  entryId: string | undefined,
  itemId: string,
): string {
  return `${entryId ?? "entry"}:${itemId}`;
}
