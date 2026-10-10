import { describe, expect, it } from "vitest";
import { landProduces, manaSupply, type ManaSupplyCardRow } from "./supply";

const JUND = ["B", "R", "G"];
const land = (typeLine: string, oracleText: string | null, name = "Test Land") => ({ name, typeLine, oracleText });

describe("landProduces", () => {
  it("reads a basic from its type", () => {
    expect(landProduces(land("Basic Land — Forest", "({T}: Add {G}.)"), JUND)).toEqual(["G"]);
  });
  it("reads a typed dual from its type line and a plain dual from its text", () => {
    expect(landProduces(land("Land — Forest Island", null), JUND)).toEqual(["U", "G"]);
    expect(landProduces(land("Land", "{T}: Add {B} or {R}."), JUND)).toEqual(["B", "R"]);
  });
  it("counts a white ability on a colorless land only where it ADDS white", () => {
    expect(landProduces(land("Land", "{T}: Add {C}.\n{W}, {T}: Create a 1/1 white Spirit."), JUND)).toEqual(["C"]);
  });
  it("gives an any-color land each of the deck's colors", () => {
    expect(landProduces(land("Land", "{T}: Add one mana of any color in your commander's color identity."), JUND)).toEqual(["B", "R", "G"]);
    expect(landProduces(land("Land", "{T}: Add one mana of any color in your commander's color identity."), [])).toEqual([]);
  });
  it("adds the deck's colors for a chosen-color land, beside its own symbol", () => {
    expect(landProduces(land("Land", "{T}: Add {G} or one mana of the chosen color."), ["G", "U", "B"])).toEqual(["U", "B", "G"]);
  });
  it("gives nothing for a grant that reads another land", () => {
    expect(landProduces(land("Land", "{T}: Add one mana of any color that a land an opponent controls could produce."), JUND)).toEqual([]);
    expect(landProduces(land("Land", "{T}: Add one mana of any type that a land you control could produce."), JUND)).toEqual([]);
  });
  it("gives a pick-a-color land (Rhystic Cave) the deck's colors, but not a choice tied to a permanent", () => {
    expect(landProduces(land("Land", "{T}: Choose a color. Add one mana of that color unless any player pays {1}. Activate only as an instant.", "Rhystic Cave"), JUND)).toEqual(["B", "R", "G"]);
    expect(landProduces(land("Land", "{T}: Choose a color of a permanent you control. Add one mana of that color.", "Meteor Crater"), JUND)).toEqual([]);
  });
  it("gives a circled-colors land (Cryptic Spires) the deck's colors, and not Paliano's drafted ones", () => {
    expect(landProduces(land("Land", "As you create your deck, circle two of the colors below.\nThis land enters tapped.\n{T}: Add one mana of either of the circled colors.", "Cryptic Spires"), JUND)).toEqual(["B", "R", "G"]);
    expect(landProduces(land("Land", "{T}: Add one mana of any color chosen as you drafted.", "Paliano, the High City"), JUND)).toEqual([]);
  });
  it("credits a land that searches for a basic without being sacrificed (Thawing Glaciers)", () => {
    expect(landProduces(land("Land", "This land enters tapped.\n{1}, {T}: Search your library for a basic land card, put that card onto the battlefield tapped, then shuffle. Return this land to its owner's hand at the beginning of the next cleanup step.", "Thawing Glaciers"), JUND)).toEqual(["B", "R", "G"]);
  });
  it("does not credit a land that sacrifices itself for a color as a source of it", () => {
    const t = "{T}: Add {W}.\n{T}, Sacrifice this land: Add one mana of any color.";
    expect(landProduces(land("Land", t, "Abandoned Outpost"), JUND)).toEqual(["W"]);
  });
  it("reads an unrestricted land search as the deck's colors", () => {
    const t = "{T}: Add {C}.\n{2}, {T}, Sacrifice this land: Search your library for a land card, put it onto the battlefield tapped, then shuffle.";
    expect(landProduces(land("Land", t, "Urza's Cave"), JUND)).toEqual(["B", "R", "G", "C"]);
  });
  it("unions every land face of a modal land and ignores a spell face", () => {
    const t = "({T}: Add {W}.)\n{T}: Add {W}.\n//\n{T}: Add {U}.";
    expect(landProduces(land("Land // Land", t, "Hengegate Pathway // Mistgate Pathway"), JUND)).toEqual(["W", "U"]);
    expect(landProduces(land("Land // Instant", "{T}: Add {R}.\n//\nAdd {B}{B}{B}.", "Front // Ritual"), JUND)).toEqual(["R"]);
  });
  it("reads an 'up to two basic land cards' search as the deck's colors", () => {
    const t = "{T}: Add {C}.\n{4}, {T}, Sacrifice this land: Search your library for up to two basic land cards, put them onto the battlefield tapped, then shuffle.";
    expect(landProduces(land("Land", t, "Myriad Landscape"), JUND)).toEqual(["B", "R", "G", "C"]);
  });
  it("gives a fetch the basic types it names, and a basic-land search the deck's colors", () => {
    expect(landProduces(land("Land", "{T}, Pay 1 life, Sacrifice this land: Search your library for a Swamp or Forest card, put it onto the battlefield, then shuffle."), JUND)).toEqual(["B", "G"]);
    expect(landProduces(land("Land", "{T}, Sacrifice this land: Search your library for a basic land card, put it onto the battlefield tapped, then shuffle."), JUND)).toEqual(["B", "R", "G"]);
  });
  it("ignores reminder text, so landcycling is not a fetch", () => {
    expect(landProduces(land("Land", "{T}: Add {C}.\nBasic landcycling {1} ({1}, Discard this card: Search your library for a basic land card, reveal it, put it into your hand, then shuffle.)"), JUND)).toEqual(["C"]);
  });
});

