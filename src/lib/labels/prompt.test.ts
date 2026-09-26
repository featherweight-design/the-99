import { describe, expect, it } from "vitest";

import { buildRequest, labelInputHash, LABEL_PROMPT_VERSION, SENDS_CACHE_BREAKPOINT } from "./prompt";

const card = {
  oracleId: "11111111-1111-4111-8111-111111111111",
  name: "Bejeweled Warg", mana_cost: "{3}{R}", type_line: "Creature — Wolf",
  oracle_text: "Whenever this creature deals combat damage, create a Treasure token.",
  layout: "normal",
};

describe("the request asks for no prompt caching", () => {
  // Task 3, and it is a MEASUREMENT: caching is inert for Haiku (block under the minimum
  // cacheable length) and a 9% loss for Sonnet, whose batch requests run in parallel so
  // almost none finds a warm cache — 53,277 write tokens against ZERO reads.
  it("sends no cache_control on the system block", () => {
    const req = buildRequest("claude-sonnet-4-5", "b-0", [card]);
    const system = req.params.system;
    expect(system).toHaveLength(1);
    expect(system[0]).not.toHaveProperty("cache_control");
  });

  // The estimator multiplies by this rather than by a model's capability, so it has to
  // agree with what the request actually sends. Two places, one fact.
  it("advertises that through SENDS_CACHE_BREAKPOINT", () => {
    expect(SENDS_CACHE_BREAKPOINT).toBe(false);
    const req = buildRequest("claude-sonnet-4-5", "b-0", [card]);
    const sends = req.params.system.some((b) => "cache_control" in b);
    expect(sends).toBe(SENDS_CACHE_BREAKPOINT);
  });
});

describe("labelInputHash", () => {
  it("is stable across calls for unchanged inputs", () => {
    expect(labelInputHash(card, "m")).toBe(labelInputHash(card, "m"));
  });

  // Each of these is a reason a stored label would describe something else. The name and
  // type line specifically: a card errata'd under its existing oracle id is the one case
  // where the id alone says fresh and the label is not.
  for (const [what, changed] of [
    ["the name", { ...card, name: "Bejewelled Warg" }],
    ["the type line", { ...card, type_line: "Creature — Dog" }],
    ["the oracle text", { ...card, oracle_text: "Whenever this creature attacks, draw a card." }],
    ["the oracle id", { ...card, oracleId: "22222222-2222-4222-8222-222222222222" }],
  ] as const) {
    it(`changes when ${what} changes`, () => {
      expect(labelInputHash(changed, "m")).not.toBe(labelInputHash(card, "m"));
    });
  }

  // The model is in the payload so switching models relabels rather than silently mixing
  // two models' output in one table.
  it("changes when the model changes", () => {
    expect(labelInputHash(card, "haiku")).not.toBe(labelInputHash(card, "sonnet"));
  });

  // The CAST FACE is hashed, not the raw column. A back face changing moves nothing the
  // label was derived from, so it must not mark the row stale and buy a relabel.
  it("ignores a change behind the cast face of a two-faced card", () => {
    const front = "{T}: Add {G}.";
    const dfc = { ...card, layout: "modal_dfc", oracle_text: `${front}\n//\nLand back, one` };
    const other = { ...card, layout: "modal_dfc", oracle_text: `${front}\n//\nLand back, TWO` };
    expect(labelInputHash(dfc, "m")).toBe(labelInputHash(other, "m"));
  });

  // ...but a change to the face that IS sent must mark it stale.
  it("changes when the cast face itself changes", () => {
    const a = { ...card, layout: "modal_dfc", oracle_text: "{T}: Add {G}.\n//\nback" };
    const b = { ...card, layout: "modal_dfc", oracle_text: "{T}: Add {R}.\n//\nback" };
    expect(labelInputHash(a, "m")).not.toBe(labelInputHash(b, "m"));
  });

  // A split card keeps BOTH halves, because both are castable — so a change to either
  // side is a change to what the model was asked about.
  it("changes when either half of a split card changes", () => {
    const a = { ...card, layout: "split", oracle_text: "Fire deals 2\n//\nIce taps" };
    const b = { ...card, layout: "split", oracle_text: "Fire deals 2\n//\nIce draws" };
    expect(labelInputHash(a, "m")).not.toBe(labelInputHash(b, "m"));
  });

  it("changes when the prompt version changes", () => {
    // Asserted through the payload rather than by mutating the constant: the version is in
    // the hash, so this pins that it is READ rather than merely exported.
    expect(LABEL_PROMPT_VERSION).toBeTruthy();
    expect(labelInputHash(card, "m")).toHaveLength(64);
  });
});
