import { describe, expect, it } from "vitest";
import type { ManaColor, ManaSupplyCardRow } from "../mana/supply";
import { helpAddColor, reviewHelp, type BasicCatalog, type ManaHelp, type TradeInputs, type TradeMove } from "./mana-help";
import type { StapleCandidate } from "./mana-staples";

const basics: BasicCatalog = {
  W: { id: "plains", name: "Plains" },
  U: { id: "island", name: "Island" },
  B: { id: "swamp", name: "Swamp" },
  R: { id: "mountain", name: "Mountain" },
  G: { id: "forest", name: "Forest" },
};
const basic = (id: string, name: string, quantity: number, color: ManaColor): ManaSupplyCardRow => ({ id, typeLine: `Basic Land — ${name}`, manaCost: null, quantity, produces: [color] });
const spell = (id: string, manaCost: string, quantity = 1): ManaSupplyCardRow => ({ id, typeLine: "Creature", manaCost, quantity });
const staple = (name: string, produces: ManaColor[], over: Partial<StapleCandidate> = {}): StapleCandidate => ({
  oracleId: name,
  name,
  typeLine: "Artifact",
  manaCost: "{2}",
  produces,
  fact: { kind: "commander", inclusion: 40 },
  free: 1,
  priceCents: 15,
  ...over,
});
const land = (id: string, produces: ManaColor[], quantity = 1): ManaSupplyCardRow => ({ id, typeLine: "Land", manaCost: null, quantity, produces });
/** No named cuts, no land text, and a land target every fixture is over, unless a test says otherwise. */
const noInputs: TradeInputs = { namedCuts: [], landText: new Map(), inclusion: null, landTarget: 0 };
const help = (rows: ManaSupplyCardRow[], color: ManaColor, locked: string[] = [], candidates: StapleCandidate[] = [], identity: string[] = ["W", "U", "B", "R", "G"], inputs: Partial<TradeInputs> = {}) =>
  helpAddColor(rows, (id) => id[0].toUpperCase() + id.slice(1), new Set(locked), basics, candidates, color as "G", identity, { ...noInputs, ...inputs });

// A one-pip green and a one-pip blue spell are pattern C: Karsten asks 19 sources of each (99-card column).
// Ten Forests leave green under 19; twenty-five Islands put blue over it, with six to spare.
const deck = () => [spell("g", "{G}"), spell("u", "{U}"), basic("forest", "Forest", 10, "G"), basic("island", "Island", 25, "U")];

describe("helpAddColor: rebalance", () => {
  it("moves basics from a color with cover to the picked color, up to the point that color would drop under Karsten's figure", () => {
    const h = help(deck(), "G");
    expect(h.sourcesNow).toBe(10);
    expect(h.rebalance).toEqual([
      { kind: "rebalance", from: "U", basicOut: "Island", basicIn: "Forest", maxCopies: 6, changes: [{ color: "U", before: 25, after: 19 }, { color: "G", before: 10, after: 16 }] },
    ]);
  });

  it("never moves a locked basic", () => {
    expect(help(deck(), "G", ["island"]).rebalance).toEqual([]);
  });

  it("moves nothing from a color that is already under its figure, not even one", () => {
    const rows = [spell("g", "{G}"), spell("u", "{U}"), basic("forest", "Forest", 10, "G"), basic("island", "Island", 18, "U")];
    expect(help(rows, "G").rebalance).toEqual([]);
  });

  it("lets a color with no pips and no published figure give up all its basics", () => {
    const rows = [spell("g", "{G}"), basic("forest", "Forest", 10, "G"), basic("plains", "Plains", 3, "W")];
    expect(help(rows, "G").rebalance).toMatchObject([{ from: "W", maxCopies: 3 }]);
  });

  it("brings in the picked color's basic when the deck holds none", () => {
    const rows = [spell("g", "{G}"), basic("plains", "Plains", 4, "W")];
    expect(help(rows, "G").rebalance).toMatchObject([{ from: "W", basicIn: "Forest", maxCopies: 4, changes: [{ color: "W", before: 4, after: 0 }, { color: "G", before: 0, after: 4 }] }]);
  });

  it("offers a move from each color that can give, and none from the picked color itself", () => {
    const rows = [spell("g", "{G}"), spell("u", "{U}"), basic("forest", "Forest", 10, "G"), basic("island", "Island", 25, "U"), basic("plains", "Plains", 2, "W")];
    expect(help(rows, "G").rebalance.map((m) => m.from).sort()).toEqual(["U", "W"]);
  });
});

