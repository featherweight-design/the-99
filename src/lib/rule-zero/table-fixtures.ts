/**
 * The Rule 0 boards' tables as `TableView`s (handoff fixtures: Colin's pod Thursday night, with you, Colin the
 * owner, Peter, and Max, Colin's friend and not yours), one per state T1 to T10. For the page's tests and its
 * contact sheet; the decks are the boards' own. No seat but the viewer's carries a deck id, as the loader's does not.
 */
import { declarationAsk } from "../bracket/declaration-ask";
import { FINDING_ORDER, type FindingId } from "../bracket/findings";
import type { Bracket, BracketLean, CardRef, ComboRef } from "../bracket/types";
import { verdictSubLine } from "../bracket/verdict-head";
import { driversFor, inRead, seatState, seatValue, tableRead, type DriverVerdict, type SeatDeck } from "./rules";
import type { TableSeat, TableView } from "./table-view";

/** A fixture seat's reading before the loader reduces it: the verdict `driversFor` takes, its declaration, its counts. */
type SeatReading = DriverVerdict & { declared: Bracket | null; counts: Record<FindingId, number> };
type TableSeatDeck = SeatDeck & { deckName: string; commanderName: string; artCropUri: string | null; verdict: SeatReading | null };
type TableSeatView = Omit<TableSeat, "deck" | "state" | "value" | "read" | "drivers"> & { deck: TableSeatDeck | null };

type Counts = Record<FindingId, number>;
const counts = (gameChangers = 0, massLandDenial = 0, extraTurns = 0, twoCardCombos = 0, tutors = 0): Counts => ({
  gameChangers,
  massLandDenial,
  extraTurns,
  twoCardCombos,
  tutors,
});

const card = (name: string): CardRef => ({ oracleId: `o-${name}`, name });

const THASSA: ComboRef = {
  variantId: "v-thoracle",
  cards: [card("Thassa’s Oracle"), card("Demonic Consultation")],
  produces: ["Win the game"],
  bracketTag: "R",
  usesCommander: false,
} as ComboRef;

/** A lean that assembled Thassa's Oracle + Demonic Consultation, reached by `tutors` distinct tutors. */
const assembled = (tutors: number): BracketLean =>
  ({
    likely: 4,
    reason: "reachable",
    decidedBy: THASSA,
    receipts: [
      {
        combo: THASSA,
        pieces: THASSA.cards.map((piece) => ({
          piece,
          tutors: Array.from({ length: tutors }, (_, i) => card(`Tutor ${i + 1}`)),
        })),
      },
    ],
  }) as BracketLean;

const reading = (
  permits: Bracket[],
  o: Partial<Pick<SeatReading, "declared" | "violations" | "lean" | "counts">> = {},
): SeatReading => ({
  permits,
  declared: o.declared ?? null,
  violations: o.violations ?? [],
  lean: o.lean ?? null,
  counts: o.counts ?? counts(),
});

const deck = (deckName: string, commanderName: string, verdict: SeatReading | null, o: Partial<TableSeatDeck> = {}): TableSeatDeck => ({
  deckName,
  commanderName,
  artCropUri: `https://cards.example/art/${deckName.replace(/\s+/g, "-").toLowerCase()}.jpg`,
  built: 99,
  size: 99,
  reading: verdict ? { fresh: true } : "none",
  verdict,
  ...o,
});

const AT = new Date("2026-10-16T21:40:00Z");

const seat = (n: number, displayName: string, d: TableSeatDeck | null, o: Partial<TableSeatView> = {}): TableSeatView => ({
  seat: n,
  displayName,
  publicId: `pub-${displayName.toLowerCase()}`,
  you: false,
  podOwner: false,
  changedAt: AT,
  deck: d,
  ...o,
});

// The boards' decks.
const ghalta = () => deck("Ghalta Stompy", "Ghalta, Primal Hunger", reading([3], { counts: counts(2, 0, 0, 0, 3) }));
const sai = () => deck("Sai Thopters", "Sai, Master Thopterist", reading([3], { counts: counts(1, 0, 0, 0, 2) }));
const ashling = () => deck("Ashling Elementals", "Ashling, the Limitless", reading([3], { counts: counts(1, 0, 0, 0, 2) }));
const gisa = () => deck("Gisa Zombies", "Ghoulcaller Gisa", reading([3], { counts: counts(2, 0, 0, 0, 2) }));
const zimone = (permits: Bracket[] = [4], declared: Bracket | null = null) =>
  deck(
    "Zimone Combo",
    "Zimone, Infinite Analyst",
    reading(permits, {
      declared,
      lean: assembled(5),
      counts: counts(3, 0, 0, 1, 5),
      // A range's reasons are its bracket-3 violations (readiness gap 10).
      violations: permits.length > 1 ? [{ rule: "gameChangers", bracket: 3, have: 5, limit: 3 }] : [],
    }),
  );
const giada = () => deck("Giada Angels", "Giada, Font of Hope", reading([2], { counts: counts(0, 0, 0, 0, 1) }));
const miku = () => deck("Miku Tokens", "Trostani, Selesnya’s Voice", reading([1, 2]));

export const VIEWER_DECK_ID = "deck-viewer-ghalta";

