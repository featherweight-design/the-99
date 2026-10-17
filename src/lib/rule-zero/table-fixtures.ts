/**
 * The Rule 0 boards' tables as `TableView`s (handoff fixtures: Colin's pod Thursday night, with you, Colin the
 * owner, Peter, and Max, Colin's friend and not yours), one per state T1 to T10. For the page's tests and its
 * contact sheet; the decks are the boards' own. No seat but the viewer's carries a deck id, as the loader's does not.
 */
import type { FindingId } from "../bracket/findings";
import type { Bracket, BracketLean, CardRef, ComboRef } from "../bracket/types";
import type { SeatReading, TableSeatDeck, TableSeatView, TableView } from "./table-view";

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

const table = (seats: TableSeatView[], o: Partial<TableView> = {}): TableView => ({
  tableId: "table-1",
  podName: "Thursday night",
  setBy: "Colin",
  closesAt: new Date("2026-10-17T21:40:00Z"),
  revision: AT,
  viewerDeckId: VIEWER_DECK_ID,
  seats,
  ...o,
});

/** Every state the read boards draw, by frame. */
export const TABLES = {
  T1: table([you(), colin(sai()), peter(ashling()), max(gisa())]),
  T2: table([you(), colin(zimone()), peter(ashling()), max(gisa())]),
  T3: table([you(), colin(sai()), peter(giada()), max(gisa())]),
  T4: table([you(), colin(zimone()), peter(giada()), max(gisa())]),
  T5: table([you(), colin(zimone())], { setBy: null }),
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
  T10: table([you(), peter({ ...giada(), built: 86 }), max(null)], { setBy: null }),
  /** Legal, with a row this deployment cannot read: its player analyzes it (rules.ts `needsAnalysis`). */
  needsAnalysis: table([
    you(),
    colin(sai()),
    peter(deck("Ashling Elementals", "Ashling, the Limitless", null, { reading: "unreadable" })),
  ]),
} as const satisfies Record<string, TableView>;
