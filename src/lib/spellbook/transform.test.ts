import { describe, expect, it } from "vitest";

import fixture from "./__fixtures__/variants-head.json";
import { toVariantRows } from "./transform";

type Raw = Record<string, unknown>;
const RECORDS = fixture.variants as unknown as Raw[];
const byId = (id: string): Raw => {
  const r = RECORDS.find((v) => v.id === id);
  if (!r) throw new Error(`fixture has no variant ${id}`);
  return r;
};

/** Every oracle id the fixture mentions, so nothing is dropped for being unresolvable. */
const ALL_KNOWN = new Set(
  RECORDS.flatMap((r) => (r.uses as { card: { oracleId: string } }[]).map((u) => u.card.oracleId)),
);

describe("toVariantRows", () => {
  it("projects the fields the tables store, and none of the image URLs", () => {
    const out = toVariantRows(byId("4067-8192"), ALL_KNOWN);
    expect(out.kind).toBe("row");
    if (out.kind !== "row") return;
    expect(out.variant).toEqual({
      variantId: "4067-8192",
      bracketTag: expect.stringMatching(/^[RSPOCEB]$/),
      cardCount: 2,
      identity: expect.any(String),
      popularity: expect.any(Number),
      produces: expect.arrayContaining([expect.any(String)]),
      requiresTemplateIds: [],
      // The fixture is a trimmed head and carries none of these four; the cases below pin
      // their behaviour against records that do.
      manaNeeded: null,
      manaValueNeeded: null,
      steps: null,
      notablePrerequisites: null,
    });
    expect(out.cards).toHaveLength(2);
    expect(JSON.stringify(out)).not.toMatch(/cards\.scryfall\.io|imageUri/);
  });

  // §4.3b rule 1. `cardCount` counts `uses` ONLY, so a two-use variant that also requires a
  // template is stored with cardCount 2 AND a non-empty template list — the combo join
  // excludes it there rather than here, because sub-project 3 surfaces it as a near-miss.
  // Measured on the live bulk: 2 of 13 two-use variants carry one, so a join without the
  // rule would count roughly one in seven "two-card combos" that the deck cannot assemble.
  it("keeps a two-use variant's template prerequisites rather than discarding them", () => {
    const out = toVariantRows(byId("3760-5147--86"), ALL_KNOWN);
    expect(out.kind).toBe("row");
    if (out.kind !== "row") return;
    expect(out.variant.cardCount).toBe(2);
    expect(out.variant.requiresTemplateIds).toEqual([86]);
  });

  it("reads template ids from requires[].template.id", () => {
    const out = toVariantRows(byId("529-1849-7690-8181--165"), ALL_KNOWN);
    expect(out.kind).toBe("row");
    if (out.kind !== "row") return;
    expect(out.variant.requiresTemplateIds).toEqual([165]);
    expect(out.variant.cardCount).toBe(4);
  });

  // The hole rule 1 could have been defeated through. Filtering a malformed template id out
  // leaves `requiresTemplateIds` empty, and the combo query then reads a three-piece variant
  // as an assembleable two-card infinite — over-slotting a deck to Bracket 4 over a combo it
  // cannot make, which is the exact false positive the rule exists to prevent.
  it("drops a variant whose template prerequisite has a malformed id", () => {
    const r = byId("3760-5147--86");
    for (const bad of [{ template: {} }, { template: { id: "86" } }, { template: { id: null } }, {}]) {
      const out = toVariantRows({ ...r, requires: [bad] }, ALL_KNOWN);
      expect(out).toEqual({ kind: "drop", reason: "malformed-prerequisite" });
    }
  });

  it("drops the variant even when one prerequisite of several is malformed", () => {
    const r = byId("3760-5147--86");
    const out = toVariantRows(
      { ...r, requires: [{ template: { id: 86 } }, { template: { id: "nope" } }] },
      ALL_KNOWN,
    );
    expect(out).toEqual({ kind: "drop", reason: "malformed-prerequisite" });
  });

  it("drops a commander-illegal variant and says so", () => {
    const out = toVariantRows(byId("4613-4687-5709"), ALL_KNOWN);
    expect(out).toEqual({ kind: "drop", reason: "not-commander-legal" });
  });

  it("carries mustBeCommander per card", () => {
    const out = toVariantRows(byId("4067-8192"), ALL_KNOWN);
    if (out.kind !== "row") throw new Error("expected a row");
    for (const c of out.cards) expect(typeof c.mustBeCommander).toBe("boolean");
  });

  it("projects produces as feature NAMES, from produces[].feature.name", () => {
    const out = toVariantRows(byId("4067-8192"), ALL_KNOWN);
    if (out.kind !== "row") throw new Error("expected a row");
    expect(out.variant.produces.every((p) => typeof p === "string" && p.length > 0)).toBe(true);
  });

  // Unresolvable names are dropped and COUNTED, exactly as the EDHREC ingest treats them —
  // so a card the catalog has not ingested reduces measured coverage rather than silently
  // shrinking a denominator. The FK would abort the insert anyway; resolving first is what
  // turns that into a number somebody can read.
  it("drops a variant naming a card the catalog does not have", () => {
    const out = toVariantRows(byId("4067-8192"), new Set<string>());
    expect(out).toEqual({ kind: "drop", reason: "unresolvable-card" });
  });

  it("drops a variant with no uses rather than storing a zero-card combo", () => {
    const out = toVariantRows({ ...byId("4067-8192"), uses: [] }, ALL_KNOWN);
    expect(out).toEqual({ kind: "drop", reason: "no-uses" });
  });

  it("drops a variant whose bracketTag is outside the seven the check constraint allows", () => {
    const out = toVariantRows({ ...byId("4067-8192"), bracketTag: "Z" }, ALL_KNOWN);
    expect(out).toEqual({ kind: "drop", reason: "unknown-bracket-tag" });
  });

  // popularity is nullable upstream and the spec names a real record carrying null.
  it("keeps a null popularity as null rather than coercing it to 0", () => {
    const out = toVariantRows({ ...byId("4067-8192"), popularity: null }, ALL_KNOWN);
    if (out.kind !== "row") throw new Error("expected a row");
    expect(out.variant.popularity).toBeNull();
  });

  it("de-duplicates a variant that names one card twice", () => {
    const r = byId("4067-8192");
    const uses = r.uses as unknown[];
    const out = toVariantRows({ ...r, uses: [...uses, uses[0]] }, ALL_KNOWN);
    if (out.kind !== "row") throw new Error("expected a row");
    // The composite primary key is (variant_id, oracle_id): a duplicate row fails the whole
    // insert batch, so the same card named twice must collapse rather than be emitted twice.
    expect(new Set(out.cards.map((c) => c.oracleId)).size).toBe(out.cards.length);
    // …and cardCount still reports what upstream said the combo uses.
    expect(out.variant.cardCount).toBe(3);
  });
});

