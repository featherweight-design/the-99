// H35 — deck description, and tailored Suggested changes. Copy strings (R2).
//
// EVERY STRING HERE IS A PLACEHOLDER, owed to /copy-review, except those Hugh wrote in review
// (marked HUGH). US English, no em dashes. Apostrophes are ’ as in about.ts.
//
// Shape: amends `src/lib/copy/deck-tuning.ts` and `deck-analysis.ts`. `deckTuningCopy.intent`
// is REPLACED by `description` below. RETIRED keys are deleted, not aliased.

import { helpMeChooseCopy } from './help-me-choose';

export const deckDescriptionCopy = {
  // ── Amends shipped copy (HUGH, R1 review) ──────────────────────────────
  amends: {
    // deckAnalysisCopy.panel.idle.bodyPersist
    bodyPersist: 'When you make changes, you can manually re-analyze for updates.', // HUGH
    // creditsCopy: every "next one at {time}" becomes "reset at {time}"
    resetAt: (time: string) => `reset at ${time}`, // HUGH
  },

  // ── The field (empty state 1b-1c, checklist editor 1h2, pencil editor 1g) ─
  description: {
    label: 'Describe your deck',
    help: 'One or two sentences that will help us write the overview and suggest more accurate card swaps.', // HUGH
    placeholder: 'e.g. Grind a four-player table out and win late with big fliers. No infinite combos.',
    placeholderPhone: 'e.g. Grind a four-player table out and win late with big fliers.',
    // Always drawn, from '0 / 240', at the help text's end (R3).
    counter: (n: number, max: number) => `${n} / ${max}`,
    maxLength: 240, // was 120; needs the decks.intent check widened
    warnAt: 220,
    tooLong: 'Keep it to 240 characters.',
    refused: 'That did not save. Try again.',
    save: 'Save',
    cancel: 'Cancel',
    pencilAria: (name: string) => `Edit name and description of ${name}`,
    fieldAria: 'Deck description',
    // Checklist row while the description is null (1h).
    rowNone: 'none yet',
    rowOpen: 'Describe your deck →',
  },

  // RETIRED from deckTuningCopy.intent: askLabel, ask, save ('Save this'), skip, edit, cancel,
  // editAria, seeded, seededAria, seededBrief*, seededAnswers and the answer* helpers.
  // RETIRED from R1: hint, caption*, saved, editHint, limits.note*, every limits caption,
  // request.label/labelTail ('This run only · not saved').

  manifest: {
    description: 'Your description', // was 'What you said this deck is for'
    descriptionCount: 'your words',
    limits: 'Kept for this deck',
    // Run rows carry no secondary text (R3); only Your games keeps 'none logged'.
    notes: 'Additional notes',
    // The last row (Hugh, 2026-10-03): pending until the model returns.
    writing: 'Writing your suggestions…',
    writingLong: 'Taking longer than usual. It is still working, and Stop uses no credit.',
    progressWriting: (done: number, total: number) => `${done} of ${total} read · writing`,
    readDescription: 'your description',
    readLimits: 'your limits',
    readNotes: 'your notes',
  },
  panelRenames: {
    unchangedReasonDescriptionKey: 'description',
    unchanged: (when: string) =>
      `Nothing has changed since ${when}: no new game, no edit to the list or to the description, so a new run would only repeat these.`,
    unchangedTail: 'Log a game or edit the description, and there will be something new to read.',
  },
  announce: {
    descriptionSaved: 'Saved the description.',
    limitSaved: 'Saved for this deck.',
  },

  // ── Suggested changes: the limits kept for the deck ───────────────────
  limits: {
    heading: 'Kept for this deck',
    capLabel: 'Most per card',
    capPlaceholder: helpMeChooseCopy.intake.budgetPlaceholder, // 'No cap'
    // Set: the collection's Set ▾ (collectionCopy filter `set`), with one change: the empty
    // trigger reads "Set: Any" (HUGH). Panel, search, chips and sheet strings are the shipped ones.
    setTriggerAny: 'Set: Any',
    ownLabel: 'Cards to add',
    ownAny: 'Any card',
    ownOnly: helpMeChooseCopy.intake.poolOwn, // 'Only cards I own'
  },

  // ── Additional notes: one press, never saved ──────────────────────────
  notes: {
    label: 'Additional notes', // HUGH
    placeholder: 'Anything for this run? e.g. more removal, swap out Sol Ring, nothing over $5',
    placeholderPhone: 'Anything for this run? e.g. more removal',
    maxLength: 500,
    counter: (n: number, max: number) => `${n} / ${max}`,
    cite: 'you asked', // chip key, drawn uppercase beside the shipped 'you said'
  },

  // ── The refusal (ruling 6), in AnalysisBanner's frame ─────────────────
  refusal: {
    commander: (name: string) =>
      `${name} is this deck’s commander, so no swap cuts it. The rest of your notes are answered below.`,
    locked: (name: string) =>
      `${name} is locked, so no swap cuts it. The rest of your notes are answered below.`,
    lockedMany: (n: number) =>
      `${n} of the cards you named are locked, so no swap cuts them. The rest of your notes are answered below.`,
    overCap: (name: string, cap: string) =>
      `${name} costs more than this deck’s ${cap} a card, so it was not suggested. The rest of your notes are answered below.`,
    tooMany: (asked: number) =>
      `A run suggests five swaps at most, not ${asked}. Here are the five that held up.`,
    nothingLeft:
      'Nothing in your notes could be done within this deck’s rules, so these swaps come from the list alone.',
  },
};
