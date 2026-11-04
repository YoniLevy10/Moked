const GRAPH = "https://graph.facebook.com/v21.0";

export function poolCredentials(): { wabaId: string; token: string } | null {
  const wabaId = process.env.META_WABA_ID?.trim();
  const token = process.env.META_SYSTEM_USER_TOKEN?.trim();
  if (!wabaId || !token) return null;
  return { wabaId, token };
}

async function graph(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<{ ok: boolean; body: Record<string, unknown> }> {
  const res = await fetch(`${GRAPH}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok, body };
}

export async function createBusinessPhone(input: {
  e164: string;
  displayName: string;
}): Promise<{ phoneNumberId: string } | { error: string }> {
  const creds = poolCredentials();
  if (!creds) return { error: "meta_not_configured" };
  const national = input.e164.startsWith("972") ? input.e164.slice(3) : input.e164;
  const result = await graph(`/${creds.wabaId}/phone_numbers`, creds.token, {
    method: "POST",
    body: JSON.stringify({
      cc: "972",
      phone_number: national,
      verified_name: input.displayName,
    }),
  });
  const id = result.body.id;
  if (!result.ok || typeof id !== "string") {
    return { error: JSON.stringify(result.body).slice(0, 300) };
  }
  return { phoneNumberId: id };
}

export async function requestVerificationCode(phoneNumberId: string) {
  const creds = poolCredentials();
  if (!creds) return { error: "meta_not_configured" as const };
  const result = await graph(
    `/${phoneNumberId}/request_code?code_method=SMS&language=he`,
    creds.token,
    { method: "POST" },
  );
  return result.ok ? { ok: true as const } : { error: JSON.stringify(result.body).slice(0, 300) };
}

export async function verifyPhoneCode(phoneNumberId: string, code: string) {
  const creds = poolCredentials();
  if (!creds) return { error: "meta_not_configured" as const };
  const result = await graph(
    `/${phoneNumberId}/verify_code?code=${encodeURIComponent(code)}`,
    creds.token,
    { method: "POST" },
  );
  return result.ok ? { ok: true as const } : { error: JSON.stringify(result.body).slice(0, 300) };
}

export async function registerPoolPhone(phoneNumberId: string, pin: string) {
  const creds = poolCredentials();
  if (!creds) return { error: "meta_not_configured" as const };
  const result = await graph(`/${phoneNumberId}/register`, creds.token, {
    method: "POST",
    body: JSON.stringify({ messaging_product: "whatsapp", pin }),
  });
  return result.ok ? { ok: true as const } : { error: JSON.stringify(result.body).slice(0, 300) };
}