describe("helpAddColor: the guard reads every pattern, not the few the evidence lists", () => {
  it("keeps blue at its figure when six harder patterns with no published row fill the evidence list", () => {
    const heavy = [0, 1, 2, 3, 4, 5].map((g) => spell(`heavy${g}`, `{${g || ""}}{U}{U}{U}{U}{U}`.replace("{}", "")));
    // Blue's plain {U} is pattern C (19 sources) and sits below the six heavy patterns in the list.
    const rows = [...heavy, spell("g", "{G}"), spell("u", "{U}"), basic("forest", "Forest", 10, "G"), basic("island", "Island", 19, "U")];
    expect(help(rows, "G").rebalance).toEqual([]);
  });
});

describe("helpAddColor: trades and staples", () => {
  it("trades a basic of the color with the most cover for a staple that adds the picked color", () => {
    const h = help(deck(), "G", [], [staple("Signet", ["G", "U"]), staple("Elfhat", ["G"])]);
    // Equal inclusion and both owned: alphabetical.
    expect(h.staples.map((s) => s.name)).toEqual(["Elfhat", "Signet"]);
    expect(h.trades.map((t) => [t.staple.name, t.out, t.changes])).toEqual([
      ["Elfhat", { id: "island", name: "Island", kind: "basic" }, [{ color: "U", before: 25, after: 24 }, { color: "G", before: 10, after: 11 }]],
      // The Signet makes blue too, so the Island it replaces costs blue nothing.
      ["Signet", { id: "island", name: "Island", kind: "basic" }, [{ color: "G", before: 10, after: 11 }]],
    ]);
  });

  it("offers a staple that adds nothing of the picked color no place", () => {
    const h = help(deck(), "G", [], [staple("Mox", ["W"])]);
    expect(h.staples).toEqual([]);
    expect(h.trades).toEqual([]);
  });

  it("offers no trade when the only basics that could go are the picked color's own or under their figure", () => {
    const rows = [spell("g", "{G}"), spell("u", "{U}"), basic("forest", "Forest", 10, "G"), basic("island", "Island", 10, "U")];
    const h = help(rows, "G", [], [staple("Elfhat", ["G"])]);
    expect(h.staples).toHaveLength(1);
    expect(h.trades).toEqual([]);
  });

  it("does not trade away a locked basic", () => {
    expect(help(deck(), "G", ["island"], [staple("Elfhat", ["G"])]).trades).toEqual([]);
  });

  it("counts a trade for a staple that also makes the color it replaces, so the replaced color keeps its count", () => {
    const rows = [spell("g", "{G}"), spell("u", "{U}"), basic("forest", "Forest", 10, "G"), basic("island", "Island", 19, "U")];
    // Island 19 sits exactly at its figure: an Island out is a blue source lost, a green-blue rock in gives it back.
    expect(help(rows, "G", [], [staple("Elfhat", ["G"])]).trades).toEqual([]);
    expect(help(rows, "G", [], [staple("Signet", ["G", "U"])]).trades).toMatchObject([{ out: { name: "Island" }, changes: [{ color: "G", before: 10, after: 11 }] }]);
  });

  it("takes the basic from the color with the most cover when several could go", () => {
    // Island 25 holds 6 above blue's 19; Plains has no pips and no figure, 3 above nothing. Both are safe.
    const rows = [...deck(), basic("plains", "Plains", 3, "W")];
    expect(help(rows, "G", [], [staple("Elfhat", ["G"])]).trades).toMatchObject([{ out: { id: "island", kind: "basic" } }]);
  });

  it("puts an owned copy first", () => {
    const h = help(deck(), "G", [], [staple("Popular", ["G"], { free: 0, fact: { kind: "commander", inclusion: 90 } }), staple("Owned", ["G"], { free: 1, fact: { kind: "commander", inclusion: 10 } })]);
    expect(h.staples.map((s) => s.name)).toEqual(["Owned", "Popular"]);
  });
});

describe("helpAddColor: the commander's identity", () => {
  it("offers nothing for a color the commander cannot play, and says so", () => {
    const rows = [spell("g", "{G}"), basic("forest", "Forest", 10, "G"), basic("plains", "Plains", 5, "W")];
    const h = help(rows, "U", [], [staple("Mox", ["U"])], ["G", "W"]);
    expect(h).toMatchObject({ color: "U", inIdentity: false, sourcesNow: 0, rebalance: [], trades: [], staples: [] });
  });

  it("offers help for a color inside it", () => {
    const rows = [spell("g", "{G}"), basic("forest", "Forest", 10, "G"), basic("plains", "Plains", 5, "W")];
    expect(help(rows, "G", [], [], ["G", "W"])).toMatchObject({ inIdentity: true, rebalance: [{ from: "W", maxCopies: 5 }] });
  });
});

