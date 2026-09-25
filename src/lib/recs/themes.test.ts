import { describe, expect, it } from "vitest";

import { cardThemes, caresAboutType, creatureSubtypes, keyCreatureType, type Theme } from "./themes";

// Staging's text, 2026-09-25: the cards each rule was sized against in the three passes.
const CARDS: Record<string, [string, string]> = {
  "Blinding Fog": ["Instant", "Prevent all damage that would be dealt to creatures this turn. Creatures you control gain hexproof until end of turn. (They can't be the targets of spells or abilities your opponents control.)"],
  "Blood Artist": ["Creature \u2014 Vampire", "Whenever this creature or another creature dies, target player loses 1 life and you gain 1 life."],
  "Counterspell": ["Instant", "Counter target spell."],
  "Craterhoof Behemoth": ["Creature \u2014 Beast", "Haste\nWhen this creature enters, creatures you control gain trample and get +X/+X until end of turn, where X is the number of creatures you control."],
  "Etali, Primal Conqueror // Etali, Primal Sickness": ["Legendary Creature \u2014 Elder Dinosaur // Legendary Creature \u2014 Phyrexian Elder Dinosaur", "Trample\nWhen Etali enters, each player exiles cards from the top of their library until they exile a nonland card. You may cast any number of spells from among the nonland cards exiled this way without paying their mana costs.\n{9}{G/P}: Transform Etali. Activate only as a sorcery.\n//\nTrample, indestructible\nWhenever Etali deals combat damage to a player, they get that many poison counters. (A player with ten or more poison counters loses the game.)"],
  "Eternal Witness": ["Creature \u2014 Human Shaman", "When this creature enters, you may return target card from your graveyard to your hand."],
  "Fraying Sanity": ["Enchantment \u2014 Aura Curse", "Enchant player\nAt the beginning of each end step, enchanted player mills X cards, where X is the number of cards put into their graveyard from anywhere this turn."],
  "Ghostly Flicker": ["Instant", "Exile two target artifacts, creatures, and/or lands you control, then return those cards to the battlefield under your control."],
  "Gishath, Sun's Avatar": ["Legendary Creature \u2014 Dinosaur Avatar", "Vigilance, trample, haste\nWhenever Gishath deals combat damage to a player, reveal that many cards from the top of your library. Put any number of Dinosaur creature cards from among them onto the battlefield and the rest on the bottom of your library in a random order."],
  "Hardened Scales": ["Enchantment", "If one or more +1/+1 counters would be put on a creature you control, that many plus one +1/+1 counters are put on it instead."],
  "Herald's Horn": ["Artifact", "As this artifact enters, choose a creature type.\nCreature spells you cast of the chosen type cost {1} less to cast.\nAt the beginning of your upkeep, look at the top card of your library. If it's a creature card of the chosen type, you may reveal it and put it into your hand."],
  "Kindred Discovery": ["Enchantment", "As this enchantment enters, choose a creature type.\nWhenever a creature you control of the chosen type enters or attacks, draw a card."],
  "Lord of Atlantis": ["Creature \u2014 Merfolk", "Other Merfolk get +1/+1 and have islandwalk. (They can't be blocked as long as defending player controls an Island.)"],
  "Lotus Cobra": ["Creature \u2014 Snake", "Landfall \u2014 Whenever a land you control enters, add one mana of any color."],
  "Maddening Cacophony": ["Sorcery", "Kicker {3}{U}\nEach opponent mills eight cards. If this spell was kicked, instead each opponent mills half their library, rounded up."],
  "Mirkwood Channeler": ["Creature \u2014 Elf Druid", "At the beginning of combat on your turn, target Elf you control gains trample and gets +X/+X until end of turn, where X is the number of Forests you control."],
  "Mulldrifter": ["Creature \u2014 Elemental", "Flying\nWhen this creature enters, draw two cards.\nEvoke {2}{U} (You may cast this spell for its evoke cost. If you do, it's sacrificed when it enters.)"],
  "Omnath, Locus of Rage": ["Legendary Creature \u2014 Elemental", "Landfall \u2014 Whenever a land you control enters, create a 5/5 red and green Elemental creature token.\nWhenever Omnath or another Elemental you control dies, Omnath deals 3 damage to any target."],
  "Restoration Angel": ["Creature \u2014 Angel", "Flash\nFlying\nWhen this creature enters, you may exile target non-Angel creature you control, then return that card to the battlefield under your control."],
  "Runadi, Behemoth Caller": ["Legendary Creature \u2014 Cat Shaman", "Whenever you cast a creature spell with mana value 5 or greater, that creature enters with X additional +1/+1 counters on it, where X is its mana value minus 4.\nCreatures you control with three or more +1/+1 counters on them have haste.\n{T}: Add {G}."],
  "Sol Ring": ["Artifact", "{T}: Add {C}{C}."],
  "Swiftfoot Boots": ["Artifact \u2014 Equipment", "Equipped creature has hexproof and haste. (It can't be the target of spells or abilities your opponents control. It can attack and {T} no matter when it came under your control.)\nEquip {1} ({1}: Attach to target creature you control. Equip only as a sorcery.)"],
  "Tireless Provisioner": ["Creature \u2014 Elf Scout", "Landfall \u2014 Whenever a land you control enters, create a Food token or a Treasure token. (Food is an artifact with \"{2}, {T}, Sacrifice this token: You gain 3 life.\" Treasure is an artifact with \"{T}, Sacrifice this token: Add one mana of any color.\")"],
  "Viscera Seer": ["Creature \u2014 Vampire Wizard", "Sacrifice a creature: Scry 1. (Look at the top card of your library. You may put that card on the bottom.)"],
  "Young Pyromancer": ["Creature \u2014 Human Shaman", "Whenever you cast an instant or sorcery spell, create a 1/1 red Elemental creature token."],
  "Zulaport Cutthroat": ["Creature \u2014 Human Rogue Ally", "Whenever this creature or another creature you control dies, each opponent loses 1 life and you gain 1 life."]
};
// The catalog's creature subtypes are handed in by the caller; these are the ones the fixtures need.
const TYPES = new Set(["Dinosaur", "Elf", "Merfolk", "Zombie", "Wizard", "Human", "Soldier", "Goblin"]);
const isType = (w: string) => TYPES.has(w);
const themes = (name: string) => {
  const [typeLine, oracleText] = CARDS[name];
  return cardThemes({ typeLine, oracleText }, isType);
};

