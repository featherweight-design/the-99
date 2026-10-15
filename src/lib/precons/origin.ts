/**
 * v0: a linked deck's precon, drawn in Versions as the list before v1 (R3 addendum, handoff
 * `HANDOFF-R3 · built-from link.md` §5). It is assembled AT READ from `precon_cards` and is never a
 * `deck_versions` row, so every reader of committed history (the newest version, the claim model,
 * game stamping, a commit's `since`, the analysis and synopsis pins, the brew test) never meets it
 * (lock 4). `origin-read.ts` reads it; these are the pure halves. A deck STARTED from the precon holds
 * the list as its own first version instead (a start commits it as v0), and the rail draws that row in
 * this one's place (`start-version.ts`).
 *
 * Client-safe: no database import, so the rail can take the type.
 */
import { averageManaValue } from "../decks/mana-value";
import type { CardQty } from "../decks/draft-diff";

/** One card of the precon's list, quantities summed across the printings the feed lists. */
export type OriginCard = CardQty & {
  name: string;
  typeLine: string;
  cmc: number;
  manaCost: string | null;
  layout: string;
  imageUri: string | null;
};

/** What the rail and v1's diff draw of v0. Shipped to the browser; the card list is not. */
export type DeckOrigin = {
  fileName: string;
  name: string;
  setCode: string;
  releaseDate: string;
  /** The precon's 99: every card it lists but its commanders, as a version's count is (never a literal 99). */
  cardCount: number;
  /**
   * The deck's version that IS this list, when the deck was started from the precon: its v0, or a v1 a
   * start committed before starts committed v0 (`isStartVersion`). Null on a deck linked after the fact,
   * whose v0 is drawn apart. Set by `readDeckOriginAndStart`; `assembleOrigin` knows no versions.
   */
  startVersionId: string | null;
  /** v0's helm, as v1's commander line reads a predecessor's. */
  commanderOracleId: string | null;
  partnerOracleId: string | null;
  commanderName: string | null;
  partnerName: string | null;
  /** The average over the 99, as a version's is: commanders are not in a version's card list. */
  manaValue: number | null;
};

/** One `precon_cards` row joined to its card, as `originQuery` selects it. */
export type OriginRow = {
  fileName: string;
  name: string;
  setCode: string;
  releaseDate: string;
  oracleId: string;
  quantity: number;
  isCommander: boolean;
  cardName: string;
  typeLine: string;
  cmc: number | string;
  manaCost: string | null;
  layout: string;
  imageUri: string | null;
};

const isBasic = (typeLine: string) => typeLine.startsWith("Basic");

/**
 * The rows into v0: the summary, and the 99 as a version's card list holds them (commanders apart,
 * since `deck_version_cards` holds the deck's 99 and the version row its commanders). Null for no
 * rows, which is an unlinked deck or a precon the ingest has since dropped.
 */
export type OriginRead = {
  summary: DeckOrigin;
  cards: OriginCard[];
  /** Its distinct non-basic cards, commanders included: the `of` in v1's kept line. */
  nonBasic: string[];
};

export function assembleOrigin(rows: readonly OriginRow[]): OriginRead | null {
  const head = rows[0];
  if (!head) return null;
  const commanders: { oracleId: string; name: string }[] = [];
  const list = new Map<string, OriginCard>();
  for (const r of rows) {
    if (r.isCommander) {
      // A commander listed under two printings is one commander, kept once, in the feed's order.
      if (!commanders.some((c) => c.oracleId === r.oracleId)) commanders.push({ oracleId: r.oracleId, name: r.cardName });
      continue;
    }
    const held = list.get(r.oracleId);
    if (held) held.quantity += r.quantity;
    else list.set(r.oracleId, {
      oracleId: r.oracleId, quantity: r.quantity, name: r.cardName, typeLine: r.typeLine, cmc: Number(r.cmc),
      manaCost: r.manaCost, layout: r.layout, imageUri: r.imageUri,
    });
  }
  const cards = [...list.values()];
  return {
    summary: {
      fileName: head.fileName,
      name: head.name,
      setCode: head.setCode,
      releaseDate: head.releaseDate,
      cardCount: cards.reduce((n, c) => n + c.quantity, 0),
      startVersionId: null,
      commanderOracleId: commanders[0]?.oracleId ?? null,
      partnerOracleId: commanders[1]?.oracleId ?? null,
      commanderName: commanders[0]?.name ?? null,
      partnerName: commanders[1]?.name ?? null,
      manaValue: averageManaValue(cards),
    },
    cards,
    nonBasic: [...new Set(rows.filter((r) => !isBasic(r.typeLine)).map((r) => r.oracleId))],
  };
}

/**
 * v1's `kept` line (K10): v0's distinct non-basic cards still in v1, and how many v0 lists. `held`
 * is every card v1 holds, its commanders included, so a precon card moved into the command zone
 * still counts as kept, as the link's own shared count counts it.
 */
export function keptFromOrigin(nonBasic: readonly string[], held: Iterable<string>): { kept: number; of: number } {
  const holding = new Set(held);
  return { kept: nonBasic.filter((id) => holding.has(id)).length, of: nonBasic.length };
}
