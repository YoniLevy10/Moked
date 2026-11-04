import { PhoneNumber } from "@/lib/types";
import {
  createPhoneNumber,
  listPhoneNumbers,
  updatePhoneNumber,
  updateTenant,
} from "@/lib/store/db";
import { nationalFromE164, toE164Il } from "@/lib/product/model";
import { encryptPin, decryptPin, randomPin } from "@/lib/product/pin";
import {
  createBusinessPhone,
  registerPoolPhone,
  requestVerificationCode,
  verifyPhoneCode,
} from "@/lib/product/meta";

const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

export async function addPoolNumber(raw: string): Promise<PhoneNumber> {
  const e164 = toE164Il(raw);
  if (!e164) throw new Error("invalid_il_phone");
  return createPhoneNumber({
    e164,
    national: nationalFromE164(e164),
    kind: "live",
    status: "available",
  });
}

export async function lockAvailableNumber(tenantId: string): Promise<PhoneNumber | null> {
  const numbers = await listPhoneNumbers();
  const held = numbers.find(
    (phone) => phone.tenantId === tenantId && phone.status !== "available" && phone.status !== "banned",
  );
  if (held && held.status !== "cooldown") return held;
  const free = numbers.find((phone) => phone.status === "available");
  if (!free) return null;
  return updatePhoneNumber(free.id, {
    status: "reserved",
    tenantId,
    lastError: undefined,
  });
}

export async function parkTenantNumber(tenantId: string): Promise<void> {
  const numbers = await listPhoneNumbers();
  const held = numbers.find(
    (phone) =>
      phone.tenantId === tenantId &&
      phone.status !== "available" &&
      phone.status !== "banned" &&
      phone.status !== "cooldown",
  );
  if (!held) return;
  await updatePhoneNumber(held.id, {
    status: "cooldown",
    cooldownUntil: new Date(Date.now() + COOLDOWN_MS).toISOString(),
  });
  await updateTenant(tenantId, {
    whatsapp: {
      connected: false,
      mode: "demo",
    },
  });
}

export async function beginRegistration(phoneId: string, displayName: string) {
  const phone = (await listPhoneNumbers()).find((item) => item.id === phoneId);
  if (!phone) throw new Error("number_not_found");
  if (!phone.tenantId) throw new Error("number_not_assigned");
  const created = await createBusinessPhone({
    e164: phone.e164,
    displayName,
  });
  if ("error" in created) {
    return updatePhoneNumber(phone.id, {
      status: "reserved",
      displayName,
      lastError: created.error,
    });
  }
  const pin = randomPin();
  const requested = await requestVerificationCode(created.phoneNumberId);
  return updatePhoneNumber(phone.id, {
    status: "error" in requested ? "reserved" : "awaiting_code",
    phoneNumberId: created.phoneNumberId,
    displayName,
    pinCipher: encryptPin(pin),
    lastError: "error" in requested ? requested.error : undefined,
  });
}

export async function submitVerificationCode(phoneId: string, code: string) {
  const phone = (await listPhoneNumbers()).find((item) => item.id === phoneId);
  if (!phone?.phoneNumberId || !phone.pinCipher) throw new Error("number_not_ready");
  const verified = await verifyPhoneCode(phone.phoneNumberId, code);
  if ("error" in verified) {
    return updatePhoneNumber(phone.id, { lastError: verified.error, lastCode: code });
  }
  const registered = await registerPoolPhone(phone.phoneNumberId, decryptPin(phone.pinCipher));
  if ("error" in registered) {
    return updatePhoneNumber(phone.id, {
      status: "registering",
      lastError: registered.error,
      lastCode: code,
    });
  }
  if (phone.tenantId) {
    await updateTenant(phone.tenantId, {
      whatsapp: {
        connected: true,
        mode: "live",
        phoneNumberId: phone.phoneNumberId,
        displayPhone: phone.national,
        wabaId: process.env.META_WABA_ID,
        connectedAt: new Date().toISOString(),
      },
    });
  }
  return updatePhoneNumber(phone.id, {
    status: "pending_name",
    lastError: undefined,
    lastCode: undefined,
  });
}

export async function markNumberLive(phoneId: string) {
  const phone = (await listPhoneNumbers()).find((item) => item.id === phoneId);
  if (!phone) throw new Error("number_not_found");
  return updatePhoneNumber(phone.id, { status: "live", lastError: undefined });
}

export async function receiveInboundCode(destRaw: string, code: string) {
  const dest = toE164Il(destRaw);
  if (!dest) return null;
  const phone = (await listPhoneNumbers()).find(
    (item) => item.e164 === dest && item.status === "awaiting_code",
  );
  if (!phone) return null;
  return submitVerificationCode(phone.id, code);
}
