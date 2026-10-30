// src/lib/copy/decks-builder.ts — ADDENDUM to the Add panel block (#158).
//
// Covers #183 / #177 / #179 / #185 / #184 / #176, plus the nine copy calls made
// inside the locked `addPanelCopy` (listed under REPLACES below — eng cannot
// take those from this file alone; they are edits to the locked block).
//
// Shape follows the locked file: flat const object, functions for interpolated
// strings, no JSX, no number formatting. Voice: Kitchen Table — straight
// utility copy; nothing here is a win, so nothing here is expressive.

// ─────────────────────────────────────────────────────────────────────────
// REPLACES — nine edits inside the locked `addPanelCopy`. Design's calls, made
// because the strings sit in the locked file and eng is not free to touch them.
//
// 1. shelf.noTarget
//    was: 'no target — this is the deck’s plan'
//    now: 'no target · this is the deck’s plan'
//    The line already sits in a mono meta row whose separator is `·`; the em
//    dash was the only one in the row.
//
// 2. degraded.body
//    was: `…not by what other ${c} decks run — so the shelves are honest and
//          the percentages are missing.`
//    now: `…not by what other ${c} decks run. The shelves are honest and the
//          percentages are missing.`
//    Two claims, so two sentences. Straight register, unchanged.
//
// 3. quickAdd.ownedFilterOffNote
//    was: 'filter off — N results you don’t own'
//    now: 'filter off · N results you don’t own'
//    Mono meta, same reasoning as 1.
//
// 4 + 5. builderEmpty.caption — the em dash AND the doubled "ninety-nine"
//    was: `Ninety-nine slots, zero filled. Type a name below, or take the
//          ninety-nine we’ve already picked out — ${commander} eats everything
//          anyway.`
//    now: `Ninety-nine slots, zero filled. Type a name below, or take the ones
//          we’ve already picked out. ${commander} eats everything anyway.`
//    "A king with no army." and "eats everything anyway" stay verbatim; the
//    second "ninety-nine" was the sentence counting itself twice.
//
// 6. tile evidence — two figures with no drawn baseline.
//    `10%` and `+31 pts vs. average` both state a rate against a comparison
//    that exists only in `inclusionAria`. A screen reader hears the baseline;
//    an eye does not. Both gain a drawn label (`tile.evidenceLabel`,
//    `tile.lift`) rather than a reword — see below.
//
// ── R2 audit additions: three strings #184 orphans in the locked block ──
//
// 7. strip.hint — REPLACED, not duplicated.
//    was: 'Click a cell for rationale · a cell under target links its shelf below'
//    now: 'A cell under target opens its shelf below'
//    Both locked clauses go false once the cell is the control: clicking a cell
//    no longer opens rationale, and a cell does not *link* a shelf, it *is* the
//    link. The R2 draft kept a second clause glossing the rationale trigger;
//    R3 cut it — a question mark mid-sentence, explaining a control that sits
//    in the same strip saying the same words. `addPanelAddendumCopy.strip.hint`
//    below is the SAME KEY at its new value — eng overwrites
//    `addPanelCopy.strip.hint` and ships ONE live value. Do not merge both
//    objects and leave two.
//
// 8. strip.shelfLink — DELETE.
//    was: 'consider'
//    Superseded by `strip.cellLink` ('consider →'), a caption inside the cell
//    rather than an anchor beneath it. The arrow moves into the string because
//    the label is no longer a link and cannot borrow the affordance from one.
//
// 9. strip.shelfLinkAria — DELETE.
//    was: (role: string) => `See ${role} cards to consider`
//    Superseded by `strip.cellLinkAria`, which names the figures too, because
//    the cell it labels now carries them. NOTE FOR ENG: this was the only
//    consumer of RECOMMENDED_MIX.land's singular label ('land'). The cell face
//    and cellLinkAria both use the display label ('Land'), so the singular
//    becomes dead data — delete it with the string unless something else
//    claims it first.
// ─────────────────────────────────────────────────────────────────────────

