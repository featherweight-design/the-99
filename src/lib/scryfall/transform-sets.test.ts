import { describe, expect, it } from "vitest";
import { toSetRows } from "./transform-sets";

const ecl = {
  code: "ECL",
  name: "Lorwyn Eclipsed",
  set_type: "expansion",
  released_at: "2026-01-23",
  card_count: 291,
  digital: false,
  icon_svg_uri: "https://svgs.scryfall.io/sets/ecl.svg",
};

const payload = (data: unknown[], has_more = false) => ({ object: "list", has_more, data });

describe("toSetRows", () => {
  it("maps a /sets entry to a sets row", () => {
    expect(toSetRows(payload([ecl]))).toEqual([
      {
        code: "ecl",
        name: "Lorwyn Eclipsed",
        setType: "expansion",
        releasedAt: "2026-01-23",
        cardCount: 291,
        digital: false,
        iconSvgUri: "https://svgs.scryfall.io/sets/ecl.svg",
        parentSetCode: null,
      },
    ]);
  });

  it("lowercases parent_set_code so it joins sets.code, and keeps it null for a standalone product", () => {
    expect(toSetRows(payload([{ ...ecl, parent_set_code: "EOE" }]))[0].parentSetCode).toBe("eoe");
    expect(toSetRows(payload([ecl]))[0].parentSetCode).toBeNull();
  });

  it("lowercases the set code so it joins printings.set_code", () => {
    expect(toSetRows(payload([{ ...ecl, code: "MH2" }]))[0].code).toBe("mh2");
  });

  it("keeps released_at null for undated sets", () => {
    expect(toSetRows(payload([{ ...ecl, released_at: undefined }]))[0].releasedAt).toBeNull();
  });

  it("defaults card_count, digital and icon when absent", () => {
    const row = toSetRows(payload([
      { code: "x", name: "X", set_type: "promo" },
    ]))[0];
    expect(row).toMatchObject({ cardCount: 0, digital: false, iconSvgUri: null });
  });

  it("throws when Scryfall starts paginating /sets", () => {
    expect(() => toSetRows(payload([ecl], true))).toThrow(/paginated/i);
  });

  it("throws when the payload is not a list", () => {
    expect(() => toSetRows({ object: "error" })).toThrow(/data/i);
  });

  it("throws when a set is missing a required field", () => {
    expect(() => toSetRows(payload([{ ...ecl, set_type: undefined }]))).toThrow(/set_type/);
    expect(() => toSetRows(payload([{ ...ecl, code: undefined }]))).toThrow(/code/);
    expect(() => toSetRows(payload([{ ...ecl, name: undefined }]))).toThrow(/name/);
  });
});
