import { afterEach, describe, expect, it, vi } from "vitest";

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildRequest, labelInputHash, labelIsFresh, LABEL_PROMPT_VERSION, needsLabel, PROMPT_SYSTEM_SHA256, renderCard,
  SENDS_CACHE_BREAKPOINT, SYSTEM, SYSTEM_TOKENS_BOUND,
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
      expect(req.params.system[0]).toMatchObject({ text: SYSTEM });
      expect(req.params.system[0]).not.toHaveProperty("cache_control");
      expect(typeof req.params.messages[0].content).toBe("string");
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
    const build = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../../scripts/lib/card-labels-build.ts"), "utf8");
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

  // The vocabulary plan's Task 3: the SYSTEM prompt's hash is in the payload, read from the registry
  // entry of the version asked for, so a hash names the instruction it was written under.
  it("changes with the version and its registered SYSTEM hash, and defaults to the current version", () => {
    const reg = { ...PROMPT_SYSTEM_SHA256, "9": "f".repeat(64) };
    expect(labelInputHash(card, "m", "9", reg)).not.toBe(labelInputHash(card, "m", LABEL_PROMPT_VERSION, reg));
    expect(labelInputHash(card, "m", "8", { "8": "0".repeat(64) })).not.toBe(labelInputHash(card, "m", "8"));
    expect(labelInputHash(card, "m", LABEL_PROMPT_VERSION)).toBe(labelInputHash(card, "m"));
  });

  // The version itself is in the payload, not only its SYSTEM hash: a bump whose SYSTEM is unchanged
  // (a rule moved into the parser, say) still writes a hash that names the new version.
  it("changes with the version even when two versions share one SYSTEM hash", () => {
    const same = { "8": PROMPT_SYSTEM_SHA256["8"], "9": PROMPT_SYSTEM_SHA256["8"] };
    expect(labelInputHash(card, "m", "9", same)).not.toBe(labelInputHash(card, "m", "8", same));
  });

  it("throws for a version the registry does not hold", () => {
    expect(() => labelInputHash(card, "m", "7")).toThrow(/no SYSTEM hash is registered/);
    // Not a prototype key either: `constructor` is on every object and is no version.
    expect(() => labelInputHash(card, "m", "constructor")).toThrow(/no SYSTEM hash is registered/);
  });

  // THE STORED v8 HASHES MUST STILL MATCH (2026-10-04). Staging and production hold rows hashed by the
  // previous `labelInputHash(card, model, system = SYSTEM)`; the registry version must reproduce it
  // exactly, or every stored row reads stale and the next build pays for all of them. Two checks: the
  // old formula, copied verbatim, and a digest the OLD function returned for this card before the
  // change (captured on the pre-change tree), which does not depend on SYSTEM at all.
  it("returns exactly what the pre-registry function did for version 8", () => {
    // The old formula hashed the CURRENT SYSTEM, so it only reproduces v8 while SYSTEM is still v8's
    // text. After a v9 bump, compare against the frozen v8 hash: the literal pin below is the one
    // that guards the stored v8 hashes independently of SYSTEM.
    const V8_SYSTEM_SHA256 = PROMPT_SYSTEM_SHA256["8"];
    const oldLabelInputHash = (c: typeof card, model: string) => createHash("sha256")
      .update(JSON.stringify([c.oracleId, renderCard(c), "8", model, V8_SYSTEM_SHA256]))
      .digest("hex");
    for (const model of ["m", "claude-sonnet-4-5"]) {
      expect(labelInputHash(card, model, "8")).toBe(oldLabelInputHash(card, model));
    }
    const elves = {
      oracleId: "11111111-1111-4111-8111-111111111111", name: "Llanowar Elves", mana_cost: "{G}",
      type_line: "Creature — Elf Druid", oracle_text: "{T}: Add {G}.", layout: "normal",
    };
    expect(labelInputHash(elves, "claude-sonnet-4-5", "8"))
      .toBe("d7a54b0705b3f3a960cce838f5a295d822221b6448584435b8f08c5e083d437a");
  });

  // The model is in the payload so a row records which model wrote it: the hash a row is checked
  // against is built under the row's OWN model. A model switch therefore relabels nothing by itself;
  // a `list:` run is how rows of another model are deliberately redone.
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

  // Version "8" is the empty-label fix. Recomputing the payload with the constant
  // itself cannot see a revert, so the literal is pinned and a row hashed under "7" with this SYSTEM is shown
  // not to match.
  it("is version 8, so a row hashed under version 7 reads stale", () => {
    expect(LABEL_PROMPT_VERSION).toBe("8");
    const underV7 = createHash("sha256")
      .update(JSON.stringify([
        card.oracleId, renderCard(card), "7", "m", createHash("sha256").update(SYSTEM).digest("hex"),
      ]))
      .digest("hex");
    expect(labelInputHash(card, "m")).not.toBe(underV7);
  });

  // A SYSTEM edit must move the version with it. A row is checked against its OWN version's registry
  // entry, so an edit under an unchanged version would write new labels whose hashes name an
  // instruction the registry says was something else. When this fails: bump LABEL_PROMPT_VERSION and
  // ADD a `PROMPT_SYSTEM_SHA256` entry for it. Never edit or remove an old entry (append-only): the
  // rows written under it would all read stale and be paid for again.
  it("pins SYSTEM to the current version's registry entry", () => {
    expect(PROMPT_SYSTEM_SHA256[LABEL_PROMPT_VERSION]).toBe(createHash("sha256").update(SYSTEM).digest("hex"));
  });

  // The v8 entry is a literal, so a v9 bump that rewrote it instead of adding one is caught here.
  it("keeps version 8's entry", () => {
    expect(PROMPT_SYSTEM_SHA256["8"]).toBe("826775f8b8851f3ed337225304f9fb0baeb31baf2505ece20a5ea5d47f90f43d");
  });

  // The version has to be READ, not merely exported. A hash computed over a payload with
  // the version removed is a different digest, so recomputing the documented payload by
  // hand and requiring the function to agree is what pins it — the first version of this
  // test asserted the constant was truthy and the digest 64 chars, which passes with
  // `LABEL_PROMPT_VERSION` deleted from the payload entirely.
  it("reads the prompt version, and the documented payload is the real one", () => {
    const expected = createHash("sha256")
      .update(JSON.stringify([
        card.oracleId, renderCard(card), LABEL_PROMPT_VERSION, "m", createHash("sha256").update(SYSTEM).digest("hex"),
      ]))
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

// Version-aware freshness (Hugh, 2026-10-04): a row is judged under the version and model that wrote
// it. A "v9" is simulated through an injected registry, which is exactly what a bump would add.
describe("labelIsFresh", () => {
  const V9 = { ...PROMPT_SYSTEM_SHA256, "9": "9".repeat(64) };
  const v8row = (over: Partial<{ model: string; promptVersion: string; inputHash: string }> = {}) =>
    ({ model: "m", promptVersion: "8", inputHash: labelInputHash(card, "m", "8"), ...over });

  it("is fresh for a row whose hash matches its card under its own version and model", () => {
    expect(labelIsFresh(v8row(), card)).toBe(true);
  });

  it("keeps a v8 row fresh after a v9 entry is registered and v9 is current", () => {
    expect(labelIsFresh(v8row(), card, V9)).toBe(true);
    // ...and a v9 row is fresh under v9 beside it.
    expect(labelIsFresh({ model: "m", promptVersion: "9", inputHash: labelInputHash(card, "m", "9", V9) }, card, V9)).toBe(true);
  });

  it("keeps a row fresh under its own model, whatever model the build now uses", () => {
    expect(labelIsFresh(v8row({ model: "haiku", inputHash: labelInputHash(card, "haiku", "8") }), card)).toBe(true);
  });

  it("stales a row whose card text moved", () => {
    expect(labelIsFresh(v8row(), { ...card, oracle_text: "Whenever this creature attacks, draw a card." })).toBe(false);
    expect(labelIsFresh(v8row(), { ...card, mana_cost: "{4}{R}" })).toBe(false);
  });

  it("stales a row of a version the registry does not hold, without throwing", () => {
    expect(labelIsFresh(v8row({ promptVersion: "7" }), card)).toBe(false);
    // A v8 hash relabelled "9" on a registry without 9 is unknown, not fresh.
    expect(labelIsFresh(v8row({ promptVersion: "9" }), card)).toBe(false);
  });

  it("stales a row whose stored version or model is not the one its hash was written under", () => {
    expect(labelIsFresh(v8row({ promptVersion: "9" }), card, V9)).toBe(false);
    expect(labelIsFresh(v8row({ model: "other" }), card)).toBe(false);
  });
});

describe("needsLabel", () => {
  const V9 = { ...PROMPT_SYSTEM_SHA256, "9": "9".repeat(64) };
  const v8row = { model: "m", promptVersion: "8", inputHash: labelInputHash(card, "m", "8") };
  const asV9 = { model: "m", version: "9", registry: V9 };

  it("labels a card with no row", () => {
    expect(needsLabel(card, undefined, { redo: false, model: "m" })).toBe(true);
  });

  it("does not relabel a fresh older-version row on a plain scope after a bump", () => {
    expect(needsLabel(card, v8row, { redo: false, ...asV9 })).toBe(false);
  });

  it("does not relabel a fresh row on a plain scope after a model switch", () => {
    expect(needsLabel(card, v8row, { redo: false, model: "other" })).toBe(false);
  });

  it("relabels a row whose text moved, on any scope", () => {
    const moved = { ...card, oracle_text: "Whenever this creature attacks, draw a card." };
    expect(needsLabel(moved, v8row, { redo: false, model: "m" })).toBe(true);
  });

  it("relabels an unknown-version row on any scope", () => {
    expect(needsLabel(card, { ...v8row, promptVersion: "7" }, { redo: false, model: "m" })).toBe(true);
  });

  // The deliberate redo: a `list:<name>` scope relabels its listed cards under the current prompt.
  it("redoes an older-version or other-model row when asked to", () => {
    expect(needsLabel(card, v8row, { redo: true, ...asV9 })).toBe(true);
    expect(needsLabel(card, v8row, { redo: true, model: "other" })).toBe(true);
  });

  it("does not redo a row already written under the current version and model", () => {
    expect(needsLabel(card, v8row, { redo: true, model: "m" })).toBe(false);
  });
});

// The ceiling may only be LOWERED: an expired batch is reserved at `MAX_TOKENS_CEILING`, which is a
// bound on what it cost only if no request can carry more.
describe("LABEL_MAX_TOKENS", () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });
  const load = async (raw: string) => {
    vi.stubEnv("LABEL_MAX_TOKENS", raw);
    vi.resetModules();
    return (await import("./prompt")).MAX_TOKENS_PER_BATCH;
  };
  it("lowers the ceiling", async () => { expect(await load("4000")).toBe(4000); });
  it("accepts the ceiling itself", async () => { expect(await load("5000")).toBe(5000); });
  it("refuses to raise it", async () => { await expect(load("5001")).rejects.toThrow(/only lower/); });
});

