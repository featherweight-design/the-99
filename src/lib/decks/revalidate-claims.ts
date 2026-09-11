import { revalidatePath } from "next/cache";

import { revalidateUserLists } from "../cache/user-lists";
import { claimSurfaces } from "./revalidate";

/**
 * Everything a claim change invalidates: the surfaces `claimSurfaces` names, and
 * the reader's cached list payloads behind them.
 *
 * One function rather than two calls at each write, because the two halves are
 * the same fact stated twice — a path revalidated without its cached payload
 * only re-renders the page around the same stale list.
 *
 * Separate from `revalidate.ts` so that module stays pure: the path lists are
 * assertable without a `next/cache` mock, and nothing importing them pulls
 * server-only code in behind them.
 */
export function revalidateClaims(deckId: string, userId: string): void {
  for (const path of claimSurfaces(deckId)) revalidatePath(path);
  // The commander detail page, every instance of it, and by route pattern
  // because there is no one path to name. It reads the decks table twice over:
  // the rank it prints is counted over a window that excludes built commanders,
  // and whether the page renders at all depends on the same exclusion — a built
  // commander resolves nowhere and 404s. So a deck created or deleted moves both,
  // and a cached detail route would otherwise keep a rank the list no longer
  // agrees with, or a 404 for a commander whose deck is gone.
  //
  // Not in `claimSurfaces`: everything there is a literal path, and a dynamic
  // route needs the `"page"` type as its second argument. Keeping the list
  // literal is what lets it stay assertable without a `next/cache` mock.
  revalidatePath("/commanders/[slug]", "page");
  revalidateUserLists(userId);
}
