import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

const state = vi.hoisted(() => ({ mapping: null as string | null }));
vi.mock("../../db", () => ({
  db: { select: () => ({ from: () => ({ where: async () => (state.mapping ? [{ id: state.mapping }] : []) }) }) },
}));

import { deleteStripeCustomerFor } from "./delete-customer";

const retrieve = vi.fn();
const del = vi.fn();
const fake = { customers: { retrieve, del } } as unknown as Stripe;
const ours = { id: "cus_1", metadata: { app: "the-99", user_id: "user_a" } };
const missing = Object.assign(new Error("No such customer"), { code: "resource_missing", statusCode: 404 });

let errors: string[];
beforeEach(() => {
  state.mapping = "cus_1";
  retrieve.mockReset().mockResolvedValue(ours);
  del.mockReset().mockResolvedValue({ id: "cus_1", deleted: true });
  errors = [];
  vi.spyOn(console, "error").mockImplementation((m: string) => { errors.push(String(m)); });
  vi.spyOn(console, "info").mockImplementation(() => {});
});

describe("deleteStripeCustomerFor", () => {
  it("does nothing, and never asks for a client, when the account has no mapping", async () => {
    state.mapping = null;
    const getStripe = vi.fn(() => null);
    expect(await deleteStripeCustomerFor("user_a", getStripe)).toMatchObject({ outcome: "none", customerId: null });
    expect(getStripe).not.toHaveBeenCalled();
    expect(retrieve).not.toHaveBeenCalled();
    expect(del).not.toHaveBeenCalled();
  });

  it("deletes the account's own Customer, which also cancels its subscriptions", async () => {
    expect(await deleteStripeCustomerFor("user_a", () => fake)).toMatchObject({ outcome: "deleted", customerId: "cus_1" });
    expect(del).toHaveBeenCalledWith("cus_1");
  });

  it("treats a 404 on the delete as done", async () => {
    del.mockRejectedValue(missing);
    expect(await deleteStripeCustomerFor("user_a", () => fake)).toMatchObject({ outcome: "gone", customerId: "cus_1" });
  });

  it("treats a 404 on the retrieve, or an already-deleted Customer, as done without deleting", async () => {
    retrieve.mockRejectedValueOnce(missing);
    expect(await deleteStripeCustomerFor("user_a", () => fake)).toMatchObject({ outcome: "gone", customerId: "cus_1" });
    retrieve.mockResolvedValueOnce({ id: "cus_1", deleted: true });
    expect(await deleteStripeCustomerFor("user_a", () => fake)).toMatchObject({ outcome: "gone", customerId: "cus_1" });
    expect(del).not.toHaveBeenCalled();
  });

  it("never deletes a Customer that is not this app's or not this account's, and does not throw: result foreign, logged", async () => {
    for (const metadata of [{}, { app: "concert-crawl", user_id: "user_a" }, { app: "the-99", user_id: "user_b" }, { app: "the-99" }]) {
      retrieve.mockResolvedValueOnce({ id: "cus_1", metadata });
      expect(await deleteStripeCustomerFor("user_a", () => fake)).toMatchObject({ outcome: "foreign", customerId: "cus_1" });
    }
    expect(del).not.toHaveBeenCalled();
    expect(errors).toHaveLength(4);
    for (const line of errors) expect(line).not.toMatch(/cus_|user_a/);
  });

  it("throws on any other Stripe failure, in fixed words that carry no id", async () => {
    del.mockRejectedValue(Object.assign(new Error("boom cus_1 user_a"), { statusCode: 500 }));
    await expect(deleteStripeCustomerFor("user_a", () => fake)).rejects.toThrow("Stripe customer deletion failed");
    retrieve.mockRejectedValueOnce(new Error("network"));
    await expect(deleteStripeCustomerFor("user_a", () => fake)).rejects.toThrow("Stripe customer deletion failed");
    for (const line of errors) expect(line).not.toMatch(/cus_|user_a/);
  });

  it("throws when a mapping exists and no usable key does", async () => {
    await expect(deleteStripeCustomerFor("user_a", () => null)).rejects.toThrow("no usable Stripe key");
  });

  it("is idempotent: a second run over a Customer Stripe now reports deleted makes no second delete", async () => {
    await deleteStripeCustomerFor("user_a", () => fake);
    retrieve.mockRejectedValueOnce(missing);
    expect(await deleteStripeCustomerFor("user_a", () => fake)).toMatchObject({ outcome: "gone", customerId: "cus_1" });
    expect(del).toHaveBeenCalledTimes(1);
  });
});
