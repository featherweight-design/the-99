import { describe, expect, it } from "vitest";

import type { PriceFact } from "../decks/price";
import {
  freeAfterTake, jobOf, landRung, mainType, rankStandIns, sameJob, STAND_IN_GROUP_CAP, type Candidate, type CardRow,
} from "./stand-ins";

const NOW = new Date("2026-09-21T09:00:00Z");
const STALE = new Date("2026-09-14T09:00:00Z");

let n = 0;
const card = (name: string, typeLine: string, oracleText: string, cmc = 0): CardRow => ({
  oracleId: `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`,
  name, typeLine, oracleText, keywords: [], cmc, imageUri: null,
});
const cand = (c: CardRow, over: Partial<Candidate> = {}): Candidate => ({
  ...c, inclusion: null, synergy: null, isUniversal: false, owned: 0, free: null, soft: 0, ...over,
});
const fact = (cents: number | null, asOf = NOW, foilCents: number | null = null): PriceFact =>
  ({ cents, foilCents, etchedCents: null, asOf });

const PLATEAU = card("Plateau", "Land — Mountain Plains", "({T}: Add {R} or {W}.)");
const FOUNDRY = card("Sacred Foundry", "Land — Mountain Plains", "({T}: Add {R} or {W}.)\nAs this land enters, you may pay 2 life. If you don't, it enters tapped.");
const RETREAT = card("Clifftop Retreat", "Land", "This land enters tapped unless you control a Mountain or a Plains.\n{T}: Add {R} or {W}.");
const MOUNTAIN = card("Mountain", "Basic Land — Mountain", "({T}: Add {R}.)");
const TOWER = card("Command Tower", "Land", "{T}: Add one mana of any color in your commander's color identity.");
const FOOTHILLS = card("Wooded Foothills", "Land", "{T}, Pay 1 life, Sacrifice this land: Search your library for a Mountain or Forest card, put it onto the battlefield, then shuffle.");
const WILDS = card("Evolving Wilds", "Land", "{T}, Sacrifice this land: Search your library for a basic land card, put it onto the battlefield tapped, then shuffle.");
const SCALDING = card("Scalding Tarn", "Land", "{T}, Pay 1 life, Sacrifice this land: Search your library for an Island or Mountain card, put it onto the battlefield, then shuffle.");
const VAULT = card("Mana Vault", "Artifact", "Mana Vault doesn't untap during your untap step.\n{T}: Add {C}{C}{C}.", 1);
const SOL_RING = card("Sol Ring", "Artifact", "{T}: Add {C}{C}.", 1);
const SIGNET = card("Arcane Signet", "Artifact", "{T}: Add one mana of any color in your commander's color identity.", 2);
const ROCK_ZERO = card("Mox Amber", "Legendary Artifact", "{T}: Add one mana of any color among legendary creatures and planeswalkers you control.", 0);
const DRAW_TWO = card("Night's Whisper", "Sorcery", "You draw two cards and you lose 2 life.", 2);
const PATH = card("Swords to Plowshares", "Instant", "Exile target creature. Its controller gains life equal to its power.", 1);
const COMMAND = card("Kolaghan's Command", "Instant", "Choose two — • Return target creature card from your graveyard to your hand. • Target player discards a card. • Destroy target artifact. • Kolaghan's Command deals 2 damage to any target.", 3);
const GRAVE_PACT = card("Grave Pact", "Enchantment", "Whenever a creature you control dies, each other player sacrifices a creature.", 4);
const STRIP = card("Strip Mine", "Land", "{T}: Add {C}.\n{T}, Sacrifice this land: Destroy target land.");

describe("jobOf", () => {
  it("reads a land's colors, a fetch's types, and a spell's roles at its mana value", () => {
    expect(jobOf(PLATEAU)).toEqual({ kind: "land", colors: ["W", "R"] });
    expect(jobOf(FOOTHILLS)).toEqual({ kind: "fetch", types: ["mountain", "forest"], basicOnly: false });
    expect(jobOf(VAULT)).toEqual({ kind: "spell", roles: ["ramp"], mv: 1 });
  });

  it("reads a double-faced spell by its FRONT face: a land back face is not ramp", () => {
    const awakening = card("Agadeem's Awakening // Agadeem, the Undercrypt", "Sorcery // Land",
      "Return from your graveyard to the battlefield any number of target creature cards that each have a different mana value X or less.\n//\nAs Agadeem, the Undercrypt enters, you may pay 3 life. If you don't, it enters tapped.\n{T}: Add {B}.", 3);
    expect(jobOf(awakening)).toEqual({ kind: "none" });
    expect(sameJob(jobOf(VAULT), { ...awakening, cmc: 1 })).toBeNull();
  });

  it("gives no job to a card with no role, or a land that neither makes a color nor fetches", () => {
    expect(jobOf(GRAVE_PACT)).toEqual({ kind: "none" });
    expect(jobOf(STRIP)).toEqual({ kind: "none" });
  });
});

