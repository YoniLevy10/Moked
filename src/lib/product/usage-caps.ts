import { Tenant } from "@/lib/types";
import { DEFAULT_OUTBOUND_CAP } from "@/lib/product/model";
import { outboundPeriod } from "@/lib/product/bot";
import { toE164Il } from "@/lib/product/model";
import { sendWhatsAppText } from "@/lib/whatsapp/client";

export const SOFT_CAP_RATIO = 0.8;

export type SoftCapState = {
  count: number;
  cap: number;
  ratio: number;
  softReached: boolean;
  hardReached: boolean;
};

export function outboundUsage(tenant: Tenant): SoftCapState {
  const { count, cap, blocked } = outboundPeriod(tenant);
  const effectiveCap = cap > 0 ? cap : DEFAULT_OUTBOUND_CAP;
  const ratio = effectiveCap > 0 ? count / effectiveCap : 0;
  return {
    count,
    cap: effectiveCap,
    ratio,
    softReached: ratio >= SOFT_CAP_RATIO && !blocked,
    hardReached: blocked,
  };
}

/**
 * True when this increment crosses the soft-cap threshold for the first time
 * in the current period (count-before < 80% ≤ count-after).
 */
export function crossedSoftCap(input: {
  previousCount: number;
  nextCount: number;
  cap: number;
}): boolean {
  const cap = input.cap > 0 ? input.cap : DEFAULT_OUTBOUND_CAP;
  const threshold = Math.ceil(cap * SOFT_CAP_RATIO);
  return input.previousCount < threshold && input.nextCount >= threshold;
}

/** Owner alert when outbound usage hits 80% of monthly cap. */
export async function notifySoftCap(tenant: Tenant, usage: SoftCapState): Promise<boolean> {
  const to = toE164Il(tenant.phone);
  const body = `התראת מכסה · ${tenant.businessName}\nנשלחו ${usage.count} מתוך ${usage.cap} הודעות החודש (80%).\nכשהמכסה תתמלא הסוכן יעצור שליחות עד לחידוש.`;
  if (!to) {
    console.info("[moked:usage:soft_cap:email-stub]", {
      tenantId: tenant.id,
      count: usage.count,
      cap: usage.cap,
    });
    return true;
  }
  await sendWhatsAppText({ tenant, to, body });
  return true;
}
