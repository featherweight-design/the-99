// The two rules the stored-pair reader and the demand path turn on, tested directly.
//
// Both are module-private in spirit and exported for this: they are the RULES, and the
// wiring around them needs a database, which is `probe:` territory. Round 3 of #754 found
// both, and both are the same shape — a value that looks like an answer and is not.
import { describe, expect, it } from "vitest";

import { compositionFrom, usable } from "./pair-read";

const FULL = {
  avgLand: 37, avgBasic: 17, avgNonbasic: 20, avgCreature: 26, avgInstant: 11,
  avgSorcery: 5, avgArtifact: 13, avgEnchantment: 6, avgPlaneswalker: 0, avgBattle: 0,
};

describe("compositionFrom", () => {
  it("returns every count when the row is whole", () => {
    expect(compositionFrom(FULL)).toEqual({
      land: 37, basic: 17, nonbasic: 20, creature: 26, instant: 11,
      sorcery: 5, artifact: 13, enchantment: 6, planeswalker: 0, battle: 0,
    });
  });

  // A zero is a real count. The reader was substituting one for every null but `avgLand`,
  // so a partial row reported a 37-land deck holding no basics and no nonbasics — which
  // breaks `basic + nonbasic = land`, an invariant a consumer may lean on.
  it("returns null when ANY column is missing, not only the first", () => {
    for (const key of Object.keys(FULL) as (keyof typeof FULL)[]) {
      expect(compositionFrom({ ...FULL, [key]: null })).toBeNull();
    }
  });

  // A real zero must survive. Planeswalker and battle counts are legitimately 0 on most
  // commanders, and a check written as falsy rather than null would erase the whole row.
  it("keeps a genuine zero", () => {
    expect(compositionFrom({ ...FULL, avgPlaneswalker: 0, avgBattle: 0 })?.land).toBe(37);
  });
});

describe("usable", () => {
  // `parseEdhrecPayload` degrades to an empty topCards on a shape it does not recognise, so
  // a 200 carrying no cardlists parses to a perfectly non-null EdhrecData describing
  // nothing. Returned from the demand path it would be cached for thirty days, and
  // `suggestions-read` prefers a pair result over the merge — so one bad page replaces a
  // working list with an empty one until the TTL expires.
  it("refuses a parse carrying no cards", () => {
    expect(usable({})).toBeNull();
    expect(usable({ container: { json_dict: { cardlists: [] } } })).toBeNull();
  });

  it("accepts a parse carrying cards", () => {
    const payload = {
      container: {
        json_dict: {
          cardlists: [
            { header: "High Synergy Cards", cardviews: [{ name: "Sol Ring", inclusion: 90, synergy: 0.4 }] },
          ],
        },
      },
    };
    expect(usable(payload)?.topCards).toEqual(["Sol Ring"]);
  });
});
