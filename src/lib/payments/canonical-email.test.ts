import { describe, expect, it } from "vitest";
import { canonicalEmail, mailboxHash, primaryVerifiedEmail, verifiedEmails, welcomeEmailHash } from "./canonical-email";

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

describe("mailboxHash", () => {
  const env = { SENTRY_USER_HASH_KEY: KEY };
  it("is one keyed hash for every spelling of a mailbox, and differs for another", () => {
    expect(mailboxHash("Ab@gmail.com", env)).toBe(mailboxHash("a.b+promo@googlemail.com", env));
    expect(mailboxHash("ab@gmail.com", env)).not.toBe(mailboxHash("abc@gmail.com", env));
    expect(mailboxHash("ab@gmail.com", env)).toMatch(/^[0-9a-f]{64}$/);
  });
  it("is domain-separated from the welcome claim's hash, so one cannot stand in for the other", () => {
    expect(mailboxHash("ab@gmail.com", env)).not.toBe(welcomeEmailHash("ab@gmail.com", env));
  });
  it("is null with no usable key or no address, never an unkeyed hash", () => {
    expect(mailboxHash("ab@gmail.com", {})).toBeNull();
    expect(mailboxHash("ab@gmail.com", { SENTRY_USER_HASH_KEY: "short" })).toBeNull();
    expect(mailboxHash("nope", env)).toBeNull();
  });
});

describe("verifiedEmails", () => {
  it("returns every verified address, primary or not, and no other", () => {
    const rows = [
      { id: "i1", email_address: "one@x.com", verification: { status: "verified" } },
      { id: "i2", email_address: "two@x.com", verification: { status: "unverified" } },
      { id: "i3", email_address: "three@x.com", verification: { status: "verified" } },
      { id: "i4", email_address: 7, verification: { status: "verified" } },
    ];
    expect(verifiedEmails({ email_addresses: rows })).toEqual(["one@x.com", "three@x.com"]);
  });
  it("is empty for a payload with no list", () => {
    expect(verifiedEmails({})).toEqual([]);
    expect(verifiedEmails({ email_addresses: "x" })).toEqual([]);
  });
});
