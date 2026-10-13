import { searchTagCards } from "../../app/cards/tag-actions";

/**
 * The `[[` picker's lookup for a deck's description box, wherever it is drawn (the Analysis empty state, the Suggested
 * changes editor, the header pencil). Module-level so its identity is stable across renders. It is not tied to the tuning
 * switch: the header pencil edits the description whether or not Suggested changes is on.
 */
export const searchDescriptionCards = (query: string) => searchTagCards("description", query);

/** The same lookup for the log-a-game form's note, which is offered whether or not Suggested changes is on. */
export const searchGameNoteCards = (query: string) => searchTagCards("gameNote", query);