describe("helpAddColor: no verdict", () => {
  it("carries no field that calls any color short, fine or met", () => {
    const h = help(deck(), "G", [], [staple("Signet", ["G", "U"])]);
    expect(JSON.stringify(h)).not.toMatch(/short|"gap"|target|"met"|fine/i);
  });
});

describe("helpAddColor: the guard reads the panel's Needed, not the single hardest card", () => {
  it("trades an Island when blue's shared pattern is met, though one {U}{U}{U} card asks far more", () => {
    // Two copies share pattern C (Needed 19); the lone UUU card's row is 36, which the old guard read.
    const rows = [spell("u", "{U}", 2), spell("heavy", "{U}{U}{U}"), spell("g", "{G}"), basic("forest", "Forest", 10, "G"), basic("island", "Island", 25, "U")];
    expect(help(rows, "G", [], [staple("Elfhat", ["G"])]).trades).toMatchObject([{ out: { id: "island" }, changes: [{ color: "U", before: 25, after: 24 }, { color: "G", before: 10, after: 11 }] }]);
  });
});

describe("helpAddColor: which basic a trade cuts", () => {
  // Blue's Needed is 19; white has no pips, so its Needed is 0.
  const rows = () => [spell("g", "{G}"), spell("u", "{U}"), basic("forest", "Forest", 10, "G"), basic("island", "Island", 21, "U"), basic("plains", "Plains", 3, "W")];

  it("takes the color with the most slack over its Needed AFTER the staple's own sources", () => {
    // A green-only staple: Island out leaves blue 1 over, Plains out leaves white 2 over.
    expect(help(rows(), "G", [], [staple("Elfhat", ["G"])]).trades[0].out.name).toBe("Plains");
  });

  it("breaks a tie on slack with the basic the deck holds more copies of", () => {
    // A green-blue staple gives blue its source back: Island 2 over, Plains 2 over, and there are 21 Islands.
    expect(help(rows(), "G", [], [staple("Signet", ["G", "U"])]).trades[0].out.name).toBe("Island");
  });

  it("breaks a tie on slack and copies in W U B R G order", () => {
    const even = [spell("g", "{G}"), basic("forest", "Forest", 10, "G"), basic("swamp", "Swamp", 2, "B"), basic("plains", "Plains", 2, "W")];
    expect(help(even, "G", [], [staple("Elfhat", ["G"])]).trades[0].out.name).toBe("Plains");
  });

  it("never cuts a basic of a color left short, even when the staple gives the source back", () => {
    // Blue sits at 18 against 19: a green-blue rock for an Island costs blue nothing, and still leaves it short.
    const short = [spell("g", "{G}"), spell("u", "{U}"), basic("forest", "Forest", 10, "G"), basic("island", "Island", 18, "U")];
    expect(help(short, "G", [], [staple("Signet", ["G", "U"])]).trades).toEqual([]);
  });

  it("cuts no land for a nonland staple unless the deck is over its land target", () => {
    const at = { landTarget: 35 }; // the fixture's 35 basics
    expect(help(deck(), "G", [], [staple("Elfhat", ["G"])], undefined, at).trades).toEqual([]);
    expect(help(deck(), "G", [], [staple("Elfhat", ["G"])], undefined, { landTarget: 34 }).trades).toHaveLength(1);
  });

  it("holds a land staple to no land target: a land for a land leaves the count where it was", () => {
    const pool = staple("Pool", ["G", "U"], { typeLine: "Land" });
    expect(help(deck(), "G", [], [pool], undefined, { landTarget: 40 }).trades).toMatchObject([{ out: { id: "island" } }]);
  });
});

