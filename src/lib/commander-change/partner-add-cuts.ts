// The cards Add a partner suggests cutting when the deck's 99 must give one up (a pair leads 98,
// so a deck holding 99 loses a card; the write refuses the change without a cut). No model spend.
//
// A basic land first, while the deck's lands exceed `landTarget(true, skeleton)` (the app's one land
// rule, never a new constant), named by the basic the deck runs most of. Then up to two cards the
// pair's decks do not run: not a commander half, not a land, not locked, the costliest first so the
// cut frees the most. "Cut another card" lists the same pool without the suggestion limit.

import { isLandFace } from "../cards/facet";
import { isBasicLand } from "../decks/grouping";

export type CutRow = {
  oracleId: string;
  name: string;
  imageUri: string | null;
  typeLine: string;
  cmc: number;
  quantity: number;
};

export type CutSuggestion = {
  oracleId: string;
  name: string;
  imageUri: string | null;
  kind: "land" | "card";
};

/** The most CARD cuts suggested beside the basic land. */
export const CARD_CUTS = 2;

const asSuggestion = (r: CutRow, kind: CutSuggestion["kind"]): CutSuggestion => ({
  oracleId: r.oracleId, name: r.name, imageUri: r.imageUri, kind,
});

/** The body cards a cut may take: not a commander, not locked. */
export function cuttable(body: readonly CutRow[], commanders: ReadonlySet<string>, locked: ReadonlySet<string>): CutRow[] {
  return body.filter((r) => !commanders.has(r.oracleId) && !locked.has(r.oracleId));
}

export function suggestCuts(input: {
  body: readonly CutRow[];
  commanders: ReadonlySet<string>;
  locked: ReadonlySet<string>;
  /** `landTarget(true, skeleton)`. */
  landCeiling: number;
  /** The body cards the pair's decks run. */
  supported: ReadonlySet<string>;
}): CutSuggestion[] {
  const pool = cuttable(input.body, input.commanders, input.locked);
  const out: CutSuggestion[] = [];
  const lands = input.body.reduce((n, r) => (isLandFace(r.typeLine) ? n + r.quantity : n), 0);
  if (lands > input.landCeiling) {
    const basic = pool
      .filter((r) => isBasicLand(r.typeLine))
      .sort((a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name))[0];
    if (basic) out.push(asSuggestion(basic, "land"));
  }
  const cards = pool
    .filter((r) => !isLandFace(r.typeLine) && !input.supported.has(r.oracleId))
    .sort((a, b) => b.cmc - a.cmc || a.name.localeCompare(b.name))
    .slice(0, CARD_CUTS);
  for (const r of cards) out.push(asSuggestion(r, "card"));
  return out;
}
