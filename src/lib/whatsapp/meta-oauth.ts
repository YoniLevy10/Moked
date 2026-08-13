const GRAPH = "https://graph.facebook.com/v21.0";

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

/** Register the phone number for Cloud API messaging. */
export async function registerCloudApiPhone(
  phoneNumberId: string,
  accessToken: string,
  pin = "123456",
): Promise<void> {
  const res = await fetch(`${GRAPH}/${phoneNumberId}/register`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      pin,
    }),
  });
  // Already-registered numbers may return an error — treat as soft failure.
  if (!res.ok) {
    const err = await res.text();
    if (!/already|registered/i.test(err)) {
      console.warn("phone register warning:", err);
    }
  }
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
