import { describe, expect, it } from "vitest";
import { cutAllowed, identityFits, pairLegal } from "./write";

describe("identityFits", () => {
  it("asks a same-size change for exactly the deck's identity (ruling 2)", () => {
    expect(identityFits(["U", "W"], ["U", "W"], false)).toBe(true);
    expect(identityFits(["U", "W"], ["B", "U", "W"], false)).toBe(false);
  });

  it("lets a single becoming a pair widen it, never narrow it", () => {
    expect(identityFits(["U"], ["R", "U"], true)).toBe(true);
    expect(identityFits(["B", "G", "R", "U", "W"], ["B", "G", "R", "U", "W"], true)).toBe(true);
    expect(identityFits(["B", "G", "R", "U", "W"], ["R", "U"], true)).toBe(false);
  });
});

describe("cutAllowed (#491, the cut a partner from outside the 99 needs)", () => {
  const inBody = new Set(["plains", "ponder", "locked"]);
  const commanders = ["ishai", "bruse"];
  const locked = new Set(["locked"]);
  const ok = (total: number, cut: string | null) => cutAllowed(total, cut, inBody, commanders, locked);

  it("needs exactly one cut from a body of 99", () => {
    expect(ok(99, "plains")).toBe(true);
    expect(ok(99, null)).toBe(false);
  });
  it("takes no cut from a body at 98 or under", () => {
    expect(ok(98, null)).toBe(true);
    expect(ok(90, null)).toBe(true);
    expect(ok(98, "plains")).toBe(false);
  });
  it("refuses a deck over 99, which no single cut brings to 98", () => {
    expect(ok(100, "plains")).toBe(false);
  });
  it("refuses a cut that is not in the body, is locked, or is a commander half", () => {
    expect(ok(99, "elsewhere")).toBe(false);
    expect(ok(99, "locked")).toBe(false);
    expect(cutAllowed(99, "ishai", new Set(["ishai"]), commanders, new Set())).toBe(false);
  });
});

describe("pairLegal (#491 PR6, a Background as the second half)", () => {
  const card = (name: string, typeLine: string, oracleText: string | null = null) =>
    ({ name, typeLine, oracleText, manaCost: "{2}{W}", layout: "normal" });
  const chooser = card("Abdel", "Legendary Creature — Human Warrior", "Choose a Background (You can have a Background as a second commander.)");
  const background = card("Acolyte", "Legendary Enchantment — Background", "Commander creatures you own have deathtouch.");
  const partner = card("Tormod", "Legendary Creature — Zombie", "Partner");
  const other = card("Other", "Legendary Creature — Elf", "Partner");

  it("accepts a Background only beside a commander that chooses one", () => {
    expect(pairLegal(chooser, background)).toBe(true);
    expect(pairLegal(partner, background)).toBe(false);
  });

  it("never lets a Background lead, or two Backgrounds pair", () => {
    expect(pairLegal(background, chooser)).toBe(false);
    expect(pairLegal(background, background)).toBe(false);
    expect(pairLegal(background, undefined)).toBe(false);
  });

  it("keeps Partner pairing as it was, and refuses a Partner beside a chooser", () => {
    expect(pairLegal(partner, other)).toBe(true);
    expect(pairLegal(chooser, partner)).toBe(false);
    expect(pairLegal(partner, undefined)).toBe(true);
  });
});
