import { describe, expect, it } from "vitest";

import {
  drawbacks, fetchFinds, givesUp, GIVES_UP_PATTERNS, colorSource, landCatch, landColors, makesFreely, nameAbility, nonManaAbilities, quote,
  QUOTE_BUDGET, type LandText,
} from "./land";

// Oracle text exactly as the catalog holds it (local-dev, 2026-09-24).
const L = (name: string, typeLine: string, oracleText: string | null): LandText => ({ name, typeLine, oracleText });
const PLATEAU = L("Plateau", "Land — Mountain Plains", "({T}: Add {R} or {W}.)");
const CAVERN = L("Cavern of Souls", "Land", "As this land enters, choose a creature type.\n{T}: Add {C}.\n{T}: Add one mana of any color. Spend this mana only to cast a creature spell of the chosen type, and that spell can't be countered.");
const CRADLE = L("Gaea's Cradle", "Legendary Land", "{T}: Add {G} for each creature you control.");
const BOSEIJU = L("Boseiju, Who Endures", "Legendary Land", "{T}: Add {G}.\nChannel — {1}{G}, Discard this card: Destroy target artifact, enchantment, or nonbasic land an opponent controls. That player may search their library for a land card with a basic land type, put it onto the battlefield, then shuffle. This ability costs {1} less to activate for each legendary creature you control.");
const FOOTHILLS = L("Wooded Foothills", "Land", "{T}, Pay 1 life, Sacrifice this land: Search your library for a Mountain or Forest card, put it onto the battlefield, then shuffle.");
const WILDS = L("Evolving Wilds", "Land", "{T}, Sacrifice this land: Search your library for a basic land card, put it onto the battlefield tapped, then shuffle.");
const VISTA = L("Prismatic Vista", "Land", "{T}, Pay 1 life, Sacrifice this land: Search your library for a basic land card, put it onto the battlefield, then shuffle.");
const STRIP = L("Strip Mine", "Land", "{T}: Add {C}.\n{T}, Sacrifice this land: Destroy target land.");
const COFFERS = L("Cabal Coffers", "Land", "{2}, {T}: Add {B} for each Swamp you control.");
const ORCHARD = L("Exotic Orchard", "Land", "{T}: Add one mana of any color that a land an opponent controls could produce.");
const POOL = L("Reflecting Pool", "Land", "{T}: Add one mana of any type that a land you control could produce.");
const TOWER = L("Command Tower", "Land", "{T}: Add one mana of any color in your commander's color identity.");
const CONFLUENCE = L("Mana Confluence", "Land", "{T}, Pay 1 life: Add one mana of any color.");
const CANYON = L("Sunbaked Canyon", "Land", "{T}, Pay 1 life: Add {R} or {W}.\n{1}, {T}, Sacrifice this land: Draw a card.");
const FORGE = L("Battlefield Forge", "Land", "{T}: Add {C}.\n{T}: Add {R} or {W}. This land deals 1 damage to you.");
const FOUNDRY = L("Sacred Foundry", "Land — Mountain Plains", "({T}: Add {R} or {W}.)\nAs this land enters, you may pay 2 life. If you don't, it enters tapped.");
const FACTORY = L("Mishra's Factory", "Land", "{T}: Add {C}.\n{1}: This land becomes a 2/2 Assembly-Worker artifact creature until end of turn. It's still a land.\n{T}: Target Assembly-Worker creature gets +1/+1 until end of turn.");
const RETREAT = L("Clifftop Retreat", "Land", "This land enters tapped unless you control a Mountain or a Plains.\n{T}: Add {R} or {W}.");
const BRASS = L("City of Brass", "Land", "Whenever this land becomes tapped, it deals 1 damage to you.\n{T}: Add one mana of any color.");
const MOUNTAIN = L("Mountain", "Basic Land — Mountain", "({T}: Add {R}.)");
// Staging's text, 2026-09-25: a mana ability that sacrifices the land itself, and two that sacrifice something else.
const OUTPOST = L("Abandoned Outpost", "Land", "This land enters tapped.\n{T}: Add {W}.\n{T}, Sacrifice this land: Add one mana of any color.");
const SPRING = L("Ancient Spring", "Land", "This land enters tapped.\n{T}: Add {U}.\n{T}, Sacrifice this land: Add {W}{B}.");
const QUARRY = L("Lazotep Quarry", "Land — Desert", "{T}: Add {C}.\n{T}, Sacrifice a creature: Add one mana of any color.\n{X}{2}, {T}, Sacrifice a Desert: Exile target creature card with mana value X from your graveyard. Create a token that's a copy of it, except it's a 4/4 black Zombie. Activate only as a sorcery.");
const HEAP = L("Heap Gate", "Land — Gate", "{T}: Add {C}.\n{1}, {T}: Add one mana of any color.\n{1}, {T}, Tap an untapped Gate you control: Create a Treasure token. (It's an artifact with \"{T}, Sacrifice this token: Add one mana of any color.\")");
// The same one-shot in older templating, naming the card rather than "this land".
const OUTPOST_NAMED = L("Abandoned Outpost", "Land", "Abandoned Outpost enters the battlefield tapped.\n{T}: Add {W}.\n{T}, Sacrifice Abandoned Outpost: Add one mana of any color.");

