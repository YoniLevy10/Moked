/**
 * Compatibility re-exports — trades niche content lives under
 * `@/lib/verticals/trades`. Prefer importing from the verticals registry
 * for new call sites.
 */
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
