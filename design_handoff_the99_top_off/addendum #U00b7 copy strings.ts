/**
 * addendum · copy strings.ts — the R1 addendum to src/lib/copy/top-off.ts.
 *
 * ELEVEN new keys, TWO edits, THREE ratifications. Nothing in the locked copy
 * file is deleted, and the toolbar cluster (keptNote, keep, keepAll) keeps
 * every word it ships with.
 *
 * The eleven split 7 + 4, and the split is the audit trail:
 *
 *   SEVEN for the five gaps —
 *     list.decline · list.restoreAll · list.restoreAllAria
 *     strip.doorNoteMobile · strip.doorNoteAgainMobile
 *     commit.nothingTickedAllDeclined · announce.restoredAll
 *   FOUR for the ratified Keep-all confirm —
 *     auto.keepAllConfirm · .keepAllConfirmMobile
 *     .keepAllConfirmYes · .keepAllConfirmNo
 *
 * Counted this way because the two halves answer to different owners: the seven
 * are Design's calls on gaps the build review raised, the four are amendment 2
 * to a fix eng is shipping separately. An auditor checking either half should
 * not have to subtract.
 *
 * The surprise is still how few the gaps took. The 390px assurance needed none
 * at all — see EDIT 2 — and one of the seven is a word already on the surface.
 */

// ── ADDS to topOffCopy.list ─────────────────────────────────────────────────

export const listAdditions = {
  /** #478. The visible label for the decline, and the whole of the fix's
   *  vocabulary problem.
   *
   *  A WORD, never a glyph: removal is a glyph everywhere in this app, and a
   *  13px × at a row's right edge is byte-identical to the one that deletes a
   *  card from the deck one surface away. The rule the addendum adds is that
   *  the candidate list has no glyph-only controls at all.
   *
   *  It is the inverse VERB of `restore` ('Show it again') and wears its exact
   *  register — mono 10.5px --fg-faint on a dashed underline — so the pair
   *  reads as one toggle rather than as an action and its apology.
   *
   *  Never 'Remove', 'Delete', 'Dismiss', 'Hide', 'Skip' or '×'. The first four
   *  are removal words for an act that removes nothing; 'Skip' says the list
   *  moves on, and it does not — the row stays, in its own slot, restorable. */
  decline: 'Set aside',

  /** S25's exit, and the mirror of `clearTicks`. Not a convenience: declines
   *  are strip state and survive every close, so a player who set all 38 aside
   *  has changed their list PERSISTENTLY and the only route back was 38 taps.
   *
   *  Present at ONE decline, not at 38 — gating it on the all-declined case
   *  would hide the general control to serve the extreme one.
   *
   *  'again' rather than 'restore' or 'undo': it is the same word the per-row
   *  control uses, pluralised, so the two are visibly one act at two scales. */
  restoreAll: (declined: string) => `Show all ${declined} again`,
  restoreAllAria: (declined: string) =>
    `Put all ${declined} declined candidates back on the list`,
} as const;

// ── ADDS to topOffCopy.strip ────────────────────────────────────────────────

export const stripAdditions = {
  /** The 390px door note. The desktop sentence runs three mono lines here, and
   *  a short form that is still two lines buys nothing — so the test is which
   *  clause survives alone.
   *
   *  THE PROMISE SURVIVES. 'Nothing is added until you say so' is the entire
   *  reason the review step exists and it is carried nowhere else on the
   *  surface: not in the caption, not on the door, not in the head.
   *
   *  THE PROVENANCE DOES NOT NEED TO. 'all from your collection' is carried
   *  three more ways the moment the list opens — the filled --success dots, the
   *  head's own `Tick the N I own`, and every unticked row's buy tag. The count
   *  stays, because it is the figure the sentence is about.
   *
   *  Longest form is 56 characters ≈ 336px inside the strip's 366px, so every
   *  count fits one line. */
  doorNoteMobile: (seeded: string) =>
    seeded === '0'
      ? 'You own none of these. Nothing is added until you say so.'
      : seeded === '1'
      ? '1 arrives ticked. Nothing is added until you say so.'
      : `${seeded} arrive ticked. Nothing is added until you say so.`,

  /** ONE reopen note at phone where desktop has two. The two desktop variants
   *  differ only in an ownership figure, and at 390px the closed caption
   *  directly above already states the candidate count — so the figure is
   *  dropped and the clause that matters is kept: the selection survived.
   *
   *  Not parameterised, because there is nothing left in it to parameterise.
   *  That is the point: three strings become two. */
  doorNoteAgainMobile: 'Reopens where you left it, declines and all.',
} as const;