export const addPanelAddendumCopy = {
  // ── Decklist row — remove, at both widths (#179) ──────────────────────
  // `decklist-row.tsx` renders the ✕ as `hidden md:block`, so a phone deck can
  // be filled and never emptied. The control is the same control; only its hit
  // box changes.
  row: {
    remove: '✕',
    removeAria: (name: string) => `Remove ${name}`,
    // A stack of basics decrements rather than unmounting, so the phone label
    // says which of the two is about to happen.
    removeCopyAria: (name: string, quantity: number) =>
      `Remove one copy of ${name}, ${quantity} in deck`,
  },

  // ── Undo (#185) ───────────────────────────────────────────────────────
  // The removed row is replaced in place by this one. No toast, no timer —
  // see decision 3 in the addendum README.
  undo: {
    removed: (name: string) => `${name} removed`,
    action: 'Undo',
    actionAria: (name: string) => `Undo removing ${name}`,
    // Read on the builder's existing live region, after the removal itself.
    announceRemoved: (name: string, built: number) =>
      `${name} removed · ${built} of 99 · undo available`,
    announceUndone: (name: string, built: number) =>
      `${name} back in the deck · ${built} of 99`,
    // LIFETIME (R2 audit item 3): the undo row is decklist state, not row
    // state, so it SURVIVES a tab switch to Consider and back, and any
    // re-sort. Cleared by exactly three things: Undo pressed, the next
    // removal, or leaving the builder route. Never by a timer — #185 is about
    // things disappearing before they are noticed.
    // The group count above a spent slot decrements IMMEDIATELY (Artifacts
    // 6 → 5), along with the 99 count: the card is out of the deck the moment
    // the row is spent. The slot is a receipt, not a pending state.
    // The undo row is the only thing standing between a mis-tap and a lost
    // card, so a failed undo says so where the row is, not in a banner.
    failed: 'Couldn’t put that back. Try adding it again.',
  },

  // ── Coverage strip — the cell is the link (#184) ───────────────────────
  // Replaces `addPanelCopy.strip.shelfLink` / `shelfLinkAria` as a separate
  // anchor beneath the cell. The label stays; it is now a caption inside the
  // cell rather than its own target.
  strip: {
    cellLink: 'consider →',
    // The whole cell is the control, so its accessible name carries the
    // figures a sighted user reads off the cell face. Two sentences, no dash —
    // the no-em-dash rule covers aria as much as visible copy.
    cellLinkAria: (role: string, have: number, target: number) =>
      `${role}, ${have} of ${target}. See ${role.toLowerCase()} cards to consider.`,
    // A cell that is not short has no shelf to send anyone to, so it is a
    // figure and not a control.
    cellStaticAria: (role: string, have: number, target: number) =>
      `${role}, ${have} of ${target}`,
    // One disclosure for the strip instead of five per-cell buttons.
    rationaleToggle: 'Why these numbers?',
    rationaleToggleAria: 'Show why each role has the target it has',
    rationaleClose: 'Hide',
    // REPLACES the locked `strip.hint` (see 7 above). ONE live value, not two.
    hint: 'A cell under target opens its shelf below',
  },

  // ── Unowned suggestions (#176) ────────────────────────────────────────
  // `getDeckSuggestions()` appends up to 5 unowned EDHREC staples, so the R2
  // premise that every suggestion is owned is false. These tiles are kept and
  // marked rather than hidden — the deck already carries a shopping list.
  unowned: {
    // Reuses the decklist row's shipped `buy` tag, same colours, same word.
    tag: 'buy',
    tagAria: (name: string) => `${name} is not in your collection`,
    // NO tile note. R1 drew one ('not owned · goes on your shopping list'); the
    // R2 audit cut it, correctly — it restated the tag and the shelf heading in
    // a noun this app does not have. The shipped vocabulary is `to buy`
    // (builder-spine.tsx:202, deck-card.tsx:162) and the tag already says it.
    // Colour is still not the sole signal: the tag word, its aria, and the
    // shelf heading each carry ownership independently.
    // The trailing shelf these sit in. Uses the existing `edhrec` label so no
    // new role or taxonomy is introduced.
    shelfCoverage: 'not in your collection',
  },

  // ── Consider provenance, with unowned present (#176) ──────────────────
  // `addPanelCopy.consider.provenance` stays exactly as it is when every
  // suggestion is owned. This form is used only when the unowned append has
  // put something on the shelves, so the line never over-claims.
  //
  // NOT `N to buy`, though the app says that in two places. In
  // builder-spine.tsx:202 and deck-card.tsx:162 it counts cards IN THIS DECK
  // you don't own; in Consider it would count SUGGESTIONS you haven't added.
  // Same phrase, different denominator, one tap apart — so this line states the
  // axis instead of borrowing a phrase that already means something else here.
  consider: {
    provenanceWithUnowned: (owned: number, unowned: number) =>
      `${owned} owned · ${unowned} you don’t own`,
  },

  // ── Tile evidence labels (#182 copy call 6) ───────────────────────────
  // Both figures now name their baseline on screen.
  tile: {
    // Sits before the inclusion bar, mono 9px, so `10%` reads as an EDHREC
    // rate rather than a bare number on a card.
    evidenceLabel: 'edhrec',
    // was: `+${n} pts vs. average`. "Average" of what was the missing half.
    lift: (pts: string) => `+${pts} pts vs. all decks`,
  },

  // ── /decks/new — the Create button becomes the route's dock (#177) ────
  // No new string: `Create deck →` keeps its label and its aria. The summary
  // line above it is new, because a docked button covers the selection it is
  // about to act on.
  createPicker: {
    dockSummary: (commander: string, identity: string) => `${commander} · ${identity}`,
    dockSummaryEmpty: 'Pick a commander to start',
  },
} as const;
