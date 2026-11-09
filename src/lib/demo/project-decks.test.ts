import { describe, expect, it } from "vitest";

import type { Availability } from "../cards/availability";
import type { PriceFact } from "../cards/price-fact";
import type { ComboPartner } from "../combos/near-miss";
import type { SynergyCard } from "../commanders/synergy-cards";
import type { CandidateFacts } from "../bracket/delta";
import type { DeckDetailCard } from "../decks/grouping";
import type { PriceRead } from "../decks/price-query";
import type { DeckCommander, DeckDetail } from "../decks/read";
import type { FitsRead } from "../swaps/fits";
import type { FitsReadPanel } from "../swaps/fits-read-run";
import type { CutsPanel } from "../tuning/cuts-state";
import type { ManaPanelData } from "../tuning/mana-view";
import type { RecommendedMix } from "../decks/mix";
import { projectCuts, projectDeck, projectFits, projectMana, projectPlayedDeck, projectTopOff } from "./project-decks";

const DECK = "00000000-0000-4000-8000-000000000001";
const ASOF = new Date("2026-11-01T00:00:00Z");
const fact = (cents: number): PriceFact => ({ cents, foilCents: null, etchedCents: null, asOf: ASOF });

const row = (name: string, group: DeckDetailCard["cardTypeGroup"], extra: Partial<DeckDetailCard> = {}): DeckDetailCard => ({
  oracleId: `o-${name}`, name, typeLine: group === "Lands" ? "Land" : "Creature", cardTypeGroup: group, role: "other", cmc: 1,
  owned: true, quantity: 1, auto: false, printedName: null, printedSetCode: null, printedCollectorNumber: null, imageUri: `img-${name}`,
  ...extra,
});
const commander = (name: string, extra: Partial<DeckCommander> = {}): DeckCommander =>
  ({ oracleId: `o-${name}`, name, typeLine: "Legendary Creature", colorIdentity: ["R"], imageUri: `img-${name}`, owned: true, ...extra }) as unknown as DeckCommander;
const detail = (cards: DeckDetailCard[], extra: Partial<DeckDetail> = {}): DeckDetail =>
  ({ id: DECK, name: "Ashen Banner Parade", commander: commander("Ashling"), partner: null, cards, unresolvedRows: [], total: cards.length + 1,
    declaredBracket: null, noteCounts: { gameChanger: 0 }, ...extra }) as unknown as DeckDetail;

