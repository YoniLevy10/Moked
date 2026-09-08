import { GRAPH, getWhatsAppToken } from "@/lib/whatsapp/client";
import { Tenant } from "@/lib/types";

const USD_ILS = Number(process.env.USD_ILS_RATE ?? "3.3");

export type PricingAnalyticsSummary = {
  currency: "ILS";
  usdIlsRate: number;
  delivered?: number;
  costUsd?: number;
  costIls?: number;
  raw?: unknown;
  error?: string;
};

/** Best-effort pricing analytics from WhatsApp Business Management API. */
export async function fetchPricingAnalytics(
  tenant: Tenant,
  days = 7,
): Promise<PricingAnalyticsSummary> {
  const token = getWhatsAppToken(tenant);
  const wabaId = tenant.whatsapp.wabaId;
  if (!token || !wabaId) {
    return { currency: "ILS", usdIlsRate: USD_ILS, error: "not_connected" };
  }

  const end = Math.floor(Date.now() / 1000);
  const start = end - days * 24 * 60 * 60;
  const url = new URL(`${GRAPH}/${wabaId}`);
  url.searchParams.set(
    "fields",
    `analytics.start(${start}).end(${end}).granularity(DAY)`,
  );

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    return {
      currency: "ILS",
      usdIlsRate: USD_ILS,
      error: await res.text(),
    };
  }
  const raw = await res.json();
  // Shape varies; expose raw + coarse estimate when possible.
  let delivered = 0;
  try {
    const points =
      (raw as { analytics?: { data_points?: Array<{ delivered?: number }> } })
        .analytics?.data_points ?? [];
    delivered = points.reduce((sum, p) => sum + (p.delivered ?? 0), 0);
  } catch {
    /* ignore */
  }

  // Rough utility-rate estimate for Israel (~$0.0053) when Meta cost fields absent.
  const costUsd = delivered * 0.0053;
  return {
    currency: "ILS",
    usdIlsRate: USD_ILS,
    delivered,
    costUsd,
    costIls: Number((costUsd * USD_ILS).toFixed(2)),
    raw,
  };
}
