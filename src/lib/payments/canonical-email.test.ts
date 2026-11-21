import { describe, expect, it } from "vitest";
import { canonicalEmail, primaryVerifiedEmail, welcomeEmailHash } from "./canonical-email";

const KEY = "k".repeat(40);

describe("canonicalEmail", () => {
  it.each([
    ["Ab@Gmail.com", "ab@gmail.com"],
    ["a.b@gmail.com", "ab@gmail.com"],
    ["a.b+promo@gmail.com", "ab@gmail.com"],
    ["a.b+x@googlemail.com", "ab@gmail.com"],
    ["  AB@GMAIL.COM ", "ab@gmail.com"],
    ["a.b+x@example.com", "a.b@example.com"],
    ["a.b@example.com", "a.b@example.com"],
    ["ａｂ@gmail.com", "ab@gmail.com"],
  ])("folds %s to %s", (raw, want) => expect(canonicalEmail(raw)).toBe(want));

  it("keeps dots on other providers: they are different mailboxes", () => {
    expect(canonicalEmail("a.b@example.com")).not.toBe(canonicalEmail("ab@example.com"));
  });

  it.each(["", "nope", "@x.com", "a b@x.com", "a@localhost", "+x@gmail.com"])("is null for %j", (raw) => expect(canonicalEmail(raw)).toBeNull());
});

describe("primaryVerifiedEmail", () => {
  const rows = [
    { id: "i1", email_address: "one@x.com", verification: { status: "verified" } },
    { id: "i2", email_address: "two@x.com", verification: { status: "unverified" } },
  ];
  it("returns the verified primary", () => expect(primaryVerifiedEmail({ email_addresses: rows, primary_email_address_id: "i1" })).toBe("one@x.com"));
  it("returns null for an unverified primary, an unknown id or a missing list", () => {
    expect(primaryVerifiedEmail({ email_addresses: rows, primary_email_address_id: "i2" })).toBeNull();
    expect(primaryVerifiedEmail({ email_addresses: rows, primary_email_address_id: "zz" })).toBeNull();
    expect(primaryVerifiedEmail({})).toBeNull();
  });
});

describe("welcomeEmailHash", () => {
  it("is equal for aliases of one mailbox and different for another", () => {
    const h = welcomeEmailHash("a.b+x@gmail.com", { SENTRY_USER_HASH_KEY: KEY });
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(welcomeEmailHash("ab@googlemail.com", { SENTRY_USER_HASH_KEY: KEY })).toBe(h);
    expect(welcomeEmailHash("abc@gmail.com", { SENTRY_USER_HASH_KEY: KEY })).not.toBe(h);
  });
  it("depends on the key, and is null (never unkeyed) without a usable one", () => {
    expect(welcomeEmailHash("a@x.com", { SENTRY_USER_HASH_KEY: KEY })).not.toBe(welcomeEmailHash("a@x.com", { SENTRY_USER_HASH_KEY: "j".repeat(40) }));
    expect(welcomeEmailHash("a@x.com", { SENTRY_USER_HASH_KEY: "short" })).toBeNull();
    expect(welcomeEmailHash("a@x.com", {})).toBeNull();
  });
  it("falls back to the anonymous-read salt, and is null for a non-address", () => {
    expect(welcomeEmailHash("a@x.com", { ANON_KEY_SALT: KEY })).toMatch(/^[0-9a-f]{64}$/);
    expect(welcomeEmailHash("nope", { SENTRY_USER_HASH_KEY: KEY })).toBeNull();
  });
});