// ── ADDS to topOffCopy.commit ───────────────────────────────────────────────

export const commitAdditions = {
  /** S25. A third variant on the zero-ticked line, chosen when every candidate
   *  in the pool is declined.
   *
   *  The shipped `nothingTicked` is FALSE here — 'the list arrives with what you
   *  own already ticked' describes a moment that has passed. And this is NOT
   *  state 13: `lastSlots.short` must never print, because 'your collection ran
   *  out' would blame the collection for the player's own preferences, which the
   *  locked handoff names as the worst sentence this surface could say.
   *
   *  So: name the state, point at the exit, and blame nobody. Lower case and no
   *  plate, matching its two siblings — nothing has gone wrong. */
  nothingTickedAllDeclined: (cand: string) =>
    `you've set all ${cand} aside — show any of them again to pick it up`,
} as const;

// ── ADDS to topOffCopy.announce ─────────────────────────────────────────────

export const announceAdditions = {
  /** The bulk restore is the largest visual change on the surface — up to 38
   *  rows changing shape at once — so it is the one act here a reader would
   *  otherwise get nothing from. The single decline already announces
   *  (announce.declined) and is unchanged.
   *
   *  It states the tick count too, because restoring does NOT re-tick: a
   *  restored row comes back unticked, and a reader needs to hear that the list
   *  is back without the selection being back. */
  restoredAll: (declined: string, ticked: string, n: string) =>
    `${declined} candidates back on the list. ${ticked} of ${n} ticked.`,
} as const;

// ── ADDS to recommendationsCopy.auto — the Keep all confirm ─────────────────
//
// Ratifying eng's separate fix, with two amendments. The pattern is
// game-history-row.tsx's inline confirm, which is this app's only confirm
// vocabulary and whose own header comment states the case it was built for.
//
// AMENDMENT 1 lives in the component, not here: the confirming button must NOT
// take --danger. Keeping is a graduation, not a deletion — it destroys no cards
// — and danger ink would say 'this loses cards', which is the one thing it does
// not do. Both answers take BULK_BUTTON_CLASS's own treatment, so the toolbar
// goes on recommending neither answer.
//
// AMENDMENT 2 is these strings. The question must name what is actually lost,
// in the words the SURFACE uses — not 'the ledger', which is an internal noun
// appearing nowhere on screen. That is the same trap eng caught in
// `seedReversal`, where 'the sweep' pointed at a control labelled 'Clear all
// auto'. The ledger's own header says 'Where these 99 cards came from', so the
// question says 'the record of where they came from'.

export const autoAdditions = {
  keepAllConfirm: (count: string) =>
    `Keep all ${count}? You'll lose the record of where they came from.`,
  /** Phone shortens rather than wrapping to three lines in a toolbar. 'The
   *  record' alone, because the full phrase has just been established by the
   *  ledger sitting a few rows up the same page. */
  keepAllConfirmMobile: (count: string) =>
    `Keep all ${count}? The record goes too.`,
  /** 'Keep them' rather than repeating 'Keep all N': the count is in the
   *  question one element away, and an answer that restates the question reads
   *  as a second trigger rather than a confirmation. */
  keepAllConfirmYes: 'Keep them',
  keepAllConfirmNo: 'Cancel',
} as const;

