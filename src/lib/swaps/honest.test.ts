import { describe, expect, it } from "vitest";

import { heldSubtypes, honestJobs, offTypeLine, rampKinds, type DeckLens } from "./honest";
import { rankStandIns, STAND_IN_GROUP_CAP, type Candidate, type CardRow } from "./stand-ins";

// The catalog's oracle text, verbatim, for the fixtures E1 names (reminders included, as stored).
const RUNADI = {
  name: "Runadi, Behemoth Caller", typeLine: "Legendary Creature — Cat Shaman", cmc: 3,
  oracleText: "Whenever you cast a creature spell with mana value 5 or greater, that creature enters with X additional +1/+1 counters on it, where X is its mana value minus 4.\nCreatures you control with three or more +1/+1 counters on them have haste.\n{T}: Add {G}.",
};
const WARG = {
  name: "Bejeweled Warg", typeLine: "Creature — Wolf", cmc: 2,
  oracleText: "Trample\nWhenever this creature deals combat damage to a player, choose one —\n• Put a +1/+1 counter on target Wolf you control.\n• Create a Treasure token. (It's an artifact with \"{T}, Sacrifice this token: Add one mana of any color.\")",
};
const INCUBATION = {
  name: "Incubation Druid", typeLine: "Creature — Elf Druid", cmc: 2,
  oracleText: "{T}: Add one mana of any type that a land you control could produce. If this creature has a +1/+1 counter on it, add three mana of that type instead.\n{3}{G}{G}: Adapt 3. (If this creature has no +1/+1 counters on it, put three +1/+1 counters on it.)",
};
const DOCKSIDE = {
  name: "Dockside Extortionist", typeLine: "Creature — Goblin Pirate", cmc: 2,
  oracleText: "When this creature enters, create X Treasure tokens, where X is the number of artifacts and enchantments your opponents control. (Treasure tokens are artifacts with \"{T}, Sacrifice this token: Add one mana of any color.\")",
};
const SERVANT = {
  name: "Generator Servant", typeLine: "Creature — Elemental", cmc: 2,
  oracleText: "{T}, Sacrifice this creature: Add {C}{C}. If any of that mana is spent on a creature spell, it gains haste until end of turn. (That creature can attack and {T} as soon as it comes under your control.)",
};
/** A tap-for-mana creature whose counter goes only on a Wolf: ramp that keeps, counters that do not. */
const WOLF_DRUID = {
  name: "Wolfkin Druid", typeLine: "Creature — Elf Druid", cmc: 2,
  oracleText: "{T}: Add {G}.\n{1}{G}: Put a +1/+1 counter on target Wolf you control.",
};

const TYPES = new Set(["Wolf", "Dinosaur", "Elf", "Druid", "Cat", "Shaman", "Goblin", "Pirate", "Elemental"]);
const isType = (w: string) => TYPES.has(w);
const SUBTYPES = new Set(["Equipment", "Gate", "Treasure", "Food"]);
const lens = (keyType: string | null, held: string[] = []): DeckLens => ({ keyType, isSubtype: (w) => SUBTYPES.has(w), held: new Set(held) });
const jobs = (c: { name: string; typeLine: string; oracleText: string }, key: string | null = "Dinosaur", held: string[] = []) =>
  honestJobs({ ...c, keywords: [] }, isType, lens(key, held));

let n = 0;
const row = (c: typeof RUNADI): CardRow => ({
  oracleId: `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`, keywords: [], imageUri: null, ...c,
});
const cand = (c: CardRow): Candidate => ({ ...c, inclusion: null, synergy: null, isUniversal: false, owned: 1, free: 1, soft: 0 });