describe("cardThemes on the cards each rule was sized against", () => {
  it.each<[string, Theme[]]>([
    ["Runadi, Behemoth Caller", ["counters", "haste"]],
    ["Hardened Scales", ["counters"]],
    ["Craterhoof Behemoth", ["pump", "evasion", "finisher"]],
    ["Swiftfoot Boots", ["protection", "haste"]],
    ["Maddening Cacophony", ["mill"]],
    ["Fraying Sanity", ["mill"]],
    ["Lotus Cobra", ["landfall"]],
    ["Omnath, Locus of Rage", ["landfall", "tokens"]],
    ["Tireless Provisioner", ["landfall", "treasure", "tokens"]],
    ["Mulldrifter", ["etbDraw", "draw"]],
    ["Viscera Seer", ["sacOutlet"]],
    ["Blood Artist", ["deathTrigger", "drain", "lifegain"]],
    ["Zulaport Cutthroat", ["deathTrigger", "drain", "lifegain"]],
    ["Eternal Witness", ["recursion"]],
    ["Ghostly Flicker", ["blink"]],
    ["Restoration Angel", ["blink"]],
    ["Young Pyromancer", ["spellslinger", "tokens"]],
    ["Etali, Primal Conqueror // Etali, Primal Sickness", ["castFree"]],
    ["Gishath, Sun's Avatar", ["tribal"]],
    ["Kindred Discovery", ["tribal", "draw"]],
    ["Herald's Horn", ["tribal"]],
    ["Lord of Atlantis", ["tribal", "pump"]],
  ])("%s reads as %j", (name, want) => expect(themes(name)).toEqual(expect.arrayContaining(want)));

  it("gives a plain card no theme", () => {
    expect(themes("Sol Ring")).toEqual([]);
    expect(themes("Counterspell")).toEqual([]);
  });

  // Pass 3's false positives: the word before "you control" names a card type, not a tribe.
  it("reads no tribe in \"Creatures you control\"", () => {
    expect(themes("Blinding Fog")).not.toContain("tribal");
    expect(themes("Runadi, Behemoth Caller")).not.toContain("tribal");
  });

  // Pass 3 sampled Mirkwood Channeler for its "Forests you control", but the same card targets "Elf you
  // control": it IS tribal, and the land type beside it neither makes nor unmakes that.
  it("reads the tribe beside a land type", () => expect(themes("Mirkwood Channeler")).toContain("tribal"));
  it("reads a typed target's +X/+X as a pump", () => expect(themes("Mirkwood Channeler")).toContain("pump"));
});

describe("caresAboutType", () => {
  it("counts a word only when the catalog calls it a creature type", () => {
    expect(caresAboutType("Goblins you control have haste.", isType)).toBe(true);
    expect(caresAboutType("Elves you control get +1/+1.", isType)).toBe(true);
    expect(caresAboutType("Forests you control are 1/1 creatures.", isType)).toBe(false);
  });
});

describe("keyCreatureType", () => {
  const n = (typeLine: string, quantity: number) => ({ typeLine, quantity });
  it("is the deck's most common creature type", () => {
    expect(keyCreatureType([n("Creature — Dinosaur", 26), n("Creature — Human Soldier", 6)], ["Legendary Creature — Dinosaur"])).toBe("Dinosaur");
  });
  it("gives a near tie to the commander's own type (HD - Soldiers: Soldier 25, Human 24)", () => {
    expect(keyCreatureType([n("Creature — Human", 24), n("Creature — Soldier", 1), n("Creature — Kor Soldier", 24)], ["Legendary Creature — Human Soldier"])).toBe("Soldier");
    expect(keyCreatureType([n("Creature — Human", 26), n("Creature — Kor Soldier", 24)], ["Legendary Creature — Soldier"])).toBe("Soldier");
  });
  it("names no type a deck barely holds", () => {
    expect(keyCreatureType([n("Creature — Elf", 3)], [])).toBeNull();
  });
  it("reads subtypes off the front face of a creature only", () => {
    expect(creatureSubtypes("Artifact Creature — Golem")).toEqual(["Golem"]);
    expect(creatureSubtypes("Land — Forest")).toEqual([]);
  });
});
