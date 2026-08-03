import { describe, expect, it } from "vitest";
import { accountIdentity } from "./identity";

describe("accountIdentity", () => {
  it("prefers the full name and primary email", () => {
    expect(
      accountIdentity({
        firstName: "Ana",
        lastName: "Ruiz",
        fullName: "Ana Ruiz",
        email: "ana.ruiz@example.com",
      }),
    ).toEqual({ name: "Ana Ruiz", email: "ana.ruiz@example.com", initials: "AR" });
  });

  it("falls back to the email as the display name when no name is set", () => {
    const id = accountIdentity({ email: "ana.ruiz@example.com" });
    expect(id.name).toBe("ana.ruiz@example.com");
    expect(id.initials).toBe("A");
  });

  it("uses a single initial for a one-word name", () => {
    expect(accountIdentity({ fullName: "Ana", email: "a@b.com" }).initials).toBe("A");
  });

  it("takes the first and last word of a three-part name", () => {
    expect(accountIdentity({ fullName: "Ana Maria Ruiz", email: "a@b.com" }).initials).toBe("AR");
  });

  it("skips non-letter characters when building initials", () => {
    expect(accountIdentity({ fullName: "  ¡ Ruiz", email: "a@b.com" }).initials).toBe("R");
  });

  // The avatar must never render empty — it is the only visible part of the trigger.
  it("falls back to a placeholder glyph when nothing yields a letter", () => {
    expect(accountIdentity({}).initials).toBe("?");
    expect(accountIdentity({ fullName: "123", email: "999@example.com" }).initials).toBe("?");
  });

  it("names the account generically when Clerk has neither name nor email", () => {
    expect(accountIdentity({})).toEqual({ name: "your account", email: "", initials: "?" });
  });

  it("uppercases initials taken from a lowercase name", () => {
    expect(accountIdentity({ fullName: "ana ruiz", email: "a@b.com" }).initials).toBe("AR");
  });

  it("prefers structured first/last names over splitting fullName", () => {
    expect(
      accountIdentity({ firstName: "Ana", lastName: "de la Cruz", fullName: "Ana de la Cruz" })
        .initials,
    ).toBe("AD");
  });
});
