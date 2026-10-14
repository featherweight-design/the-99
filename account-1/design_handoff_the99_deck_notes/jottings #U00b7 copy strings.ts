// Proposed src/lib/copy/jottings.ts. Shape follows game-log.ts: a flat const object, functions for
// interpolated strings, no number formatting. Placeholders until /copy-review.
// Never "notes" (Additional notes, a version's note and a game note already exist). Never "tick".

export const JOTTING_MAX = 140;
export const JOTTING_WARN_AT = 120;
export const JOTTINGS_PER_DECK = 100;

export const jottingsCopy = {
  head: {
    title: 'Jottings',
    note: 'oldest first',
    noteEmpty: 'one line each \u00b7 dated for you \u00b7 [[ names a card',
    closed: (open: string) => `Jottings \u00b7 ${open}`,
    toggleAria: (open: string) => `Jottings, ${open} open`,
  },
  add: {
    placeholder: 'Jot something down. Type [[ to name a card.',
    placeholderShort: 'Jot something down \u00b7 [[ names a card',
    label: 'Add a jotting',
    add: 'Add',
    adding: 'Adding\u2026',
    hint: 'One line each, dated for you.',
    hintTyping: (today: string) => `Enter adds \u00b7 dated today, ${today}`,
    counter: (n: string, max: string) => `${n} / ${max}`,
    refused: 'We couldn\u2019t save that jotting. It\u2019s still in the box, so you can try again.',
    atCap: 'This deck holds 100 jottings, the most it keeps. Delete one to add another.',
    atCapNote: 'done ones count too',
    atCapRefused: 'This deck already holds 100 jottings.',
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
    edit: 'Edit this jotting',
    delete: 'Delete this jotting',
    more: 'More for this jotting',
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
    heading: 'Delete this jotting?',
    body: 'It goes for good. The deck and its cards are unchanged.',
    yes: 'Delete',
    no: 'Keep it',
    deleting: 'Deleting\u2026',
    refused: 'We couldn\u2019t delete that jotting. Nothing has changed.',
  },
  done: {
    toggle: (n: string) => `Done (${n})`,
  },
  more: {
    open: (n: string) => `Show all ${n}`,
    done: (n: string) => `Show all ${n} done`,
  },
  announce: {
    added: 'Jotting added.',
    done: 'Marked done.',
    reopened: 'Back on the list.',
    saved: 'Jotting saved.',
    deleted: 'Jotting deleted.',
  },
} as const;
