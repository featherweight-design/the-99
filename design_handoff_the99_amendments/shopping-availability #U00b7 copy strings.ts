// src/lib/copy/recommendations.ts — amendment 5, Shopping reads availability (#281).
//
// SIX ADDITIONS to the existing `shopping` block. Shape follows the shipped
// file: flat const object, functions for interpolated strings, no JSX, no
// number formatting — callers pass pre-formatted strings, and singular is
// branched on the string exactly as `overCopy` does it.
//
// Voice: Kitchen Table. A second copy of a card you already own is a purchase,
// not a problem, so nothing here apologises, warns, or advises a cut.
//
// VOCABULARY. This block borrows availability's two nouns and adds no third.
// "spare" is the player's word for `free` in the one place `free` cannot be
// said — `free` is a property of a COPY, and here we are talking about the
// player's ability to sleeve one: "you own it but can't spare it". If
// availability ever swaps `free` → `available` (see availability.ts's header),
// "spare" travels with it and is part of that one edit.
//
// NOT TOUCHED BY THIS AMENDMENT, and each for a stated reason:
//   recommendationsCopy.shopping.intro / .introUnfilled
//       Superseded when `spokenFor > 0`, never edited. At zero they must
//       render byte-for-byte as they ship — that is the assertion the whole
//       amendment's safety rests on.
//   recommendationsCopy.shopping.footer / .footerMixed        same rule
//   recommendationsCopy.shopping.emptyCovered* / .emptyUncovered
//       Unreachable while a card is contested, which is the correction. The
//       strings themselves are right and stay.
//   recommendationsCopy.shopping.groupGap
//       The role groups' arithmetic does not move. A spoken-for card is
//       already inside `from`, so it is not in these groups at all.
//   availabilityCopy.deckSummary.* / .deckRollup.*
//       The over-committed summary keeps its sentences. This block adds the
//       LINK that points at the new rows; it rewrites nothing the band says.
//   availabilityCopy.marker.*
//       The row's marker is #43's, unchanged: `short 1 — also in Atraxa`.
//   addPanelCopy.unowned.tag  (`buy`)
//       Still the default word on every unowned row, everywhere.

export const shoppingAvailabilityCopy = {
  // ── The tag ───────────────────────────────────────────────────────────
  // Replaces the word inside BuyTag on a contested row — the plate, size and
  // colour are unchanged, because the trip to the shop is the same trip. The
  // severity is already carried by the marker beside it.
  //
  // "2nd copy" over "spare", "another" and "duplicate": it is the only one that
  // says what you would be holding afterwards, and at 9px a tag has room for
  // exactly one fact.
  rowSecondCopyTag: "2nd copy",
  // BuyTag's labelled form swaps the word for a sentence rather than hanging an
  // aria-label on a bare span (see buy-tag.tsx). The row's own accessible name
  // already carries the marker's prose, so this says only what the tag says.
  rowSecondCopyTagAria: "a second copy to buy",

  // ── The marker on a Shopping row: COUNT-ONLY ──────────────────────────
  // No new string — this is a note about which shipped one to use, recorded
  // here so the next author does not "restore" the deck name.
  //
  // A Shopping row passes `nameless` to AvailabilityMarker, so the label is
  // `availabilityCopy.marker.over(-free)` — a bare `short 1` — and the prose is
  // `overAriaCountOnly`, never `overAlsoIn` / `overAlsoInAria`. Reason: the
  // clause's fixed prefix is ~120px and never truncates by contract, and this
  // row also carries the EDHREC figure, the `2nd copy` tag and a 44px ✕. At
  // 390px, and inside the 2-up desktop grid, there is no width left for a name
  // that would still read as a name — and the component's own comment forbids
  // inventing one ("the floor is what keeps 'truncates' from meaning
  // 'vanishes'").
  //
  // The named form is unchanged everywhere it fits: the All-view decklist row,
  // the over-committed band, and card detail. Addendum 2 §3's rule — every
  // state that names a deck ships a sibling that doesn't — is what this uses,
  // not a new exception.

  // ── The group ─────────────────────────────────────────────────────────
  // Pinned last, after `Other`. Uses the shipped Shopping group header: mono
  // 10px --accent label, mono 10px --fg-faint clause.
  spokenForGroupLabel: "Spoken for",
  // The clause slot where every other Shopping group draws `closes 7→10`. It
  // cannot draw arithmetic: the card is already counted in the role's own
  // baseline, so buying a second copy closes nothing. Saying why, once, in the
  // slot the eye already reads for that answer, is cheaper than a note.
  spokenForGroupClause: (n: string) =>
    n === "1" ? "1 · already in the deck" : `${n} · already in the deck`,

  // ── The intro ─────────────────────────────────────────────────────────
  // Runs whenever `spokenFor > 0`, at both widths, whether or not the deck was
  // filled. It supersedes the fill's expressive intro because that sentence —
  // "cards we reached past your collection for … every one is closing a
  // specific gap" — is untrue twice of a contested row: nobody reached past the
  // collection for a card that is in it, and the purchase closes no gap.
  //
  // "can't cover" rather than "does not have": the collection DOES have these
  // cards. What it cannot do is cover two lists with one copy.
  introSplit: (n: string, missing: string, spokenFor: string) =>
    `${n} cards this deck wants that your collection can't cover — ${missing} you don${"\u2019"}t own, and ${
      spokenFor === "1" ? "1 you own but can\u2019t spare" : `${spokenFor} you own but can\u2019t spare`
    }.`,
  // Nothing unowned, something contested. A different sentence rather than the
  // split one with a zero in it: "0 you don't own" is a clause about nothing.
  introOnlySpokenFor: (n: string) =>
    n === "1"
      ? "One card here is already yours \u2014 and already sleeved into a finished list. A second copy is the only way to have both."
      : `${n} cards here are already yours \u2014 and already sleeved into finished lists. A second copy of each is the only way to have both.`,

  // ── The footer ────────────────────────────────────────────────────────
  // One mono line under a 1px --border rule, as it ships. The leading figure
  // stops being "cards to buy" the moment the list holds two kinds of purchase,
  // so it becomes the plain size of the list and the two kinds follow it.
  footerSplit: (n: string, missing: string, spokenFor: string, auto: string) =>
    `${n} cards · ${missing} to buy · ${spokenFor} a 2nd copy · ${auto} auto`,
  // 390px cannot hold four clauses on one mono line. The auto clause is the one
  // that drops: it describes provenance, and the other three describe the trip.
  footerSplitShort: (n: string, missing: string, spokenFor: string) =>
    `${n} cards · ${missing} to buy · ${spokenFor} a 2nd copy`,
  // Nothing unowned. `{n} cards to buy` would be wrong about all of them.
  footerOnlySpokenFor: (n: string) =>
    n === "1" ? "1 second copy · already in the deck" : `${n} second copies · already in the deck`,

  // ── The over-committed summary's link ─────────────────────────────────
  // The band keeps every word it ships (availabilityCopy.deckSummary). This is
  // the one control it gains, in the BUILDER only: the deck card on /decks has
  // no Shopping list to open, so it takes no link and changes in no way.
  //
  // Absent when the Shopping filter is already active — a link to the screen
  // you are on is furniture.
  summaryLink: "See them in Shopping",
  summaryLinkAria: (n: string) =>
    n === "1"
      ? "Show the 1 spoken-for card in the Shopping list"
      : `Show the ${n} spoken-for cards in the Shopping list`,
} as const;

