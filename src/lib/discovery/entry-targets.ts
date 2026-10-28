import type { TargetId } from "./targets";

/**
 * Each tool's About entry and the control a halo lands on, for the ? panel's Show me (discovery R2·8, C4, R2 gap 7).
 * The same pairs as `TOOLS`' `entry` and `target`, held apart because `tools.ts` imports the Tuning hub's copy, which
 * the client-graph guard keeps out of every page but the deck's, and the ? is in the shell on every page.
 * `entry-targets.test.ts` holds the two equal.
 */
export const ENTRY_TARGETS: Readonly<Record<string, TargetId>> = {
  "help-me-choose": "help-me-choose",
  precons: "precons",
  "auto-fill": "top-off",
  "proposed-cuts": "proposed-cuts",
  "suggested-changes": "suggested-changes",
  "mana-balance": "mana-balance",
  "stand-ins": "stand-ins",
  "friend-spares": "friend-spares",
  "fits-your-decks": "find-a-deck",
  wishlist: "wishlist",
  "upload-choice": "collection-sync",
  opponents: "matchups",
  "decks-stats": "lineup",
  friends: "friends",
};

/**
 * Each About page label a tool's Show me lights, and that tool's halo target: `TOOLS`' `label` → `target`, for the tool
 * landing on the About pages (plan `2026-10-27-about-visual.md`, PR 5).
 */
export const LABEL_TARGETS: Readonly<Record<string, TargetId>> = {
  "commanders/for-you/places": "help-me-choose",
  "decks/your-deck/mix": "top-off",
  "decks/analysis/cuts": "proposed-cuts",
  "decks/analysis/suggested": "suggested-changes",
  "shopping/deck-shopping/standins": "stand-ins",
  "shopping/deck-shopping/spare": "friend-spares",
  "collection/cards/taken": "find-a-deck",
  "collection/cards/tabs": "wishlist",
  "collection/upload/drop": "collection-sync",
  "decks/games/matchups": "matchups",
  "decks/your-decks/decks-stats": "lineup",
  "friends/friends/add": "friends",
  "decks/your-decks/precons": "precons",
  "decks/analysis/mana": "mana-balance",
};
