/**
 * Deck notes copy. PR 1 carries the limits and the refusal strings the actions return; the panel's
 * strings land with the UI and go through `/copy-review` whole. The feature is called Notes. In code it
 * is `deck_notes` and `deckNotesCopy`, so nothing collides with `decks.notes`, `deck_games.note` or
 * `deck_versions.note`. Done is selected and unselected, never "ticked".
 */

/** One line, counted on the RENDERED text in code points: a tag counts as its name. */
export const NOTE_MAX = 140;
export const NOTE_WARN_AT = 120;
/** Open and done together. */
export const NOTES_PER_DECK = 100;

export const deckNotesCopy = {
  add: {
    refused: "We couldn’t save that note. It’s still in the box, so you can try again.",
    atCapRefused: `This deck already holds ${NOTES_PER_DECK} notes.`,
  },
  row: {
    doneRefused: "We couldn’t mark that done. Nothing has changed.",
    reopenRefused: "We couldn’t put that back on the list. Nothing has changed.",
  },
  edit: {
    refused: "We couldn’t save that change. Your edit is still here.",
  },
  confirm: {
    refused: "We couldn’t delete that note. Nothing has changed.",
  },
  picker: {
    refused: "Couldn’t search just now.",
  },
} as const;