describe("projectDeck", () => {
  const cards = [row("Zap", "Instants"), row("Mountain", "Lands"), row("Bolt Elemental", "Creatures", { printedName: "Flavor Bolt" }), row("Ash", "Creatures")];
  const priced: PriceRead = { prices: new Map([["o-Zap", fact(120)], ["o-Ashling", fact(900)]]), newestAsOf: ASOF };
  const combos = new Map<string, ComboPartner>([["o-Zap", { partnerOracleId: "o-Ash", partnerName: "Ash" } as ComboPartner]]);

  it("holds the deck page's rows, assembled as the page assembles them, and nothing else", () => {
    const out = projectDeck({ deckId: DECK, detail: detail(cards), priced, inDeckCombos: combos });
    expect(Object.keys(out).sort()).toEqual(["cards", "commander", "commanderShopping", "deckName", "id", "newestAsOf", "partner", "siblings"]);
    expect(out.id).toBe(DECK);
    expect(out.deckName).toBe("Ashen Banner Parade");
    expect(out.newestAsOf).toBe(ASOF);
    const zap = out.cards.find((c) => c.oracleId === "o-Zap")!;
    expect(zap.price).toEqual(fact(120));
    expect(zap.comboPartner).toEqual({ oracleId: "o-Ash", name: "Ash" });
    expect(out.cards.find((c) => c.oracleId === "o-Ash")!.price).toBeNull();
    expect(out.commander.price).toEqual(fact(900));
    expect(out.partner).toBeNull();
  });

  it("orders the siblings as a first visit's decklist draws them: commanders, then each type group by name", () => {
    const out = projectDeck({ deckId: DECK, detail: detail(cards), priced, inDeckCombos: null });
    expect(out.siblings.map((s) => s.oracleId)).toEqual(["o-Ashling", "o-Ash", "o-Bolt Elemental", "o-Zap", "o-Mountain"]);
    expect(out.siblings[0]).toEqual({ oracleId: "o-Ashling", name: "Ashling", imageUri: "img-Ashling", colorIdentity: ["R"] });
    // A row's sibling carries the name the row draws: the printed one when the copy has one.
    expect(out.siblings[2]).toMatchObject({ oracleId: "o-Bolt Elemental", name: "Flavor Bolt", imageUri: "img-Bolt Elemental" });
  });

  it("a failed price read prices nothing and dates nothing; a failed combo read marks nothing", () => {
    const out = projectDeck({ deckId: DECK, detail: detail(cards), priced: null, inDeckCombos: null });
    expect(out.newestAsOf).toBeNull();
    expect(out.cards.every((c) => c.price === null && c.comboPartner === null)).toBe(true);
  });

  it("gives the mark key the commanders the Shopping list bills: an unowned one, never an owned one", () => {
    expect(projectDeck({ deckId: DECK, detail: detail(cards), priced, inDeckCombos: null }).commanderShopping).toEqual([]);
    const unowned = detail(cards, { commander: commander("Giada", { owned: false }) });
    expect(projectDeck({ deckId: DECK, detail: unowned, priced, inDeckCombos: null }).commanderShopping.map((c) => c.oracleId)).toEqual(["o-Giada"]);
  });
});

describe("projectPlayedDeck", () => {
  const cell = (target: number) => ({ label: `L${target}`, target, advisory: false });
  const mix = { cells: { ramp: cell(10), draw: cell(9), removal: cell(8), wipes: cell(3), land: cell(36) }, types: null } as unknown as RecommendedMix;
  const deck = projectDeck({ deckId: DECK, detail: detail([row("Zap", "Instants"), row("Ash", "Creatures", { printedName: "Flavor Ash" })]), priced: null, inDeckCombos: null });

  it("adds what the builder derives for Analysis and Suggested changes, from the deck's own rows, and keeps the deck", () => {
    const out = projectPlayedDeck(deck, { detail: { declaredBracket: 3 }, labelRows: null, mix, permits: [2, 3] });
    expect(Object.keys(out).sort()).toEqual([...Object.keys(deck), "analysis", "declared", "permits", "runFigures"].sort());
    expect(Object.keys(out.analysis).sort()).toEqual(["art", "ledgerAvailability"]);
    expect(out.analysis.art.get("o-Ash")).toEqual({ name: "Flavor Ash", imageUri: "img-Ash" });
    expect([...out.analysis.ledgerAvailability.keys()]).toEqual(["o-Zap", "o-Ash", "o-Ashling"]);
    expect(out.runFigures.typeCounts).toEqual({ Instants: 1, Creatures: 1 });
    expect(out.runFigures.roles.map((r) => r.target)).toEqual([10, 9, 8, 3, 36]);
    expect(out.permits).toEqual([2, 3]);
    expect(out.declared).toBe(3);
    expect(out.cards).toBe(deck.cards);
  });

  it("an unread deck permits nothing and a deck with no declaration declares nothing", () => {
    const out = projectPlayedDeck(deck, { detail: { declaredBracket: null }, labelRows: null, mix, permits: null });
    expect(out.permits).toBeNull();
    expect(out.declared).toBeNull();
  });
});

