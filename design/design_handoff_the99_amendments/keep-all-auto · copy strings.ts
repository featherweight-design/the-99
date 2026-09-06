// src/lib/copy/recommendations.ts — amendment 6, keep all auto.
//
// Five keys added to the existing `recommendationsCopy.auto` block, beside the
// sweep's own strings. Shape follows the shipped file: flat const object,
// functions for interpolated strings, no JSX, no number formatting (callers pass
// pre-formatted strings).
//
// Voice: Kitchen Table, utility register. One rule specific to this control:
//   Nothing here congratulates. Accepting the fill is not an achievement, it is
//   the player saying "yes, these are mine" — so the copy states the count and
//   stops.
//
// Existing strings this pass does NOT touch, re-word, or delete:
//   auto.tag / auto.keep / auto.keepAria     the per-row control, unchanged
//   auto.clearAll / clearAllMobile / clearAllAria
//                                            the sweep, unchanged — the new
//                                            button sits beside it and does not
//                                            renegotiate its label
//   auto.keptNote                            unchanged, and deliberately: after
//                                            a bulk keep it reads "{built} cards
//                                            are yours now", which is a claim
//                                            about the whole deck and is exactly
//                                            what became true. Amendment 6
//                                            decision 3.
//   auto.swept / sweptUndo / sweptUndoAria / sweptAnnounce / sweptRestoredAnnounce
//                                            the sweep's receipt. Keep all draws
//                                            no receipt strip, so none of these
//                                            are extended or mirrored.
//   auto.sweepFailed / restoreFailed / keepFailed
//                                            three refusals that stay as they
//                                            are; the fourth is added below.
//   fill.*                                   the provenance paragraph, which
//                                            already leaves with the last auto
//                                            card and therefore needs no edit.

export const keepAllCopy = {
  // ── The control ───────────────────────────────────────────────────────
  // The verb, then the count. Same words as deckImportCopy.update.diff.keepAll
  // (amendment 2) and a deliberately separate key: there `Keep all {n}` rescues
  // removals from a diff, here it accepts the fill's picks. One phrase for one
  // idea — "keep all of these" — stated on two surfaces that own their own copy.
  keepAll: (n: string) => `Keep all ${n}`,
  // The phone drops "all": the 390px toolbar row already carries two filter
  // pills, the sweep and the grouping pills, and this is the shortest form that
  // still names the act. `Clear auto · {n}` is NOT reworded to match — a shipped
  // string is not collateral of a new one.
  keepAllMobile: (n: string) => `Keep ${n}`,
  // Says "auto cards" out loud, the way clearAllAria does, because the visible
  // label's noun is carried by the tags on screen and a screen reader has none.
  keepAllAria: (n: string) => `Keep all ${n} auto cards in this deck`,

  // ── The receipt, which is spoken and nothing else ──────────────────────
  // One message per settle, into the live region that already carries
  // sweptAnnounce. Two clauses: what happened, then the state it leaves — and
  // the second clause is keptNote's sentence, so the spoken receipt and the
  // written one agree word for word. `built` is NOT printed: the deck's size did
  // not change, and quoting it here would imply it had.
  keptAllAnnounce: (kept: string, yours: string) =>
    `${kept} cards kept. ${yours} cards are yours now.`,

  // ── The refusal ───────────────────────────────────────────────────────
  // Never "the deck is unchanged" — that is sweepFailed's sentence, true there
  // because a sweep that fails deletes nothing. Here the deck is also unchanged,
  // which is precisely why saying so would be useless: what the player needs to
  // know is that the tags are back.
  keepAllFailed: 'We couldn’t keep those. They are still marked auto.',
} as const;

// ── NOT ADDED, deliberately ────────────────────────────────────────────
//
//   No receipt string, no undo string. Keeping destroys nothing, so there is
//   nothing for a strip to hold open — and an Undo would have to write
//   `auto = true` across every row it touched, which is the app re-claiming the
//   cards the player has just declared theirs. schema.ts:183-185 is standing in
//   front of that write. README decision 2.
//
//   No confirm-dialog copy. The label carries the count, which is the same
//   confirmation `Clear all auto · {n}` runs on for a far heavier act.
//
//   No "all kept" variant of keptNote. A player who clicked `keep ✓` forty
//   times lands in the identical state and reads the shipped sentence there;
//   a second string would fork one lifecycle into two.
//
//   No celebration string. The 99/99 reveal is untouched: not one card moved.
//
//   No "kept in bulk" marker. Nothing records how a card stopped being the
//   fill's, and inventing a column for it would re-create the provenance this
//   amendment exists to let the player retire.
