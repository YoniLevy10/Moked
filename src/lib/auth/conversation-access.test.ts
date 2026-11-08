import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { conversationVisibleToTenant } from "@/lib/auth/conversation-access";

describe("conversationVisibleToTenant", () => {
  it("returns false for missing conversation (404 path)", () => {
    assert.equal(conversationVisibleToTenant(null, "t1", "owner"), false);
    assert.equal(conversationVisibleToTenant(undefined, "t1", "owner"), false);
  });

  it("allows same-tenant owner", () => {
    assert.equal(
      conversationVisibleToTenant({ tenantId: "t1" }, "t1", "owner"),
      true,
    );
  });

  it("blocks cross-tenant owner (IDOR)", () => {
    assert.equal(
      conversationVisibleToTenant({ tenantId: "t-other" }, "t1", "owner"),
      false,
    );
  });

  it("allows superadmin across tenants", () => {
    assert.equal(
      conversationVisibleToTenant({ tenantId: "t-other" }, "t1", "superadmin"),
      true,
    );
  });
});
