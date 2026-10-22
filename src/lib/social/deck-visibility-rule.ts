/**
 * The friend deck rule's pure half (friend decks handoff, G2), apart from `deck-visibility.ts` so a client component
 * (the ⋯ menu's Hidden from friends row) can decide what it draws without importing the database. `deck-visibility.ts`
 * re-exports every name here: it stays the one place the rule is read from on the server.
 */
import type { StatusPill } from "../decks/status";

export type FriendDeckPrefs = { seeDecks: boolean; seeUnfinished: boolean };

/** The defaults a reader with no `user_prefs` row has, and the columns' own defaults. */
export const DEFAULT_FRIEND_DECK_PREFS: FriendDeckPrefs = { seeDecks: true, seeUnfinished: false };

const UNFINISHED: ReadonlySet<StatusPill> = new Set<StatusPill>(["New", "Draft", "Building"]);

export function unfinishedPill(pill: StatusPill): boolean {
  return UNFINISHED.has(pill);
}

/** Whether a friend sees this deck, by its owner's rules. Pure. */
export function friendCanSeeDeck(deck: { hiddenFromFriends?: boolean; statusPill: StatusPill }, prefs: FriendDeckPrefs): boolean {
  if (!prefs.seeDecks || deck.hiddenFromFriends) return false;
  return prefs.seeUnfinished || !unfinishedPill(deck.statusPill);
}

/**
 * The owner's Settings rules already hide this deck, whatever its own flag says: the ⋯ row then draws ticked and
 * locked, and its press opens Settings rather than writing (README 4b).
 */
export function settingsHideDeck(statusPill: StatusPill, prefs: FriendDeckPrefs): boolean {
  return !friendCanSeeDeck({ hiddenFromFriends: false, statusPill }, prefs);
}