const sorted = (s: Set<string>) => [...s].sort();

describe("landColors", () => {
  it("reads basic land types and add clauses", () => {
    expect(sorted(landColors(PLATEAU))).toEqual(["R", "W"]);
    expect(sorted(landColors(CANYON))).toEqual(["R", "W"]);
    expect(sorted(landColors(CRADLE))).toEqual(["G"]);
    expect(sorted(landColors(COFFERS))).toEqual(["B"]);
  });

  it("counts an unconditional any-color grant as every color, Command Tower included", () => {
    expect(landColors(TOWER).size).toBe(5);
    expect(landColors(CONFLUENCE).size).toBe(5);
    expect(landColors(CAVERN).size).toBe(5);
  });

  it("counts a grant that depends on other lands as nothing (brief §3.0)", () => {
    expect(landColors(ORCHARD).size).toBe(0);
    expect(landColors(POOL).size).toBe(0);
  });

  // v2 bug 1: a one-shot is a single mana, not a source. Plateau's sheet led with the Outpost.
  it("counts no color that only a self-sacrifice makes", () => {
    expect(sorted(landColors(OUTPOST))).toEqual(["W"]);
    expect(sorted(landColors(OUTPOST_NAMED))).toEqual(["W"]);
    expect(sorted(landColors(SPRING))).toEqual(["U"]);
  });

  it("still counts mana paid for by sacrificing something else, or by mana", () => {
    expect(landColors(QUARRY).size).toBe(5);
    expect(landColors(HEAP).size).toBe(5);
  });

  it("gives a fetch and a colorless utility land no colors", () => {
    expect(landColors(FOOTHILLS).size).toBe(0);
    expect(landColors(STRIP).size).toBe(0);
  });
});

