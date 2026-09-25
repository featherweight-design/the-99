import { describe, expect, it } from "vitest";

import { recommendedMix, type RecommendedMix } from "../decks/mix";
import { mixKey } from "../decks/deck-mix";
import { shapeFits, themeReason, type DeckCard, type DeckRow, type FitReason, type FitsRead } from "./fits";

const birds: FitsRead["card"] = { oracleId: "o-birds", name: "Birds of Paradise", colorIdentity: ["G"], commanderLegal: true, role: "ramp" };
const deck = (over: Partial<DeckRow> & { id: string; name: string }): DeckRow => ({
  commander_oracle_id: `c-${over.id}`, partner_oracle_id: null, commander_names: [`Cmdr ${over.id}`], commander_types: [],
  identity: ["G", "R"], holds: 0, leads: false, synergy: null, ...over,
});
const measured = { ...recommendedMix(null, false), rolesUsable: true, landMeasured: true };
const flat = recommendedMix(null, false);
const mixesFor = (rows: DeckRow[], mix: RecommendedMix = measured) =>
  new Map(rows.map((r) => [mixKey({ commanderOracleId: r.commander_oracle_id, partnerOracleId: r.partner_oracle_id }), mix]));

describe("mixKey", () => {
  // The skeleton's fallback reads the first commander's row, so the order is part of the question.
  it("keys a pair by its column order, as the deck page asks it", () => {
    expect(mixKey({ commanderOracleId: "a", partnerOracleId: "b" })).not.toBe(mixKey({ commanderOracleId: "b", partnerOracleId: "a" }));
    expect(mixKey({ commanderOracleId: "a", partnerOracleId: null })).not.toBe(mixKey({ commanderOracleId: "a", partnerOracleId: "b" }));
  });
});

describe("shapeFits", () => {
  it("sorts the decks into fit, holds and ruled out by colors; with no synergy figure, each by name", () => {
    const rows = [
      deck({ id: "k", name: "Kinnan" }),
      deck({ id: "g", name: "Gishath" }),
      deck({ id: "t", name: "Tymna", holds: 1 }),
      deck({ id: "a", name: "Atraxa", leads: true }),
      deck({ id: "u", name: "Urza", identity: ["U"] }),
    ];
    const r = shapeFits(birds, rows, new Map([["g", 7], ["k", 11]]), mixesFor(rows), { owned: 2, free: 1 });
    expect(r.fits.map((d) => d.name)).toEqual(["Gishath", "Kinnan"]);
    expect(r.fits[0]).toMatchObject({ need: { role: "ramp", have: 7, target: 10 }, reason: null });
    // A deck the card leads holds it too.
    expect(r.holds).toEqual([{ id: "a", name: "Atraxa", quantity: 1 }, { id: "t", name: "Tymna", quantity: 1 }]);
    expect(r.excluded).toEqual([{ id: "u", name: "Urza", commanders: ["Cmdr u"], outside: ["G"] }]);
    expect(r).toMatchObject({ owned: 2, free: 1, staple: false });
  });

  // v2 item 9: by each commander's synergy for the card, the deck with no figure last, then by name.
  it("ranks the decks that could take it by synergy", () => {
    const r = shapeFits(birds, [
      deck({ id: "a", name: "Alpha", synergy: 0.05 }),
      deck({ id: "b", name: "Bravo", synergy: 0.61 }),
      deck({ id: "c", name: "Charlie" }),
      deck({ id: "d", name: "Delta", synergy: "0.3" }),
    ], new Map(), new Map(), { owned: 1, free: 1 });
    expect(r.fits.map((f) => f.name)).toEqual(["Bravo", "Delta", "Alpha", "Charlie"]);
  });

  // Hugh's Q7: a combo the card completes, then a theme it joins (the most cards first), then synergy.
  it("ranks a completed combo first, then a joined theme, then synergy", () => {
    const reasons = new Map<string, FitReason>([
      ["t1", { kind: "theme", theme: "mill", n: 3 }],
      ["t2", { kind: "theme", theme: { type: "Elf" }, n: 9 }],
      ["c", { kind: "combo", with: { oracleId: "o-x", name: "Fraying Sanity" } }],
    ]);
    const r = shapeFits(birds, [
      deck({ id: "s", name: "Synergy", synergy: 0.9 }),
      deck({ id: "t1", name: "Theme Three", synergy: 0.5 }),
      deck({ id: "t2", name: "Theme Nine" }),
      deck({ id: "c", name: "Combo" }),
    ], new Map(), new Map(), { owned: 1, free: 1 }, false, reasons);
    expect(r.fits.map((f) => f.name)).toEqual(["Combo", "Theme Nine", "Theme Three", "Synergy"]);
    expect(r.fits[0].reason).toEqual(reasons.get("c"));
  });

  it("keeps a staple's list by name, since its figure is about every commander", () => {
    const r = shapeFits(birds, [
      deck({ id: "a", name: "Alpha", synergy: 0.05 }),
      deck({ id: "b", name: "Bravo", synergy: 0.61 }),
    ], new Map(), new Map(), { owned: 1, free: 1 }, true);
    expect(r.fits.map((f) => f.name)).toEqual(["Alpha", "Bravo"]);
  });

  it("carries the staple flag through, for the picker's staple form", () => {
    const rows = [deck({ id: "g", name: "Gishath" })];
    expect(shapeFits(birds, rows, new Map(), mixesFor(rows), { owned: 0, free: null }, true).staple).toBe(true);
  });

  it("names no need when the card has no role, or its role's target was not measured (F9)", () => {
    const rows = [deck({ id: "g", name: "Gishath" })];
    expect(shapeFits({ ...birds, role: "other" }, rows, new Map(), mixesFor(rows), { owned: 0, free: null }).fits[0].need).toBeNull();
    expect(shapeFits(birds, rows, new Map([["g", 7]]), mixesFor(rows, flat), { owned: 0, free: null }).fits[0].need).toBeNull();
  });

  it("measures a land against the land count, which has its own half", () => {
    const rows = [deck({ id: "g", name: "Gishath" })];
    const land = { ...birds, role: "land" as const };
    const landOnly = { ...flat, landMeasured: true };
    expect(shapeFits(land, rows, new Map([["g", 33]]), mixesFor(rows, landOnly), { owned: 0, free: null }).fits[0].need)
      .toEqual({ role: "land", have: 33, target: landOnly.cells.land.target });
  });

  it("counts a deck with none of the role as zero of it, not as no need", () => {
    const rows = [deck({ id: "g", name: "Gishath" })];
    expect(shapeFits(birds, rows, new Map(), mixesFor(rows), { owned: 0, free: null }).fits[0].need)
      .toEqual({ role: "ramp", have: 0, target: 10 });
  });
});

