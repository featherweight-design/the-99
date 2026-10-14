// src/lib/copy/recommendations.ts — #130 · #131.
// Shape follows src/lib/copy/decks-builder.ts and shell.ts: flat const object,
// functions for interpolated strings, no JSX, no number formatting (callers
// pass pre-formatted strings). Voice: Kitchen Table — utility copy stays
// straight; the three expressive moments are marked.
//
// Existing strings this block does NOT touch, and must not duplicate:
//   detail.tsx:312-316  `{n} short of baseline` / `At the {n}-source baseline`
//                       / `Well past the {n}-source baseline`
//   detail.tsx:330      `No {role} cards in your pool`
//   mix.ts:82           RECOMMENDED_MIX_SOURCE_LINE
//   card-detail-provider.tsx  cardDetailCopy.triggerAria
//   buy-tag / addPanelCopy.unowned.tag  `buy`

export const recommendationsCopy = {
  // ── Surface A · Role Coverage ─────────────────────────────────────────
  coverage: {
    // Replaces the shipped sub-caption "Your owned cards by role" ONLY when
    // figures are available. See REPLACES note at the bottom of this file.
    subcaption: 'Your owned cards by role · figures from EDHREC',
    subcaptionNoFigures: 'Your owned cards by role',

    // The chip. The figure lives inside the accessible name rather than on a
    // nested span — BuyTag already learned that a label on a bare span is
    // discarded. The em dash itself is aria-hidden.
    chipAria: (name: string, pct: string) =>
      `View details for ${name}. In ${pct}% of decks.`,
    chipAriaNoFigure: (name: string) =>
      `View details for ${name}. No EDHREC figure.`,
    chipFigure: (pct: string) => `${pct}%`,
    // Absence, never 0%. Drawn only where neighbouring chips carry figures.
    chipNoFigure: '—',
    chipNoFigureLegend: '— = no EDHREC figure for this card',

    // Disclosure. Desktop rests on the count; the phone names the action,
    // because a 44px row with "+22 more" in it does not read as a control.
    moreChips: (n: string) => `+${n} more`,
    showAll: (n: string) => `Show all ${n}`,
    showAllAria: (n: string, role: string) => `Show all ${n} ${role} cards`,
    showFewer: 'Show fewer',
    // Past the expansion cap of 40 — a count, not a control.
    beyondCap: (n: string) => `+${n} more not shown`,

    // Said once at the top of the section, never per chip. Two strings, because
    // FitHero's distinction is load-bearing: absent is permanent, degraded is
    // an outage with a retry.
    absentHeading: 'No EDHREC figures for this commander',
    absentBody:
      'the roles below are your collection’s, counted the same way. We just can’t say how often other decks run them.',
    absentBodyMobile: 'roles still count, we just can’t rank them.',
    degradedHeading: 'EDHREC figures unavailable',
    degradedBody:
      'we couldn’t reach EDHREC, so the percentages are hidden for now.',
    degradedRetry: 'Try again',
    degradedRetryAria: 'Try loading EDHREC figures again',
  },

  // ── Surface A · the build promise ─────────────────────────────────────
  build: {
    // Replaces the mobile sticky bar's "{n} cards in your pool". The button
    // now keeps a promise, so the line states the promise.
    stickyLabel: 'READY TO BUILD',
    stickyPromise: (n: string) => `We’ll fill ${n} of the 99`,
    // Replaces detail.tsx's desktop seed note "Your owned pool will seed the
    // deck builder", which describes a seeding that no longer happens.
    seedNote: (n: string) =>
      `We’ll fill ${n} of the 99 — roles and lands. The rest is yours.`,
  },

  // ── Surface B · the auto marker ───────────────────────────────────────
  auto: {
    tag: 'auto',
    // The control's label is the verb, not the marker's name: the player wants
    // to keep a card, not to clear a flag.
    keep: 'keep ✓',
    keepAria: (name: string) => `Keep ${name} in this deck`,
    // Group heading clause, beside the shipped "{n}" count.
    groupCount: (n: string) => `${n} auto`,
    // Toolbar sweep. Absent at zero — never rendered disabled.
    clearAll: (n: string) => `Clear all auto · ${n}`,
    clearAllMobile: (n: string) => `Clear auto · ${n}`,
    clearAllAria: (n: string) => `Clear all ${n} untouched auto cards`,
    // Beside the sweep once some cards have been kept.
    keptNote: (n: string) => `${n} cards are yours now`,
    // One receipt for the whole sweep — not one per row. Lifetime is decklist
    // state, per PR #204.
    swept: (n: string) => `${n} auto cards removed`,
    sweptUndo: 'Undo',
    sweptUndoAria: (n: string) => `Put all ${n} auto cards back`,
    // The single live-region message. One, never one per row.
    sweptAnnounce: (removed: string, total: string) =>
      `${removed} auto cards removed. ${total} of 99.`,
    sweepFailed: 'We couldn’t clear those. The deck is unchanged.',
  },

  // ── Surface B · the arrival (expressive moment 1) ─────────────────────
  // Not a toast and not dismissible: it describes the deck's state, so it
  // leaves when the last auto card does.
  fill: {
    provenance: (filled: string, bought: string, open: string) =>
      `We filled the roles and the mana base — ${filled} cards, ${bought} of them from outside your collection. The other ${open} are yours: that is where this commander actually happens, and it is where we are worst.`,
    provenanceMobile: (filled: string, bought: string, open: string) =>
      `We filled the roles and the mana base — ${filled} cards, ${bought} from outside your collection. The other ${open} are yours.`,
    // Every baseline was covered from the collection, so nothing was bought.
    provenanceAllOwned: (filled: string, open: string) =>
      `We filled the roles and the mana base — ${filled} cards, all from your collection. The other ${open} are yours.`,
    // State 13 — a baseline the fill could not reach. Names the shortfall
    // rather than quietly reporting a smaller number.
    provenanceShort: (filled: string, role: string, open: string) =>
      `We filled ${filled} of 99. ${role} came up short — you own what you own, EDHREC knows what it knows, and that is everything we have. The other ${open} are yours.`,
    // In-flight (state 14). One announcement on settle, never per row.
    filling: (n: string) => `Filling ${n} of 99…`,
    fillingRows: (n: string) => `Sleeving ${n} cards…`,
    filledAnnounce: (filled: string, bought: string) =>
      `Deck filled. ${filled} of 99, ${bought} to buy.`,
    // State 15 — the deck exists, the fill did not land.
    failedHeading: 'The deck is here, the cards aren’t.',
    failedBody:
      'We made the deck but couldn’t fill it. Nothing is lost — your commander is saved and the slots are empty.',
    failedRetry: 'Try filling again',
    failedRetryAria: 'Try filling this deck again',
  },

  // ── Surface B · Shopping filled by the fill ───────────────────────────
  shopping: {
    intro: (n: string) =>
      `${n} cards we reached past your collection for, to get each role to its baseline. Nothing here is a wildcard — every one is closing a specific gap.`,
    // Role group heading clause. The arithmetic the group closes, stated once.
    groupGap: (n: string, from: string, to: string) =>
      `${n} · closes ${from}→${to}`,
    // The phone Shopping row carries the figure on a meta line under the name,
    // out of the pill that used to give it context — so it is prefixed.
    // Addendum A2. The All view's row keeps 44px and prints no figure.
    rowFigure: (pct: string) => `edhrec ${pct}%`,
    // Absence on its own line, with no column of figures beside it to give an
    // em dash meaning: a sentence, exactly as suggestion-tile.tsx ships it.
    rowNoFigure: 'no EDHREC figure',
    footer: (n: string, auto: string) => `${n} cards to buy · all ${auto} auto`,
    footerMixed: (n: string, auto: string) =>
      `${n} cards to buy · ${auto} auto`,
    // Expressive moment 2 — a covered collection is a win, and says so.
    emptyCoveredHeading: 'Nothing to buy. Your shelf covered it.',
    emptyCoveredBody: (open: string) =>
      `Every role hit its baseline from cards you already own. The ${open} slots we left open are the fun part.`,
  },

  // ── Surface B · swept back to the commander (expressive moment 3) ─────
  // Branches on whether this deck was ever filled. The shipped first-run copy
  // welcomes a player to a deck they haven't built; reached by deletion it
  // would congratulate them on a demolition.
  sweptEmpty: {
    heading: 'Back to just the commander',
    body: (name: string) =>
      `${name} and 99 empty slots. Everything we suggested is in Consider if you want any of it back — or start typing and build it your way.`,
    cta: 'See what we suggested',
  },
} as const;

