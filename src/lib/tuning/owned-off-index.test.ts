import { beforeEach, describe, expect, it, vi } from "vitest";

const availability = vi.hoisted(() => ({ map: new Map<string, { free: number }>(), calls: [] as string[][] }));
const prices = vi.hoisted(() => ({ map: new Map<string, number>() }));
vi.mock("../decks/availability-query", () => ({
  loadAvailability: vi.fn(async (_u: string, opts: { oracleIds: string[] }) => { availability.calls.push(opts.oracleIds); return availability.map; }),
}));
vi.mock("../decks/price-query", () => ({
  loadPrices: vi.fn(async () => {
    const asOf = new Date(0);
    return { prices: new Map([...prices.map].map(([id, cents]) => [id, { cents, foilCents: null, etchedCents: null, asOf }])), newestAsOf: asOf };
  }),
}));

import { db } from "../../db";
import { ENV_VIEW } from "@/test/env-view";
import { loadOwnedOffIndex, NEIGHBOUR_COMMANDERS, neighbourQuery, offIndexQuery, offIndexWorthOffering, rankOffIndex, readOwnedOffIndex, type OffIndexFitCard } from "./owned-candidates";
import type { Job } from "../labels/types";
import { OWNED_OFF_INDEX_MAX } from "./limits";

const args = {
  userId: "u1", deckId: "deck", commanderOracleIds: ["cmd"], colorIdentity: ["W", "U"], inDeck: new Set(["d1", "d2"]),
  limits: { capCents: null as number | null, sets: [] as string[] }, env: ENV_VIEW,
};

