import type { Tenant, TenantAvailability } from "@/lib/types";
import type { TenantKnowledgeRow } from "@/lib/agent/types";

/** Registered vertical packs. Appointments lands in P2 — not registered yet. */
export type VerticalPackId = "trades";

/**
 * Per-tenant apply/seed context. Packs ignore unknown fields.
 * `niche` = trades tradeKind (plumbing, hvac, …).
 */
export type VerticalPackContext = {
  niche?: string | null;
};

/** Optional classifier vocab — knowledge-driven preferred; hooks for later wiring. */
export type VerticalClassifierVocab = {
  /** HE problem-report tokens that tend to mean booking/intake for this vertical. */
  problemReport?: readonly string[];
  /** HE service-info tokens. */
  serviceInfo?: readonly string[];
};

/**
 * Vertical Pack contract — single interface for knowledge templates,
 * classifier vocab hooks, workflow presets, availability defaults, eval fixtures.
 */
export type VerticalPack = {
  id: VerticalPackId;
  /** Tenant.vertical value this pack owns. */
  vertical: Tenant["vertical"];
  labelHe: string;
  /** Apply pack defaults (processes, pricing, bot, availability, …). */
  applyToTenant(tenant: Tenant, ctx?: VerticalPackContext): Tenant;
  /** Extra FAQ / policy knowledge rows beyond pricing mirror. */
  knowledgeSeed(tenantId: string, ctx?: VerticalPackContext): TenantKnowledgeRow[];
  /** Process wave enablement preset (Wave D payment stays off for trades). */
  processPreset(): Tenant["processes"];
  /** Default hours + daily capacity for slot proposals. */
  availabilityDefaults(): TenantAvailability;
  /** Optional classifier vocab hooks (or leave unset when knowledge-driven). */
  classifierVocab?: VerticalClassifierVocab;
  /** Cheap eval fixture hook — tag selecting vertical-flavored goldens. */
  evalFixtureTag?: string;
};
