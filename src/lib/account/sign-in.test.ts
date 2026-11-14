import { describe, expect, it } from "vitest";
import { primaryEmail, signInMethods, type UserLike } from "./sign-in";

const user = (over: Partial<UserLike> = {}): UserLike => ({
  passwordEnabled: false,
  primaryEmailAddress: { emailAddress: "wren@example.com" },
  emailAddresses: [{ verification: { status: "verified" } }],
  externalAccounts: [],
  ...over,
});

describe("signInMethods", () => {
  it("names Google, then password, then email code", () => {
    expect(signInMethods(user({ passwordEnabled: true, externalAccounts: [{ provider: "oauth_google" }] }))).toEqual(["google", "password", "code"]);
  });

  it("names a Google account's code too, and a password account's", () => {
    expect(signInMethods(user({ externalAccounts: [{ provider: "google" }] }))).toEqual(["google", "code"]);
    expect(signInMethods(user({ passwordEnabled: true }))).toEqual(["password", "code"]);
  });

  it("names no code on an unverified address", () => {
    expect(signInMethods(user({ passwordEnabled: true, emailAddresses: [{ verification: { status: "unverified" } }] }))).toEqual(["password"]);
  });

  it("names no code without an email address", () => {
    expect(signInMethods(user({ emailAddresses: [], primaryEmailAddress: null }))).toEqual([]);
    expect(primaryEmail(user({ primaryEmailAddress: null }))).toBe("");
  });
});