describe("offIndexQuery", () => {
  it("aliases and qualifies every correlated subquery on the single-table select (AGENTS.md)", () => {
    const { sql } = offIndexQuery(db, { ...args, neighbours: ["n1"] }).toSQL();
    // Both ranking sums name the outer card explicitly; a bare "oracle_id" would compare csc with itself.
    expect(sql).toContain('(select sum(csc.inclusion)::float8 from "commander_support_cards" csc where csc.oracle_id = "cards".oracle_id and csc.commander_oracle_id = any(');
    expect(sql).toContain('join "cards" cc on cc.oracle_id = csc.commander_oracle_id where csc.oracle_id = "cards".oracle_id and cc.color_identity <@');
    expect(sql).toContain('ci.oracle_id = "cards".oracle_id');
    expect(sql).toContain('twin.name = "cards".name and twin.oracle_id <> "cards".oracle_id');
    expect(sql).not.toMatch(/= "oracle_id"/);
  });

  it("reads each card's label row beside it, joined on the card's own id", () => {
    const { sql } = offIndexQuery(db, { ...args, neighbours: [] }).toSQL();
    expect(sql).toContain('left join "card_labels" on "card_labels"."oracle_id" = "cards"."oracle_id"');
    expect(sql).toContain('"card_labels"."labels"');
    expect(sql).toContain('"card_labels"."input_hash"');
  });

  it("keeps the card off this commander's index, out of the deck, not a commander, and owned", () => {
    const { sql, params } = offIndexQuery(db, { ...args, neighbours: [] }).toSQL();
    expect(sql).toContain('not exists (select 1 from "commander_support_cards" csc where csc.oracle_id = "cards".oracle_id and csc.commander_oracle_id = any(');
    // Two exclusions by id: the deck's cards, and its commanders (a commander need not sit in deck_cards).
    expect(sql.match(/"cards"\.oracle_id <> all\(/g)).toHaveLength(2);
    expect(sql).toContain("collection_items");
    expect(params).toContainEqual(["cmd"]);
    expect(params).toContainEqual(["d1", "d2"]);
    expect(params).toContain("u1");
  });
});

describe("neighbourQuery", () => {
  it("reads commanders inside the identity, not the deck's own, by overlap with the deck's cards, at most twenty", () => {
    const { sql, params } = neighbourQuery(db, args).toSQL();
    expect(sql).toContain('"cards"."color_identity" <@');
    expect(sql).toContain('"commander_support_cards"."commander_oracle_id" <> all(');
    expect(sql).toContain('"commander_support_cards"."oracle_id" = any(');
    expect(sql).toMatch(/order by count\(\*\) desc/);
    expect(params).toContain(NEIGHBOUR_COMMANDERS);
    expect(NEIGHBOUR_COMMANDERS).toBe(20);
  });
});

describe("rankOffIndex", () => {
  const row = (name: string, neighbourInclusion: number | null, identityInclusion: number | null) => ({ oracleId: name, name, neighbourInclusion, identityInclusion });
  it("orders by neighbour inclusion, then identity-wide inclusion, then the name, and drops a card scoring nothing on both", () => {
    const ranked = rankOffIndex([
      row("Z low", 5, 900), row("Identity only", null, 50), row("B high", 40, 10), row("A high", 40, 10), row("A tie", 40, 30),
      row("Nothing", null, null), row("Zero", 0, 0),
    ]);
    expect(ranked.map((r) => r.name)).toEqual(["A tie", "A high", "B high", "Z low", "Identity only"]);
  });
});

describe("loadOwnedOffIndex", () => {
  type Row = {
    oracleId: string; name: string; typeLine: string; oracleText: string | null; layout: string; manaCost: string | null; keywords: string[];
    labels: unknown; labelModel: string | null; promptVersion: string | null; inputHash: string | null;
    neighbourInclusion: number | null; identityInclusion: number | null;
  };
  // A creature with no label row: always worth offering (`offIndexWorthOffering`), so these tests read the ranking alone.
  const row = (i: number, n: number | null = 100 - i, id: number | null = null, typeLine = "Creature — Elf", oracleText: string | null = null): Row => ({
    oracleId: `id${i}`, name: `Card ${i}`, typeLine, oracleText, layout: "normal", manaCost: "{G}", keywords: [],
    labels: null, labelModel: null, promptVersion: null, inputHash: null, neighbourInclusion: n, identityInclusion: id,
  });
  // The first select is the neighbours' read, the second the candidates'.
  const reader = (neighbours: string[], rows: Row[]) => {
    let call = 0;
    const seen = { neighbourReads: 0 };
    const r = {
      select: () => {
        const mine = call++;
        const result = mine === 0 && neighbours !== null ? neighbours.map((commanderOracleId) => ({ commanderOracleId, overlap: 1 })) : rows;
        if (mine === 0) seen.neighbourReads++;
        const chain: Record<string, unknown> = {};
        for (const m of ["from", "innerJoin", "leftJoin", "where", "groupBy", "orderBy", "limit"]) chain[m] = () => chain;
        chain.then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => Promise.resolve(result).then(res, rej);
        return chain;
      },
    };
    return { read: r as unknown as Parameters<typeof loadOwnedOffIndex>[1], seen };
  };

  beforeEach(() => {
    availability.map = new Map();
    availability.calls = [];
    prices.map = new Map();
  });

  it("returns the ranked cards, skipping one with no free copy, one over the cap, one already offered, and one scoring nothing", async () => {
    availability.map = new Map([["id1", { free: 0 }], ["id2", { free: 1 }]]);
    prices.map = new Map([["id3", 900], ["id4", 100]]);
    const { read } = reader(["n1"], [row(4), row(1), row(2), row(3), row(5), row(6, null, null)]);
    const out = await loadOwnedOffIndex({ ...args, limits: { capCents: 300, sets: [] }, exclude: new Set(["id5"]) }, read);
    expect(out.map((c) => c.oracleId)).toEqual(["id2", "id4"]);
    expect(out[0]).toEqual({ oracleId: "id2", name: "Card 2", typeLine: "Creature — Elf" });
  });

  it("leaves out a card that does no job before ranking, so it neither takes room nor stops the tier completing", async () => {
    const rows = [
      row(1, 90, null, "Enchantment", "You may cast spells with mana value less than or equal to the number of creatures you control from your hand without paying their mana costs."),
      row(2, 80, null, "Land", "{T}: Add {C}."),
      row(3, 70),
      row(4, 60, null, "Land", "{T}: Add {G} or {W}."),
    ];
    const read = await readOwnedOffIndex({ ...args, colorIdentity: ["G", "W"], max: 2 }, reader(["n1"], rows).read);
    expect(read).toEqual({ cards: [expect.objectContaining({ oracleId: "id3" }), expect.objectContaining({ oracleId: "id4" })], complete: false });
    const roomy = await readOwnedOffIndex({ ...args, colorIdentity: ["G", "W"], max: 3 }, reader(["n1"], rows).read);
    expect(roomy.cards.map((c) => c.oracleId)).toEqual(["id3", "id4"]);
    expect(roomy.complete).toBe(true);
  });

  it("stops at its room, never past OWNED_OFF_INDEX_MAX, and reads nothing with no room or no commander", async () => {
    const rows = Array.from({ length: 120 }, (_, i) => row(i, 1000 - i));
    expect(await loadOwnedOffIndex({ ...args, max: 3 }, reader(["n1"], rows).read)).toHaveLength(3);
    expect(await loadOwnedOffIndex({ ...args, max: 500 }, reader(["n1"], rows).read)).toHaveLength(OWNED_OFF_INDEX_MAX);
    const none = reader(["n1"], rows);
    expect(await loadOwnedOffIndex({ ...args, max: 0 }, none.read)).toEqual([]);
    expect(none.seen.neighbourReads).toBe(0);
    expect(await loadOwnedOffIndex({ ...args, commanderOracleIds: [] }, reader(["n1"], rows).read)).toEqual([]);
  });

  // Only a tier that ran out of ranked cards below its room is complete: one that filled its room is the top of a longer
  // list, and one given no room was never read.
  it("reports the tier complete only when it ran out of cards below its room", async () => {
    const rows = Array.from({ length: 5 }, (_, i) => row(i, 100 - i));
    expect(await readOwnedOffIndex({ ...args, max: 10 }, reader(["n1"], rows).read)).toMatchObject({ complete: true });
    expect((await readOwnedOffIndex({ ...args, max: 5 }, reader(["n1"], rows).read)).complete).toBe(false);
    expect((await readOwnedOffIndex({ ...args, max: 3 }, reader(["n1"], rows).read)).complete).toBe(false);
    expect(await readOwnedOffIndex({ ...args, max: 0 }, reader(["n1"], rows).read)).toEqual({ cards: [], complete: false });
    availability.map = new Map([["id0", { free: 0 }]]);
    expect(await readOwnedOffIndex({ ...args, max: 5 }, reader(["n1"], rows).read)).toMatchObject({ complete: true });
  });

  it("reads past a slice whose every card is claimed elsewhere instead of coming back short", async () => {
    const rows = Array.from({ length: 20 }, (_, i) => row(i, 1000 - i));
    availability.map = new Map(rows.slice(0, 6).map((r) => [r.oracleId, { free: 0 }]));
    const out = await loadOwnedOffIndex({ ...args, max: 2 }, reader(["n1"], rows).read);
    expect(out.map((c) => c.oracleId)).toEqual(["id6", "id7"]);
    expect(availability.calls).toHaveLength(2);
  });
});

describe("offIndexWorthOffering", () => {
  // The cards a paid eval on an Elves deck (mono-green) was offered, with their staging labels and text (2026-10-29).
  const job = (space: "role" | "theme", kind: string, recurrence: "oneShot" | "repeatable" = "repeatable"): Job => ({
    space, kind, recurrence, to: null, method: null, modal: false, affects: "self", trigger: "none", threshold: null, restrictedTo: null,
  }) as Job;
  const card = (name: string, typeLine: string, oracleText: string | null, jobs: Job[] | null, layout = "normal"): OffIndexFitCard => ({ name, typeLine, oracleText, layout, keywords: [], jobs });
  const green = ["G"];

  const filler: OffIndexFitCard[] = [
    card("Omnipresence", "Enchantment", "You may cast spells with mana value less than or equal to the number of creatures you control from your hand without paying their mana costs.", [job("theme", "castFree")]),
    card("Lure", "Enchantment — Aura", "Enchant creature\nAll creatures able to block enchanted creature do so.", [job("theme", "goad")]),
    card("Aggressive Urge", "Instant", "Target creature gets +1/+1 until end of turn.\nDraw a card.", [job("theme", "pump", "oneShot"), job("role", "draw", "oneShot")]),
    card("Mithril Coat", "Legendary Artifact — Equipment", "Flash\nIndestructible\nEquipped creature has indestructible.\nEquip {3}", [job("theme", "protection")]),
    card("Moment's Peace", "Instant", "Prevent all combat damage that would be dealt this turn.\nFlashback {2}{G}", [job("theme", "fog", "oneShot")]),
    card("Urza's Cave", "Land — Urza's Cave", "{T}: Add {C}.\n{3}, {T}, Sacrifice this land: Search your library for a land card, put it onto the battlefield tapped, then shuffle.", [job("role", "land"), job("role", "ramp", "oneShot")]),
    card("Hidden Nursery", "Land — Cave", "This land enters tapped.\n{T}: Add {G}.\n{4}{G}, {T}, Sacrifice this land: Discover 4. Activate only as a sorcery.", [job("role", "land"), job("theme", "castFree")]),
    card("Slippery Karst", "Land", "This land enters tapped.\n{T}: Add {G}.\nCycling {2}", [job("role", "land")]),
    card("Temple of the False God", "Land", "{T}: Add {C}{C}. Activate only if you control five or more lands.", [job("role", "land")]),
  ];
  const picks: OffIndexFitCard[] = [
    card("Scavenging Ooze", "Creature — Ooze", "{G}: Exile target card from a graveyard.", [job("theme", "graveyardHate"), job("theme", "counters"), job("theme", "lifegain")]),
    // Its label row is `[]`, which `freshJobsOf` reads as no label.
    card("Taunting Elf", "Creature — Elf", "All creatures able to block this creature do so.", null),
    card("Elvish Pioneer", "Creature — Elf Druid", "When this creature enters, you may put a basic land card from your hand onto the battlefield tapped.", [job("role", "ramp", "oneShot")]),
    card("Quirion Explorer", "Creature — Elf Druid Scout", "{T}: Add one mana of any color that a land an opponent controls could produce.", [job("role", "ramp")]),
    card("Ambush Commander", "Creature — Elf", "Forests you control are 1/1 green Elf creatures that are still lands.", [job("theme", "sacOutlet"), job("theme", "pump")]),
    card("Boughside Wanderers", "Creature — Elf Scout", "When this creature enters, look at the top four cards of your library.", [job("role", "tutor", "oneShot"), job("theme", "pump"), job("theme", "landfall")]),
    card("Mirkwood Pathmaker", "Creature — Elf Ranger", "Mirkwood Pathmaker's power and toughness are each equal to the number of lands you control.", null),
    card("Kodama of the East Tree", "Legendary Creature — Spirit", "Reach", [job("theme", "evasion")]),
  ];

  it("leaves out the Elves eval's filler and keeps its good picks", () => {
    expect(filler.filter((c) => offIndexWorthOffering(c, green)).map((c) => c.name)).toEqual([]);
    expect(picks.filter((c) => !offIndexWorthOffering(c, green)).map((c) => c.name)).toEqual([]);
  });

  it("offers a noncreature spell for a working role, a repeatable draw or a typal theme, and not a one-shot draw", () => {
    const spell = (jobs: Job[]) => offIndexWorthOffering(card("X", "Sorcery", "", jobs), green);
    for (const kind of ["ramp", "removal", "wipes", "tutor", "counterspell"]) expect(spell([job("role", kind, "oneShot")])).toBe(true);
    expect(spell([job("role", "draw", "repeatable")])).toBe(true);
    expect(spell([job("role", "draw", "oneShot")])).toBe(false);
    expect(spell([job("theme", "tribal")])).toBe(true);
    expect(spell([job("theme", "tokens"), job("role", "land")])).toBe(false);
    expect(spell([])).toBe(false);
  });

  it("falls back to the text classifier for a noncreature card with no fresh label", () => {
    expect(offIndexWorthOffering(card("Rampant Growth", "Sorcery", "Search your library for a basic land card, put that card onto the battlefield tapped, then shuffle.", null), green)).toBe(true);
    expect(offIndexWorthOffering(card("Lure", "Enchantment — Aura", "Enchant creature\nAll creatures able to block enchanted creature do so.", null), green)).toBe(false);
    // The text cannot tell a cantrip's draw from a repeatable one, so a draw alone does not stand in for a label.
    expect(offIndexWorthOffering(card("Aggressive Urge", "Instant", "Target creature gets +1/+1 until end of turn.\nDraw a card.", null), green)).toBe(false);
    // A modal card is judged on its cast face: Malakir Rebirth's land back taps for mana, which is not ramp for the front.
    const rebirth = "Choose target creature. When that creature dies this turn, return it to the battlefield under its owner's control.\n//\nAs Malakir Mire enters, you may pay 3 life. If you don't, it enters tapped.\n{T}: Add {B}.";
    expect(offIndexWorthOffering(card("Malakir Rebirth // Malakir Mire", "Instant // Land", rebirth, null, "modal_dfc"), ["B", "G"])).toBe(false);
  });

  it("offers a land only when it makes two or more of the deck's colors", () => {
    const dual = card("Savannah", "Land — Forest Plains", "({T}: Add {G} or {W}.)", [job("role", "land")]);
    expect(offIndexWorthOffering(dual, ["G", "W"])).toBe(true);
    expect(offIndexWorthOffering(dual, ["G"])).toBe(false);
    expect(offIndexWorthOffering(card("Command Tower", "Land", "{T}: Add one mana of any color in your commander's color identity.", [job("role", "land")]), ["G", "W"])).toBe(true);
    // A land creature is a creature first.
    expect(offIndexWorthOffering(card("Dryad Arbor", "Land Creature — Forest Dryad", "", null), green)).toBe(true);
  });
});
