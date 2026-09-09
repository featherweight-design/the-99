import { describe, expect, it } from "vitest";
import { canPair, partnerAbility, partnerAbilityLabel, type PartnerAbility } from "./partner";

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
  // The name only decides the named form, so every other case states one that
  // cannot be the reason the answer came out the way it did.
  const side = (ability: PartnerAbility | null, name = "Somebody, of Somewhere") => ({
    name,
    ability,
  });

  it("pairs two generics", () => {
    expect(canPair(side({ kind: "generic" }), side({ kind: "generic" }))).toBe(true);
  });

  it("pairs two restricted commanders carrying the same label", () => {
    const a = { kind: "restricted", label: "Partner—Father & son" } as const;
    expect(canPair(side(a), side({ ...a }))).toBe(true);
  });

  it("refuses restricted commanders carrying different labels", () => {
    expect(
      canPair(
        side({ kind: "restricted", label: "Partner—Father & son" }),
        side({ kind: "restricted", label: "Partner—Survivors" }),
      ),
    ).toBe(false);
  });

  it("refuses a generic paired with a restricted", () => {
    expect(
      canPair(side({ kind: "generic" }), side({ kind: "restricted", label: "Partner—Survivors" })),
    ).toBe(false);
  });

  it("pairs two friends forever", () => {
    expect(canPair(side({ kind: "friendsForever" }), side({ kind: "friendsForever" }))).toBe(true);
  });

  it("refuses friends forever paired with generic", () => {
    expect(canPair(side({ kind: "friendsForever" }), side({ kind: "generic" }))).toBe(false);
  });

  it("refuses when either side has no ability", () => {
    expect(canPair(side(null), side({ kind: "generic" }))).toBe(false);
    expect(canPair(side({ kind: "generic" }), side(null))).toBe(false);
  });

  // `Partner with` is the one form that names a specific card, so two cards
  // carrying it are a legal pair only when each is the card the other names.
  it("pairs a named form only when each commander names the other", () => {
    const pir = side({ kind: "with", name: "Toothy, Imaginary Friend" }, "Pir, Imaginative Rascal");
    const toothy = side({ kind: "with", name: "Pir, Imaginative Rascal" }, "Toothy, Imaginary Friend");
    expect(canPair(pir, toothy)).toBe(true);
    expect(canPair(toothy, pir)).toBe(true);
  });

  it("refuses two named commanders that name someone else", () => {
    const pir = side({ kind: "with", name: "Toothy, Imaginary Friend" }, "Pir, Imaginative Rascal");
    const khorvath = side({ kind: "with", name: "Sylvia Brightspear" }, "Khorvath Brightflame");
    expect(canPair(pir, khorvath)).toBe(false);
  });

  it("ignores case and surrounding space in the named form", () => {
    expect(
      canPair(
        side({ kind: "with", name: "toothy, imaginary friend " }, "Pir, Imaginative Rascal"),
        side({ kind: "with", name: " PIR, IMAGINATIVE RASCAL" }, "Toothy, Imaginary Friend"),
      ),
    ).toBe(true);
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
