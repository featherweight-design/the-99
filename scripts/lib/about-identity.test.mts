import { describe, expect, it } from "vitest";
import { accountIdentity } from "../../src/lib/shell/identity";
import { STAND_IN, applyPairs, identityLeftovers, identityOf, identityPlan } from "./about-identity.mjs";

const NAMED = { firstName: "Ana", lastName: "Ruiz", fullName: "Ana Ruiz", email: "ana@example.org" };
const EMAIL_ONLY = { firstName: null, lastName: null, fullName: null, email: "hugh+clerk_test@example.org" };

describe("identityOf", () => {
  it("is accountIdentity, for every shape the control draws", () => {
    for (const s of [
      NAMED,
      EMAIL_ONLY,
      { fullName: "Ana de la Cruz", firstName: "Ana", lastName: "de la Cruz", email: "a@x.io" },
      { fullName: "Cher", email: "c@x.io" },
      { fullName: "Ana Ruiz", email: null },
      { email: "  9lives@x.io " },
      {},
    ]) {
      expect(identityOf(s)).toEqual(accountIdentity(s));
    }
  });
});

describe("identityPlan + identityLeftovers", () => {
  it("a named account: its name, email, initials and the trigger's label all go, and a page left with any fails", () => {
    const real = identityOf(NAMED);
    expect(real).toEqual({ name: "Ana Ruiz", email: "ana@example.org", initials: "AR" });
    const plan = identityPlan(real);
    expect(plan.trigger).toBe("Account: Ana Ruiz");
    expect(applyPairs("Account: Ana Ruiz", plan.label)).toBe("Account: Sam");
    expect(applyPairs("Ana Ruiz · ana@example.org", plan.text)).toBe("Sam · sam@example.com");
    expect(plan.chip).toEqual(["AR", "S"]);
    expect(plan.forbidden).toEqual(expect.arrayContaining(["Ana Ruiz", "ana@example.org", "ana"]));

    const clean = { text: "Sam sam@example.com Decks", attrs: "Account: Sam", chips: ["S"] };
    expect(identityLeftovers(plan, clean)).toEqual([]);
    expect(identityLeftovers(plan, { ...clean, text: "Welcome, Ana Ruiz" })).toEqual(["text"]);
    expect(identityLeftovers(plan, { ...clean, attrs: "Account: Ana Ruiz" })).toEqual(["label"]);
    expect(identityLeftovers(plan, { ...clean, chips: [" AR "] })).toEqual(["initials"]);
  });

  it("the email fallback: the email is the name, the local part's letter the chip", () => {
    const real = identityOf(EMAIL_ONLY);
    expect(real).toEqual({ name: EMAIL_ONLY.email, email: EMAIL_ONLY.email, initials: "H" });
    const plan = identityPlan(real, ["clerk_test", "Hugh"]);
    expect(plan.nameNode).toEqual([EMAIL_ONLY.email, STAND_IN.name]);
    expect(applyPairs(`Account: ${EMAIL_ONLY.email}`, plan.label)).toBe("Account: Sam");
    expect(applyPairs(EMAIL_ONLY.email, plan.text)).toBe(STAND_IN.email);
    expect(plan.chip).toEqual(["H", "S"]);
    expect(plan.forbidden).toEqual(expect.arrayContaining([EMAIL_ONLY.email, "hugh+clerk_test", "clerk_test", "Hugh"]));
    expect(identityLeftovers(plan, { text: "Sam", attrs: "Account: Sam", chips: ["S"] })).toEqual([]);
    expect(identityLeftovers(plan, { text: "x", attrs: `Account: ${EMAIL_ONLY.email}`, chips: ["H"] })).toEqual([
      "label",
      "initials",
    ]);
  });

  it("an account whose initials are the stand-in's own has no chip to swap or check", () => {
    const plan = identityPlan(identityOf({ fullName: "Sky Stone", firstName: "Sky", lastName: "Stone", email: "s@x.io" }));
    expect(plan.chip).toEqual(["SS", "S"]);
    const solo = identityPlan(identityOf({ fullName: "Sol", email: "s@x.io" }));
    expect(solo.chip).toBeNull();
    expect(solo.initials).toBeNull();
  });
});