// All 17 lands on staging (2026-09-25) whose own sacrifice pays for mana: the sacrifice line adds no color.
// Expected = the same land with that line removed, so the assertion is exactly "the one-shot counts for nothing".
const SELF_SACRIFICE: [string, string, string, string][] = [
  ["Abandoned Outpost", "Land", "This land enters tapped.\n{T}: Add {W}.\n{T}, Sacrifice this land: Add one mana of any color.", "This land enters tapped.\n{T}: Add {W}."],
  ["Ancient Spring", "Land", "This land enters tapped.\n{T}: Add {U}.\n{T}, Sacrifice this land: Add {W}{B}.", "This land enters tapped.\n{T}: Add {U}."],
  ["Archaeological Dig", "Land", "{T}: Add {C}.\n{T}, Sacrifice this land: Add one mana of any color.", "{T}: Add {C}."],
  ["Bog Wreckage", "Land", "This land enters tapped.\n{T}: Add {B}.\n{T}, Sacrifice this land: Add one mana of any color.", "This land enters tapped.\n{T}: Add {B}."],
  ["Crystal Vein", "Land", "{T}: Add {C}.\n{T}, Sacrifice this land: Add {C}{C}.", "{T}: Add {C}."],
  ["Dwarven Ruins", "Land", "This land enters tapped.\n{T}: Add {R}.\n{T}, Sacrifice this land: Add {R}{R}.", "This land enters tapped.\n{T}: Add {R}."],
  ["Ebon Stronghold", "Land", "This land enters tapped.\n{T}: Add {B}.\n{T}, Sacrifice this land: Add {B}{B}.", "This land enters tapped.\n{T}: Add {B}."],
  ["Geothermal Crevice", "Land", "This land enters tapped.\n{T}: Add {R}.\n{T}, Sacrifice this land: Add {B}{G}.", "This land enters tapped.\n{T}: Add {R}."],
  ["Havenwood Battleground", "Land", "This land enters tapped.\n{T}: Add {G}.\n{T}, Sacrifice this land: Add {G}{G}.", "This land enters tapped.\n{T}: Add {G}."],
  ["Irrigation Ditch", "Land", "This land enters tapped.\n{T}: Add {W}.\n{T}, Sacrifice this land: Add {G}{U}.", "This land enters tapped.\n{T}: Add {W}."],
  ["Ravaged Highlands", "Land", "This land enters tapped.\n{T}: Add {R}.\n{T}, Sacrifice this land: Add one mana of any color.", "This land enters tapped.\n{T}: Add {R}."],
  ["Ruins of Trokair", "Land", "This land enters tapped.\n{T}: Add {W}.\n{T}, Sacrifice this land: Add {W}{W}.", "This land enters tapped.\n{T}: Add {W}."],
  ["Seafloor Debris", "Land", "This land enters tapped.\n{T}: Add {U}.\n{T}, Sacrifice this land: Add one mana of any color.", "This land enters tapped.\n{T}: Add {U}."],
  ["Sulfur Vent", "Land", "This land enters tapped.\n{T}: Add {B}.\n{T}, Sacrifice this land: Add {U}{R}.", "This land enters tapped.\n{T}: Add {B}."],
  ["Svyelunite Temple", "Land", "This land enters tapped.\n{T}: Add {U}.\n{T}, Sacrifice this land: Add {U}{U}.", "This land enters tapped.\n{T}: Add {U}."],
  ["Timberland Ruins", "Land", "This land enters tapped.\n{T}: Add {G}.\n{T}, Sacrifice this land: Add one mana of any color.", "This land enters tapped.\n{T}: Add {G}."],
  ["Tinder Farm", "Land", "This land enters tapped.\n{T}: Add {G}.\n{T}, Sacrifice this land: Add {R}{W}.", "This land enters tapped.\n{T}: Add {G}."],
];

describe("landColors over every self-sacrificing land", () => {
  it("has the 17 staging lands", () => expect(SELF_SACRIFICE).toHaveLength(17));
  it.each(SELF_SACRIFICE)("%s counts only what it makes without sacrificing itself", (name, typeLine, text, without) => {
    expect(sorted(landColors(L(name, typeLine, text)))).toEqual(sorted(landColors(L(name, typeLine, without))));
  });
});

describe("fetchFinds", () => {
  it("reads the types a fetch finds, and a basic-land fetch as every type, basics only", () => {
    expect(fetchFinds(FOOTHILLS)).toEqual({ types: new Set(["mountain", "forest"]), basicOnly: false });
    expect(fetchFinds(WILDS)).toEqual({ types: new Set(["plains", "island", "swamp", "mountain", "forest"]), basicOnly: true });
  });

  it("is null for a land that searches for nothing, and for a search that is not the land's own", () => {
    expect(fetchFinds(STRIP)).toBeNull();
    // Boseiju's channel lets the OPPONENT search, and nothing is sacrificed.
    expect(fetchFinds(BOSEIJU)).toBeNull();
  });
});

describe("drawbacks", () => {
  it("names each cost in the copy's set", () => {
    expect(drawbacks(RETREAT)).toEqual([{ kind: "entersTappedUnless", condition: "you control a mountain or a plains" }]);
    expect(drawbacks(FOUNDRY)).toEqual([{ kind: "entersTappedUnless", condition: "you pay 2 life" }]);
    expect(drawbacks(FORGE)).toEqual([{ kind: "damage", amount: 1, colors: ["R", "W"] }]);
    expect(drawbacks(CANYON)).toEqual([{ kind: "life", amount: 1, colors: ["R", "W"] }]);
    expect(drawbacks(FOOTHILLS)).toEqual([{ kind: "lifeFetch", amount: 1 }]);
    expect(drawbacks(WILDS)).toEqual([{ kind: "entersTapped" }, { kind: "basicOnly" }]);
    expect(drawbacks(VISTA)).toEqual([{ kind: "lifeFetch", amount: 1 }, { kind: "basicOnly" }]);
  });

  it("pays an any-color land's cost for every color, and reads City of Brass's own damage line", () => {
    expect(drawbacks(CONFLUENCE)).toEqual([{ kind: "life", amount: 1, colors: ["W", "U", "B", "R", "G"] }]);
    expect(drawbacks(BRASS)).toEqual([{ kind: "damage", amount: 1, colors: ["W", "U", "B", "R", "G"] }]);
  });

  it("is empty for a land that costs nothing to run", () => {
    expect(drawbacks(PLATEAU)).toEqual([]);
    expect(drawbacks(MOUNTAIN)).toEqual([]);
    expect(drawbacks(TOWER)).toEqual([]);
  });
});

