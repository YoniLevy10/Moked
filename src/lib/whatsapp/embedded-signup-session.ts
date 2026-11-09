/**
 * Parse Meta WA_EMBEDDED_SIGNUP postMessage payloads.
 *
 * Current docs (object-shaped `data` on FINISH*):
 *   { type, event, data: { phone_number_id, waba_id, business_id, ... } }
 *
 * Legacy / alternate array shape (still accepted if present):
 *   { type, event, data: [{ phone_number_id, waba_id }] }
 *
 * CANCEL / ERROR / FINISH_ONLY_WABA / missing IDs → never treat as connected.
 */

export type EmbeddedSignupEvent =
  | "FINISH"
  | "FINISH_ONLY_WABA"
  | "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING"
  | "FINISH_GRANT_ONLY_API_ACCESS"
  | "CANCEL"
  | "ERROR"
  | string;

export type EmbeddedSignupSessionIds = {
  phoneNumberId: string;
  wabaId: string;
  businessId?: string;
};

export type EmbeddedSignupParseResult =
  | {
      ok: true;
      event: EmbeddedSignupEvent;
      ids: EmbeddedSignupSessionIds;
    }
  | {
      ok: false;
      event?: EmbeddedSignupEvent;
      reason: string;
      detail?: string;
    };

type AssetRow = {
  phone_number_id?: unknown;
  waba_id?: unknown;
  business_id?: unknown;
};

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function extractIds(data: unknown): EmbeddedSignupSessionIds | null {
  if (!data || typeof data !== "object") return null;

  // Current docs: object-shaped data
  if (!Array.isArray(data)) {
    const row = data as AssetRow;
    const phoneNumberId = asNonEmptyString(row.phone_number_id);
    const wabaId = asNonEmptyString(row.waba_id);
    if (!phoneNumberId || !wabaId) return null;
    const businessId = asNonEmptyString(row.business_id) ?? undefined;
    return { phoneNumberId, wabaId, businessId };
  }

  // Legacy array-shaped data (sessionInfoVersion-era)
  for (const item of data) {
    if (!item || typeof item !== "object") continue;
    const row = item as AssetRow;
    const phoneNumberId = asNonEmptyString(row.phone_number_id);
    const wabaId = asNonEmptyString(row.waba_id);
    if (phoneNumberId && wabaId) {
      const businessId = asNonEmptyString(row.business_id) ?? undefined;
      return { phoneNumberId, wabaId, businessId };
    }
  }
  return null;
}

/** True when the finish event can include a Cloud API phone number. */
export function isPhoneBearingFinishEvent(event: string | undefined): boolean {
  return (
    event === "FINISH" || event === "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING"
  );
}

/**
 * Parse a WA_EMBEDDED_SIGNUP message payload (already JSON-decoded).
 * Returns ok only for phone-bearing FINISH* with both IDs present.
 */
export function parseEmbeddedSignupSession(
  payload: unknown,
): EmbeddedSignupParseResult {
  if (!payload || typeof payload !== "object") {
    return { ok: false, reason: "invalid_payload" };
  }
  const body = payload as {
    type?: unknown;
    event?: unknown;
    data?: unknown;
  };
  if (body.type !== "WA_EMBEDDED_SIGNUP") {
    return { ok: false, reason: "not_embedded_signup" };
  }

  const event =
    typeof body.event === "string" ? (body.event as EmbeddedSignupEvent) : undefined;

  if (event === "CANCEL") {
    const step =
      body.data &&
      typeof body.data === "object" &&
      !Array.isArray(body.data) &&
      typeof (body.data as { current_step?: unknown }).current_step === "string"
        ? String((body.data as { current_step: string }).current_step)
        : undefined;
    return {
      ok: false,
      event,
      reason: "cancelled",
      detail: step ? `cancelled_at_${step}` : "user_cancelled",
    };
  }

  if (event === "ERROR") {
    const err =
      body.data &&
      typeof body.data === "object" &&
      !Array.isArray(body.data) &&
      typeof (body.data as { error_message?: unknown }).error_message === "string"
        ? String((body.data as { error_message: string }).error_message)
        : "embedded_signup_error";
    return { ok: false, event, reason: "error", detail: err };
  }

  if (event === "FINISH_ONLY_WABA" || event === "FINISH_GRANT_ONLY_API_ACCESS") {
    return {
      ok: false,
      event,
      reason: "incomplete_no_phone",
      detail: event,
    };
  }

  if (!event || !isPhoneBearingFinishEvent(event)) {
    return {
      ok: false,
      event,
      reason: "unexpected_event",
      detail: event ?? "missing_event",
    };
  }

  const ids = extractIds(body.data);
  if (!ids) {
    return {
      ok: false,
      event,
      reason: "missing_ids",
      detail: "phone_number_id_or_waba_id_missing",
    };
  }

  return { ok: true, event, ids };
}
