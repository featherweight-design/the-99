import { searchTagCards } from "../../app/cards/tag-actions";

/**
 * The `[[` picker's lookup for a deck's description box, wherever it is drawn (the Analysis empty state, the Suggested
 * changes editor, the header pencil). Module-level so its identity is stable across renders; the description belongs to
 * the tuning feature, so it is that surface's switch that gates the lookup.
 */
export const searchDescriptionCards = (query: string) => searchTagCards("tuning", query);
