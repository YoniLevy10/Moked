import { BotAnswers, BotInstructions, PhoneNumber, Subscription, Tenant } from "@/lib/types";

export const DEFAULT_OUTBOUND_CAP = 1000;

export function subscriptionPriceIls(): number {
  const parsed = Number(process.env.MOKED_SUBSCRIPTION_ILS ?? 249);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 249;
}

export function defaultSubscription(): Subscription {
  return {
    status: "inactive",
    monthlyOutboundCap: DEFAULT_OUTBOUND_CAP,
    outboundCount: 0,
  };
}

export function defaultBot(): BotInstructions {
  return {
    draft: "",
    answers: {
      what: "",
      hours: "",
      forbidden: "",
      handoff: "",
      pasted: "",
    },
  };
}

export function normalizeTenant(tenant: Tenant): Tenant {
  const subscription = {
    ...defaultSubscription(),
    ...(tenant.subscription ?? {}),
  };
  const answers = {
    ...defaultBot().answers,
    ...(tenant.bot?.answers ?? {}),
  };
  return {
    ...tenant,
    subscription,
    bot: {
      ...defaultBot(),
      ...(tenant.bot ?? {}),
      answers,
    },
  };
}

export function toE164Il(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.startsWith("972") && digits.length === 12) return digits;
  if (digits.startsWith("0") && digits.length === 10) return `972${digits.slice(1)}`;
  return null;
}

export function nationalFromE164(e164: string): string {
  if (e164.startsWith("972")) return `0${e164.slice(3)}`;
  return e164;
}

export function currentPeriod(date = new Date()): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function emptyAnswers(): BotAnswers {
  return defaultBot().answers;
}

export function publicNumber(phone: PhoneNumber, reveal: boolean) {
  return {
    id: phone.id,
    status: phone.status,
    kind: phone.kind,
    national: reveal && phone.status === "live" ? phone.national : "",
    e164: reveal && phone.status === "live" ? phone.e164 : "",
    lastError: phone.lastError,
    displayName: phone.displayName,
  };
}
