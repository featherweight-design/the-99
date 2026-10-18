import { describe, expect, it } from "vitest";
import { idPrefix, nameSlug, parsePublicSlug, publicSlug, SLUG_HEX, uuidRange } from "./slug";

const ID = "0b3f2c9e-6a41-4d8e-9c53-1f0a7e2d4b68";

describe("nameSlug", () => {
  it("lowercases, hyphenates and drops punctuation and apostrophes", () => {
    expect(nameSlug("Atraxa, Praetors' Voice")).toBe("atraxa-praetors-voice");
    expect(nameSlug("Urza’s Saga")).toBe("urzas-saga");
  });

  it("folds the letters NFD leaves alone", () => {
    expect(nameSlug("Æther Vial")).toBe("aether-vial");
    expect(nameSlug("Jötun Grunt")).toBe("jotun-grunt");
    expect(nameSlug("Lim-Dûl's Vault")).toBe("lim-duls-vault");
    expect(nameSlug("Œil de Cristal ß ø")).toBe("oeil-de-cristal-ss-o");
  });

  it("keeps both halves of a split or double-faced card", () => {
    expect(nameSlug("Fire // Ice")).toBe("fire-ice");
    expect(nameSlug("Delver of Secrets // Insectile Aberration")).toBe("delver-of-secrets-insectile-aberration");
  });

  it("is empty when nothing survives", () => {
    expect(nameSlug("★ ✦ 日本")).toBe("");
  });
});

describe("publicSlug and parsePublicSlug", () => {
  it("is the name then the first 12 hex of the id", () => {
    expect(idPrefix(ID)).toBe("0b3f2c9e6a41");
    expect(publicSlug("Sol Ring", ID)).toBe("sol-ring-0b3f2c9e6a41");
    expect(idPrefix(ID)).toHaveLength(SLUG_HEX);
  });

  it("is the prefix alone when the name leaves nothing", () => {
    expect(publicSlug("★", ID)).toBe("0b3f2c9e6a41");
  });

  it("round-trips, and resolves on the suffix whatever the name part says", () => {
    expect(parsePublicSlug("sol-ring-0b3f2c9e6a41")).toEqual({ namePart: "sol-ring", hex: "0b3f2c9e6a41" });
    expect(parsePublicSlug("wrong-name-0b3f2c9e6a41")?.hex).toBe("0b3f2c9e6a41");
    expect(parsePublicSlug("0b3f2c9e6a41")).toEqual({ namePart: "", hex: "0b3f2c9e6a41" });
  });

  it("is not an address when the suffix is missing, short, long or not lowercase hex", () => {
    for (const bad of ["sol-ring", "sol-ring-0b3f2c9e6a4", "sol-ring-0B3F2C9E6A41", "sol-ring-0b3f2c9e6a41x", "", "-"]) {
      expect(parsePublicSlug(bad), bad).toBeNull();
    }
  });
});

describe("uuidRange", () => {
  it("covers exactly the ids with that prefix, as uuids", () => {
    const { lo, hi } = uuidRange("0b3f2c9e6a41");
    expect(lo).toBe("0b3f2c9e-6a41-0000-0000-000000000000");
    expect(hi).toBe("0b3f2c9e-6a41-ffff-ffff-ffffffffffff");
    expect(ID >= lo && ID <= hi).toBe(true);
    expect("0b3f2c9e-6a42-0000-0000-000000000000" > hi).toBe(true);
  });
});
