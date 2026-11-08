import type { VerticalPack } from "@/lib/verticals/types";
import {
  applyTradesPackToTenant,
  tradesKnowledgeRows,
  tradesProcessPreset,
} from "@/lib/verticals/trades/pack";
import { defaultTradesAvailability } from "@/lib/trades/slots";

/** First vertical pack — beachhead trades (plumbing / HVAC / …). */
export const tradesVerticalPack: VerticalPack = {
  id: "trades",
  vertical: "trades",
  labelHe: "בעלי מקצוע",
  applyToTenant(tenant, ctx) {
    return applyTradesPackToTenant(tenant, ctx?.niche);
  },
  knowledgeSeed(tenantId, ctx) {
    return tradesKnowledgeRows(tenantId, ctx?.niche);
  },
  processPreset: tradesProcessPreset,
  availabilityDefaults: defaultTradesAvailability,
  slotPolicy: {
    model: "site_visit",
    collectAddress: true,
  },
  classifierVocab: {
    problemReport: [
      "נזילה",
      "סתימה",
      "תקלה",
      "שבור",
      "לא עובד",
      "תיקון",
      "מזגן",
      "חשמל",
      "ברז",
      "שיפוץ",
      "דליפה",
      "קצר",
      "להגיע",
    ],
    serviceInfo: ["מה כולל", "שירות", "מה אתם עושים"],
  },
  /** Goldens in agent/eval/cases.ts are trades-flavored beachhead cases. */
  evalFixtureTag: "trades",
};

export {
  TRADE_PACKS,
  applyTradesPackToTenant,
  resolveTradeKind,
  tradesKnowledgeRows,
  tradesLandingCopy,
  tradesProcessPreset,
  type TradeKind,
  type TradePack,
} from "@/lib/verticals/trades/pack";
