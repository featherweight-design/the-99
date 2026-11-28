// @vitest-environment node
import { describe, expect, it } from "vitest";
import { mailboxHash } from "../../src/lib/payments/canonical-email";
import { planMailboxes, type ClerkUser } from "./account-mailboxes-backfill.mjs";

const keys = { SENTRY_USER_HASH_KEY: "k".repeat(48) };
const addr = (id: string, email: string, status = "verified") => ({ id, email_address: email, verification: { status } });
const user = (id: string, ...emails: ReturnType<typeof addr>[]): ClerkUser => ({ id, raw: { email_addresses: emails, primary_email_address_id: emails[0]?.id } });

describe("planMailboxes", () => {
  it("writes a row for every verified address, not only the primary", () => {
    const plan = planMailboxes([user("u1", addr("a", "one@example.com"), addr("b", "two@example.com"))], keys);
    expect(plan.rows.map((r) => r.mailboxHash).sort()).toEqual([mailboxHash("one@example.com", keys)!, mailboxHash("two@example.com", keys)!].sort());
    expect(plan.rows.every((r) => r.userId === "u1")).toBe(true);
  });

  it("skips an unverified address and counts the account that holds none", () => {
    const plan = planMailboxes([user("u1", addr("a", "one@example.com", "unverified")), { id: "u2", raw: null }], keys);
    expect(plan.rows).toEqual([]);
    expect(plan.withoutMailbox).toBe(2);
  });

  it("folds aliases into one mailbox and keeps it with the first account", () => {
    const plan = planMailboxes([user("u1", addr("a", "ab@gmail.com")), user("u2", addr("b", "a.b+x@googlemail.com"))], keys);
    expect(plan.rows).toEqual([{ userId: "u1", mailboxHash: mailboxHash("ab@gmail.com", keys)! }]);
    expect(plan.sharedMailbox).toBe(1);
  });

  it("holds a hash and never an address", () => {
    const plan = planMailboxes([user("u1", addr("a", "someone@example.com"))], keys);
    expect(JSON.stringify(plan)).not.toContain("someone");
  });

  it("writes nothing with no usable key, and says so", () => {
    const plan = planMailboxes([user("u1", addr("a", "one@example.com"))], {});
    expect(plan.rows).toEqual([]);
    expect(plan.unhashed).toBe(1);
  });

  it("is deterministic, so a second run plans the same rows", () => {
    const users = [user("u1", addr("a", "one@example.com")), user("u2", addr("b", "two@example.com"))];
    expect(planMailboxes(users, keys)).toEqual(planMailboxes(users, keys));
  });
});