describe("nonManaAbilities", () => {
  it("drops mana abilities, their costs, setup lines and a fetch's own search", () => {
    for (const land of [PLATEAU, FORGE, CONFLUENCE, RETREAT, FOUNDRY, TOWER, WILDS, FOOTHILLS, BRASS, MOUNTAIN]) {
      expect(nonManaAbilities(land), land.name).toEqual([]);
    }
  });

  it("keeps what a land does besides make mana, one ability per line", () => {
    expect(nonManaAbilities(CAVERN)).toEqual([
      "spend this mana only to cast a creature spell of the chosen type, and that spell can't be countered.",
    ]);
    expect(nonManaAbilities(CRADLE)).toEqual(["{t}: add {g} for each creature you control."]);
    expect(nonManaAbilities(BOSEIJU)).toHaveLength(1);
    expect(nonManaAbilities(FACTORY)).toHaveLength(2);
    expect(nonManaAbilities(CANYON)).toEqual(["{1}, {t}, sacrifice this land: draw a card."]);
  });
});

describe("nameAbility: one case per pattern", () => {
  const cases: [string, string][] = [
    ["spend this mana only to cast a creature spell, and that spell can't be countered.", "uncounterable spells"],
    ["{1}: this land becomes a 2/2 artifact creature until end of turn.", "becoming a creature"],
    ["channel — {1}{g}, discard this card: destroy target artifact.", "its channel ability"],
    ["{t}: add {g} for each creature you control.", "its extra mana"],
    ["{t}: add {c}{c}. this land deals 2 damage to you.", "its extra mana"],
    ["{t}, sacrifice this land: destroy target land.", "land destruction"],
    ["{3}, {t}: exile target creature.", "removal"],
    ["{2}{u}, {t}: counter target spell.", "a counterspell"],
    ["{1}, {t}, sacrifice this land: draw a card.", "card draw"],
    ["{3}, {t}: create a 1/1 white spirit creature token.", "making tokens"],
    ["{t}: return target creature card from your graveyard to your hand.", "recursion"],
    ["{4}, {t}: search your library for a card.", "a library search"],
    ["{t}: scry 1.", "card selection"],
    ["{2}, {t}: target player mills two cards.", "milling"],
    ["{2}, {t}: this land deals 1 damage to any target.", "dealing damage"],
    ["{1}, {t}: you gain 2 life.", "life gain"],
    ["{t}: untap target permanent.", "untapping a permanent"],
    ["{t}: target creature you control gains hexproof until end of turn.", "protection"],
    ["cycling {2}", "cycling"],
    ["{t}: put a +1/+1 counter on target creature.", "+1/+1 counters"],
    ["{t}: target assembly-worker creature gets +1/+1 until end of turn.", "a pump"],
    ["{t}: target creature can't block this turn.", "a restriction on opponents"],
    ["you may have this land enter tapped as a copy of any land on the battlefield.", "copying a land"],
    ["hideaway 4", "hideaway"],
    ["{t}: add {b}{g}.", "its extra mana"],
    ["{3}, {t}, sacrifice this land: destroy each nonland permanent with mana value x.", "a board wipe"],
    ["{2}, {t}, sacrifice a desert: exile all graveyards.", "graveyard hate"],
    ["{2}{c}, {t}, sacrifice this land: copy target instant or sorcery spell you control.", "copying a spell"],
    ["{4}, {t}: proliferate.", "proliferate"],
    ["{4}, {t}: target creature can't be blocked this turn.", "evasion"],
    ["{2}{r}{w}, {t}: target creature gains double strike until end of turn.", "granting an ability"],
    ["colorless eldrazi spells you cast cost {2} less to cast.", "a cost reduction"],
    ["you have no maximum hand size.", "no maximum hand size"],
  ];

  it("covers every pattern exactly once", () => {
    expect(new Set(cases.map(([, label]) => label))).toEqual(new Set(GIVES_UP_PATTERNS.map(([, label]) => label)));
  });

  it.each(cases)("%s → %s", (sentence, label) => {
    expect(nameAbility(sentence, "This Land")).toEqual({ kind: "named", label });
  });

  it("names extra mana only in an add clause, and quotes a 'for each' that adds none", () => {
    expect(nameAbility("{2}, {t}: for each opponent, tap target creature that player controls.", "X").kind).toBe("quoted");
  });

  it("quotes an ability no pattern covers, from the card's own text", () => {
    expect(nameAbility("{t}: target player shuffles their library.", "Odd Land")).toEqual({
      kind: "quoted", text: "{T}: target player shuffles their library",
    });
  });
});

