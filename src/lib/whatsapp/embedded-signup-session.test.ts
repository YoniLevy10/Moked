import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseEmbeddedSignupSession } from "@/lib/whatsapp/embedded-signup-session";

describe("parseEmbeddedSignupSession", () => {
  it("accepts object-shaped FINISH data (current Meta docs)", () => {
    const result = parseEmbeddedSignupSession({
      type: "WA_EMBEDDED_SIGNUP",
      event: "FINISH",
      data: {
        phone_number_id: "106540352242922",
        waba_id: "524126980791429",
        business_id: "2729063490586005",
      },
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.ids.phoneNumberId, "106540352242922");
      assert.equal(result.ids.wabaId, "524126980791429");
      assert.equal(result.ids.businessId, "2729063490586005");
    }
  });

  it("accepts legacy array-shaped data when still present", () => {
    const result = parseEmbeddedSignupSession({
      type: "WA_EMBEDDED_SIGNUP",
      event: "FINISH",
      data: [{ phone_number_id: "pn1", waba_id: "waba1" }],
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.ids.phoneNumberId, "pn1");
      assert.equal(result.ids.wabaId, "waba1");
    }
  });

  it("rejects CANCEL and never marks connected", () => {
    const result = parseEmbeddedSignupSession({
      type: "WA_EMBEDDED_SIGNUP",
      event: "CANCEL",
      data: { current_step: "PHONE_NUMBER_SETUP" },
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.reason, "cancelled");
      assert.match(result.detail ?? "", /PHONE_NUMBER_SETUP/);
    }
  });

  it("rejects ERROR", () => {
    const result = parseEmbeddedSignupSession({
      type: "WA_EMBEDDED_SIGNUP",
      event: "ERROR",
      data: { error_message: "verified name violates guidelines" },
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "error");
  });

  it("rejects FINISH_ONLY_WABA (no phone)", () => {
    const result = parseEmbeddedSignupSession({
      type: "WA_EMBEDDED_SIGNUP",
      event: "FINISH_ONLY_WABA",
      data: { waba_id: "waba1" },
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "incomplete_no_phone");
  });

  it("rejects FINISH with missing IDs", () => {
    const result = parseEmbeddedSignupSession({
      type: "WA_EMBEDDED_SIGNUP",
      event: "FINISH",
      data: { waba_id: "only_waba" },
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "missing_ids");
  });

  it("rejects invalid / non-signup payloads", () => {
    assert.equal(parseEmbeddedSignupSession(null).ok, false);
    assert.equal(parseEmbeddedSignupSession({ type: "OTHER" }).ok, false);
  });
});
