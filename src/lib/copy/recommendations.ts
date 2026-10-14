// src/lib/copy/recommendations.ts — #130 · #131.
// Shape follows src/lib/copy/decks-builder.ts and shell.ts: flat const object,
// functions for interpolated strings, no JSX, no number formatting (callers
// pass pre-formatted strings). Voice: Kitchen Table — utility copy stays
// straight; the three expressive moments are marked.
//
// Existing strings this block does NOT touch, and must not duplicate:
//   detail.tsx:330      `No {role} cards in your pool`
//   mix.ts               mixSourceLine() — derived per deck now, so it states what it
//                        is measured against rather than asserting EDHREC
//   card-detail-provider.tsx  cardDetailCopy.triggerAria
//   buy-tag / addPanelCopy.unowned.tag  `buy`

/** The noun every spoken-for clause counts, agreeing with its own figure.
 *  Callers pass pre-formatted strings, so the test is on the string. */
function secondCopies(n: string): string {
  return n === '1' ? 'second copy' : 'second copies';
}

/** Same shape as `plural` in decks-builder.ts and top-off.ts. The auto-card
 *  family below counts a set that is routinely one card, and every one of its
 *  strings pluralised unconditionally: "1 cards are yours now". */
const plural = (n: string, one: string, many: string) =>
  `${n} ${n === '1' ? one : many}`;