describe("quote", () => {
  it("keeps a short ability whole, restoring its capital", () => {
    expect(quote("{t}: tap target artifact.", "Card")).toBe("{T}: tap target artifact");
  });

  it("gives back the case the readers took: the card's name, its symbols and the variable X", () => {
    expect(quote("{x}{x}, {t}: put x charge counters on blast zone.", "Blast Zone"))
      .toBe("{X}{X}, {T}: put X charge counters on Blast Zone");
  });

  it("cuts a long ability at a word boundary under the budget, with an ellipsis", () => {
    const q = quote("{2}, {t}: each player sacrifices a creature, then each player returns a land card to their hand.", "Card");
    expect(q.endsWith("…")).toBe(true);
    expect(q.length).toBeLessThanOrEqual(QUOTE_BUDGET);
    expect(q).not.toMatch(/\s…$/);
  });
});

describe("givesUp (H3)", () => {
  it("names what a utility land does that its stand-in does not", () => {
    expect(givesUp(CAVERN, TOWER)).toEqual([{ kind: "named", label: "uncounterable spells" }]);
    expect(givesUp(CRADLE, MOUNTAIN)).toEqual([{ kind: "named", label: "its extra mana" }]);
    expect(givesUp(BOSEIJU, MOUNTAIN)).toEqual([{ kind: "named", label: "its channel ability" }]);
    expect(givesUp(COFFERS, MOUNTAIN)).toEqual([{ kind: "named", label: "its extra mana" }]);
  });

  it("gives up nothing only when the original does nothing its stand-in does not", () => {
    expect(givesUp(PLATEAU, FOUNDRY)).toEqual([]);
    expect(givesUp(PLATEAU, CANYON)).toEqual([]);
    // Canyon's card draw is Canyon's, so a stand-in for it gives it up.
    expect(givesUp(CANYON, PLATEAU)).toEqual([{ kind: "named", label: "card draw" }]);
  });

  it("keeps an ability the stand-in shares", () => {
    expect(givesUp(FACTORY, FACTORY)).toEqual([]);
  });

  it("keeps a QUOTED ability the stand-in shares, and still gives up one it does not", () => {
    const ring = L("Mage-Ring Network", "Land", "{T}: Add {C}.\n{1}, {T}: Put a storage counter on this land.");
    const twin = L("Storage Twin", "Land", "{T}: Add {C}.\n{1}, {T}: Put a storage counter on this land.");
    expect(givesUp(ring, twin)).toEqual([]);
    expect(givesUp(ring, L("Wastes", "Basic Land", "({T}: Add {C}.)"))).toEqual([
      { kind: "quoted", text: "{1}, {T}: put a storage counter on this land" },
    ]);
  });
});

// v2 item 2, rung 4: the head of Plateau's $0.15 wall on Hugh's HD - Gishath (staging text, 2026-09-25).
describe("makesFreely", () => {
  const CAPITAL = L("Capital City", "Land", "{T}: Add {C}.\n{1}, {T}: Add one mana of any color.\nCycling {2}");
  const HUB = L("Aether Hub", "Land", "When this land enters, you get {E} (an energy counter).\n{T}: Add {C}.\n{T}, Pay {E}: Add one mana of any color.");
  const TOWER_HERO = L("Avengers Tower", "Land", "{T}: Add {C}.\n{T}: Add one mana of any color. Spend this mana only to cast a Hero spell or to activate an ability of a Hero source.");
  const TOWNSHIP = L("An-Havva Township", "Land", "{T}: Add {C}.\n{1}, {T}: Add {G}.\n{2}, {T}: Add {R} or {W}.");
  const BRANCH = L("Branch of Vitu-Ghazi", "Land", "{T}: Add {C}.\nDisguise {3}\nWhen this land is turned face up, add two mana of any one color.");

  it("reads the wall as utility mana: paid, restricted, or from a trigger", () => {
    for (const land of [CAPITAL, HUB, TOWER_HERO, TOWNSHIP, BRANCH]) expect(makesFreely(land, "R")).toBe(false);
  });

  it("counts a basic type, a plain tap, a pain land and a life payment as free", () => {
    expect(makesFreely(PLATEAU, "R")).toBe(true);
    expect(makesFreely(FORGE, "W")).toBe(true);
    expect(makesFreely(CONFLUENCE, "W")).toBe(true);
    expect(makesFreely(CANYON, "R")).toBe(true);
    expect(makesFreely(BRASS, "R")).toBe(true);
    expect(makesFreely(TOWER, "W")).toBe(true);
  });

  it("does not make a color the land never makes", () => expect(makesFreely(MOUNTAIN, "W")).toBe(false));
});

