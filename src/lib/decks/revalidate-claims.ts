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
  revalidateUserLists(userId);
}