describe("sameJob", () => {
  it("takes a land that makes every color the original makes, and not one that makes some", () => {
    const job = jobOf(PLATEAU);
    expect(sameJob(job, FOUNDRY)).not.toBeNull();
    expect(sameJob(job, TOWER)).not.toBeNull();
    expect(sameJob(job, MOUNTAIN)).toBeNull();
    expect(sameJob(job, SOL_RING)).toBeNull();
  });

  it("takes a fetch that finds every type the original finds, a basic-land fetch included", () => {
    const job = jobOf(FOOTHILLS);
    expect(sameJob(job, WILDS)).not.toBeNull();
    expect(sameJob(job, SCALDING)).toBeNull();
    expect(sameJob(job, PLATEAU)).toBeNull();
  });

  it("takes a spell sharing ANY role at the same mana value or less, and names what it shares", () => {
    const job = jobOf(COMMAND);
    expect(job).toMatchObject({ kind: "spell", mv: 3 });
    expect(sameJob(job, PATH)).toEqual({ shared: ["removal"] });
    expect(sameJob(jobOf(VAULT), SOL_RING)).toEqual({ shared: ["ramp"] });
    // Mana value 2 against Vault's 1.
    expect(sameJob(jobOf(VAULT), SIGNET)).toBeNull();
    expect(sameJob(jobOf(VAULT), ROCK_ZERO)).toEqual({ shared: ["ramp"] });
    expect(sameJob(jobOf(VAULT), DRAW_TWO)).toBeNull();
  });
});

describe("freeAfterTake", () => {
  it("is free when a copy is spare after the take, and a buy when none is", () => {
    expect(freeAfterTake(SOL_RING, 1, 1)).toBe(true);
    expect(freeAfterTake(SOL_RING, 1, 0)).toBe(false);
    expect(freeAfterTake(SOL_RING, 2, -1)).toBe(false);
    expect(freeAfterTake(SOL_RING, 0, null)).toBe(false);
  });

  it("always counts a basic as free, since a basic is never on Shopping", () => {
    expect(freeAfterTake(MOUNTAIN, 0, null)).toBe(true);
  });
});

