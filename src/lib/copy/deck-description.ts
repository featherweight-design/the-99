// Deck description, and tailored Suggested changes (H35) — copy.
//
// EVERY STRING HERE IS A PLACEHOLDER, owed to /copy-review, except those Hugh wrote in review
// (marked HUGH). Transcribed from the handoff's `deck-description · copy strings.ts` (R2).
// US English, no em dashes. Apostrophes are ’.
//
// REPLACES `deckTuningCopy.intent` wholesale (not an amend): the ask, the seeded chip and its
// sentences are gone with the old door (DESCRIPTION-where-it-lives.md).

import { helpMeChooseCopy } from "./help-me-choose";

export const deckDescriptionCopy = {
  // ── The field (empty state 1b-1c, checklist editor 1h2, pencil editor 1g) ──
  description: {
    label: "Describe your deck",
    // HUGH, less one clause (2026-10-05): the Overview does not read the description (H35, Q2).
    help: "One or two sentences that will help us suggest more accurate card swaps.",
    placeholder: "e.g. Grind a four-player table out and win late with big fliers. No infinite combos.",
    placeholderPhone: "e.g. Grind a four-player table out and win late with big fliers.",
    // Always drawn, from '0 / 240', at the help text's end.
    counter: (n: number, max: number) => `${n} / ${max}`,
    maxLength: 240,
    warnAt: 220,
    tooLong: "Keep it to 240 characters.",
    refused: "That did not save. Try again.",
    save: "Save",
    cancel: "Cancel",
    pencilAria: (name: string) => `Edit name and description of ${name}`,
    fieldAria: "Deck description",
    // Checklist row while the description is null (1h).
    rowNone: "none yet",
    rowOpen: "Describe your deck →",
  },

  manifest: {
    description: "Your description",
    descriptionCount: "your words",
    limits: "Kept for this deck",
    // Run rows carry no secondary text; only Your games keeps 'none logged'.
    notes: "Additional notes",
    // The last row: pending until the model returns.
    writing: "Writing your suggestions…",
    writingLong: "Taking longer than usual. It is still working.",
    progressWriting: (done: number, total: number) => `${done} of ${total} read · writing`,
    readDescription: "your description",
    readLimits: "your limits",
    readNotes: "your notes",
  },
  panelRenames: {
    unchangedReasonDescriptionKey: "description",
    unchanged: (when: string) =>
      `Nothing has changed since ${when}: no new game, no edit to the list or to the description, so a new run would only repeat these.`,
    unchangedTail: "Log a game or edit the description, and there will be something new to read.",
  },
  announce: {
    descriptionSaved: "Saved the description.",
    limitSaved: "Saved for this deck.",
  },

  // ── Suggested changes: the limits kept for the deck ──
  limits: {
    heading: "Kept for this deck",
    capLabel: "Most per card",
    capPlaceholder: helpMeChooseCopy.intake.budgetPlaceholder, // 'No cap'
    ownLabel: "Cards to add",
    ownAny: "Any card",
    ownOnly: helpMeChooseCopy.intake.poolOwn, // 'Only cards I own'
    // Not in the handoff's copy file — this box's own save had no refusal string there.
    refused: "That did not save. Try again.",
    removeSet: helpMeChooseCopy.intake.removeSet, // 'Remove {name}', shared with the intake chip
  },

  // ── Additional notes: one press, never saved ──
  notes: {
    label: "Additional notes", // HUGH
    placeholder: "Anything for this run? e.g. more removal, swap out Sol Ring, nothing over $5",
    placeholderPhone: "Anything for this run? e.g. more removal",
    maxLength: 500,
    counter: (n: number, max: number) => `${n} / ${max}`,
    // The box takes the Notes `[[` card tag (card-tags plan, PR 2). A tag only names the card for this run.
    tagHelp: {
      infoAria: "How card tags work",
      lines: [
        "Type [[ and the start of a card’s name to tag it, or press [[ ]] to start one.",
        "A tagged card is read by its exact name.",
        "A name typed without picking it from the list stays plain text.",
      ],
      insert: "[[ ]]",
      insertAria: "Insert a card tag",
    },
    cite: "you asked", // chip key, drawn uppercase beside the shipped 'you said'
  },

  // ── The refusal (ruling 6), in AnalysisBanner's frame ──
  refusal: {
    commander: (name: string) =>
      `${name} is this deck’s commander, so nothing cuts it. The rest of your notes are answered below.`,
    locked: (name: string) =>
      `${name} is locked, so nothing cuts it. The rest of your notes are answered below.`,
    lockedMany: (n: number) =>
      `${n} of the cards you named are locked, so nothing cuts them. The rest of your notes are answered below.`,
    overCap: (name: string, cap: string) =>
      `${name} costs more than this deck’s ${cap} a card, so it was not suggested. The rest of your notes are answered below.`,
    tooMany:
      "A run shows five additions and five cuts at most. Here are the ones that held up.",
    // "Owned only" is set and nothing the player owns fits: the additions are cards to buy, each with
    // its own buy tag and price. Hugh, 2026-10-11; owned cards come first whenever any fit.
    ownedNone:
      "Nothing in your collection fits these needs, so the additions are cards to buy.",
    // The credit came back though suggestions are shown: too few held up (`refundsCredit`). Hugh, 2026-10-11.
    refunded: (nWord: string) => `Only ${nWord} held up, so this one’s on us.`,
    nothingLeft:
      "Nothing in your notes could be done within this deck’s rules, so these suggestions come from the list alone.",
  },
};
