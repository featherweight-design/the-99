// `decks.last_edited_at` — the one place it is written.
//
// Home's resume block orders by the most recent of three events and the row's
// stamp names which one won, so what counts as an edit is a product rule, not a
// detail of whichever action happens to be writing. It is stated once here and
// applied by call, never by wrapper: a `withTouch` helper over every mutation
// would hide the list below, and the list IS the rule.
//
// WHAT TOUCHES — anything that changes what the deck is:
//   add · remove · fill · sweep · restore a sweep · top off · undo a fill pass ·
//   pull a card · rename · update from a list · resolve an unresolved row ·
//   discard a draft back to its version
//
// Each of those stamps only where it actually wrote. A top-off whose every card
// was already in the deck, a restore the player had already re-added by hand, an
// undo that found its rows claimed — all of them commit a transaction and change
// nothing, and the figure each one reports to its own caller is the test used
// here rather than a second one invented for the stamp.
//
// `renameDeck` is the one site that does not call this function: it is already
// an UPDATE of the deck row, so it sets the column inline and is atomic by
// construction. The rule still lives here.
//
// WHAT DOES NOT:
//   - Keeping a fill's card (`keepAutoCard`, `keepAllAutoCards`). It clears the
//     `auto` marker, which is a claim about who put the card there; the card was
//     in the deck before and is in the deck after, and the list is what the stamp
//     describes.
//   - A commit. `deck_versions.committed_at` is its own term in the sort, so a
//     commit that also stamped this column would print `edited` forever and the
//     `committed` verb would never be reached.
//   - A logged game. Same reason: `deck_games.played_at` is its own term. That
//     column is player-supplied rather than database-stamped — it records when
//     the game was PLAYED and may be days old — which is a further reason not to
//     fold it in here.
//   - Filing a deck on a shelf. A folder move is where the deck is kept, not
//     work on the deck.
//   - Opening one. Never recorded anywhere, deliberately — a sort keyed on
//     glances fills the block with what was looked at rather than what was done.
//   - Creating one. The column defaults to `now()` on insert, so a new deck
//     arrives already stamped and an explicit call here would be a second
//     writer for the same instant.

import { eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { decks } from "../../db/schema";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Stamp a deck as edited, now.
 *
 * Takes the caller's transaction handle rather than reaching for `db`, so the
 * stamp and the change it describes commit together or not at all — a deck that
 * reads as edited at an instant when nothing was written is the one failure this
 * column can produce.
 *
 * `clock_timestamp()`, NOT `now()`. `now()` is the transaction's start, which is
 * read before this statement waits for the deck row's lock — so an edit that
 * queued behind another edit would stamp a time from before the one it followed,
 * and Home would order the newer of the two second. `clock_timestamp()` is read
 * when the statement runs, after the wait.
 *
 * It is the DATABASE's clock either way, not the app server's, which is what
 * makes it comparable to `deck_versions.committed_at` — also Postgres-stamped.
 * `deck_games.played_at` is the exception and is not a clock at all: it is the
 * date the game was played, which the log lets the player set. See the note in
 * `touched.ts`.
 *
 * Ownership is the caller's. Every site that calls this has already resolved the
 * deck against the signed-in player through `requireDeck`; re-checking here
 * would be a second authorisation path that could disagree with the first.
 */
export async function touchDeck(tx: Tx, deckId: string): Promise<void> {
  await tx.update(decks).set({ lastEditedAt: sql`clock_timestamp()` })
    .where(eq(decks.id, deckId));
}
