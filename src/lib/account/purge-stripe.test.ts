import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

// Step 0 of the purge: Stripe first, database second. The database is a spy, so "nothing purged" is
// "no transaction was opened".
// `full`: the transaction runs its body against a recording tx; `rowsForMapping` is what the mapping delete
// returns (the interleaving: a mapping stored after step 0 looked).
const st = vi.hoisted(() => ({ mapping: null as string | null, transactions: 0, full: false, rowsForMapping: [] as string[], committed: false, ran: [] as string[] }));
vi.mock("../../db", async () => {
  const { PgDialect } = await import("drizzle-orm/pg-core");
  const dialect = new PgDialect();
  return {
    db: {
      select: () => ({ from: () => ({ where: async () => (st.mapping ? [{ id: st.mapping }] : []) }) }),
      transaction: async (cb: (tx: unknown) => Promise<unknown>) => {
        st.transactions += 1;
        if (!st.full) throw new Error("stop after the transaction opened");
        const tx = {
          execute: async (q: never) => {
            const text = dialect.sqlToQuery(q).sql;
            st.ran.push(text);
            if (/delete from "stripe_customers"/.test(text)) {
              // Postgres returns the ids only when the statement asks for them: without RETURNING the purge could not
              // see a mapping it never handled.
              const returning = /returning\s+"?stripe_customer_id/i.test(text);
              return { rowCount: st.rowsForMapping.length, rows: returning ? st.rowsForMapping.map((id) => ({ stripe_customer_id: id })) : [] };
            }
            return { rowCount: 0, rows: [] };
          },
        };
        const out = await cb(tx);
        st.committed = true;
        return out;
      },
    },
  };
});
vi.mock("../social/purge", () => ({ purgeSocialIn: async () => ({ counts: { friendLinks: 0, podsLeft: 0, podsHandedOn: 0, podsDeleted: 0 }, friendIds: [] }), SOCIAL_PURGED: {}, SOCIAL_UNLINKED: {} }));
vi.mock("../invites/purge", () => ({ unlinkInvitesIn: async () => 0, invitationIdsIn: async () => [], revokeAfterPurge: async () => ({ found: 0, revoked: 0 }), INVITES_UNLINKED: {} }));
vi.mock("../discovery/owned-support-lock", async () => {
  const { sql } = await import("drizzle-orm");
  return { ownedSupportLock: () => sql`select 1` };
});

const { purgeAccount } = await import("./purge");

const retrieve = vi.fn();
const del = vi.fn();
const fake = { customers: { retrieve, del } } as unknown as Stripe;

beforeEach(() => {
  st.mapping = "cus_1";
  st.transactions = 0;
  st.full = false;
  st.rowsForMapping = [];
  st.committed = false;
  st.ran = [];
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

  it("leaves a Customer that is not this app's alone and still purges the database half", async () => {
    retrieve.mockResolvedValue({ id: "cus_1", metadata: { app: "concert-crawl", user_id: "user_a" } });
    await expect(purgeAccount("user_a", { stripe: () => fake })).rejects.toThrow("stop after");
    expect(del).not.toHaveBeenCalled();
    expect(st.transactions).toBe(1);
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

  it("aborts, deleting nothing, when a mapping appeared after step 0 saw none; the retry deletes that Customer and purges", async () => {
    st.full = true;
    st.mapping = null; // step 0 looks: no mapping
    st.rowsForMapping = ["cus_late"]; // ...then a Checkout stores one before the transaction deletes it
    const getStripe = vi.fn(() => fake);
    await expect(purgeAccount("user_a", { stripe: getStripe })).rejects.toThrow("appeared during the purge");
    expect(st.committed).toBe(false);
    expect(del).not.toHaveBeenCalled();
    // The retry (Clerk, or the sweep): step 0 now sees the mapping.
    st.mapping = "cus_late";
    retrieve.mockResolvedValue({ id: "cus_late", metadata: { app: "the-99", user_id: "user_a" } });
    await purgeAccount("user_a", { stripe: () => fake });
    expect(del).toHaveBeenCalledWith("cus_late");
    expect(st.committed).toBe(true);
  });

  it("commits when the mapping the transaction deletes is the one step 0 handled", async () => {
    st.full = true;
    st.rowsForMapping = ["cus_1"];
    await purgeAccount("user_a", { stripe: () => fake });
    expect(st.committed).toBe(true);
  });
});
