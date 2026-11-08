import { z } from "zod";
import { nanoid } from "nanoid";
import type { BotAnswers, Tenant } from "@/lib/types";
import {
  confidenceClarifyThreshold,
  confidenceReplyThreshold,
  maxAgentTurns,
  maxEscalationsPerConversation,
} from "@/lib/agent/policy";

/** Shared PATCH body for owner + Managed (same endpoints). */
export const OwnerProfilePatchSchema = z.object({
  businessName: z.string().min(2).optional(),
  ownerName: z.string().min(2).optional(),
  phone: z.string().min(9).optional(),
  pricing: z
    .array(
      z.object({
        id: z.string().optional(),
        name: z.string().min(1),
        priceIls: z.number(),
        description: z.string().optional(),
      }),
    )
    .optional(),
  botAnswers: z
    .object({
      what: z.string().optional(),
      hours: z.string().optional(),
      forbidden: z.string().optional(),
      handoff: z.string().optional(),
      pasted: z.string().optional(),
    })
    .optional(),
  availability: z
    .object({
      timezone: z.string().optional(),
      windows: z
        .array(
          z.object({
            day: z.number().int().min(0).max(6),
            startHour: z.number().int().min(0).max(23),
            endHour: z.number().int().min(1).max(24),
          }),
        )
        .optional(),
      dailyCapacity: z.number().int().min(0).optional(),
    })
    .optional(),
  integrations: z
    .object({
      googleCalendar: z.boolean().optional(),
      paymentsProvider: z
        .enum(["none", "demo", "grow", "payplus", "tranzila", "cardcom"])
        .optional(),
      invoicingProvider: z
        .enum(["none", "icount", "morning", "greeninvoice"])
        .optional(),
      googleReviewsUrl: z.string().optional(),
    })
    .optional(),
});

export type OwnerProfilePatch = z.infer<typeof OwnerProfilePatchSchema>;

export function applyOwnerProfilePatch(
  tenant: Tenant,
  patch: OwnerProfilePatch,
): Partial<Tenant> {
  const next: Partial<Tenant> = {};

  if (patch.businessName !== undefined) next.businessName = patch.businessName;
  if (patch.ownerName !== undefined) next.ownerName = patch.ownerName;
  if (patch.phone !== undefined) next.phone = patch.phone;

  if (patch.pricing) {
    next.pricing = patch.pricing.map((p) => ({
      id: p.id?.trim() || nanoid(8),
      name: p.name.trim(),
      priceIls: p.priceIls,
      description: p.description?.trim() || undefined,
    }));
  }

  if (patch.botAnswers) {
    const answers: BotAnswers = { ...tenant.bot.answers };
    for (const [key, value] of Object.entries(patch.botAnswers)) {
      if (typeof value === "string") {
        (answers as Record<string, string>)[key] = value;
      }
    }
    next.bot = {
      ...tenant.bot,
      answers,
    };
  }

  if (patch.availability) {
    next.availability = {
      timezone:
        patch.availability.timezone ??
        tenant.availability?.timezone ??
        "Asia/Jerusalem",
      windows:
        patch.availability.windows ?? tenant.availability?.windows ?? [],
      dailyCapacity:
        patch.availability.dailyCapacity ??
        tenant.availability?.dailyCapacity ??
        0,
    };
  }

  if (patch.integrations) {
    next.integrations = {
      ...tenant.integrations,
      ...patch.integrations,
    };
  }

  return next;
}

/**
 * Escalation ladder shown to owners — values from agent SoT / env.
 * Do not invent alternate thresholds in the UI.
 */
export function escalationPolicySnapshot() {
  return {
    confidenceReply: confidenceReplyThreshold(),
    confidenceClarify: confidenceClarifyThreshold(),
    maxTurns: maxAgentTurns(),
    maxEscalationsPerConversation: maxEscalationsPerConversation(),
    rulesHe: [
      "confidence ≥ סף מענה ומקור קיים → עונים",
      "בין סף הבהרה לסף מענה → שאלה מבהירה אחת; אחרי כישלון שני → הסלמה",
      "מתחת לסף הבהרה / כסף / תלונה / בקשת אדם → הסלמה מיידית",
      "מקסימום שתי התראות לבעלים לשיחה",
    ],
  };
}