// ── REPLACES — edits inside files this block does not own ──────────────────
//
// 1. decklist.tsx:118 — the Shopping predicate.
//    WAS:  cards.filter(c => !c.owned && !isBasicLand(c.typeLine))
//    NOW:  the same, OR availabilityState(c.availability, { selfExcluded: true })
//          === "over". Basics excluded exactly as today.
//    NEVER: `owned - hard`, and never `free` recomputed from anything. Read
//    `availability.free` — it was computed from this deck's vantage, and
//    Addendum 2 §6 / R5 §6 is explicit that the subtraction is right only
//    off-decklist and silently wrong here.
//
// 2. decklist.tsx — intro and footer selection.
//    `spokenFor === 0` MUST fall through to the shipped strings unchanged. One
//    unit test asserts that byte-for-byte; it is the amendment's safety net.
//
// 3. decklist.tsx:139 — the spent slot.
//    WAS:  filter === "all" || !spentSlot.owned
//    NOW:  filter === "all" || the Shopping list was showing this card.
//    Reason: a contested card is owned, so removing one from Shopping would
//    unmount the row with no undo receipt — the exact case #185 exists for.
//
// 4. buy-tag.tsx — one optional `word` prop, defaulting to
//    addPanelCopy.unowned.tag. No new variant, plate or colour.
//
// 5. builder-spine.tsx — RollupBands takes an optional `onShowShopping`.
//    No callback = no link, which is what leaves the deck card's band alone.
//
// ── NOT ADDED, deliberately ───────────────────────────────────────────────
//
//   No "cut it instead" string. A cut releases a copy; the marker never argues
//   against a move, and the row's own ✕ is that exit already.
//
//   No urgency wording for `short 2` and above. A bigger shortfall is a bigger
//   purchase, not a louder one, and the marker states the number.
//
//   No degraded-read message. The builder fails quiet — the rows are simply
//   absent, which is what a player with no commitments sees.
//
//   No price, total, or "buy all". Shopping copies names, as it ships.
//
//   No string for the export dialog's Shopping tab. Its heading count
//   ("8 cards you don't own") is now wrong twice over, and it lives outside
//   this block — named in AMENDMENT-5-README.md decision 8 and gap 6 rather
//   than quietly patched from here.