// ── EDITS — two, both inside the locked file ────────────────────────────────
//
// 1. list.cap — KEPT VERBATIM, MOVED. 'Untick one to swap another in' is
//    correct and eng's reason for cutting the count is ratified below. What
//    changes is where it renders: it is currently printed after all 38 rows,
//    which explains the cap 167 rows below where a player hits it.
//
//      phone   → the pinned commit bar, as rung 1 of the status ladder
//      desktop → the selection head, after the counts, behind a
//                `border-left: 1px var(--border-strong)` divider
//
//    It must render at BOTH widths: `capLineId` is the aria-describedby target
//    of every inert tick box. Do not make one home `md:hidden` and drop the id.
//
// 2. commit.slotsStayOpen — STRING UNCHANGED, one class deleted. It ships
//    `hidden md:block` and so never reaches a phone, which is where the
//    assurance matters most: the phone reader has 38 rows below the fold and a
//    bar telling them they are about to add 27 cards.
//
//    Measured at mono 10.5px, the longest form ('31 slots stay open — you can
//    come back to them', 45 chars) is ~281px inside the bar's 366px, and the
//    singular already exists. So THIS GAP NEEDED NO NEW STRING — it needed the
//    class removed and a home in the ladder, at rung 2.
//
// ── THE STATUS LADDER — one line, three tenants, in priority order ──────────
//
//    1. atCap                        → list.cap
//    2. openSlots - tickedCount > 0  → commit.slotsStayOpen
//    3. otherwise                    → dock.retired
//
//    Gate this as ONE ternary, not three sibling conditionals, or two can print
//    and the bar grows a line — which invalidates onBarHeight's reservation.
//
//    Rungs 1 and 2 are mutually exclusive by arithmetic, so the ladder costs no
//    height. The consequence to state out loud: dock.retired is rung 3, so at
//    phone it appears only when a pass is exactly full. That is close to
//    retiring it, and it is deliberate — the swap is already spoken on open by
//    dock.retiredAnnounce, and `Cancel` and `Close` are both on screen and are
//    both the answer to 'how do I get quick-add back'. The other two tenants
//    are stated nowhere else at 390px.
//
// ── RATIFIED — eng calls adopted without change ─────────────────────────────
//
// a. list.declineAria — the ENG-INVENTED marker comes off, THE STRING STAYS.
//    'Set {name} aside' was the right inverse of restoreAria, and the visible
//    label is now the same verb, so the accessible name is a superset of the
//    label rather than a second vocabulary. Eng was right to invent a trigger
//    (a state with no way into it is a state that does not exist) and right to
//    flag it; only the FORM was Design's to fix, and the glyph was the defect.
//
// b. list.cap's missing count — RATIFIED, and the reasoning is better than the
//    handoff's own rule. It led '31 of 31 slots ticked', which is `head` word
//    for word at desktop and `headMobile` word for word in the bar directly
//    below, so the instruction arrived third behind a figure already on screen
//    twice. The denominator-in-every-string rule yields to that.
//
// c. `plural` — RATIFIED. 'Add 1 cards' and '1 slots stay open' are the kind of
//    defect a handoff writes by pluralising unconditionally, and the helper's
//    shape matches decks-builder.ts's. It applies to every string in this file
//    that carries a count.
//
// Also ratified, in the component rather than the copy: captionMobileOpen,
// closeShort, colCost, markOne, markedRow, and the unownedClause / toBuy null
// branches (a total of zero priced copies is not a total of $0.00). All six
// were correct extensions and none is re-specced here.
//
// ── UNTOUCHED ───────────────────────────────────────────────────────────────
//
//   autoCopy.keptNote / .keep / .keepAll / .keepAllMobile / .keepAllAria
//     — the graduation cluster keeps every word. R3 made it load-bearing for
//       this surface; the addendum adds a confirm around keepAll and edits
//       nothing inside it.
//   autoCopy.clearAll / .clearAllAria / .swept / .sweptUndo
//     — and NO confirm. It already ships SweepReceipt with an undo. The rule:
//       confirm where there is no undo, receipt where there is. Two
//       destructive-looking neighbours, two treatments, for a reason a player
//       can feel.
//   every ledger.* string, list.declined / .restore / .restoreAria,
//   list.illegal*, commit.refused / .refusedLabel, dock.*, and the whole of
//   synergyCopy.lastSlots — including .short, which must not print in S25.
