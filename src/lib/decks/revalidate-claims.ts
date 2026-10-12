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
  // because there is no one path to name.
  //
  // Every claim write, not only a create or a delete, because the page reads
  // deck rows three ways. Its rank is counted over a window that excludes built
  // commanders and whether it renders at all turns on that same exclusion — both
  // of which move on a create or a delete. But `committedSupport` reads
  // `deck_cards` for the sentence under **Why this commander** ("…and 11 of those
  // are already in your X list"), and Role Coverage marks each owned card that is
  // already in a deck. Those move on an ordinary add or remove, which is exactly
  // the set of writes that reach this helper.
  //
  // The pattern form is the route's, not one reader's, but the route is dynamic —
  // server-rendered on demand, per reader — so there is no shared full-route
  // cache to churn. What this drops is the client router cache for the route,
  // which is what makes a back navigation to a commander show the write.
  //
  // Not in `claimSurfaces`: everything there is a literal path, and a dynamic
  // route needs the `"page"` type as its second argument. Keeping the list
  // literal is what lets it stay assertable without a `next/cache` mock.
  revalidatePath("/commanders/[slug]", "page");
  // Every OTHER deck's review page, for the reason `claimSurfaces` states and
  // then only half-acts on: a membership change here decides whether a row on
  // another deck's review page still offers a pull. The literal path in that
  // list covers this deck alone, so without the pattern form a reader sitting on
  // another deck's review page is offered a pull the server would now refuse.
  // Pattern form and the `"page"` argument for the same reason the commander
  // page takes them — a dynamic route, and no one path to name.
  revalidatePath("/decks/[id]/changes", "page");
  // The import receipt. Its contested rows are read LIVE against the claim model, so a commit, a
  // proxy toggle or a pick all change what an older receipt says about who is short — and a
  // cached one would go on answering for a claim that has moved. Pattern form: the route is keyed
  // by upload id and there is no one path to name. Here rather than at one caller, because every
  // claim write has the same effect on it.
  revalidatePath("/collection/replace/summary/[uploadId]", "page");
  // EVERY OTHER DECK'S OWN PAGE, by pattern. `claimSurfaces` names this deck's
  // literal path alone, which was right while a claim change only moved figures
  // on the deck that made it and on the shared lists. A proxy breaks that: the
  // copy it releases belongs to whichever deck was going short for it, and that
  // deck's own page is where the relief is drawn. Without this, ruling 1 is a
  // change a player never sees until something else invalidates the page.
  revalidatePath("/decks/[id]", "page");
  // The proxy list itself. A literal path, so it could live in `claimSurfaces`
  // with the rest — it is here because it is a proxy fact rather than a claim
  // fact, and `claimSurfaces` is asserted by tests that predate this route.
  revalidatePath("/collection/proxies");
  // Both precon routes draw the reader's decks that share a list (`built`, and the start dialog's
  // "already have"), so a membership change moves them. Pattern form for the open precon: dynamic.
  revalidatePath("/decks/precons");
  revalidatePath("/decks/precons/[fileName]", "page");
  revalidateUserLists(userId);
}