const you = (d: TableSeatDeck | null = ghalta()) => seat(1, "Hugh", d, { you: true, publicId: null });
const colin = (d: TableSeatDeck | null) => seat(2, "Colin", d, { podOwner: true });
const peter = (d: TableSeatDeck | null) => seat(3, "Peter", d);
const max = (d: TableSeatDeck | null) => seat(4, "Max", d, { publicId: null });

/**
 * The table as `loadTable` returns it: each seat placed by the same `rules.ts` steps the loader runs (`seatState`,
 * `seatValue`, `tableRead`, `driversFor`), and its reading reduced to the loader's shape.
 */
const table = (input: TableSeatView[], o: Partial<TableView> = {}): TableView => {
  const placed = input.map((s) => {
    const state = seatState(s.deck);
    const verdict = s.deck?.verdict && inRead(state) ? s.deck.verdict : null;
    return { s, state, verdict, value: verdict ? seatValue(verdict.permits, verdict.declared) : null };
  });
  const read = tableRead(placed.map((p) => ({ id: String(p.s.seat), value: p.value })));
  const at = new Map(read.kind === "read" ? read.seats.map((r) => [r.id, r]) : []);
  const seats: TableSeat[] = placed.map(({ s, state, verdict, value }) => {
    const r = at.get(String(s.seat));
    const d = s.deck;
    return {
      ...s,
      deck: d && {
        deckId: s.you ? VIEWER_DECK_ID : null,
        name: d.deckName,
        commander: { name: d.commanderName, artCropUri: d.artCropUri },
        partner: null,
        cards: d.built + (100 - d.size),
        reading: verdict && {
          permits: [...verdict.permits],
          declared: verdict.declared,
          ask: declarationAsk(verdict.permits, verdict.declared),
          findings: FINDING_ORDER.map((id) => ({ id, count: verdict.counts[id] })),
          subLine: verdictSubLine(verdict),
          lean: null,
          rangeReasons: [],
        },
      },
      state,
      value,
      read: r ? { face: r.face, distance: r.distance, flag: r.flag } : null,
      drivers: r?.flag && verdict ? driversFor(verdict, r.flag, r.face) : null,
    };
  });
  return {
    tableId: "table-1",
    podName: "Thursday night",
    closesAt: new Date("2026-10-17T21:40:00Z"),
    setBy: "Colin",
    setByYou: false,
    viewerDeckId: input.find((s) => s.you)?.deck ? VIEWER_DECK_ID : null,
    revision: AT,
    seenAt: null,
    read: read.kind === "read" ? { kind: "read", middle: read.middle, band: read.band } : read,
    seats,
    offer: [],
    ...o,
  };
};

/** Every state the read boards draw, by frame. */
export const TABLES = {
  T1: table([you(), colin(sai()), peter(ashling()), max(gisa())]),
  T2: table([you(), colin(zimone()), peter(ashling()), max(gisa())]),
  T3: table([you(), colin(sai()), peter(giada()), max(gisa())]),
  T4: table([you(), colin(zimone()), peter(giada()), max(gisa())]),
  T5: table([you(), colin(zimone())], { setBy: "Hugh", setByYou: true }),
  T6: table([you(), colin(zimone([4, 5], 4)), peter(miku()), max(gisa())]),
  T7: table([you(), colin(zimone([4, 5], 1)), peter(ashling()), max(gisa())]),
  T8: table([
    you(),
    colin({ ...sai(), reading: { fresh: false } }),
    peter({ ...giada(), built: 86 }),
    // Over 100 with a stored reading: the reading is not used.
    max({ ...gisa(), built: 100 }),
  ]),
  T9: table([you(), colin(sai()), peter(deck("Ashling Elementals", "Ashling, the Limitless", null)), max(gisa())]),
  T10: table([you(), peter({ ...giada(), built: 86 }), max(null)], { setBy: "Hugh", setByYou: true }),
  /** Two undeclared Exhibition-or-Core ranges beside two Upgradeds: the middle is 2.25, so both ranges' faces sit at Core. */
  twoRanges: table([you(sai()), colin(miku()), peter(miku()), max(gisa())]),
  /** No flag, and the read seats do not all read the same: an undeclared Exhibition or Core beside two Cores. */
  mixed: table([you(giada()), colin(giada()), peter(miku())]),
  /** PR 7's S1: the viewer's own deck reads high, with two of their own decks nearer the middle offered. */
  S1: table([you(zimone()), colin(sai()), peter(ashling())], {
    offer: [
      { deckId: "deck-viewer-sai", name: "Sai Thopters", artCropUri: null, permits: [3], answered: null },
      { deckId: "deck-viewer-jace", name: "Jace Clones", artCropUri: null, permits: [3], answered: null },
    ],
  }),
  /** S6: the viewer's own deck reads low, with one nearer deck offered. */
  S6: table([you(giada()), colin(sai()), peter(ashling())], {
    offer: [{ deckId: "deck-viewer-ashling", name: "Ashling Elementals", artCropUri: null, permits: [3], answered: null }],
  }),
  /** Legal, with a row this deployment cannot read: its player analyzes it (rules.ts `needsAnalysis`). */
  needsAnalysis: table([
    you(),
    colin(sai()),
    peter(deck("Ashling Elementals", "Ashling, the Limitless", null, { reading: "unreadable" })),
  ]),
} as const satisfies Record<string, TableView>;
