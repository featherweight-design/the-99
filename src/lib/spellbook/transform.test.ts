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
