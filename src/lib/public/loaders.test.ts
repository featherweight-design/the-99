import { beforeEach, describe, expect, it, vi } from "vitest";

const resolve = vi.hoisted(() => vi.fn());
vi.mock("./resolve", async (orig) => ({ ...(await orig<typeof import("./resolve")>()), resolvePublicSlug: resolve }));

import { PRINTINGS_LIMIT, loadPublicCard, printingsQuery, splitFaces } from "./card";
import { loadPublicCommander, signatureQuery, SIGNATURE_LIMIT } from "./commander";
import { cardsByPrefixQuery } from "./resolve";

const ID = "0b3f2c9e-6a41-4d8e-9c53-1f0a7e2d4b68";

beforeEach(() => resolve.mockReset());

describe("the id lookup", () => {
  it("is a uuid RANGE on the primary key with a limit of two, never a text cast", async () => {
    const q = cardsByPrefixQuery("0b3f2c9e6a41").toSQL();
    expect(q.sql).toMatch(/"cards"\."oracle_id" >= \$1 and "cards"\."oracle_id" <= \$2/);
    expect(q.sql).not.toMatch(/::text|like/i);
    expect(q.sql).toMatch(/limit \$3/);
    expect(q.params.slice(0, 2)).toEqual(["0b3f2c9e-6a41-0000-0000-000000000000", "0b3f2c9e-6a41-ffff-ffff-ffffffffffff"]);
  });

});

describe("the card loader", () => {
  it("passes a not-found or ambiguous address straight through", async () => {
    resolve.mockResolvedValue({ kind: "ambiguous" });
    expect(await loadPublicCard("x-0b3f2c9e6a41")).toEqual({ kind: "ambiguous" });
    resolve.mockResolvedValue({ kind: "not-found" });
    expect(await loadPublicCard("x-0b3f2c9e6a41")).toEqual({ kind: "not-found" });
  });

  it("reads printings representative-first, then by set and number, bounded, from the printings table alone", () => {
    const q = printingsQuery(ID).toSQL();
    expect(q.sql).toMatch(/from "printings" where "printings"\."oracle_id" = \$1 order by "printings"\."is_representative" desc, "printings"\."set_code" asc, "printings"\."collector_number" asc limit \$2/);
    expect(q.params).toEqual([ID, PRINTINGS_LIMIT]);
    expect(q.sql).not.toMatch(/printing_prices/);
  });

  it("splits a double-faced or split card's name and type line, and leaves a one-faced card whole", () => {
    expect(splitFaces("Delver of Secrets // Insectile Aberration", "Creature — Human Wizard // Creature — Human Insect")).toEqual([
      { name: "Delver of Secrets", typeLine: "Creature — Human Wizard" },
      { name: "Insectile Aberration", typeLine: "Creature — Human Insect" },
    ]);
    expect(splitFaces("Sol Ring", "Artifact")).toEqual([{ name: "Sol Ring", typeLine: "Artifact" }]);
    expect(splitFaces("Fire // Ice", "Instant // Instant")).toHaveLength(2);
  });
});

describe("the commander loader", () => {
  it("passes a not-found or ambiguous address straight through", async () => {
    resolve.mockResolvedValue({ kind: "not-found" });
    expect(await loadPublicCommander("x-0b3f2c9e6a41")).toEqual({ kind: "not-found" });
  });

  it("orders the signature cards as the support list does: inclusion descending, nulls last, then oracle id", () => {
    const q = signatureQuery(ID).toSQL();
    expect(q.sql).toMatch(/inner join "cards" on "cards"\."oracle_id" = "commander_support_cards"\."oracle_id"/);
    expect(q.sql).toMatch(/order by "commander_support_cards"\."inclusion" desc nulls last, "commander_support_cards"\."oracle_id" asc limit \$2/);
    expect(q.params).toEqual([ID, SIGNATURE_LIMIT]);
  });
});

import { shapeCommander, similarIdsOf } from "./commander";

const card = { oracleId: ID, name: "Atraxa, Praetors' Voice", manaCost: "{G}{W}{U}{B}", cmc: 4, colorIdentity: ["B", "G", "U", "W"], typeLine: "Legendary Creature", oracleText: "Flying", keywords: [], commanderLegal: true, imageUri: "u", artCropUri: null, rarity: "mythic", layout: "normal", backImageUri: null, gameChanger: false, scryfallId: ID } as never;
const support = (over: object = {}) => ({
  commanderOracleId: ID, synergyState: "ok", edhrecTotal: 90, tags: [{ slug: "infect", label: "Infect", count: 5 }], bracketCounts: { "3": 4 }, budgetCounts: { cheap: 2 },
  similarOracleIds: ["a", "b", "c"], deckCount: 1200, rank: 7, engine: "triggered", prose: "Wants counters.", ...over,
}) as never;
const l = (oracleId: string, name: string) => ({ oracleId, name, imageUri: null });

describe("shapeCommander: the state rule", () => {
  it("an `ok` read carries every figure, the prose, and the similar commanders in EDHREC's order", () => {
    const c = shapeCommander(card, support(), [{ ...l("s", "Sol Ring"), inclusion: 90, synergy: 1 }], [l("c", "C"), l("a", "A"), l("b", "B")]);
    expect(c).toMatchObject({ state: "ok", rank: 7, deckCount: 1200, engine: "triggered", prose: "Wants counters.", slug: "atraxa-praetors-voice-0b3f2c9e6a41" });
    expect(c.similar.map((x) => x.name)).toEqual(["A", "B", "C"]);
    expect(c.signature).toEqual([expect.objectContaining({ name: "Sol Ring", inclusion: 90 })]);
  });

  it("`absent` and `degraded` carry NO figure, no prose (even a stored one) and no related cards", () => {
    for (const synergyState of ["absent", "degraded"]) {
      const c = shapeCommander(card, support({ synergyState }), [{ ...l("s", "S"), inclusion: 1, synergy: 1 }], [l("a", "A")]);
      expect(c).toMatchObject({ state: synergyState, rank: null, deckCount: null, tags: [], bracketCounts: {}, budgetCounts: {}, engine: null, prose: null, similar: [], signature: [] });
    }
    expect(similarIdsOf({ synergyState: "degraded", similarOracleIds: ["a"] })).toEqual([]);
  });

  it("a similar commander the support list does not name sorts to the END, not the front", () => {
    const c = shapeCommander(card, support(), [], [l("zzz", "Z"), l("c", "C"), l("a", "A")]);
    expect(c.similar.map((x) => x.name)).toEqual(["A", "C", "Z"]);
  });

  it("an `ok` read with no accepted prose, rank or deck count shows them blank rather than failing", () => {
    expect(shapeCommander(card, support({ prose: null, rank: null, deckCount: null }), [], [])).toMatchObject({ prose: null, rank: null, deckCount: null });
  });
});