describe("honestJobs (E1)", () => {
  it("reads Runadi as tapping for mana, with counters and haste", () => {
    expect(jobs(RUNADI)).toEqual({ roles: ["tapsForMana"], themes: ["counters", "haste"] });
  });

  it("leaves out an ability limited to a type the deck does not play (ruling a)", () => {
    // Warg's counter goes only on a Wolf: in a Dinosaur deck it is no +1/+1 counters job.
    expect(jobs(WARG).themes).not.toContain("counters");
    expect(jobs(WOLF_DRUID).themes).not.toContain("counters");
    // In a Wolf deck the same line is a job.
    expect(jobs(WOLF_DRUID, "Wolf").themes).toContain("counters");
  });

  it("names a creature type only where a line limits itself to it", () => {
    expect(offTypeLine("Put a +1/+1 counter on target Wolf you control.", isType, lens("Dinosaur"))).toBe(true);
    expect(offTypeLine("Other Elves you control get +1/+1.", isType, lens("Elf"))).toBe(false);
    // A token the line MAKES limits nothing.
    expect(offTypeLine("Create a 1/1 green Elf Warrior creature token.", isType, lens("Dinosaur"))).toBe(false);
    // A list is usable when any item is (review, round 2).
    // `each` has no trailing "you control" to catch the second item, so only a list read keeps it.
    expect(offTypeLine("Put a +1/+1 counter on each Wolf or Dinosaur.", isType, lens("Dinosaur"))).toBe(false);
    expect(offTypeLine("Other Elves, Goblins, and Wolves you control get +1/+1.", isType, lens("Dinosaur"))).toBe(true);
    expect(offTypeLine("Sacrifice a Food or Treasure you control: Draw a card.", isType, lens("Dinosaur", ["Treasure"]))).toBe(false);
    expect(offTypeLine("Sacrifice a Food or Treasure you control: Draw a card.", isType, lens("Dinosaur", ["Gate"]))).toBe(true);
    // No key type: the deck plays no type in numbers, so a typed line does it no job.
    expect(offTypeLine("Other Elves you control get +1/+1.", isType, lens(null))).toBe(true);
  });

  it("reads a line limited to a noncreature subtype as a job only when the deck holds one (d9, N = 1)", () => {
    const smith = { name: "Forge Watcher", typeLine: "Artifact Creature — Construct", oracleText: "Whenever an Equipment you control enters, draw a card." };
    expect(jobs(smith).roles).not.toContain("draw");
    expect(jobs(smith, "Dinosaur", ["Equipment"]).roles).toContain("draw");
  });

  it("counts a subtype the deck holds or makes, from front faces and token text", () => {
    const held = heldSubtypes([
      { typeLine: "Artifact — Equipment", oracleText: "Equipped creature gets +2/+0." },
      { typeLine: "Creature — Goblin Pirate", oracleText: "When this creature enters, create X Treasure tokens. (Treasure tokens are artifacts.)" },
      { typeLine: "Land — Gate // Land", oracleText: null },
      // A sentence-initial "Create", as Warg's own mode reads.
      { typeLine: "Instant", oracleText: "Create a Food token." },
      { typeLine: "Sorcery", oracleText: "Create a Clue, Food, or Treasure token." },
    ]);
    expect([...held].sort()).toEqual(["Clue", "Equipment", "Food", "Gate", "Goblin", "Pirate", "Treasure"]);
  });

  it("reads ramp as its kind (ruling b)", () => {
    expect(jobs(INCUBATION)).toEqual({ roles: ["tapsForMana"], themes: ["counters"] });
    // A Treasure maker is not a mana tapper, and its Treasure is said once, as the ramp kind.
    expect(jobs(DOCKSIDE)).toEqual({ roles: ["makesTreasure"], themes: ["tokens"] });
    expect(jobs(WARG).roles).toEqual(["makesTreasure"]);
    // A source used up making its mana is a burst (d9's option 1), not a tapper.
    expect(jobs(SERVANT).roles).toEqual(["burstMana"]);
  });

  it("keeps a keyword's reminder, which is its only text, and drops a mana token's", () => {
    // Cycling's draw is written only in its reminder (Titanoth Rex, Akroma's Blessing read no job without it).
    const cycler = { name: "Cycling Beast", typeLine: "Creature — Dinosaur", oracleText: "Trample\nCycling {2} ({2}, Discard this card: Draw a card.)" };
    expect(jobs(cycler).roles).toEqual(["draw"]);
    // Gold is sacrificed for its mana: a burst, not a tapper and not a Treasure (Curse of Opulence).
    const gold = { name: "Gilded Curse", typeLine: "Enchantment — Aura Curse", oracleText: "Whenever enchanted player is attacked, create a Gold token. (It's an artifact with \"Sacrifice this artifact: Add one mana of any color.\")" };
    expect(jobs(gold).roles).toEqual(["burstMana"]);
    // Firebending's mana comes every combat from the card's own keyword, so it is repeatable mana.
    const bender = { name: "Fire Bender", typeLine: "Creature — Human", oracleText: "Firebending 2 (Whenever this creature attacks, add {R}{R}. This mana lasts until end of combat.)" };
    expect(jobs(bender).roles).toEqual(["tapsForMana"]);
  });

  it("tells the four kinds apart line by line", () => {
    expect([...rampKinds("{t}: add {c}{c}.", "Artifact")]).toEqual(["tapsForMana"]);
    expect([...rampKinds("add {b}{b}{b}.", "Instant")]).toEqual(["burstMana"]);
    expect([...rampKinds("{t}, sacrifice this artifact: add one mana of any color.", "Artifact")]).toEqual(["burstMana"]);
    // Sacrificing something ELSE leaves the source to do it again: Ashnod's Altar is repeatable mana.
    expect([...rampKinds("sacrifice a creature: add {c}{c}.", "Artifact")]).toEqual(["tapsForMana"]);
    expect([...rampKinds("search your library for a basic land card, put that card onto the battlefield tapped, then shuffle.", "Sorcery")])
      .toEqual(["fetchesLand"]);
    expect([...rampKinds("when this creature enters, add {r}{r}{r}.", "Creature")]).toEqual(["burstMana"]);
  });
});

describe("rankStandIns over honest jobs (E1)", () => {
  const original = row(RUNADI);
  const offer = (...cs: (typeof RUNADI)[]) => {
    const read = rankStandIns(original, cs.map((c) => cand(row(c))), { newestAsOf: new Date(), prices: new Map() }, isType, STAND_IN_GROUP_CAP, lens("Dinosaur"));
    return read.groups.flatMap((g) => g.rows);
  };

  it("drops a stand-in that keeps nothing: Warg is off Runadi's sheet (ruling d)", () => {
    expect(offer(WARG).map((s) => s.card.name)).toEqual([]);
  });

  it("drops a Treasure maker for a mana tapper", () => {
    expect(offer(DOCKSIDE)).toEqual([]);
  });

  it("keeps Incubation Druid's tap for mana and its counters", () => {
    const [druid] = offer(INCUBATION);
    expect(druid.shared).toEqual(["tapsForMana"]);
    expect(druid.sharedThemes).toEqual(["counters"]);
    expect(druid.missing).toEqual(["haste"]);
  });

  it("does not credit a counter the deck cannot use, and says Runadi's counters are lost", () => {
    const [druid] = offer(WOLF_DRUID);
    expect(druid.shared).toEqual(["tapsForMana"]);
    expect(druid.sharedThemes).toEqual([]);
    expect(druid.missing).toContain("counters");
  });

  it("ranks on the honest shares: the druid that keeps counters above the one that does not", () => {
    expect(offer(WOLF_DRUID, INCUBATION).map((s) => s.card.name)).toEqual(["Incubation Druid", "Wolfkin Druid"]);
  });
});
