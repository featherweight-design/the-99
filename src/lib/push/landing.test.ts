import { describe, expect, it } from "vitest";
import { appBadge, readPushLanding, strippedLanding } from "./landing";

const ID = "2d8a1a3c-5b0e-4f5e-9a51-0d7c6b3e9f10";

describe("readPushLanding: what a landing's address asks Home to open", () => {
  it("reads the worker's card, and its combo only when push-combo is exactly 1", () => {
    expect(readPushLanding(`?push-card=${ID}`)).toEqual({ card: ID, combo: false });
    expect(readPushLanding(`?push-card=${ID}&push-combo=1`)).toEqual({ card: ID, combo: true });
    expect(readPushLanding(`push-card=${ID}&other=x`)).toEqual({ card: ID, combo: false });
    for (const flag of ["0", "true", "yes", "", "1 ", "11"]) {
      expect(readPushLanding(`?push-card=${ID}&push-combo=${encodeURIComponent(flag)}`)).toEqual({ card: ID, combo: false });
    }
    expect(readPushLanding(`?push-card=${ID}&push-combo=1&push-combo=1`)).toEqual({ card: ID, combo: false });
  });

  it("lowercases the id, since the catalog's oracle ids are lowercase", () => {
    expect(readPushLanding(`?push-card=${ID.toUpperCase()}`)).toEqual({ card: ID, combo: false });
  });

  it("opens nothing without a card, for a combo flag alone, or for anything not shaped like an oracle id", () => {
    expect(readPushLanding("")).toBeNull();
    expect(readPushLanding("?push-combo=1")).toBeNull();
    const hostile = [
      "",
      "not-a-uuid",
      `${ID}x`,
      ` ${ID}`,
      `${ID}\n`,
      `${ID}/../../admin`,
      "javascript:alert(1)",
      "<script>alert(1)</script>",
      "00000000-0000-0000-0000-00000000000g",
      "a".repeat(5000),
    ];
    for (const value of hostile) expect(readPushLanding(`?push-card=${encodeURIComponent(value)}`)).toBeNull();
  });

  it("opens nothing when the card is repeated, which the worker never writes", () => {
    expect(readPushLanding(`?push-card=${ID}&push-card=${ID}`)).toBeNull();
  });
});

describe("strippedLanding: the address without the landing's parameters", () => {
  it("removes both, valid or not, and keeps everything else", () => {
    expect(strippedLanding(`https://the-99.dev/?push-card=${ID}&push-combo=1&tour=1#x`)?.href).toBe("https://the-99.dev/?tour=1#x");
    expect(strippedLanding("https://the-99.dev/?push-card=junk")?.href).toBe("https://the-99.dev/");
    expect(strippedLanding("https://the-99.dev/?push-combo=1")?.href).toBe("https://the-99.dev/");
  });

  it("is null when the address carries neither, so a plain Home visit writes nothing", () => {
    expect(strippedLanding("https://the-99.dev/?tour=1")).toBeNull();
    expect(strippedLanding("https://the-99.dev/")).toBeNull();
  });
});

describe("appBadge: the icon's figure (G6)", () => {
  it("sets a positive count and clears zero or nothing", () => {
    expect(appBadge(3)).toEqual({ set: 3 });
    expect(appBadge(0)).toBe("clear");
    expect(appBadge(undefined)).toBe("clear");
  });

  it("never sets a figure that is not a whole positive number", () => {
    expect(appBadge(-2)).toBe("clear");
    expect(appBadge(Number.NaN)).toBe("clear");
    expect(appBadge(Number.POSITIVE_INFINITY)).toBe("clear");
    expect(appBadge(2.7)).toEqual({ set: 2 });
    expect(appBadge(0.4)).toBe("clear");
  });
});
