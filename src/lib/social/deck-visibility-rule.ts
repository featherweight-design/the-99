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
 * The owner's Settings rules already hide this deck, whatever its own flag says: the ⋯ menu then draws no checkbox but a block that
 * says why and links to the Settings box (`hiddenWhy`, draft hidden row #2988), and nothing is written from the menu.
 */
export function settingsHideDeck(statusPill: StatusPill, prefs: FriendDeckPrefs): boolean {
  return !friendCanSeeDeck({ hiddenFromFriends: false, statusPill }, prefs);
}

/** The Settings box a hidden-by-rule deck's way out names: the master switch, or the include-unfinished one (Settings' Your decks). */
export type SettingsTarget = "see" | "unfinished";

/** The ids Settings' Your decks puts on those two rows, so the ⋯ menu's link lands on the exact toggle. */
export const SETTINGS_TARGET_HASH: Readonly<Record<SettingsTarget, string>> = {
  see: "settings-decks-see",
  unfinished: "settings-decks-unfinished",
};

/** What the ⋯ menu says about a deck Settings' rules hide (draft hidden row, #2988): why, and each way out the player really has. */
export type HiddenWhy = {
  why: "seeDecksOff" | "draftReady" | "draftFull" | "draftShort" | "empty" | "building";
  /** `Commit as v1` is offered only where the deck can commit now. */
  commit: boolean;
  settings: SettingsTarget;
  /** Which sentence of Settings' rule the way out names: drafts, decks being built, or every deck. */
  label: "drafts" | "building" | "all";
};

/**
 * Why a deck the owner's Settings rules hide is hidden, from the rule's own inputs: the master switch is tested first (it hides every
 * deck whatever its status), then the status. `canCommit` is `firstCommitReady`'s answer. Pure. Called only for a deck `settingsHideDeck`
 * hides, so the status is New, Draft or Building (or any, with `seeDecks` off): anything else would read as a Draft.
 */
export function hiddenWhy(args: { statusPill: StatusPill; prefs: FriendDeckPrefs; built: number; size: number; canCommit: boolean }): HiddenWhy {
  const { statusPill, prefs, built, size, canCommit } = args;
  if (!prefs.seeDecks) return { why: "seeDecksOff", commit: false, settings: "see", label: "all" };
  if (statusPill === "New") return { why: "empty", commit: false, settings: "unfinished", label: "drafts" };
  if (statusPill === "Building") return { why: "building", commit: false, settings: "unfinished", label: "building" };
  // A Draft: full and resolved can commit; short, over its size or unresolved cannot.
  if (canCommit) return { why: "draftReady", commit: true, settings: "unfinished", label: "drafts" };
  return { why: built < size ? "draftShort" : "draftFull", commit: false, settings: "unfinished", label: "drafts" };
}