const row = (o: Partial<ManaSupplyCardRow>): ManaSupplyCardRow => ({ typeLine: "Creature", manaCost: null, quantity: 1, ...o });

describe("manaSupply", () => {
  it("counts raw pips per copy, hybrid once per half, and drops generic and Phyrexian pips", () => {
    const s = manaSupply([
      row({ manaCost: "{2}{R}{R}", quantity: 2 }),
      row({ manaCost: "{W/U}{G}" }),
      row({ manaCost: "{1}{W/P}{2/B}{C}" }),
    ]);
    expect(s.demand).toEqual({ W: 1, U: 1, B: 0, R: 4, G: 1, C: 1 });
  });
  it("counts a land once for each color it adds, per copy, and a dual twice over the deck", () => {
    const s = manaSupply([
      row({ typeLine: "Basic Land — Forest", quantity: 5, produces: ["G"] }),
      row({ typeLine: "Land", produces: ["B", "G"] }),
      row({ typeLine: "Land", produces: [] }),
    ]);
    expect(s.supply.G.lands).toBe(6);
    expect(s.supply.B.lands).toBe(1);
    expect(s.lands).toBe(7);
  });
  it("puts non-land ramp in unattributedNonland and never into a color", () => {
    const s = manaSupply([row({ typeLine: "Artifact", ramp: true, quantity: 2, manaCost: "{1}" }), row({ ramp: true })]);
    expect(s.unattributedNonland).toBe(3);
    expect(Object.values(s.supply).every((x) => x.nonland === 0 && x.lands === 0)).toBe(true);
  });
  it("takes a land's cost and its ramp flag for nothing", () => {
    const s = manaSupply([row({ typeLine: "Land", manaCost: "{R}", ramp: true, produces: ["R"] })]);
    expect(s.demand.R).toBe(0);
    expect(s.unattributedNonland).toBe(0);
  });
  it("is all zeros for an empty frame", () => {
    const s = manaSupply([]);
    expect(s.lands).toBe(0);
    expect(Object.values(s.demand).every((n) => n === 0)).toBe(true);
  });
});