describe("themeReason", () => {
  const row = (id: string, typeLine: string, oracleText: string): DeckCard =>
    ({ deck_id: "d", oracle_id: id, quantity: 1, name: id, type_line: typeLine, oracle_text: oracleText, keywords: [] });
  const MILL = "Target player mills three cards.";
  const TOKENS = "Create a 1/1 green Saproling creature token.";
  const elves = (w: string) => w === "Elf";

  it("names the theme the most of the deck's other cards carry", () => {
    const deck = [row("a", "Sorcery", MILL), row("b", "Sorcery", MILL), row("c", "Sorcery", TOKENS)];
    expect(themeReason({ oracleId: "x", themes: ["tokens", "mill"], subtypes: [] }, deck, [], elves)).toEqual({ theme: "mill", n: 2 });
  });

  // d9: a tie goes to the theme earlier in the approved list (tokens before mill).
  it("breaks a tie by the approved theme order", () => {
    const deck = [row("a", "Sorcery", MILL), row("c", "Sorcery", TOKENS)];
    expect(themeReason({ oracleId: "x", themes: ["mill", "tokens"], subtypes: [] }, deck, [], elves)).toEqual({ theme: "tokens", n: 1 });
  });

  it("never counts the card itself, and names nothing when no other card shares a theme", () => {
    const deck = [row("x", "Sorcery", MILL), row("c", "Sorcery", TOKENS)];
    expect(themeReason({ oracleId: "x", themes: ["mill"], subtypes: [] }, deck, [], elves)).toBeNull();
  });

  it("picks the key type by copies, and counts cards for n", () => {
    const rats = { ...row("r", "Creature — Rat", "{T}: Add {B}."), quantity: 6 };
    const elfRows = Array.from({ length: 5 }, (_, i) => row(`e${i}`, "Creature — Elf", "{T}: Add {G}."));
    expect(themeReason({ oracleId: "x", themes: [], subtypes: ["Rat"] }, [rats, ...elfRows], [], elves)).toEqual({ theme: { type: "Rat" }, n: 1 });
  });

  // Hugh's Q5: tribal is membership too. An Elf joins an Elf deck's creatures.
  it("names the deck's key creature type for a creature of that type", () => {
    const deck = Array.from({ length: 6 }, (_, i) => row(`e${i}`, i % 2 ? "Creature — Elf Druid" : "Creature — Elf Warrior", "{T}: Add {G}."));
    expect(themeReason({ oracleId: "x", themes: [], subtypes: ["Elf", "Warrior"] }, deck, [], elves)).toEqual({ theme: { type: "Elf" }, n: 6 });
    expect(themeReason({ oracleId: "x", themes: [], subtypes: ["Goblin"] }, deck, [], elves)).toBeNull();
  });
});
