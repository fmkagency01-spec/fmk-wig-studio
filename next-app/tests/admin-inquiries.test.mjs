import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { transitionInquiry } from "../src/lib/admin-inquiries.ts";

describe("admin inquiry transition receipts", () => {
  test("approve sends the final quote and requires a matching receipt", async () => {
    let call;
    const client = {
      rpc: async (name, args) => {
        call = { name, args };
        return {
          data: {
            id: args._inquiry_id,
            status: args._next_status,
            estimated_total: 12500,
            currency: "BDT",
            decision_reason: null,
            reviewed_by: "admin",
            reviewed_at: "now",
            updated_at: "now",
          },
          error: null,
        };
      },
    };
    const receipt = await transitionInquiry(client, {
      id: "inquiry-1",
      status: "approved",
      quoteTotal: 12500,
      currency: "BDT",
    });
    assert.equal(receipt.status, "approved");
    assert.equal(call.name, "transition_b2b_inquiry");
    assert.equal(call.args._quote_total, 12500);
  });

  test("reject sends a trimmed reason", async () => {
    let args;
    const client = {
      rpc: async (_name, input) => {
        args = input;
        return {
          data: { id: input._inquiry_id, status: "rejected", updated_at: "now" },
          error: null,
        };
      },
    };
    await transitionInquiry(client, {
      id: "inquiry-2",
      status: "rejected",
      reason: "  MOQ unavailable  ",
    });
    assert.equal(args._reason, "MOQ unavailable");
  });

  for (const result of [
    { data: null, error: { message: "permission denied" } },
    { data: null, error: null },
    { data: { id: "wrong", status: "approved", updated_at: "now" }, error: null },
    { data: { id: "inquiry-1", status: "reviewing", updated_at: "now" }, error: null },
  ]) {
    test("never reports success without a matching durable receipt", async () => {
      const client = { rpc: async () => result };
      await assert.rejects(
        transitionInquiry(client, {
          id: "inquiry-1",
          status: "approved",
          quoteTotal: 1,
          currency: "BDT",
        }),
      );
    });
  }
});
