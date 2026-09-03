import { describe, expect, it } from "vitest";
import { parseSelectParam, selectParamSuffix } from "./selection-param";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

describe("parseSelectParam", () => {
  it("splits a comma-separated list", () => {
    expect(parseSelectParam(`${A},${B}`)).toEqual([A, B]);
  });

  it("is empty when the parameter is absent", () => {
    expect(parseSelectParam(undefined)).toEqual([]);
  });

  it("drops anything that is not uuid-shaped", () => {
    expect(parseSelectParam(`${A},not-a-uuid,'; drop table deck_cards; --`)).toEqual([A]);
  });

  it("collapses a repeated id", () => {
    expect(parseSelectParam(`${A},${A}`)).toEqual([A]);
  });

  it("accepts the array form of a repeated query parameter", () => {
    expect(parseSelectParam([A, B])).toEqual([A, B]);
  });

  // A hostile URL must not widen the `in (…)` array behind the legality check.
  it("bounds a selection longer than the deck can hold", () => {
    const many = Array.from(
      { length: 400 },
      (_, i) => `${i.toString().padStart(8, "0")}-1111-4111-8111-111111111111`,
    );
    expect(parseSelectParam(many.join(","))).toHaveLength(99);
  });
});

describe("selectParamSuffix", () => {
  it("is empty at zero selection, so the redirect stays byte-identical", () => {
    expect(selectParamSuffix(undefined)).toBe("");
    expect(selectParamSuffix("not-a-uuid")).toBe("");
  });

  it("carries the surviving ids", () => {
    expect(selectParamSuffix(`${A},${B}`)).toBe(`&select=${A}%2C${B}`);
  });
});
