import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  isAppSubscribedToWaba,
  listWabaSubscribedApps,
} from "@/lib/whatsapp/meta-oauth";

const ORIGINAL = { ...process.env };

afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL)) delete process.env[key];
  }
  Object.assign(process.env, ORIGINAL);
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