describe("projectCuts and projectMana", () => {
  it("keeps what the cuts drawing reads and drops the owner's live state: the allowance, the re-review and the fingerprint", () => {
    const kept = {
      run: { id: "r1", status: "ok", errorClass: null, createdAt: ASOF, droppedCount: 0 }, items: [{ id: "i1", reason: "Too slow here" }],
      itemsReport: { over: 4 }, lastOkAt: ASOF, modelVersionMoved: false, total: 104, bodySize: 99, over: 4, commander: "Giada",
      allLocked: false, lockedCount: 0, keyCount: 0, declaredBracket: null, edhrecDecks: 1200, thin: false, rows: [], chips: {},
      resultCurrent: true, asked: 4,
    };
    const panel = {
      ...kept, lastOkFingerprint: "fp", review: null,
      allowance: { used: 1, limit: 3, reopensAt: null, nextAt: null, plan: 40, paidUsedToday: 2, paidLimit: 50 },
    } as unknown as CutsPanel;
    const out = projectCuts(panel);
    expect(out).not.toHaveProperty("allowance");
    expect(out).not.toHaveProperty("review");
    expect(out).not.toHaveProperty("lastOkFingerprint");
    expect(Object.keys(out).sort()).toEqual(Object.keys(kept).sort());
    expect(out).toEqual(kept);
  });

  it("hands Mana Balance's read on unchanged", () => {
    const data = { commander: "Zimone", commanders: 1, cards: 94, ids: {}, art: {} } as unknown as ManaPanelData;
    expect(projectMana(data)).toBe(data);
  });

  it("refuse a read that came back empty, rather than export a step with nothing to draw", () => {
    expect(() => projectCuts(null)).toThrow(/cuts panel/);
    expect(() => projectMana(null)).toThrow(/Mana Balance/);
  });
});

describe("projectTopOff", () => {
  const syn = (name: string, extra: Partial<SynergyCard> = {}): SynergyCard =>
    ({ oracleId: `o-${name}`, name, typeLine: "Creature", inclusionPct: 10, synergyPts: 5, imageUri: `img-${name}`, owned: false, committedTo: null, availability: null, ...extra }) as unknown as SynergyCard;
  const cards = [row("Forest", "Lands", { quantity: 90 }), row("Held", "Creatures")];
  const ranked = [syn("Bought"), syn("Held"), syn("Owned", { owned: true }), syn("Against", { synergyPts: -2 })];
  const avail = { owned: 1, hard: 0, soft: 0, free: 1, claims: [] } as unknown as Availability;
  const facts = { kinds: [] } as unknown as CandidateFacts;
  const input = {
    cards,
    detail: { partner: null, unresolvedRows: [], declaredBracket: 2 as const, noteCounts: { gameChanger: 1 } as unknown as DeckDetail["noteCounts"] },
    ranked,
    // The pool as the exporter cut it (`listLastSlotsCandidates`): the deck's own card and the one EDHREC argues against out.
    candidateCards: [ranked[0], ranked[2]],
    ownedArt: new Map([["o-Owned", "owned-art"]]),
    priced: { prices: new Map([["o-Bought", fact(250)], ["o-Owned", fact(50)]]), newestAsOf: ASOF } as PriceRead,
    availability: new Map([["o-Owned", avail]]),
    candidateFacts: new Map([["o-Bought", facts]]),
    completions: new Map<string, ComboPartner>([["o-Owned", { partnerOracleId: "o-Forest", partnerName: "Forest" } as ComboPartner]]),
  };

  it("assembles exactly the pool it is handed, in its order, without cutting it again", () => {
    const out = projectTopOff(input);
    expect(Object.keys(out).sort()).toEqual(["allNegative", "bodySize", "candidates", "deckOracleIds", "declaredBracket", "newestAsOf", "noteCounts", "openSlots"]);
    expect(out.candidates.map((c) => c.oracleId)).toEqual(["o-Bought", "o-Owned"]);
    expect(projectTopOff({ ...input, candidateCards: [ranked[2]] }).candidates.map((c) => c.oracleId)).toEqual(["o-Owned"]);
    expect(out.allNegative).toBe(false);
  });

  it("prices only an unowned row, gives availability only to an owned one, and carries each row's art, facts and combo", () => {
    const [bought, owned] = projectTopOff(input).candidates;
    expect(bought).toMatchObject({ price: fact(250), availability: null, facts, comboPartner: null, imageUri: "img-Bought" });
    expect(owned).toMatchObject({ price: null, availability: avail, facts: null, comboPartner: { oracleId: "o-Forest", name: "Forest" }, imageUri: "owned-art" });
  });

  it("counts the open slots against the body the builder counts, and passes the deck's own facts through", () => {
    const out = projectTopOff(input);
    expect(out.bodySize).toBe(99);
    expect(out.openSlots).toBe(99 - 91);
    expect([...out.deckOracleIds].sort()).toEqual(["o-Forest", "o-Held"]);
    expect(out.newestAsOf).toBe(ASOF);
    expect(out.declaredBracket).toBe(2);
    expect(out.noteCounts).toBe(input.detail.noteCounts);
  });

  it("says the pool emptied itself when every card left is one EDHREC argues against", () => {
    const out = projectTopOff({ ...input, ranked: [syn("Held"), syn("Against", { synergyPts: -2 })], candidateCards: [] });
    expect(out.candidates).toEqual([]);
    expect(out.allNegative).toBe(true);
  });
});

