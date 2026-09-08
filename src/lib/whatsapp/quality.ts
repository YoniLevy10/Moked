import { GRAPH, getWhatsAppToken } from "@/lib/whatsapp/client";
import { updateTenantQuality } from "@/lib/store/db";
import { Tenant } from "@/lib/types";

export function isOutboundBlockedByQuality(tenant: Tenant): boolean {
  return tenant.whatsapp.qualityRating === "RED";
}

export async function refreshPhoneQuality(
  tenant: Tenant,
): Promise<Tenant | null> {
  const token = getWhatsAppToken(tenant);
  const phoneNumberId = tenant.whatsapp.phoneNumberId;
  if (!token || !phoneNumberId || tenant.whatsapp.mode !== "live") {
    return null;
  }

  const res = await fetch(
    `${GRAPH}/${phoneNumberId}?fields=quality_rating,messaging_limit_tier,display_phone_number`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) return null;
  const data = (await res.json()) as {
    quality_rating?: string;
    messaging_limit_tier?: string;
  };
  const rating = (data.quality_rating ?? "UNKNOWN").toUpperCase();
  const normalized =
    rating === "GREEN" || rating === "YELLOW" || rating === "RED"
      ? rating
      : "UNKNOWN";

  return updateTenantQuality(tenant.id, {
    qualityRating: normalized,
    messagingLimitTier: data.messaging_limit_tier,
  });
}
