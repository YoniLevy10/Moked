import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  completeEmbeddedSignup,
  isAppSubscribedToWaba,
  listWabaSubscribedApps,
  PhoneRegisterError,
  registerCloudApiPhone,
  resolveCloudApiRegisterPin,
} from "@/lib/whatsapp/meta-oauth";

const ORIGINAL = { ...process.env };

afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL)) delete process.env[key];
  }
  Object.assign(process.env, ORIGINAL);
});

describe("resolveCloudApiRegisterPin", () => {
  it("never defaults to 123456", () => {
    delete process.env.META_PHONE_REGISTER_PIN;
    process.env.NODE_ENV = "test";
    const pin = resolveCloudApiRegisterPin();
    assert.match(pin, /^\d{6}$/);
    // Statistical: generated pin must not be the historic hardcoded default
    // when env is unset — allow rare collision by regenerating once.
    if (pin === "123456") {
      const again = resolveCloudApiRegisterPin();
      assert.notEqual(again, "123456");
    }
  });

  it("requires META_PHONE_REGISTER_PIN in production", () => {
    delete process.env.META_PHONE_REGISTER_PIN;
    process.env.NODE_ENV = "production";
    assert.throws(
      () => resolveCloudApiRegisterPin(),
      (err: unknown) =>
        err instanceof PhoneRegisterError && err.code === "pin_missing",
    );
  });

  it("uses env PIN when valid", () => {
    process.env.META_PHONE_REGISTER_PIN = "482917";
    assert.equal(resolveCloudApiRegisterPin(), "482917");
  });
});

describe("registerCloudApiPhone", () => {
  it("succeeds on Graph success", async () => {
    process.env.META_PHONE_REGISTER_PIN = "482917";
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ success: true }), {
        status: 200,
      })) as typeof fetch;
    try {
      const result = await registerCloudApiPhone("pn1", "tok");
      assert.equal(result.ok, true);
      assert.equal(result.alreadyRegistered, false);
      assert.equal(result.pinUsed, "482917");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("treats already-registered as success", async () => {
    process.env.META_PHONE_REGISTER_PIN = "482917";
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ error: { message: "already registered" } }), {
        status: 400,
      })) as typeof fetch;
    try {
      const result = await registerCloudApiPhone("pn1", "tok");
      assert.equal(result.ok, true);
      assert.equal(result.alreadyRegistered, true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("fail-closes on PIN mismatch with actionable error", async () => {
    process.env.META_PHONE_REGISTER_PIN = "111111";
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          error: { message: "Invalid PIN / two-step verification mismatch" },
        }),
        { status: 400 },
      )) as typeof fetch;
    try {
      await assert.rejects(
        () => registerCloudApiPhone("pn1", "tok"),
        (err: unknown) =>
          err instanceof PhoneRegisterError &&
          err.code === "pin_mismatch" &&
          /META_PHONE_REGISTER_PIN|WhatsApp Manager/i.test(err.message),
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("fail-closes on generic register failure (no warn-and-continue)", async () => {
    process.env.META_PHONE_REGISTER_PIN = "482917";
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response("server boom", { status: 500 })) as typeof fetch;
    try {
      await assert.rejects(
        () => registerCloudApiPhone("pn1", "tok"),
        (err: unknown) =>
          err instanceof PhoneRegisterError && err.code === "register_failed",
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe("completeEmbeddedSignup mocked full flow", () => {
  it("exchanges code, subscribes, registers, fetches display phone", async () => {
    process.env.META_APP_ID = "app1";
    process.env.META_APP_SECRET = "sec1";
    process.env.META_PHONE_REGISTER_PIN = "482917";
    const calls: string[] = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push(`${init?.method ?? "GET"} ${url}`);
      if (url.includes("/oauth/access_token")) {
        return new Response(JSON.stringify({ access_token: "exchanged_tok" }), {
          status: 200,
        });
      }
      if (url.includes("/subscribed_apps") && init?.method === "POST") {
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      }
      if (url.includes("/register")) {
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      }
      if (url.includes("fields=display_phone_number")) {
        return new Response(
          JSON.stringify({ display_phone_number: "+972 50-000-0000" }),
          { status: 200 },
        );
      }
      return new Response("unexpected", { status: 500 });
    }) as typeof fetch;
    try {
      const result = await completeEmbeddedSignup({
        code: "code1",
        wabaId: "waba1",
        phoneNumberId: "pn1",
      });
      assert.equal(result.accessToken, "exchanged_tok");
      assert.equal(result.displayPhone, "+972 50-000-0000");
      assert.ok(calls.some((c) => c.includes("/oauth/access_token")));
      assert.ok(calls.some((c) => c.includes("/subscribed_apps")));
      assert.ok(calls.some((c) => c.includes("/register")));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("does not mark success when register fails", async () => {
    process.env.META_APP_ID = "app1";
    process.env.META_APP_SECRET = "sec1";
    process.env.META_PHONE_REGISTER_PIN = "482917";
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/oauth/access_token")) {
        return new Response(JSON.stringify({ access_token: "tok" }), {
          status: 200,
        });
      }
      if (url.includes("/subscribed_apps") && init?.method === "POST") {
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      }
      if (url.includes("/register")) {
        return new Response("nope", { status: 500 });
      }
      return new Response("{}", { status: 200 });
    }) as typeof fetch;
    try {
      await assert.rejects(
        () =>
          completeEmbeddedSignup({
            code: "code1",
            wabaId: "waba1",
            phoneNumberId: "pn1",
          }),
        PhoneRegisterError,
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe("subscribed_apps helpers", () => {
  it("isAppSubscribedToWaba matches META_APP_ID only", () => {
    process.env.META_APP_ID = "app_123";
    assert.equal(
      isAppSubscribedToWaba([{ id: "app_123", name: "Moked" }]),
      true,
    );
    assert.equal(isAppSubscribedToWaba([{ id: "other" }]), false);
    assert.equal(isAppSubscribedToWaba([]), false);
    delete process.env.META_APP_ID;
    assert.equal(isAppSubscribedToWaba([{ id: "app_123" }]), false);
  });

  it("listWabaSubscribedApps parses Graph shape", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          data: [
            {
              whatsapp_business_api_data: {
                id: "app_abc",
                name: "Moked",
              },
            },
          ],
        }),
        { status: 200 },
      )) as typeof fetch;
    try {
      const result = await listWabaSubscribedApps("waba1", "tok");
      assert.equal(result.ok, true);
      assert.deepEqual(result.apps, [{ id: "app_abc", name: "Moked" }]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("listWabaSubscribedApps fails closed on Graph error", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response("nope", { status: 403 })) as typeof fetch;
    try {
      const result = await listWabaSubscribedApps("waba1", "tok");
      assert.equal(result.ok, false);
      assert.equal(result.apps.length, 0);
      assert.match(result.detail ?? "", /subscribed_apps_403/);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
