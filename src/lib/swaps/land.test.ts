import { describe, expect, it } from "vitest";

import {
  drawbacks, fetchFinds, givesUp, GIVES_UP_PATTERNS, landColors, nameAbility, nonManaAbilities, quote,
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

  it("gives a fetch and a colorless utility land no colors", () => {
    expect(landColors(FOOTHILLS).size).toBe(0);
    expect(landColors(STRIP).size).toBe(0);
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
