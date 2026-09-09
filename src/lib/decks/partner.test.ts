import { describe, expect, it } from "vitest";
import { canPair, partnerAbility, partnerAbilityLabel } from "./partner";

describe("partnerAbility", () => {
  it("reads the generic ability", () => {
    expect(partnerAbility("Flying\nPartner (You can have two commanders if both have partner.)"))
      .toEqual({ kind: "generic" });
  });

  it("reads the restricted form and keeps the printed label", () => {
    expect(
      partnerAbility(
        "Partner—Father & son (You can have two commanders if both have partner with the same label.)",
      ),
    ).toEqual({ kind: "restricted", label: "Partner—Father & son" });
  });

  it("normalises a hyphen-minus in the restricted form to the printed em dash", () => {
    expect(partnerAbility("Partner-Father & son")).toEqual({
      kind: "restricted",
      label: "Partner—Father & son",
    });
  });

  it("reads the named form", () => {
    expect(partnerAbility("Partner with Pir (When this creature enters, target player may...)"))
      .toEqual({ kind: "with", name: "Pir" });
  });

  it("reads friends forever", () => {
    expect(partnerAbility("Friends forever (You can have two commanders if both have friends forever.)"))
      .toEqual({ kind: "friendsForever" });
  });

  it("returns null for a commander with no partner ability", () => {
    expect(partnerAbility("Flying, vigilance")).toBeNull();
    expect(partnerAbility(null)).toBeNull();
  });

  it("does not mistake reminder text mentioning partner for the ability", () => {
    expect(partnerAbility("Whenever a creature you control with partner attacks, draw a card."))
      .toBeNull();
  });
});

describe("canPair", () => {
  it("pairs two generics", () => {
    expect(canPair({ kind: "generic" }, { kind: "generic" })).toBe(true);
  });

  it("pairs two restricted commanders carrying the same label", () => {
    const a = { kind: "restricted", label: "Partner—Father & son" } as const;
    expect(canPair(a, { ...a })).toBe(true);
  });

  it("refuses restricted commanders carrying different labels", () => {
    expect(
      canPair(
        { kind: "restricted", label: "Partner—Father & son" },
        { kind: "restricted", label: "Partner—Survivors" },
      ),
    ).toBe(false);
  });

  it("refuses a generic paired with a restricted", () => {
    expect(canPair({ kind: "generic" }, { kind: "restricted", label: "Partner—Survivors" })).toBe(
      false,
    );
  });

  it("pairs two friends forever", () => {
    expect(canPair({ kind: "friendsForever" }, { kind: "friendsForever" })).toBe(true);
  });

  it("refuses friends forever paired with generic", () => {
    expect(canPair({ kind: "friendsForever" }, { kind: "generic" })).toBe(false);
  });

  it("refuses when either side has no ability", () => {
    expect(canPair(null, { kind: "generic" })).toBe(false);
    expect(canPair({ kind: "generic" }, null)).toBe(false);
  });
});

describe("partnerAbilityLabel", () => {
  it("prints the ability verbatim, as the picker caption does", () => {
    expect(partnerAbilityLabel({ kind: "generic" })).toBe("Partner");
    expect(partnerAbilityLabel({ kind: "restricted", label: "Partner—Father & son" })).toBe(
      "Partner—Father & son",
    );
    expect(partnerAbilityLabel({ kind: "with", name: "Pir" })).toBe("Partner with Pir");
    expect(partnerAbilityLabel({ kind: "friendsForever" })).toBe("Friends forever");
  });
});