// The rest of Plateau's rung 1 on HD - Gishath before this read (staging text, 2026-09-25): each has a catch.
describe("colorSource and landCatch", () => {
  const verge = L("Sunbillow Verge", "Land", "{T}: Add {W}.\n{T}: Add {R}. Activate only if you control a Mountain or a Plains.");
  const havens = L("The Grey Havens", "Land", "When The Grey Havens enters, scry 1.\n{T}: Add {C}.\n{T}: Add one mana of any color among legendary creature cards in your graveyard.");
  const plaza = L("Plaza of Heroes", "Land", "{T}: Add {C}.\n{T}: Add one mana of any color. Spend this mana only to cast a legendary spell.\n{T}: Add one mana of any color among legendary permanents you control.");
  const paliano = L("Paliano, the High City", "Legendary Land", "Reveal this card as you draft it.\n{T}: Add one mana of any color chosen as you drafted cards named Paliano, the High City.");
  it("reads a verge's second color as conditional, like a checkland", () => {
    expect(colorSource(verge, "W")).toBe("free");
    expect(colorSource(verge, "R")).toBe("conditional");
  });
  it("reads a grant that holds only on a counter as conditional", () => {
    const caverns = L("Gemstone Caverns", "Legendary Land", "If this card is in your opening hand and you're not the starting player, you may begin the game with it on the battlefield with a luck counter on it.\n{T}: Add {C}. If this land has a luck counter on it, instead add one mana of any color.");
    expect(colorSource(caverns, "R")).toBe("conditional");
  });
  it("gives no color to a grant that depends on other cards or on a draft", () => {
    expect(landColors(havens).size).toBe(0);
    expect(landColors(paliano).size).toBe(0);
    expect(colorSource(plaza, "R")).toBe("utility");
  });
  it.each([
    ["Rainbow Vale", "{T}: Add one mana of any color. An opponent gains control of this land at the beginning of the next end step.", "utility"],
    ["Undiscovered Paradise", "{T}: Add one mana of any color. During your next untap step, as you untap your permanents, return this land to its owner's hand.", "utility"],
    ["Forsaken City", "This land doesn't untap during your untap step.\nAt the beginning of your upkeep, you may exile a card from your hand. If you do, untap this land.\n{T}: Add one mana of any color.", "utility"],
    ["Glimmervoid", "At the beginning of the end step, if you control no artifacts, sacrifice this land.\n{T}: Add one mana of any color.", "condition"],
    ["Rith's Grove", "When this land enters, sacrifice it unless you return a non-Lair land you control to its owner's hand.\n{T}: Add {R}, {G}, or {W}.", "condition"],
    ["Lotus Vale", "If this land would enter, sacrifice two untapped lands instead. If you do, put this land onto the battlefield. If you don't, put it into its owner's graveyard.\n{T}: Add three mana of any one color.", "condition"],
    ["Forbidden Orchard", "{T}: Add one mana of any color.\nWhenever you tap this land for mana, target opponent creates a 1/1 colorless Spirit creature token.", "condition"],
  ])("%s has a %s catch", (name, text, want) => expect(landCatch(L(name, "Land", text))).toBe(want));
  it("reads no catch in a fetch's own cost, or in a plain dual", () => {
    expect(landCatch(FOOTHILLS)).toBeNull();
    expect(landCatch(PLATEAU)).toBeNull();
    expect(landCatch(FOUNDRY)).toBeNull();
  });
});
