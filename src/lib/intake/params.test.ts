import { describe, expect, it } from "vitest";

import { answersOf, emptyParams, parseChooseParams, resolveWords, serializeChooseParams, type ChooseParams } from "./params";

const CARD = "0000aaaa-0000-4000-8000-000000000001";
const parse = (qs: string) => parseChooseParams(new URLSearchParams(qs));

describe("the choose URL", () => {
  it("keeps only well-formed deeper marks", () => {
    expect(parse("d=t:dinosaurs,a,b,k,x,t:Bad Slug,t:dinosaurs").deeper).toEqual(["t:dinosaurs", "a", "b", "k"]);
  });

  it("round-trips every answer", () => {
    const p: ChooseParams = {
      words: "big lizards", colors: ["r", "g"], match: "exactly", themes: ["dinosaurs", "landfall"], themeJoin: "any",
      card: CARD, budgetDollars: 150, bracket: 3, readId: null, notUsed: ["that stomp", "$200"], deeper: ["t:landfall", "b"], results: true,
    };
    expect(parse(serializeChooseParams(p).slice(1))).toEqual(p);
  });

  it("carries Not used as one param, trimmed, deduplicated and capped", () => {
    const many = Array.from({ length: 20 }, (_, i) => `phrase ${i}`);
    const p = parse(serializeChooseParams({ ...emptyParams(), notUsed: [" a ", "a", "", "x".repeat(200), ...many] }).slice(1));
    expect(p.notUsed).toHaveLength(12);
    expect(p.notUsed.slice(0, 2)).toEqual(["a", "x".repeat(120)]);
    expect(parse("n=" + encodeURIComponent("one\u001ftwo")).notUsed).toEqual(["one", "two"]);
  });

  it("reads at most the words box's limit of w", () => {
    expect(parse(`w=${"a".repeat(900)}`).words).toHaveLength(800);
  });

  it("writes defaults as absences, so an empty form is a bare URL", () => {
    expect(serializeChooseParams(emptyParams())).toBe("");
    expect(serializeChooseParams({ ...emptyParams(), match: "exactly" })).toBe("");
  });

  it("reads the lanes' own color encoding, so Discover's link parses as-is", () => {
    expect(parse("c=g,r&m=exact")).toMatchObject({ colors: ["r", "g"], match: "exactly" });
    expect(answersOf(parse("c=g,r")).colors).toEqual(["R", "G"]);
  });

  it("drops anything malformed rather than refusing the page", () => {
    expect(parse("a=not-a-uuid&b=0&k=6&t=Bad Slug,ok-slug&r=nope")).toMatchObject({
      card: null, budgetDollars: null, bracket: null, themes: ["ok-slug"], readId: null,
    });
  });
});

describe("resolveWords", () => {
  const none = { themes: [], budgetDollars: null, bracket: null };

  it("adds the words' themes after the picked ones, once each", () => {
    const r = resolveWords([{ kind: "theme", slug: "dinosaurs", label: "Dinosaurs" }, { kind: "theme", slug: "landfall", label: "Landfall" }],
      { ...none, themes: ["landfall"] });
    expect(r.themes).toEqual(["landfall", "dinosaurs"]);
  });

  it("counts the first card, budget and bracket, and lists the rest as not used", () => {
    const r = resolveWords([
      { kind: "card", oracleId: CARD, name: "Doubling Season" }, { kind: "card", oracleId: "x", name: "Sol Ring" },
      { kind: "budget", dollars: 100 }, { kind: "budget", dollars: 300 },
      { kind: "bracket", bracket: 2 }, { kind: "bracket", bracket: 4 },
    ], none);
    expect(r).toMatchObject({ card: CARD, budgetDollars: 100, bracket: 2, notUsed: ["Sol Ring", "$300", "bracket 4"] });
  });

  it("lists a budget past the range rather than losing it, and takes the next one", () => {
    const r = resolveWords([{ kind: "budget", dollars: 200_000 }, { kind: "budget", dollars: 100 }], none);
    expect(r).toMatchObject({ budgetDollars: 100, notUsed: ["$200000"] });
  });

  it("lets a set control beat the words, and lists a disagreeing figure as not used", () => {
    const r = resolveWords([{ kind: "budget", dollars: 300 }, { kind: "bracket", bracket: 3 }],
      { themes: [], budgetDollars: 100, bracket: 3 });
    expect(r).toMatchObject({ budgetDollars: 100, bracket: 3, notUsed: ["$300"] });
  });
});
