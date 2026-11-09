// The landing demo's card details (step 5l-c): what a press on a card opens, as `pnpm demo:export` wrote them into
// `card-details.generated.ts`. Their own chunk, apart from the step data (`projected.ts`): they are most of the demo's bytes
// and only a press needs them, so the host fetches them on the first press (`loadDemoCardDetails`), not on Start.

import { unpackCardDetails } from "./card-details-pack";
import type { DemoCardData, DemoDeckCombos } from "./project-cards";
import { decodeDemo } from "./wire";

/** The chunk's format: 1 since it split from the step data. A file in any other format reads as none. */
export const CARD_DETAILS_FORMAT = 1;

/** The file decoded, prices unpacked: what the modal takes. Null when the export has not written it. */
export function decodeCardDetails(json: unknown): DemoCardData | null {
  if (json === null) return null;
  const file = decodeDemo<{ format: number; cardDetails: Record<string, { prices?: unknown }>; deckCombos: DemoDeckCombos }>(json);
  if (file.format !== CARD_DETAILS_FORMAT) return null;
  return { cardDetails: unpackCardDetails(file.cardDetails), deckCombos: file.deckCombos };
}

let loading: Promise<DemoCardData | null> | undefined;

/**
 * The card details, fetched and decoded once: every press after the first takes the same object. A failed fetch is not kept,
 * so the next press tries again.
 */
export function loadDemoCardDetails(): Promise<DemoCardData | null> {
  loading ??= import("./card-details.generated").then(
    (m) => decodeCardDetails(m.cardDetailsJson),
    (e: unknown) => {
      loading = undefined;
      throw e;
    },
  );
  return loading;
}
