// Proposed src/lib/copy/deck-notes.ts (R3; R2's strip strings are withdrawn). Shape follows game-log.ts: a flat const object, functions for
// interpolated strings, no number formatting. Placeholders until /copy-review.
// The feature is called Notes (Hugh, R1 feedback). In code: deck_notes / deckNotesCopy. Never "tick".

export const NOTE_MAX = 140;
export const NOTE_WARN_AT = 120;
export const NOTES_PER_DECK = 100;

export const deckNotesCopy = {
  head: {
    title: 'Notes',
    // R3: the segment cell and the row's mono line (Stats' `provenance` slot).
    segment: 'Notes',
    segmentAria: (open: string) => `Notes, ${open} open`,
    segmentAriaNone: 'Notes, none yet',
    provenance: (open: string) => `${open} open \u00b7 newest first`,
    provenanceEmpty: 'yours only \u00b7 on this deck, not a version',
  },
  empty: {
    heading: 'The swap you meant to try.',
    body: 'Notes keep the small stuff with the deck: a card to test, a cut to make, a question for the pod. One line each, dated when you add it. Select one when it\u2019s done and it folds away.',
    tagLead: 'Type',
    tagAfter: 'and a card\u2019s name to tag it, as in',
    tagExample: 'Thassa\u2019s Oracle',
    tagClose: '. The tag opens that card.',
  },
  help: {
    // R4: InfoTip lines (the ⓘ inside the field) and the insert button.
    infoAria: 'How card tags work',
    lines: [
      'Type [[ and the start of a card\u2019s name to tag it, or press [[ ]] to start one. This deck\u2019s cards come first, then any card.',
      'A tagged name opens that card: underlined solid if it\u2019s in this deck, dashed if it isn\u2019t.',
      'A name typed without picking it from the list stays plain text.',
    ],
    insert: '[[ ]]',
    insertAria: 'Insert a card tag',
    insertPrompt: 'Type a card name. This deck\u2019s cards come first.',
    button: '[[ ]]',
    aria: 'How card tags work',
    title: 'Tag a card with [[ ]]',
    body: 'Type [[ and the start of a name. This deck\u2019s cards come first, then any card. Pick one and its name opens that card.',
    held: 'solid: in this deck',
    notHeld: 'dashed: not in it',
    foot: 'a name typed without picking stays plain text',
  },
  legacyHead: {
    note: 'oldest first',
    noteEmpty: 'one line each \u00b7 dated for you \u00b7 [[ names a card',
    toggleAria: (open: string) => `Notes, ${open} open`,
  },
  add: {
    placeholder: 'Add a note. Type [[ to tag a card.',
    placeholderShort: 'Add a note \u00b7 [[ tags a card',
    label: 'Add a note',
    add: 'Add',
    adding: 'Adding\u2026',
    hint: 'One line each, dated for you.',
    hintTyping: (today: string) => `Enter adds \u00b7 dated today, ${today}`,
    counter: (n: string, max: string) => `${n} / ${max}`,
    refused: 'We couldn\u2019t save that note. It\u2019s still in the box, so you can try again.',
    atCap: 'This deck holds 100 notes, the most it keeps. Delete one to add another.',
    atCapNote: 'done ones count too',
    atCapRefused: 'This deck already holds 100 notes.',
  },
  picker: {
    inDeck: 'In this deck',
    anyCard: 'Any card',
    noneInDeck: 'Nothing in this deck by that name',
    empty: 'Type a card name. This deck\u2019s cards come first.',
    searching: 'Searching\u2026',
    refused: 'Couldn\u2019t search just now.',
    notInDeck: 'not in this deck',
    notLegal: 'not legal in Commander',
    keys: '\u2191 \u2193 to move \u00b7 Enter picks \u00b7 Esc keeps what you typed',
  },
  row: {
    doneAria: (text: string) => `Done: ${text}`,
    tagAria: (name: string) => `${name}, card details`,
    edit: 'Edit this note',
    delete: 'Delete this note',
    more: 'More for this note',
    menuEdit: 'Edit',
    menuDelete: 'Delete',
    date: (d: string) => d,
    doneDate: (d: string) => `done ${d}`,
    doneRefused: 'We couldn\u2019t mark that done. Nothing has changed.',
    reopenRefused: 'We couldn\u2019t put that back on the list. Nothing has changed.',
  },
  edit: {
    save: 'Save',
    saving: 'Saving\u2026',
    cancel: 'Cancel',
    hint: (date: string) => `Enter saves \u00b7 Esc cancels \u00b7 the date stays ${date}`,
    refused: 'We couldn\u2019t save that change. Your edit is still here.',
  },
  confirm: {
    heading: 'Delete this note?',
    body: 'It goes for good. The deck and its cards are unchanged.',
    yes: 'Delete',
    no: 'Keep it',
    deleting: 'Deleting\u2026',
    refused: 'We couldn\u2019t delete that note. Nothing has changed.',
  },
  done: {
    toggle: (n: string) => `Done (${n})`,
  },
  more: {
    open: (n: string) => `Show all ${n}`,
    done: (n: string) => `Show all ${n} done`,
  },
  announce: {
    added: 'Note added.',
    done: 'Marked done.',
    reopened: 'Back on the list.',
    saved: 'Note saved.',
    deleted: 'Note deleted.',
  },
} as const;
