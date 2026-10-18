import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

// Step 0 of the purge: Stripe first, database second. The database is a spy, so "nothing purged" is
// "no transaction was opened".
const st = vi.hoisted(() => ({ mapping: null as string | null, transactions: 0 }));
vi.mock("../../db", () => ({
  db: {
    select: () => ({ from: () => ({ where: async () => (st.mapping ? [{ id: st.mapping }] : []) }) }),
    transaction: async () => { st.transactions += 1; throw new Error("stop after the transaction opened"); },
  },
}));

const { purgeAccount } = await import("./purge");

const retrieve = vi.fn();
const del = vi.fn();
const fake = { customers: { retrieve, del } } as unknown as Stripe;

beforeEach(() => {
  st.mapping = "cus_1";
  st.transactions = 0;
  retrieve.mockReset().mockResolvedValue({ id: "cus_1", metadata: { app: "the-99", user_id: "user_a" } });
  del.mockReset().mockResolvedValue({ id: "cus_1", deleted: true });
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
});

describe("purgeAccount and Stripe", () => {
  it("deletes the Customer before the database transaction opens", async () => {
    await expect(purgeAccount("user_a", { stripe: () => fake })).rejects.toThrow("stop after");
    expect(del).toHaveBeenCalledWith("cus_1");
    expect(st.transactions).toBe(1);
  });

  it("purges nothing when Stripe fails: the caller sees a throw and no transaction opened", async () => {
    del.mockRejectedValue(Object.assign(new Error("down"), { statusCode: 500 }));
    await expect(purgeAccount("user_a", { stripe: () => fake })).rejects.toThrow("Stripe customer deletion failed");
    expect(st.transactions).toBe(0);
  });

  it("purges nothing for a Customer that is not this app's", async () => {
    retrieve.mockResolvedValue({ id: "cus_1", metadata: { app: "concert-crawl", user_id: "user_a" } });
    await expect(purgeAccount("user_a", { stripe: () => fake })).rejects.toThrow("not this app's");
    expect(del).not.toHaveBeenCalled();
    expect(st.transactions).toBe(0);
  });

  it("purges nothing when a mapping exists and there is no usable key", async () => {
    await expect(purgeAccount("user_a", { stripe: () => null })).rejects.toThrow("no usable Stripe key");
    expect(st.transactions).toBe(0);
  });

  it("needs no key and makes no Stripe call for an account with no mapping", async () => {
    st.mapping = null;
    const getStripe = vi.fn(() => null);
    await expect(purgeAccount("user_a", { stripe: getStripe })).rejects.toThrow("stop after");
    expect(getStripe).not.toHaveBeenCalled();
    expect(st.transactions).toBe(1);
  });
});