// The four fields the reasoning modal draws. The trimmed fixture carries none of them, so these
// build the records — which also lets each case state the exact upstream shape it is about.
describe("toVariantRows — the reasoning modal's fields", () => {
  const ORACLE = "66d41377-626d-4ae6-ba86-17bf0c8b3362";
  const KNOWN = new Set([ORACLE, "b0a54050-3493-4ff6-8eca-e43b92c1f3d3"]);
  const base = (extra: Record<string, unknown>): Record<string, unknown> => ({
    id: "1-2",
    bracketTag: "E",
    identity: "R",
    legalities: { commander: true },
    uses: [{ card: { oracleId: ORACLE } }, { card: { oracleId: "b0a54050-3493-4ff6-8eca-e43b92c1f3d3" } }],
    produces: [{ feature: { name: "Infinite mana" } }],
    ...extra,
  });
  const row = (extra: Record<string, unknown>) => {
    const out = toVariantRows(base(extra), KNOWN);
    if (out.kind !== "row") throw new Error(`dropped: ${out.reason}`);
    return out.variant;
  };

  it("carries the mana, the steps and the prerequisites when upstream sends them", () => {
    const v = row({
      manaNeeded: "{2}",
      manaValueNeeded: 2,
      description: "Sacrifice the creature.\nReturn it.\nRepeat.",
      notablePrerequisites: "You control at least five creatures.",
    });
    expect(v.manaNeeded).toBe("{2}");
    expect(v.manaValueNeeded).toBe(2);
    expect(v.steps).toBe("Sacrifice the creature.\nReturn it.\nRepeat.");
    expect(v.notablePrerequisites).toBe("You control at least five creatures.");
  });

  // 59% of variants need NO mana to execute, and that zero is the fact the modal draws as
  // "No mana needed". Coercing it to null — which `|| null` or a truthiness test would do —
  // turns the most informative reading on the record into "we do not know".
  it("keeps a zero mana value, because zero means the combo is free rather than unknown", () => {
    const v = row({ manaNeeded: "", manaValueNeeded: 0, description: "Go off." });
    expect(v.manaValueNeeded).toBe(0);
    expect(v.manaNeeded).toBeNull();
  });

  // Upstream sends "" far more often than it omits the key, and a "" reaching the database
  // would be drawn as a prerequisite nobody wrote.
  it("folds upstream's empty strings to null", () => {
    const v = row({ manaNeeded: "   ", description: "", notablePrerequisites: "" });
    expect(v.manaNeeded).toBeNull();
    expect(v.steps).toBeNull();
    expect(v.notablePrerequisites).toBeNull();
  });

  // A non-numeric mana value is not a zero. Treating it as one would claim the combo is free.
  it("rejects a non-numeric mana value rather than reading it as free", () => {
    expect(row({ manaValueNeeded: "2" }).manaValueNeeded).toBeNull();
    expect(row({ manaValueNeeded: null }).manaValueNeeded).toBeNull();
  });
});