describe("rankStandIns", () => {
  it("leads with free copies, then buys cheaper than the original, cheapest first, for a land", () => {
    const priced = {
      newestAsOf: NOW,
      prices: new Map([
        [PLATEAU.oracleId, fact(29384)],
        [FOUNDRY.oracleId, fact(1500)],
        [RETREAT.oracleId, fact(90)],
        [TOWER.oracleId, fact(30)],
      ]),
    };
    const g = rankStandIns(PLATEAU, [cand(FOUNDRY), cand(RETREAT), cand(TOWER, { owned: 1, free: 1 })], priced);
    expect(g.originalCents).toBe(29384);
    expect(g.free.map((s) => s.card.name)).toEqual(["Command Tower"]);
    expect(g.cheapest.map((s) => s.card.name)).toEqual(["Clifftop Retreat", "Sacred Foundry"]);
    expect(g.cheapest[0].drawbacks).toEqual([{ kind: "entersTappedUnless", condition: "you control a mountain or a plains" }]);
  });

  it("never offers a buy that is not cheaper, not stocked now, or never stocked", () => {
    const priced = {
      newestAsOf: NOW,
      prices: new Map([
        [VAULT.oracleId, fact(3000)],
        [SOL_RING.oracleId, fact(3500)],
        [ROCK_ZERO.oracleId, fact(100, STALE)],
      ]),
    };
    const g = rankStandIns(VAULT, [cand(SOL_RING), cand(ROCK_ZERO), cand(card("Unpriced Rock", "Artifact", "{T}: Add {C}.", 1))], priced);
    expect([...g.byCommander, ...g.unlisted]).toEqual([]);
  });

  it("gives a sold-out original free copies only (F5)", () => {
    const priced = {
      newestAsOf: NOW,
      prices: new Map([[VAULT.oracleId, fact(3000, STALE)], [SOL_RING.oracleId, fact(100)]]),
    };
    const g = rankStandIns(VAULT, [cand(SOL_RING), cand(ROCK_ZERO, { owned: 1, free: 1 })], priced);
    expect(g.originalCents).toBeNull();
    expect(g.free.map((s) => s.card.name)).toEqual(["Mox Amber"]);
    expect([...g.byCommander, ...g.unlisted]).toEqual([]);
  });

  // v2 item 8: synergy, not inclusion. The two disagree here, so the order says which one is read.
  it("orders spells the index lists by the commander's synergy, and the rest after them by price", () => {
    const a = card("Listed Low", "Artifact", "{T}: Add {C}.", 1);
    const b = card("Listed High", "Artifact", "{T}: Add {C}.", 1);
    const c = card("Unlisted Cheap", "Artifact", "{T}: Add {C}.", 1);
    const d = card("Unlisted Dear", "Artifact", "{T}: Add {C}.", 1);
    const priced = {
      newestAsOf: NOW,
      prices: new Map([
        // The higher-synergy card is the DEARER one, so neither inclusion nor price can produce this order.
        [VAULT.oracleId, fact(3000)], [a.oracleId, fact(900)], [b.oracleId, fact(50)],
        [c.oracleId, fact(20)], [d.oracleId, fact(40)],
      ]),
    };
    const g = rankStandIns(VAULT, [
      cand(a, { inclusion: 12, synergy: 0.4 }), cand(b, { inclusion: 61, synergy: 0.02 }), cand(d), cand(c),
    ], priced);
    expect(g.byCommander.map((s) => s.card.name)).toEqual(["Listed Low", "Listed High"]);
    expect(g.unlisted.map((s) => s.card.name)).toEqual(["Unlisted Cheap", "Unlisted Dear"]);
    expect(g.staples).toEqual([]);
  });

  // v2 item 2: lands on the ladder, never the alphabet or price alone. Plateau's stand-ins in HD - Gishath were
  // an alphabetical wall of $0.15 lands.
  it("orders land stand-ins by rung, then synergy, then price", () => {
    const L = (name: string, text: string) => card(name, "Land", text);
    const tapped = L("Aaa Tapped", "This land enters tapped.\n{T}: Add {R} or {W}.");
    const check = L("Bbb Check", "This land enters tapped unless you control a Mountain or a Plains.\n{T}: Add {R} or {W}.");
    const clean = L("Ccc Clean", "{T}: Add {R} or {W}.");
    const cleanSyn = L("Ddd Clean Synergy", "{T}: Add {R} or {W}.");
    const paid = L("Aaa Paid", "{T}: Add {C}.\n{1}, {T}: Add one mana of any color.");
    const priced = {
      newestAsOf: NOW,
      prices: new Map([
        [PLATEAU.oracleId, fact(40000)], [tapped.oracleId, fact(15)], [check.oracleId, fact(15)],
        [clean.oracleId, fact(15)], [cleanSyn.oracleId, fact(900)], [paid.oracleId, fact(10)],
      ]),
    };
    const g = rankStandIns(PLATEAU, [
      cand(tapped, { synergy: 0.9 }), cand(check), cand(clean), cand(cleanSyn, { synergy: 0.3 }), cand(paid, { synergy: 0.95 }),
    ], priced);
    // The paid land is cheapest, first by name and highest in synergy, and still last: it is utility mana.
    expect(g.cheapest.map((s) => s.card.name)).toEqual(["Ddd Clean Synergy", "Ccc Clean", "Bbb Check", "Aaa Tapped", "Aaa Paid"]);
  });

  it("moves a universal staple to buy into its own group, by price, and keeps a free one free (H4)", () => {
    const dear = card("Staple Dear", "Artifact", "{T}: Add {C}.", 1);
    const cheap = card("Staple Cheap", "Artifact", "{T}: Add {C}.", 1);
    const owned = card("Staple Owned", "Artifact", "{T}: Add {C}.", 1);
    const listed = card("Listed", "Artifact", "{T}: Add {C}.", 1);
    const priced = {
      newestAsOf: NOW,
      prices: new Map([
        [VAULT.oracleId, fact(3000)], [dear.oracleId, fact(400)], [cheap.oracleId, fact(90)],
        [owned.oracleId, fact(90)], [listed.oracleId, fact(50)],
      ]),
    };
    const g = rankStandIns(VAULT, [
      // The dear staple's figure is the highest: by the commander's order it would lead.
      cand(dear, { inclusion: 95, isUniversal: true }), cand(cheap, { inclusion: 60, isUniversal: true }),
      cand(owned, { inclusion: 80, isUniversal: true, owned: 1, free: 1 }), cand(listed, { inclusion: 30 }),
    ], priced);
    expect(g.staples.map((s) => s.card.name)).toEqual(["Staple Cheap", "Staple Dear"]);
    expect(g.byCommander.map((s) => s.card.name)).toEqual(["Listed"]);
    expect(g.free.map((s) => s.card.name)).toEqual(["Staple Owned"]);
    expect(g.free[0].isUniversal).toBe(true);
  });

  it("prices a foil-only stand-in at its foil figure", () => {
    const priced = {
      newestAsOf: NOW,
      prices: new Map([[VAULT.oracleId, fact(3000)], [SOL_RING.oracleId, fact(null, NOW, 700)]]),
    };
    const g = rankStandIns(VAULT, [cand(SOL_RING)], priced);
    expect(g.unlisted[0]).toMatchObject({ cents: 700, foilOnly: true });
  });

  it("offers nothing for a card with no job", () => {
    const g = rankStandIns(GRAVE_PACT, [cand(SOL_RING, { owned: 1, free: 1 })], { newestAsOf: NOW, prices: new Map() });
    expect(g.job).toEqual({ kind: "none" });
    expect(g.free).toEqual([]);
  });

  it("caps each group", () => {
    const many = Array.from({ length: STAND_IN_GROUP_CAP + 5 }, (_, i) => card(`Rock ${i}`, "Artifact", "{T}: Add {C}.", 1));
    const g = rankStandIns(VAULT, many.map((c) => cand(c, { owned: 1, free: 1 })), { newestAsOf: NOW, prices: new Map() });
    expect(g.free).toHaveLength(STAND_IN_GROUP_CAP);
  });

  it("carries what a utility land gives up onto each of its stand-ins (H3)", () => {
    const cradle = card("Gaea's Cradle", "Legendary Land", "{T}: Add {G} for each creature you control.");
    const forest = card("Forest", "Basic Land — Forest", "({T}: Add {G}.)");
    const g = rankStandIns(cradle, [cand(forest)], { newestAsOf: NOW, prices: new Map([[cradle.oracleId, fact(90000)]]) });
    expect(g.free[0].givesUp).toEqual([{ kind: "named", label: "its extra mana" }]);
  });
});

