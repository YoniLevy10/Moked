import type { Tenant } from "@/lib/types";
import type {
  VerticalPack,
  VerticalPackContext,
  VerticalPackId,
  VerticalSlotPolicy,
} from "@/lib/verticals/types";
import {
  DEFAULT_SITE_VISIT_QUALIFICATION_QUESTIONS,
} from "@/lib/verticals/types";
import { appointmentsVerticalPack } from "@/lib/verticals/appointments";
import { tradesVerticalPack } from "@/lib/verticals/trades";

const PACKS: Record<VerticalPackId, VerticalPack> = {
  trades: tradesVerticalPack,
  appointments: appointmentsVerticalPack,
};

const DEFAULT_SLOT_POLICY: VerticalSlotPolicy = {
  model: "site_visit",
  collectAddress: true,
};

/** Lookup by pack id (`trades` | `appointments`). */
export function getVerticalPack(id: VerticalPackId): VerticalPack {
  return PACKS[id];
}

/** All registered packs. */
export function listVerticalPacks(): VerticalPack[] {
  return Object.values(PACKS);
}

/**
 * Resolve pack for a tenant vertical.
 * - `trades` → trades pack
 * - `beauty` | `coach` → appointments pack (P2; not medical clinics)
 * - anything else (`other`, `clinic`, `realty`, …) → null (safe no-op)
 */
export function resolveVerticalPack(
  vertical: Tenant["vertical"] | string | null | undefined,
): VerticalPack | null {
  if (vertical === "trades") return PACKS.trades;
  if (vertical === "beauty" || vertical === "coach") return PACKS.appointments;
  return null;
}

/** Apply pack defaults when a pack exists; otherwise return tenant unchanged. */
export function applyPackToTenant(
  tenant: Tenant,
  vertical: Tenant["vertical"],
  ctx?: VerticalPackContext,
): Tenant {
  const pack = resolveVerticalPack(vertical);
  if (!pack) return tenant;
  const niche =
    ctx?.niche ??
    (vertical === "beauty" || vertical === "coach" ? vertical : undefined);
  return pack.applyToTenant(tenant, { ...ctx, niche });
}

/** Knowledge seed rows for a vertical, or [] when no pack (e.g. `other`). */
export function knowledgeSeedForVertical(
  vertical: Tenant["vertical"],
  tenantId: string,
  ctx?: VerticalPackContext,
) {
  const pack = resolveVerticalPack(vertical);
  if (!pack) return [];
  const niche =
    ctx?.niche ??
    (vertical === "beauty" || vertical === "coach" ? vertical : undefined);
  return pack.knowledgeSeed(tenantId, { ...ctx, niche });
}

/** Slot / booking policy for Wave A — defaults to site visit when no pack. */
export function slotPolicyForVertical(
  vertical: Tenant["vertical"] | string | null | undefined,
): VerticalSlotPolicy {
  return resolveVerticalPack(vertical)?.slotPolicy ?? DEFAULT_SLOT_POLICY;
}

/** Qualification prompts for Wave A intake/qualification. */
export function qualificationQuestionsForVertical(
  vertical: Tenant["vertical"] | string | null | undefined,
): readonly string[] {
  const pack = resolveVerticalPack(vertical);
  if (pack?.qualificationQuestions?.length) {
    return pack.qualificationQuestions;
  }
  return DEFAULT_SITE_VISIT_QUALIFICATION_QUESTIONS;
}
