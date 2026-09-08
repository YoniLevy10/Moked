/**
 * Meta Business Agent connector (feature-flagged).
 * MOKED Process Engine remains the default; this is an optional addon.
 */
import { Tenant } from "@/lib/types";

export function isMetaBusinessAgentEnabled(tenant: Tenant): boolean {
  return Boolean(tenant.metaFeatures?.metaBusinessAgentEnabled);
}

export type MetaAgentConfig = {
  enabled: boolean;
  note: string;
};

export function getMetaBusinessAgentStatus(tenant: Tenant): MetaAgentConfig {
  return {
    enabled: isMetaBusinessAgentEnabled(tenant),
    note: isMetaBusinessAgentEnabled(tenant)
      ? "Meta Business Agent מסומן כפעיל — Process Engine של MOKED נשאר ברירת המחדל עד חיבור connector מלא."
      : "כבוי. הליבה היא Process Engine של MOKED (לא Meta Business Agent).",
  };
}
