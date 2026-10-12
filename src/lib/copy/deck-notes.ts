/**
 * Deck notes copy. The feature is called Notes. In code it is `deck_notes` and `deckNotesCopy`, so nothing
 * collides with `decks.notes`, `deck_games.note`, `deck_versions.note` or Suggested changes' `Additional
 * notes`. Done is selected and unselected, never "ticked".
 *
 * From the handoff's `notes-copy.ts` (R4) with the strings R4 withdrew dropped and the cap interpolated
 * (READINESS-audit F9). A flat const object: functions for interpolated strings, no number formatting.
 */

/** One line, counted on the RENDERED text in code points: a tag counts as its name. */
export const NOTE_MAX = 140;
export const NOTE_WARN_AT = 120;
/** Open and done together. */
export const NOTES_PER_DECK = 100;
/** The open (and the done) list shows this many, then `Show all N`. */
export const NOTES_SHOWN = 6;

export const deckNotesCopy = {
  head: {
    segment: "Notes",
    segmentGroupAria: "Decklist view",
    segmentAria: (open: string) => `Notes, ${open} open`,
    segmentAriaNone: "Notes, none yet",
    provenance: (open: string) => `${open} open · newest first`,
  },
  empty: {
    heading: "The swap you meant to try.",
    body: "Notes keep the small stuff with the deck: a card to test, a cut to make, a question for the pod. Each is one line, dated when you add it, and selecting one folds it under Done.",
  },
  help: {
    infoAria: "How card tags work",
    lines: [
      "Type [[ and the start of a card’s name to tag it, or press [[ ]] to start one.",
      "A tagged name opens that card: underlined solid if it’s in this deck, dashed if it isn’t.",
      "A name typed without picking it from the list stays plain text.",
    ],
    insert: "[[ ]]",
    insertAria: "Insert a card tag",
  },
  add: {
    placeholder: "Add a note. Type [[ to tag a card.",
    placeholderShort: "Add a note · [[ tags a card",
    label: "Add a note",
    add: "Add",
    adding: "Adding…",
    hintTyping: (today: string) => `Enter adds · dated ${today}`,
    counter: (n: string, max: string) => `${n} / ${max}`,
    refused: "We couldn’t save that note. What you typed is still here, so you can try again.",
    atCap: `This deck holds ${NOTES_PER_DECK} notes, the most it keeps. Delete one to add another.`,
    atCapNote: "done ones count too",
    atCapRefused: `This deck already holds ${NOTES_PER_DECK} notes.`,
  },
  picker: {
    inDeck: "In this deck",
    anyCard: "Any card",
    noneInDeck: "Nothing in this deck by that name",
    empty: "Type a card name. This deck’s cards come first.",
    /** The same prompt where there is no deck to put first (a box outside a deck). */
    emptyAny: "Type a card name.",
    searching: "Searching…",
    refused: "Couldn’t search just now.",
    notInDeck: "not in this deck",
    notLegal: "not legal in Commander",
    keys: "↑ ↓ to move · Enter picks · Esc keeps what you typed",
    listAria: "Cards to tag",
  },
  row: {
    doneAria: (text: string) => `Done: ${text}`,
    tagAria: (name: string) => `${name}, card details`,
    edit: "Edit this note",
    delete: "Delete this note",
    more: "More for this note",
    menuEdit: "Edit",
    menuDelete: "Delete",
    doneDate: (d: string) => `done ${d}`,
    doneRefused: "We couldn’t mark that done. Nothing has changed.",
    reopenRefused: "We couldn’t put that back on the list. Nothing has changed.",
  },
  edit: {
    save: "Save",
    saving: "Saving…",
    cancel: "Cancel",
    hint: (date: string) => `Enter saves · Esc cancels · the date stays ${date}`,
    refused: "We couldn’t save that change. Your edit is still here.",
  },
  confirm: {
    heading: "Delete this note?",
    body: "It goes for good. The deck and its cards are unchanged.",
    yes: "Delete",
    no: "Keep it",
    deleting: "Deleting…",
    refused: "We couldn’t delete that note. Nothing has changed.",
  },
  done: {
    toggle: (n: string) => `Done (${n})`,
  },
  more: {
    open: (n: string) => `Show all ${n}`,
    done: (n: string) => `Show all ${n} done`,
  },
  announce: {
    added: "Note added.",
    done: "Marked done.",
    reopened: "Back on the list.",
    saved: "Note saved.",
    deleted: "Note deleted.",
  },
} as const;
