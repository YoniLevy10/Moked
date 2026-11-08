import type { Tenant, TenantAvailability } from "@/lib/types";
import type { TenantKnowledgeRow } from "@/lib/agent/types";

/** Registered vertical packs. */
export type VerticalPackId = "trades" | "appointments";

/**
 * Per-tenant apply/seed context. Packs ignore unknown fields.
 * `niche` = trades tradeKind (plumbing, hvac, …) or appointment kind (beauty, coach).
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
 * Slot / booking policy — trades use site visits; appointments book in-place
 * (no street address step). Google Calendar OAuth stays P2 / out of pack scope.
 */
export type VerticalSlotPolicy = {
  model: "site_visit" | "appointment";
  /** Collect full street address after slot confirm (site visits only). */
  collectAddress: boolean;
};

/** Default site-visit qualification prompts (trades / unknown verticals). */
export const DEFAULT_SITE_VISIT_QUALIFICATION_QUESTIONS = [
  "מתי נוח שנתאם ביקור? (היום / מחר / השבוע / גמיש)",
  "באיזה אזור / עיר?",
  "יש פרט חשוב שכדאי שנדע לפני הביקור?",
] as const;

/**
 * Vertical Pack contract — single interface for knowledge templates,
 * classifier vocab hooks, workflow presets, slot/appointment policy,
 * availability defaults, eval fixtures.
 */
export type VerticalPack = {
  id: VerticalPackId;
  /** Primary Tenant.vertical value this pack owns (may also resolve aliases). */
  vertical: Tenant["vertical"];
  labelHe: string;
  /** Apply pack defaults (processes, pricing, bot, availability, …). */
  applyToTenant(tenant: Tenant, ctx?: VerticalPackContext): Tenant;
  /** Extra FAQ / policy knowledge rows beyond pricing mirror. */
  knowledgeSeed(tenantId: string, ctx?: VerticalPackContext): TenantKnowledgeRow[];
  /** Process wave enablement preset (Wave D payment stays off for beachhead). */
  processPreset(): Tenant["processes"];
  /** Default hours + daily capacity for slot proposals. */
  availabilityDefaults(): TenantAvailability;
  /** Appointment vs site-visit booking behavior for Wave A. */
  slotPolicy: VerticalSlotPolicy;
  /** Wave A qualification prompts (HE). Falls back to site-visit defaults. */
  qualificationQuestions?: readonly string[];
  /** Optional classifier vocab hooks (or leave unset when knowledge-driven). */
  classifierVocab?: VerticalClassifierVocab;
  /** Cheap eval fixture hook — tag selecting vertical-flavored goldens. */
  evalFixtureTag?: string;
};