describe("projectFits", () => {
  const card = { oracleId: "o-Swords", name: "Swords to Plowshares", printedName: null, colorIdentity: ["W"], quantity: 1, availability: { free: 1 } };
  const read = { card: { oracleId: "o-Swords", name: "Swords to Plowshares", colorIdentity: ["W"] }, owned: 2, free: -1, fits: [], holds: [], excluded: [] } as unknown as FitsRead;
  const panel = {
    fits: read, view: { pending: null, stored: null, failed: null }, candidates: 2, names: { "o-Swords": "Swords to Plowshares" }, images: {}, commanderIds: {},
    allowance: { used: 1, limit: 3, reopensAt: null, nextAt: null, welcome: 4 }, planSources: { d1: "stored" },
  } as unknown as FitsReadPanel;

  it("holds the drawing's data and nothing of its UI state", () => {
    const out = projectFits({ card, panel, read });
    expect(Object.keys(out).sort()).toEqual(["card", "countsKnown", "freeNow", "list", "name", "owned", "panel"]);
    expect(out.card).toEqual({ oracleId: "o-Swords", colorIdentity: ["W"] });
    expect(out.name).toBe("Swords to Plowshares");
    expect(out.panel).toEqual({ fits: read, view: panel.view, candidates: 2, names: panel.names, images: {}, commanderIds: {} });
    expect(out.list).toEqual({ read });
  });

  it("drops the owner's live state from the read panel: their allowance and the per-deck plan sources", () => {
    const out = projectFits({ card, panel, read });
    expect(out.panel).not.toHaveProperty("allowance");
    expect(out.panel).not.toHaveProperty("planSources");
  });

  it("counts from the list's read when it landed, never fewer than none free", () => {
    expect(projectFits({ card, panel, read })).toMatchObject({ owned: 2, freeNow: 0, countsKnown: true });
  });

  it("without a read, counts from the card, known only when its availability read worked", () => {
    expect(projectFits({ card, panel: null, read: null })).toMatchObject({ owned: 1, freeNow: 1, countsKnown: true });
    expect(projectFits({ card: { ...card, availability: null }, panel: null, read: null })).toMatchObject({ owned: 1, freeNow: 0, countsKnown: false });
  });

  it("heads with the printed name when the opened copy has one", () => {
    expect(projectFits({ card: { ...card, printedName: "Flavor Swords" }, panel: null, read: null }).name).toBe("Flavor Swords");
  });

  it("refuses a read about another card", () => {
    const other = { ...read, card: { ...read.card, oracleId: "o-Other" } } as FitsRead;
    expect(() => projectFits({ card, panel: null, read: other })).toThrow(/another card/);
    expect(() => projectFits({ card, panel: { ...panel, fits: other }, read })).toThrow(/another card/);
  });
});