// The v8 fix (2026-10-04). v7 left 11.7% of any-target burn with no jobs: its removal definition named
// no damage, its drain line said any-target damage was NEVER drain, and its last line sanctioned an
// empty answer for any card it could not fit. Each clause is pinned so a revert reads red here, not in
// a paid run.
describe("SYSTEM v8: damage and the empty answer", () => {
  // One definition: from its own "  name — " line up to the next definition's.
  const def = (role: string) => {
    const at = SYSTEM.search(new RegExp(`^  ${role} +—`, "m"));
    const rest = SYSTEM.slice(at + 1);
    const next = rest.search(/^  [a-zA-Z]+ +—/m);
    return next === -1 ? rest : rest.slice(0, next);
  };

  it("counts damage that can hit a creature or permanent as removal", () => {
    expect(def("removal")).toMatch(/deals damage to it/);
    expect(def("removal")).toMatch(/"deals\s+3 damage to any target" and "deals 2 damage to target\s+creature" are both removal/);
    // Spiteful Bully: damage only to your own creature is no opponent's loss.
    expect(def("removal")).toMatch(/Damage only to a creature YOU\s+control is not/);
  });

  // A sweeper stays wipes alone (Pyroclasm, Blasphemous Act, Pestilence in the gold set): the damage
  // rule is about TARGETED damage, or v8 would add a removal job to every damage wipe.
  it("keeps damage to each creature a wipe, not removal", () => {
    expect(def("removal")).toMatch(/TARGETED damage/);
    expect(def("removal")).toMatch(/Damage to EACH creature is wipes\./);
    expect(def("wipes")).toMatch(/"deals 2\s+damage to each creature"/);
  });

  it("labels any-target damage drain as well, never drain alone", () => {
    expect(SYSTEM).not.toMatch(/NEVER drain/);
    expect(def("drain")).toMatch(/removal FIRST, and drain AS WELL/);
    expect(def("drain")).toMatch(/Damage that cannot hit a player\s+is never drain/);
  });

  // Empty means no ability maps to a job, not no ability at all: a tapper, a scry or a cycling card stays [],
  // and a creature's own flying is still evasion.
  it("keeps an empty answer for a card whose abilities map to no job", () => {
    expect(SYSTEM).not.toMatch(/A card with no job in the vocabulary gets/);
    expect(SYSTEM).toMatch(/"jobs": \[\] is ONLY for a card none of whose abilities is one of the jobs above/);
    expect(SYSTEM).toMatch(/Damage that\s+can hit an opponent or an opponent's permanent is always a job/);
    // A land is never ramp (Escape Tunnel), and landcycling is not fetchesLand (Topiary Panther).
    expect(SYSTEM).toMatch(/a NONLAND card's fetchesLand search as defined above \(ramp\)/);
    // Cycling is NOT draw (the draw definition), so the never-empty clause must not name drawing.
    expect(SYSTEM).not.toMatch(/never answer \[\] for a\s+card that[^.]*draws/i);
  });
});
