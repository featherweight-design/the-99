// @vitest-environment node
import { describe, expect, it } from "vitest";
import { welcomeEmailHash } from "../../src/lib/payments/canonical-email";
import { LOCAL_DEV_BRANCH, PRODUCTION_BRANCH, STAGING_BRANCH } from "./scratch-branch.mjs";
import { chunks, clerkKeyFits, keyLooksWrong, parseArgs, planClaims, resolveTarget, type ClerkUser } from "./welcome-claims-backfill.mjs";

const keys = { SENTRY_USER_HASH_KEY: "k".repeat(48) };
const user = (id: string, email: string, status = "verified", primary = true): ClerkUser => ({
  id,
  raw: {
    email_addresses: [{ id: `e-${id}`, email_address: email, verification: { status } }],
    primary_email_address_id: primary ? `e-${id}` : "other",
  },
});

describe("parseArgs", () => {
  it("is a dry run by default", () => {
    expect(parseArgs([])).toEqual({ apply: false, target: null, keyCheck: true });
    expect(parseArgs(["--dry-run"]).apply).toBe(false);
  });
  it("writes only with --apply, and reads --target and --no-key-check", () => {
    expect(parseArgs(["--apply", "--target=staging", "--no-key-check"])).toEqual({ apply: true, target: "staging", keyCheck: false });
  });
  it("refuses an unknown argument, an empty target, and --apply with --dry-run", () => {
    expect(() => parseArgs(["--aply"])).toThrow(/unknown argument/);
    expect(() => parseArgs(["--target="])).toThrow(/unknown argument/);
    expect(() => parseArgs(["--apply", "--dry-run"])).toThrow(/pick one/);
  });
});

describe("resolveTarget", () => {
  it("runs on production with no --target", () => {
    expect(resolveTarget(PRODUCTION_BRANCH, null)).toEqual({ ok: true, name: "production" });
  });
  it("refuses staging, local-dev and any other branch with no --target", () => {
    for (const b of [STAGING_BRANCH, LOCAL_DEV_BRANCH, "br-scratch-123"]) expect(resolveTarget(b, null).ok).toBe(false);
  });
  it("runs on the branch --target names, by name or id, and on nothing else", () => {
    expect(resolveTarget(STAGING_BRANCH, "staging")).toEqual({ ok: true, name: "staging" });
    expect(resolveTarget(LOCAL_DEV_BRANCH, "local-dev")).toEqual({ ok: true, name: "local-dev" });
    expect(resolveTarget("br-scratch-123", "br-scratch-123")).toEqual({ ok: true, name: "br-scratch-123" });
    expect(resolveTarget(PRODUCTION_BRANCH, "staging").ok).toBe(false);
    expect(resolveTarget("br-scratch-123", "br-other").ok).toBe(false);
    expect(resolveTarget(STAGING_BRANCH, "prod").ok).toBe(false);
  });
  it("refuses a database that reports no branch", () => {
    expect(resolveTarget(null, null).ok).toBe(false);
    expect(resolveTarget(null, "production").ok).toBe(false);
  });
});

describe("clerkKeyFits", () => {
  it("needs a live Clerk key on production only", () => {
    expect(clerkKeyFits("production", "sk_test_x")).toBe(false);
    expect(clerkKeyFits("production", "sk_live_x")).toBe(true);
    expect(clerkKeyFits("br-scratch-123", "sk_test_x")).toBe(true);
  });
});

describe("planClaims", () => {
  it("claims each account's verified primary address with the webhook's own hash", () => {
    const plan = planClaims(["u1"], [user("u1", "Ab@Gmail.com")], keys);
    expect(plan.hashes).toEqual([welcomeEmailHash("ab@gmail.com", keys)]);
    expect(plan).toMatchObject({ accounts: 1, notInClerk: 0, unclaimable: 0, sharedMailbox: 0 });
  });
  it("folds aliases of one mailbox into one claim and counts the share", () => {
    const plan = planClaims(["u1", "u2"], [user("u1", "ab@gmail.com"), user("u2", "a.b+x@googlemail.com")], keys);
    expect(plan.hashes).toHaveLength(1);
    expect(plan.sharedMailbox).toBe(1);
  });
  it("counts an account Clerk no longer has, and one with no verified primary, and claims neither", () => {
    const plan = planClaims(["u1", "u2", "u3", "u3"], [user("u2", "x@example.com", "unverified"), user("u3", "y@example.com", "verified", false)], keys);
    expect(plan).toEqual({ accounts: 3, notInClerk: 1, unclaimable: 2, hashes: [], sharedMailbox: 0 });
  });
  it("claims nothing with no usable key: never an unkeyed hash", () => {
    const plan = planClaims(["u1"], [user("u1", "ab@gmail.com")], { SENTRY_USER_HASH_KEY: "short" });
    expect(plan.hashes).toEqual([]);
    expect(plan.unclaimable).toBe(1);
  });
});

describe("keyLooksWrong", () => {
  it("flags a run whose claims match none of a non-empty table", () => {
    expect(keyLooksWrong(5, 0, 10)).toBe(true);
    expect(keyLooksWrong(5, 1, 10)).toBe(false);
    expect(keyLooksWrong(0, 0, 10)).toBe(false);
    expect(keyLooksWrong(5, 0, 0)).toBe(false);
  });
});

describe("chunks", () => {
  it("splits into pages of the given size", () => {
    expect(chunks([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunks([], 2)).toEqual([]);
  });
});