// ── NOT OURS — the status pill, named here so it is not re-declared ─────────
//
// The deck status pill (`Draft` / `Building` / `Playable` / `Complete`) is
// shipped and computed from the deck's own counts. It gets NO key in this file:
// a second live value in a second module is the defect the add-panel addendum
// flagged when `strip.hint` was overwritten from two places. Recorded instead
// as a mapping, so R2's "two values for one pill" is answered without a fork:
//
//   state 14 (in-flight, 0 rows committed) → `Draft`     — what the shipped
//     computation already returns for a deck with no cards. Drawn dashed, which
//     is a treatment, not a different string.
//   state 8  (filled, 68 rows)             → `Building`  — likewise computed;
//     68 of 99 is mid-build by the shipped thresholds.
//
// Both values come out of the existing ladder unchanged. If eng finds the
// thresholds disagree with this mapping, the thresholds win and this comment is
// what needs editing — not the pill.

// ── REPLACES — edits inside files this block does not own ───────────────────
//
// CORRECTION (addendum): all three entries below target **hardcoded JSX in
// detail.tsx**, not decks-builder.ts or commanders.ts. R1's engineering notes
// implied a copy-module edit; there is no copy module for this surface yet.
// Eng lifts the three strings out of the component first — into commanders.ts
// or into this block — and that lift is part of the work, not free.
//
// 1. detail.tsx (both widths) — the Role Coverage sub-caption
//    WAS:  'Your owned cards by role'
//    NOW:  recommendationsCopy.coverage.subcaption when figures are present,
//          .subcaptionNoFigures otherwise. The old string survives as the
//          second branch, so this is an addition rather than a deletion.
//
// 2. detail.tsx:~853 (desktop, under Build this deck) — the seed note
//    WAS:  'Your owned pool will seed the deck builder'
//    NOW:  recommendationsCopy.build.seedNote('68')
//    Reason: "seed" described a handoff that did not put a card in the deck.
//    It now does, so the line states the count and the limit.
//
// 3. detail.tsx:~758 (mobile sticky bar) — the sub-line
//    WAS:  '{n} cards in your pool'
//    NOW:  recommendationsCopy.build.stickyPromise('68')
//    Reason: the pool size is on the page twice already (The Pool section
//    header); the promise is not stated anywhere.
//
// Nothing in decks-builder.ts is deleted by this pass. addPanelCopy.undo.*
// stays exactly as it is — the row-level receipt for a single removal is
// unchanged, and auto.swept* is the list-level receipt beside it.
