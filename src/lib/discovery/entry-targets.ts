import type { TargetId } from "./targets";

/**
 * Each About page label a tool's Show me lights, and that tool's halo target: every one of `TOOLS`' `labels` → its `target`, for the tool
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
  "decks/your-decks/new-deck": "help-me-choose",
  "decks/your-decks/precons": "precons",
  "decks/analysis/mana": "mana-balance",
};
