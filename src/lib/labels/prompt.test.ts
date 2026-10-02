import { describe, expect, it } from "vitest";

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildRequest, labelInputHash, LABEL_PROMPT_VERSION, renderCard, SENDS_CACHE_BREAKPOINT, SYSTEM, SYSTEM_TOKENS_BOUND,
} from "./prompt";

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
  // Both real model ids, because the first version of this had the arguments the wrong way
  // round — `buildRequest(customId, model, cards)` — and built a request for a model called
  // "b-0", where `acceptsTemperature` and `needsThinkingDisabled` both take their default
  // branch. It asserted caching on a model that does not exist.
  for (const model of ["claude-sonnet-4-5", "claude-haiku-4-5-20251001", "claude-sonnet-5"]) {
    it(`sends no cache_control on the system block for ${model}`, () => {
      const req = buildRequest("b-0", model, [card]);
      expect(req.params.model).toBe(model);
      expect(req.params.system).toHaveLength(1);
      expect(req.params.system[0]).not.toHaveProperty("cache_control");
    });
  }

  // While a real id is in hand: the two model-specific branches, which nothing else pins.
  it("omits temperature for Sonnet 5 and disables its thinking", () => {
    const s5 = buildRequest("b-0", "claude-sonnet-5", [card]).params;
    expect(s5).not.toHaveProperty("temperature");
    expect(s5.thinking).toEqual({ type: "disabled" });
  });

  it("pins temperature at 0 for the 4.5 family and leaves thinking alone", () => {
    const s45 = buildRequest("b-0", "claude-sonnet-4-5", [card]).params;
    expect(s45.temperature).toBe(0);
    expect(s45).not.toHaveProperty("thinking");
  });

  // The estimator multiplies by this rather than by a model's capability, so it has to
  // agree with what the request actually sends. Two places, one fact.
  it("advertises that through SENDS_CACHE_BREAKPOINT", () => {
    expect(SENDS_CACHE_BREAKPOINT).toBe(false);
    const req = buildRequest("b-0", "claude-sonnet-4-5", [card]);
    const sends = req.params.system.some((b) => "cache_control" in b);
    expect(sends).toBe(SENDS_CACHE_BREAKPOINT);
  });
});

describe("SYSTEM_TOKENS_BOUND", () => {
  // The build's hard stop is booked on this. A figure under the block's length is no bound, and
  // the build must read this one rather than keep a constant measured on an older block.
  it("is at least one token per character, and is what the build books", () => {
    expect(SYSTEM_TOKENS_BOUND).toBeGreaterThanOrEqual(SYSTEM.length);
    // import.meta.url, not __dirname: Vitest runs tests as ESM.
    const build = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../../scripts/build-card-labels.ts"), "utf8");
    expect(build).toMatch(/const SYSTEM_TOKENS = SYSTEM_TOKENS_BOUND;/);
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

  // Version "2" is what makes every row labelled before `affects`, `to` and `method` existed read STALE.
  // Recomputing the payload with the constant itself cannot see a revert to "1", so the literal is pinned
  // and a row hashed under "1" is shown not to match.
  it("is version 2, so a row hashed under version 1 reads stale", () => {
    expect(LABEL_PROMPT_VERSION).toBe("2");
    const underV1 = createHash("sha256")
      .update(JSON.stringify([card.oracleId, renderCard(card), "1", "m"]))
      .digest("hex");
    expect(labelInputHash(card, "m")).not.toBe(underV1);
  });

  // The version has to be READ, not merely exported. A hash computed over a payload with
  // the version removed is a different digest, so recomputing the documented payload by
  // hand and requiring the function to agree is what pins it — the first version of this
  // test asserted the constant was truthy and the digest 64 chars, which passes with
  // `LABEL_PROMPT_VERSION` deleted from the payload entirely.
  it("reads the prompt version, and the documented payload is the real one", () => {
    const expected = createHash("sha256")
      .update(JSON.stringify([card.oracleId, renderCard(card), LABEL_PROMPT_VERSION, "m"]))
      .digest("hex");
    expect(labelInputHash(card, "m")).toBe(expected);
  });

  // EVERY field `renderCard` sends must move the hash. This is the coupling that was
  // missing: the payload omitted `mana_cost`, which is sent and from which an `mv`
  // threshold is derived, so a cost errata'd under the same oracle id hashed identically,
  // skipped, and kept a stale `mv >= 5` for ever.
  describe("every field the model is sent moves the hash", () => {
    for (const [what, changed] of [
      ["mana_cost", { ...card, mana_cost: "{4}{R}" }],
      ["name", { ...card, name: "Bejewelled Warg" }],
      ["type_line", { ...card, type_line: "Creature — Dog" }],
      ["oracle_text", { ...card, oracle_text: "Whenever this creature attacks, draw a card." }],
    ] as const) {
      it(`moves when ${what} changes`, () => {
        expect(renderCard(changed)).not.toBe(renderCard(card));
        expect(labelInputHash(changed, "m")).not.toBe(labelInputHash(card, "m"));
      });
    }

    // The converse, so the rule is not "any change at all": a field the model is NOT sent
    // must not buy a relabel. `oracleId` is excluded — it is the key, and in the payload.
    it("does not move when something the model never sees changes", () => {
      const sameRender = { ...card, layout: "normal" };
      expect(renderCard(sameRender)).toBe(renderCard(card));
      expect(labelInputHash(sameRender, "m")).toBe(labelInputHash(card, "m"));
    });
  });
});