// v2 item 2 and Hugh's Q1: the ladder is read from the parsed drawbacks, never from a name.
describe("landRung", () => {
  it("puts a land with no cost first", () => expect(landRung([])).toBe(1));
  it("puts a condition or a life price second: check, fast, shock, pain, pay life", () => {
    expect(landRung([{ kind: "entersTappedUnless", condition: "you control a Mountain" }])).toBe(2);
    expect(landRung([{ kind: "damage", amount: 1, colors: ["R", "W"] }])).toBe(2);
    expect(landRung([{ kind: "life", amount: 1, colors: ["R"] }])).toBe(2);
    expect(landRung([{ kind: "lifeFetch", amount: 1 }])).toBe(2);
  });
  it("puts utility mana fourth, ahead of everything else it costs", () => {
    expect(landRung([], "utility")).toBe(4);
    expect(landRung([{ kind: "entersTapped" }], "utility")).toBe(4);
    expect(landRung([], "free", "utility")).toBe(4);
    expect(landRung([], "conditional")).toBe(2);
    expect(landRung([], "free", "condition")).toBe(2);
  });
  it("puts entering tapped third, whatever else it costs", () => {
    expect(landRung([{ kind: "entersTapped" }])).toBe(3);
    expect(landRung([{ kind: "entersTapped" }, { kind: "basicOnly" }])).toBe(3);
  });
  it("moves nothing for finding only basics", () => expect(landRung([{ kind: "basicOnly" }])).toBe(1));
});

// Hugh's Q4: the front face's main type, an artifact creature counting as a creature.
describe("mainType", () => {
  it.each([
    ["Artifact Creature — Golem", "creature"],
    ["Enchantment Creature — God", "creature"],
    ["Legendary Planeswalker — Ajani", "planeswalker"],
    ["Instant", "instant"],
    ["Sorcery // Sorcery", "sorcery"],
    ["Artifact — Equipment", "artifact"],
    ["Legendary Enchantment", "enchantment"],
    ["Creature — Human // Land", "creature"],
    ["Kindred Instant — Elf", "instant"],
  ])("%s is %s", (typeLine, want) => expect(mainType(typeLine)).toBe(want));
});
