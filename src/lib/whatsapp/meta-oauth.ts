import { randomInt } from "crypto";
import { META_GRAPH_BASE } from "@/lib/whatsapp/graph";

const GRAPH = META_GRAPH_BASE;

export type EmbeddedSignupPayload = {
  code: string;
  wabaId: string;
  phoneNumberId: string;
};

export async function exchangeEmbeddedSignupCode(
  code: string,
): Promise<{ accessToken: string }> {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) {
    throw new Error("meta_app_credentials_missing");
  }

  const url = new URL(`${GRAPH}/oauth/access_token`);
  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("code", code);

  const res = await fetch(url.toString(), { method: "GET" });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`token_exchange_failed: ${err}`);
  }
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new Error("token_exchange_empty");
  return { accessToken: data.access_token };
}

export async function fetchPhoneDisplayNumber(
  phoneNumberId: string,
  accessToken: string,
): Promise<string | undefined> {
  const res = await fetch(
    `${GRAPH}/${phoneNumberId}?fields=display_phone_number,verified_name`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) return undefined;
  const data = (await res.json()) as { display_phone_number?: string };
  return data.display_phone_number;
}

/** Subscribe the app to WABA webhooks so inbound messages reach /api/whatsapp/webhook. */
export async function subscribeAppToWaba(
  wabaId: string,
  accessToken: string,
): Promise<void> {
  const res = await fetch(`${GRAPH}/${wabaId}/subscribed_apps`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`waba_subscribe_failed: ${err}`);
  }
}

export type SubscribedApp = { id: string; name?: string };

/**
 * List apps subscribed to a WABA (GET /{waba-id}/subscribed_apps).
 * Used by live readiness — phone GET alone is not webhook evidence.
 */
export async function listWabaSubscribedApps(
  wabaId: string,
  accessToken: string,
): Promise<{ ok: boolean; apps: SubscribedApp[]; detail?: string }> {
  try {
    const res = await fetch(`${GRAPH}/${wabaId}/subscribed_apps`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      return {
        ok: false,
        apps: [],
        detail: `subscribed_apps_${res.status}`,
      };
    }
    const data = (await res.json()) as {
      data?: Array<{
        whatsapp_business_api_data?: { id?: string; name?: string };
        id?: string;
      }>;
    };
    const apps: SubscribedApp[] = [];
    for (const row of data.data ?? []) {
      const id = row.whatsapp_business_api_data?.id ?? row.id;
      if (!id) continue;
      apps.push({
        id,
        name: row.whatsapp_business_api_data?.name,
      });
    }
    return { ok: true, apps };
  } catch (error) {
    return {
      ok: false,
      apps: [],
      detail: error instanceof Error ? error.message : "subscribed_apps_error",
    };
  }
}

/** True when META_APP_ID appears in the WABA subscribed_apps list. */
export function isAppSubscribedToWaba(
  apps: SubscribedApp[],
  appId = process.env.META_APP_ID?.trim(),
): boolean {
  if (!appId) return false;
  return apps.some((a) => a.id === appId);
}

export type RegisterPhoneResult = {
  ok: true;
  alreadyRegistered: boolean;
  /** PIN used for register — never log in production handlers. */
  pinUsed: string;
};

export class PhoneRegisterError extends Error {
  readonly code:
    | "pin_missing"
    | "pin_invalid"
    | "pin_mismatch"
    | "register_failed";
  readonly status?: number;
  readonly graphBody?: string;

  constructor(
    code: PhoneRegisterError["code"],
    message: string,
    opts?: { status?: number; graphBody?: string },
  ) {
    super(message);
    this.name = "PhoneRegisterError";
    this.code = code;
    this.status = opts?.status;
    this.graphBody = opts?.graphBody;
  }
}

const PIN_RE = /^\d{6}$/;

/**
 * Resolve the 6-digit Cloud API two-step PIN.
 * Production requires META_PHONE_REGISTER_PIN (never hardcoded 123456).
 * Non-production may generate a cryptographically random PIN when unset.
 */
export function resolveCloudApiRegisterPin(
  explicitPin?: string,
): string {
  const fromArg = explicitPin?.trim();
  if (fromArg) {
    if (!PIN_RE.test(fromArg)) {
      throw new PhoneRegisterError(
        "pin_invalid",
        "Cloud API register PIN must be exactly 6 digits",
      );
    }
    return fromArg;
  }

  const fromEnv = process.env.META_PHONE_REGISTER_PIN?.trim();
  if (fromEnv) {
    if (!PIN_RE.test(fromEnv)) {
      throw new PhoneRegisterError(
        "pin_invalid",
        "META_PHONE_REGISTER_PIN must be exactly 6 digits",
      );
    }
    return fromEnv;
  }

  if (process.env.NODE_ENV === "production") {
    throw new PhoneRegisterError(
      "pin_missing",
      "META_PHONE_REGISTER_PIN is required in production (set a secure 6-digit PIN; do not use 123456)",
    );
  }

  // Dev/test only — cryptographically random, never the historic 123456 default.
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

function classifyRegisterFailure(
  status: number,
  body: string,
): PhoneRegisterError {
  const lower = body.toLowerCase();
  if (
    /pin|two[- ]?step|verification/i.test(body) &&
    /mismatch|incorrect|invalid|wrong|does not match/i.test(body)
  ) {
    return new PhoneRegisterError(
      "pin_mismatch",
      "Cloud API register failed: PIN mismatch. Set META_PHONE_REGISTER_PIN to the number's existing two-step PIN (or reset PIN in WhatsApp Manager).",
      { status, graphBody: body },
    );
  }
  return new PhoneRegisterError(
    "register_failed",
    `Cloud API register failed (${status}): ${body.slice(0, 280)}`,
    { status, graphBody: body },
  );
}

function isAlreadyRegistered(status: number, body: string): boolean {
  if (/already\s*(registered|connected)|registered.*already/i.test(body)) {
    return true;
  }
  // Meta sometimes returns 400 with a specific error subcode; keep text heuristic.
  if (status === 400 && /133016|133010/i.test(body) === false) {
    // 133010 = not registered (opposite). Don't treat as already.
  }
  return false;
}

/**
 * Register the phone number for Cloud API messaging.
 * Fail-closed on register failure (except already-registered → success).
 */
export async function registerCloudApiPhone(
  phoneNumberId: string,
  accessToken: string,
  pin?: string,
): Promise<RegisterPhoneResult> {
  const resolvedPin = resolveCloudApiRegisterPin(pin);
  const res = await fetch(`${GRAPH}/${phoneNumberId}/register`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      pin: resolvedPin,
    }),
  });

  if (res.ok) {
    return { ok: true, alreadyRegistered: false, pinUsed: resolvedPin };
  }

  const err = await res.text();
  if (isAlreadyRegistered(res.status, err)) {
    return { ok: true, alreadyRegistered: true, pinUsed: resolvedPin };
  }

  throw classifyRegisterFailure(res.status, err);
}

export async function completeEmbeddedSignup(input: EmbeddedSignupPayload) {
  const { accessToken } = await exchangeEmbeddedSignupCode(input.code);
  await subscribeAppToWaba(input.wabaId, accessToken);
  await registerCloudApiPhone(input.phoneNumberId, accessToken);
  const displayPhone = await fetchPhoneDisplayNumber(
    input.phoneNumberId,
    accessToken,
  );
  return { accessToken, displayPhone };
}
