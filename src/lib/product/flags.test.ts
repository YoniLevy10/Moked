import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { customerPaymentsEnabled } from "@/lib/product/flags";

const ORIGINAL = process.env.MOKED_ENABLE_CUSTOMER_PAYMENTS;

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.MOKED_ENABLE_CUSTOMER_PAYMENTS;
  else process.env.MOKED_ENABLE_CUSTOMER_PAYMENTS = ORIGINAL;
});

describe("customer payments flag", () => {
  it("defaults off (parked)", () => {
    delete process.env.MOKED_ENABLE_CUSTOMER_PAYMENTS;
    assert.equal(customerPaymentsEnabled(), false);
    process.env.MOKED_ENABLE_CUSTOMER_PAYMENTS = "false";
    assert.equal(customerPaymentsEnabled(), false);
  });

  it("enables only with explicit true", () => {
    process.env.MOKED_ENABLE_CUSTOMER_PAYMENTS = "true";
    assert.equal(customerPaymentsEnabled(), true);
  });
});