export const recommendationsCopy = {
  // ── Surface A · Role Coverage ─────────────────────────────────────────
  coverage: {
    /** The section's head. */
    title: 'Role Coverage',
    /** A role in a sentence ("No ramp cards in your pool"); the headings use `ROLE_SUBJECTS`. */
    roleNoun: { ramp: 'ramp', draw: 'draw', removal: 'removal', wipes: 'board wipe' } as const,
    owned: (count: number) => `${count} owned`,
    emptyPool: (noun: string) => `No ${noun} cards in your pool`,
    // A role group's head: what the reader owns against the role's target. MEASURED is what
    // this commander's decks run (its own figure, or its color bucket's), rounded to whole
    // cards the way the fit score rounds it; FLAT is the per-role baseline we fall back to
    // when no figure exists. A measured target of 0 says so and is never "short": its decks
    // run none of that role, so a reader owning none is not missing anything.
    gap: (count: number, target: number, measured: boolean): string => {
      if (measured && target <= 0) return 'Its decks run none';
      const of = measured ? `the ${target} its decks run` : `the ${target}-source baseline`;
      if (count > target) return `Well past ${of}`;
      if (count === target) return `At ${of}`;
      return measured ? `${target - count} short of ${of}` : `${target - count} short of baseline`;
    },

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
    // The phone drops "for this card": the row it explains is directly above,
    // and the line has a full-width row to live in, not a wrap of chips.
    chipNoFigureLegendMobile: '— = no EDHREC figure',

    // Disclosure. Desktop rests on the count; the phone names the action,
    // because a 44px row with "+22 more" in it does not read as a control.
    moreChips: (n: string) => `+${n} more`,
    showAll: (n: string) => `Show all ${n}`,
    showAllAria: (n: string, role: string) => `Show all ${n} ${role} cards`,
    // Expansion stops at 40, so a role holding more than that cannot show all
    // of them however the visible label reads. A sighted reader sees the
    // "+N more not shown" line the moment the panel opens; a screen reader
    // would only hear the promise, so it hears the real number instead.
    showCappedAria: (shown: string, total: string, role: string) =>
      `Show ${shown} of ${total} ${role} cards`,
    showFewer: 'Show fewer',
    // Four role panels each carry this control, and a screen reader lists them
    // together — four buttons all named "Show fewer" name nothing. The visible
    // label stays short because its panel is right there on screen.
    showFewerAria: (role: string) => `Show fewer ${role} cards`,
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
    // `We’ll fill 68 of the 99` until the fill stopped at the role floors and the mana base.
    // It now continues to the body through its synergy residual, so the old sentence
    // under-promised by 31 cards and its `The rest is yours` named a remainder that no longer
    // exists.
    //
    // NO FIGURE, AND A CONDITION. `planFill` stops when its candidate pool is exhausted, and
    // that pool is the owned collection plus at most a hundred EDHREC staples — so a small
    // collection or a degraded EDHREC read leaves the deck short, and an unconditional "all 99"
    // is a promise the action cannot keep. "As far as your collection reaches" is the same
    // condition the build contract already states.
    stickyPromise: "We’ll build the whole 99, as far as your collection reaches",
    // Replaces detail.tsx's desktop seed note "Your owned pool will seed the
    // deck builder", which describes a seeding that no longer happens.
    seedNote:
      "We’ll build the whole 99, as far as your collection reaches. Anything we add is yours to clear.",
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
    // Locked (L3): `clearAll(n)` counts only the copies a sweep can take, auto less locked auto,
    // and this is the name when some stay. Both figures count COPIES (audit T3).
    clearAllAriaLocked: (n: string, locked: string) =>
      `Clear all ${n} untouched auto cards. ${plural(locked, 'locked one stays', 'locked ones stay')}.`,
    // The bulk keep, left of the sweep so the cluster reads from the safe
    // answer to the destructive one. Same words as the re-import diff's own
    // `keepAll` and a deliberately separate key: there it rescues removals,
    // here it accepts the fill's picks.
    keepAll: (n: string) => `Keep all ${n}`,
    // The phone drops "all" — the 390px toolbar already carries four pills and
    // the sweep. `clearAllMobile` is not reworded to match.
    keepAllMobile: (n: string) => `Keep ${n}`,
    // Says "auto cards" out loud, the way clearAllAria does: the visible
    // label's noun is carried by the tags on screen, and a reader has none.
    // Not pluralised: the aria-label has to open with the visible label, which
    // reads "Keep all 1", or voice control cannot match the control by name.
    keepAllAria: (n: string) => `Keep all ${n} auto cards in this deck`,
    // One message per settle, into the live region that carries sweptAnnounce.
    // Its second clause is keptNote's sentence, so the spoken receipt and the
    // written one agree word for word. Deck size did not change, so it is not
    // quoted here — that would imply it had.
    keptAllAnnounce: (kept: string, yours: string) =>
      `${plural(kept, 'card', 'cards')} kept. ${plural(yours, 'card is', 'cards are')} yours now.`,
    // Never "the deck is unchanged" — that is sweepFailed's sentence. Here the
    // deck is also unchanged, which is why saying so would be useless: what the
    // player needs to know is that the tags are back.
    keepAllFailed: 'We couldn’t keep those. They are still marked auto.',
    // The inline confirm. A keep cannot be undone — the inverse would write
    // `auto = true` back across forty rows — so it asks first, while the sweep
    // beside it ships a receipt instead. Confirm where there is no undo,
    // receipt where there is. It names what is actually lost in the words the
    // ledger's own header uses, never "the ledger", which appears nowhere on
    // screen.
    keepAllConfirm: (count: string) =>
      `Keep all ${count}? You'll lose the record of where they came from.`,
    // Phone shortens rather than wrapping to three lines in a toolbar. "The
    // record" alone, because the full phrase has just been established by the
    // ledger sitting a few rows up the same page.
    keepAllConfirmMobile: (count: string) => `Keep all ${count}? The record goes too.`,
    // "Keep them" rather than repeating "Keep all N": the count is in the
    // question one element away, and an answer that restates the question reads
    // as a second trigger rather than a confirmation.
    keepAllConfirmYes: 'Keep them',
    keepAllConfirmNo: 'Cancel',
    // Beside the sweep once some cards have been kept.
    keptNote: (n: string) => `${plural(n, 'card is', 'cards are')} yours now`,
    // One receipt for the whole sweep — not one per row. Lifetime is decklist
    // state, per PR #204.
    swept: (n: string) => `${plural(n, 'auto card', 'auto cards')} removed`,
    // The receipt's second clause when locked auto cards stayed (L3), in copies (T3). No clause
    // at zero.
    sweptLeftLocked: (n: string) => plural(n, 'locked card stayed', 'locked cards stayed'),
    sweptUndo: 'Undo',
    sweptUndoAria: (n: string) => `Put all ${n} auto cards back`,
    // The single live-region message. One, never one per row. `built` arrives
    // pre-formatted from `builtFragment`, which past the limit reads "104
    // cards, 5 over the 99" rather than the range "104 of 99", which a screen
    // reader cannot make sense of.
    sweptAnnounce: (removed: string, built: string) =>
      `${removed} auto cards removed. ${built}.`,
    // The same message when locked auto cards stayed (L3).
    sweptAnnounceLocked: (removed: string, locked: string, built: string) =>
      `${removed} auto cards removed. ${plural(locked, 'locked card stayed', 'locked cards stayed')}. ${built}.`,
    // Undo's counterpart. Accepting Undo unmounts the receipt, so without this
    // a screen reader hears the removal announced and the reversal not at all.
    sweptRestoredAnnounce: (restored: string, built: string) =>
      `${restored} auto cards put back. ${built}.`,
    sweepFailed: 'We couldn’t clear those. The deck is unchanged.',
    // Undo's refusal. The sweep already succeeded, so the deck is *not*
    // unchanged — saying so would send the player looking for cards that are
    // genuinely gone. The receipt stays up, so the line points back at it.
    restoreFailed: 'We couldn’t put those back. They are still out of the deck.',
    // `useDeckMutation` needs a message for a rejected keep. An empty one leaves
    // the refusal silent and the card still counted as the fill's.
    keepFailed: 'We couldn’t keep that one. It is still marked auto.',
  },

  // ── Surface B · the arrival (expressive moment 1) ─────────────────────
  // The six provenance* sentences that stood here stated one deck-wide total
  // for the whole fill. #359 needs each pass named and reversible on its own,
  // so `topOffCopy.ledger` replaced them; the shortfall wording they carried
  // lives on in `synergyCopy.lastSlots.short`. That includes the full-fill pair
  // added by #462, whose "The other 0 are yours" defect the ledger cannot have:
  // it states per-pass counts and never hands back a remainder.
  fill: {
    // In-flight (state 14). One announcement on settle, never per row.
    filling: (n: string) => `Filling ${n} of 99…`,
    filledAnnounce: (filled: string, bought: string) =>
      `Deck filled. ${filled} of 99, ${bought} to buy.`,
    // State 15 — the deck exists, the fill did not land.
    failedHeading: 'The deck is here, the cards aren’t.',
    // "the slots are empty" was the heading's second clause said again, plainly.
    failedBody: 'We made the deck but couldn’t fill it. Nothing is lost.',
    failedRetry: 'Try filling again',
    failedRetryAria: 'Try filling this deck again',
  },

  // ── Surface B · Shopping filled by the fill ───────────────────────────
  shopping: {
    intro: (n: string) =>
      `${n} cards we reached past your collection for, to get each role to its baseline.`,
    // This surface was drawn for a list the fill produced, and the intro above
    // says so. A deck built by hand, or one the player has added unowned cards
    // to on top of the fill, holds rows nobody reached past the collection for
    // — so the list states its size and claims nothing about where the cards
    // came from. The group headings keep their gap clause either way: "closes
    // 7→10" is arithmetic about the deck, true whoever put the card on the list.
    introUnfilled: (n: string) =>
      `${n} cards this deck wants that your collection does not have.`,
    // Role group heading clause. The arithmetic the group closes, stated once.
    groupGap: (n: string, from: string, to: string) =>
      `${n} · closes ${from}→${to}`,
    // The phone Shopping row carries the figure on a meta line under the name,
    // out of the pill that used to give it context — so it is prefixed.
    // Addendum A2. The All view's row keeps 44px and prints no figure.
    rowFigure: (pct: string) => `edhrec ${pct}%`,
    // Desktop inline figure: no prefix because the percentage sits on the same
    // line as the name — its position gives it context. Phone needs the prefix
    // because the meta line is detached from the name, so "24%" alone would be
    // ambiguous. Two keys because the two widths have different needs.
    rowFigureDesktop: (pct: string) => `${pct}%`,
    // Absence on its own line, with no column of figures beside it to give an
    // em dash meaning: a sentence, exactly as suggestion-tile.tsx ships it.
    rowNoFigure: 'no EDHREC figure',
    // Desktop absence: an em dash reads fine inline because the name is beside
    // it; a full sentence there would be visually heavy on a 34px row.
    rowNoFigureDesktop: '—',
    // The trip, and not where the cards came from. The auto clause went with the Shopping row's
    // auto tag (Hugh, 2026-09-28): nothing on this list marks a card auto any more, so a count of
    // them would name a mark the reader cannot find.
    footer: (n: string) => `${plural(n, 'card', 'cards')} to buy`,
    // Expressive moment 2 — a covered collection is a win, and says so.
    // Shown only when the deck was actually filled (deck.filled === true); an
    // unfilled deck that happens to own everything it lists gets emptyUncovered
    // instead — congratulating a fill that never ran would be wrong.
    emptyCoveredHeading: 'Nothing to buy. Your collection covered it.',
    emptyCoveredBody: (open: string) =>
      `Every role hit its baseline from cards you already own. The ${open} slots we left open are the fun part.`,
    // The unfilled deck's zero-shopping state: no compliment, just a neutral
    // observation. Matches the original shipped string before the fill branch
    // was added.
    emptyUncovered: 'No cards to buy.',

    // ── Amendment 5 (#281) — a card you own but cannot spare ──────────────
    // "spare" is the player's word for `free` in the one place `free` cannot be
    // said: `free` is a property of a copy, and here we speak of the player's
    // ability to sleeve one. If availability ever renames `free`, this travels
    // with it.
    //
    // Every string below is reached only when something on the list is `over`.
    // At zero contested cards the strings above render byte-for-byte as they
    // ship — that is the assertion the amendment's safety rests on.

    // The tag on a contested row draws the same `buy` as every other row — the
    // trip to the shop is the same trip, and which kind of trip it is is
    // already carried twice, by the `Spoken for` heading above and the marker
    // beside it. Only the spoken form differs, because a reader can reach the
    // row without either of those in earshot.
    rowSecondCopyTagAria: 'a second copy to buy',

    // The group, pinned after `Other`. Its clause slot says why there is no
    // arithmetic: the card is already inside the role's own baseline, so buying
    // a second copy closes nothing.
    spokenForGroupLabel: 'Spoken for',
    // The group an unowned or spoken-for commander heads the list in (H28), above every role or
    // type section. It carries no clause: a commander closes no role's gap.
    commanderGroupLabel: (n: number) => (n > 1 ? 'Commanders' : 'Commander'),
    spokenForGroupClause: (n: string) => `${n} · already in the deck`,

    // "can’t cover" rather than "does not have": the collection does have these
    // cards. What it cannot do is cover two lists with one copy.
    introSplit: (n: string, missing: string, spokenFor: string) =>
      `${n} cards this deck wants that your collection can’t cover: ${missing} you don’t own, and ${
        spokenFor === '1' ? '1 you own but can’t spare' : `${spokenFor} you own but can’t spare`
      }.`,
    // Nothing unowned, something contested. A sentence of its own rather than
    // the split one with a zero in it: "0 you don't own" is a clause about
    // nothing.
    introOnlySpokenFor: (n: string) =>
      n === '1'
        ? 'One card here is already yours, and already sleeved into a committed deck. A second copy is the only way to have both.'
        : `${n} cards here are already yours, and already sleeved into committed decks. A second copy of each is the only way to have both.`,

    // The leading figure stops being "cards to buy" the moment the list holds
    // two kinds of purchase, so it becomes the plain size of the list.
    // The middle clause agrees with its own count — `2 a 2nd copy` is not a
    // phrase — and borrows `footerOnlySpokenFor`'s spelled-out noun rather than
    // the plate's `2nd`, which cannot take a plural without reading as a date.
    footerSplit: (n: string, missing: string, spokenFor: string) =>
      `${n} cards · ${missing} to buy · ${spokenFor} ${secondCopies(spokenFor)}`,
    // Nothing unowned. `{n} cards to buy` would be wrong about all of them.
    footerOnlySpokenFor: (n: string) =>
      `${n} ${secondCopies(n)} · already in the deck`,

    // The over-committed band's one new control, in the builder only — the deck
    // card on /decks has no Shopping list to open, so it takes no link.
    summaryLink: 'See them in Shopping',
    summaryLinkAria: (n: string) =>
      n === '1'
        ? 'Show the 1 spoken-for card in the Shopping list'
        : `Show the ${n} spoken-for cards in the Shopping list`,
  },

  // ── Surface B · swept back to the commander (expressive moment 3) ─────
  // Branches on whether this deck was ever filled. The shipped first-run copy
  // welcomes a player to a deck they haven't built; reached by deletion it
  // would congratulate them on a demolition.
  sweptEmpty: {
    heading: 'Back to just the commander',
    body: (name: string) =>
      `${name} and 99 empty slots. Everything we suggested is in Consider if you want any of it back, or start typing and build it your way.`,
    cta: 'See what we suggested',
  },
} as const;

// ── NOT OURS — the status pill, named here so it is not re-declared ─────────
//
// The deck status pill (`Draft` / `Building` / `Over` / `Unresolved` /
// `To buy` / `Complete`, enumerated in `lib/decks/status.ts`) is shipped and
// computed from the deck's own counts. It gets NO key in this file:
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