describe("helpAddColor: a trade can cut a card that is not a basic", () => {
  const rows = () => [...deck(), spell("weak", "{3}"), spell("other", "{2}"), land("wolfrun", ["C"])];

  it("cuts a card the deck's tuning already named first, for a nonland staple", () => {
    const h = help(rows(), "G", [], [staple("Elfhat", ["G"])], undefined, { namedCuts: ["weak"] });
    expect(h.trades).toEqual([{ kind: "trade", out: { id: "weak", name: "Weak", kind: "namedCut" }, staple: expect.objectContaining({ name: "Elfhat" }), changes: [{ color: "G", before: 10, after: 11 }] }]);
  });

  it("takes the named cuts in the order given, and each on one row only", () => {
    const h = help(rows(), "G", [], [staple("Elfhat", ["G"]), staple("Signet", ["G", "U"]), staple("Talisman", ["G", "U"])], undefined, { namedCuts: ["other", "weak"] });
    expect(h.trades.map((t) => [t.staple.name, t.out.name, t.out.kind])).toEqual([
      ["Elfhat", "Other", "namedCut"],
      ["Signet", "Weak", "namedCut"],
      ["Talisman", "Wolfrun", "offPlanLand"],
    ]);
  });

  it("gives a nonland staple the named nonland cards before a named land, whatever the run's order", () => {
    const h = help(rows(), "G", [], [staple("Elfhat", ["G"]), staple("Signet", ["G", "U"])], undefined, { namedCuts: ["wolfrun", "weak"] });
    expect(h.trades.map((t) => t.out.name)).toEqual(["Weak", "Wolfrun"]);
  });

  it("never names a locked card, a card the deck no longer holds, or a basic as a named cut", () => {
    const h = help(rows(), "G", ["weak"], [staple("Elfhat", ["G"])], undefined, { namedCuts: ["weak", "gone", "island"] });
    expect(h.trades[0].out).toEqual({ id: "wolfrun", name: "Wolfrun", kind: "offPlanLand" });
  });

  it("gives a land staple a land, never a named nonland cut", () => {
    const pool = staple("Pool", ["G", "U"], { typeLine: "Land" });
    expect(help(rows(), "G", [], [pool], undefined, { namedCuts: ["weak"] }).trades[0].out.id).toBe("wolfrun");
    expect(help(rows(), "G", [], [pool], undefined, { namedCuts: ["weak", "wolfrun"] }).trades[0].out).toEqual({ id: "wolfrun", name: "Wolfrun", kind: "namedCut" });
  });

  it("cuts an off-plan land before a basic, the one fewest of the commander's decks run first", () => {
    const lands = [...deck(), land("wolfrun", ["C"]), land("sunhome", ["C"])];
    // Against name order, so the inclusion is what decides it.
    const inclusion = new Map([["wolfrun", 13], ["sunhome", 22]]);
    const h = help(lands, "G", [], [staple("Elfhat", ["G"]), staple("Signet", ["G", "U"]), staple("Talisman", ["G", "U"])], undefined, { inclusion });
    expect(h.trades.map((t) => t.out.name)).toEqual(["Wolfrun", "Sunhome", "Island"]);
  });

  it("does not read a land that fixes another way as off plan", () => {
    const fixers = [...deck(), land("orchard", []), land("barrens", ["C"]), land("wilds", ["C"]), land("dual", ["G", "U"]), spell("rites", "{2}{G}")];
    const landText = new Map([
      ["orchard", "{T}: Add one mana of any color that a land an opponent controls could produce."],
      ["barrens", "{T}: Add {C}.\nBasic landcycling {1}"],
      ["wilds", "{T}, Sacrifice Wilds: Search your library for a basic land card, put it onto the battlefield tapped, then shuffle."],
    ]);
    expect(help(fixers, "G", [], [staple("Elfhat", ["G"])], undefined, { landText }).trades[0].out.kind).toBe("basic");
  });

  it("holds an off-plan land to the land target for a nonland staple", () => {
    expect(help(rows(), "G", [], [staple("Elfhat", ["G"])], undefined, { landTarget: 36 }).trades).toEqual([]);
  });
});

describe("reviewHelp: a past help reopened from History", () => {
  const trade = (stapleId: string, outId: string): TradeMove => ({
    kind: "trade", out: { id: outId, name: outId } as TradeMove["out"], staple: { ...staple(stapleId, ["G"]), oracleId: stapleId }, changes: [],
  });
  const helpOf = (trades: TradeMove[]): ManaHelp => ({ color: "G", inIdentity: true, sourcesNow: 10, rebalance: [], trades, staples: trades.map((t) => t.staple) });

  it("keeps its own trades and marks the ones today's help no longer offers with the same card out", () => {
    const past = helpOf([trade("a", "forest"), trade("b", "island"), trade("c", "wastes")]);
    const today = helpOf([trade("a", "forest"), trade("b", "plains")]);
    const shown = reviewHelp(past, today);
    expect(shown.trades.map((t) => t.staple.oracleId)).toEqual(["a", "b", "c"]);
    expect(shown.noLonger).toEqual(["b", "c"]);
  });

  it("marks every trade when today's help could not be read", () => {
    expect(reviewHelp(helpOf([trade("a", "forest")]), null).noLonger).toEqual(["a"]);
  });
});
