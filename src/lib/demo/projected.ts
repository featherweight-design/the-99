// The landing demo's projected fixture data, decoded: what `pnpm demo:export` wrote into `projected.generated.ts`, in the
// shapes the drawing halves take (Dates, Maps and Sets restored, `wire.ts`). Null until the export has run. Reads no table
// and no request: the file is committed, and the demo draws from it.
import type { DemoAnalysis, DemoChoose, DemoCollection, DemoCommanders, DemoOverview, DemoSuggested } from "./project";
import type { DemoCuts, DemoDeck, DemoFits, DemoMana, DemoPlayedDeck, DemoTopOff } from "./project-decks";
import { unpackCardDetails } from "./card-details-pack";
import type { DemoCardDetails, DemoDeckCombos } from "./project-cards";
import { projectedJson } from "./projected.generated";
import { decodeDemo } from "./wire";

export type Projected = {
  /** 2 since the decks, cuts, Mana Balance, Top off and Which deck steps joined (PR 6b). */
  format: 2;
  collection: DemoCollection;
  commanders: DemoCommanders;
  /** Step 3: null only in a file exported without the paid run (never committed). */
  choose: DemoChoose | null;
  analysis: DemoAnalysis;
  overview: DemoOverview | null;
  suggested: DemoSuggested | null;
  /** Step 4: Ashling (played, exactly 100), Giada (over) and Zimone (under), as the deck page draws each; the played deck
   *  also carries what the builder derives for steps 5 and 6. */
  decks: { played: DemoPlayedDeck; over: DemoDeck; under: DemoDeck };
  /** Step 7: Giada's Proposed cuts. */
  cuts: DemoCuts;
  /** Step 7: Zimone's Mana Balance. */
  mana: DemoMana;
  /** Step 7: Zimone's Top off. */
  topOff: DemoTopOff;
  /** Step 8: Which deck needs it most?, on the card the fixture shares between decks. */
  fits: DemoFits;
  /** Step 5l-c: card details for every card the demo can open (`demoCardIds`), by oracle id. Absent from a file exported
   *  before the step joined, where a press opens nothing, as it did before. */
  cardDetails?: DemoCardDetails;
  /** Step 5l-c: a deck step's own read of a card's combos, where it differs from `cardDetails` (`deckComboOverrides`). The host
   *  lays `deckCombos[role][id]` over `cardDetails[id].cardCombos` for a press from that deck's step, as the deck page's modal
   *  reads combos against its deck. Absent with `cardDetails`. */
  deckCombos?: DemoDeckCombos;
};

/** Steps 1 to 6, the shape format 1 held. */
export type ProjectedSteps1to6 = Pick<Projected, "collection" | "commanders" | "choose" | "analysis" | "overview" | "suggested">;

/** The committed file as it may be on disk: format 1 (steps 1 to 6, written before the deck steps joined) until lane 02
 *  regenerates it on format 2. */
export type CommittedProjected = (ProjectedSteps1to6 & { format: 1 }) | Projected;

let decoded: CommittedProjected | null | undefined;

/** The committed file, decoded once, in whichever format it was written: for a reader of steps 1 to 6, and for its test. */
export function committedProjected(): CommittedProjected | null {
  if (decoded === undefined) {
    const file = projectedJson === null ? null : decodeDemo<CommittedProjected>(projectedJson);
    // Card details' prices are packed in the file (`packCardDetails`); every reader takes them as the modal's read gave them.
    if (file && "cardDetails" in file && file.cardDetails) file.cardDetails = unpackCardDetails(file.cardDetails as never);
    decoded = file;
  }
  return decoded;
}

/**
 * The decoded data, built once: a caller that memoises on it keeps one identity across renders. Null until the file is
 * format 2: an older file has no deck, cuts, Mana Balance, Top off or Which deck step, and a caller handed it as
 * `Projected` would read `undefined` there.
 */
export function projected(): Projected | null {
  const file = committedProjected();
  return file?.format === 2 ? file : null;
}
