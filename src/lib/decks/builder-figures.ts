// Three things the deck builder derives from the rows it holds, for the Analysis tab and Suggested changes: the art a
// finding's receipt draws, the copies the benchmark ledger marks, and the figures a v2 run's group heads read. Pure, and
// out of `builder-shell.tsx`: shared with the landing demo's exporter (PR 6b-2), so both derive these values through the
// same functions.
import { printedNameOf } from "../cards/printed-name";
import type { CardTypeGroup, DeckDetailCard } from "./grouping";
import type { JobRowsByCard } from "./job-tally";
import { roleCounterFor } from "./label-role-counts";
import { ROLE_ORDER, type RecommendedMix } from "./mix";
import type { DeckCommander } from "./read";

/**
 * What a receipt tile draws for a card: the name printed on the copy the player owns, and its art.
 *
 * RESOLVED AT THE DRAW, from the deck page's own rows, never carried on the profile. The profile
 * is a cached document keyed on the deck's cards, and a printing is a fact about the READER's
 * collection — an art pick would retire a profile whose every figure is unchanged. Every card a
 * finding names is one of this deck's own rows or its commander, so the deck page always holds
 * the answer; a card missing from the map draws a plain plate and its oracle name.
 */
export type FindingArt = ReadonlyMap<string, { name: string; imageUri: string | null }>;

/**
 * What the deck page knows about each of its cards' copies, by oracle id: whether the player owns
 * it and the availability its decklist row draws. A card absent from it (a commander, a card no
 * longer in the list) draws no marker.
 */
export type LedgerAvailability = ReadonlyMap<string, { owned: boolean; availability: DeckDetailCard["availability"] }>;

/** What the grouping heads read off the deck page: its count per type group, and what it has of each shelf role. */
export type RunFigures = {
  typeCounts: Partial<Record<CardTypeGroup, number>>;
  roles: readonly { role: string; have: number; target: number }[];
};

/** The deck's commanders, the partner after the commander. */
const commandersOf = (commander: DeckCommander, partner: DeckCommander | null) => [commander, ...(partner ? [partner] : [])];

/**
 * What the benchmark ledger's rows draw for each card's copies: the decklist row's own facts, and the commanders' (a
 * commander's absent `owned` means owned, as everywhere else). A proxied slot is filled by its proxy, so it draws no
 * marker, as the decklist row suppresses it.
 */
export function ledgerAvailabilityOf(cards: readonly DeckDetailCard[], commander: DeckCommander, partner: DeckCommander | null): LedgerAvailability {
  return new Map([
    ...cards.map((c) => [c.oracleId, { owned: c.owned && !c.proxied, availability: c.proxied ? null : c.availability ?? null }] as const),
    ...commandersOf(commander, partner).map((c) =>
      [c.oracleId, { owned: (c.owned ?? true) && !c.proxied, availability: c.proxied ? null : c.availability ?? null }] as const),
  ]);
}

/**
 * What a receipt tile draws for each card the findings can name: its own printed name and the art of the copy this reader
 * owns. Every one of them is a row here or a commander, so the map is complete by construction and the profile never has
 * to carry a printing.
 */
export function findingArtOf(cards: readonly DeckDetailCard[], commander: DeckCommander, partner: DeckCommander | null): FindingArt {
  const art = new Map<string, { name: string; imageUri: string | null }>();
  for (const c of [...cards, ...commandersOf(commander, partner)]) {
    art.set(c.oracleId, { name: printedNameOf({ name: c.name, printedName: c.printedName ?? null }), imageUri: c.imageUri ?? null });
  }
  return art;
}

/**
 * What a v2 run's group heads read off the deck (`n in the deck`, a role's have and target), and the role figures the
 * shell hands the hub beside it (`runFigures.roles` is the same array). A READ, built whatever the reader's switch says: a
 * stored v2 run is drawn read-only with the switch off (#2497), and its heads must carry the same counts as with it on.
 */
export function runFiguresOf(cards: readonly DeckDetailCard[], labelRows: JobRowsByCard | null, mix: RecommendedMix) {
  const haveByRole = roleCounterFor(labelRows)(cards);
  const roles = ROLE_ORDER.map((role) => ({
    role, label: mix.cells[role].label, have: haveByRole[role], target: mix.cells[role].target, advisory: mix.cells[role].advisory,
  }));
  const figures: RunFigures = {
    typeCounts: cards.reduce<Partial<Record<CardTypeGroup, number>>>((acc, c) => {
      acc[c.cardTypeGroup] = (acc[c.cardTypeGroup] ?? 0) + c.quantity;
      return acc;
    }, {}),
    roles,
  };
  return { roleFigures: roles, runFigures: figures };
}
