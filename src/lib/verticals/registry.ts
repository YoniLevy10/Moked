import type { Tenant } from "@/lib/types";
import type {
  VerticalPack,
  VerticalPackContext,
  VerticalPackId,
} from "@/lib/verticals/types";
import { tradesVerticalPack } from "@/lib/verticals/trades";

const PACKS: Record<VerticalPackId, VerticalPack> = {
  trades: tradesVerticalPack,
};

/** Lookup by pack id (`trades`). */
export function getVerticalPack(id: VerticalPackId): VerticalPack {
  return PACKS[id];
}

/** All registered packs (today: trades only). */
export function listVerticalPacks(): VerticalPack[] {
  return Object.values(PACKS);
}

/**
 * Resolve pack for a tenant vertical.
 * `trades` → trades pack; anything else (`other`, clinic, …) → null (safe no-op).
 */
export function resolveVerticalPack(
  vertical: Tenant["vertical"] | string | null | undefined,
): VerticalPack | null {
  if (vertical === "trades") return PACKS.trades;
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
  return pack.applyToTenant(tenant, ctx);
}

/** Knowledge seed rows for a vertical, or [] when no pack (e.g. `other`). */
export function knowledgeSeedForVertical(
  vertical: Tenant["vertical"],
  tenantId: string,
  ctx?: VerticalPackContext,
) {
  const pack = resolveVerticalPack(vertical);
  if (!pack) return [];
  return pack.knowledgeSeed(tenantId, ctx);
}
