// Copy for the one-commander-image round. Only strings this round CHANGES —
// everything not listed here is unchanged, including `refreshCopy.status`,
// which already carries the six deck statuses and is not touched.
//
// Three kinds of change:
//   1. CUT   — a string that comes out, with what now says it instead
//   2. LABEL — visible text that becomes an accessible name
//   3. KEEP  — a string I proposed cutting in an earlier round and did not
//
// Product owns the three cuts. None is invented here and each survives
// elsewhere; see README's "Decision 7 — what comes out".

export const commanderImageCopy = {
  /* ── 1 · CUT ─────────────────────────────────────────────────────────── */

  cuts: {
    // hero-commander.tsx — the primary CTA on Home's Ready to build.
    // "No one will want to build the deck automatically w/o seeing the deck
    // first." `seeThePool` takes the filled treatment as the only action.
    heroStartDeck: {
      was: "Start this deck",
      nowSaidBy: "See the pool — promoted to the filled button",
      surface: "hero-commander.tsx",
    },

    // resume-decks.tsx — the row printed a status pill, the commander's name,
    // the count AND a to-buy clause into a 200px line. A 168px cover band
    // shows the commander, so the name is redundant; the count already says
    // how far along, so the clause is too.
    resumeCommanderName: {
      was: "{commanderName}",
      nowSaidBy: "the band's own art",
      surface: "resume-decks.tsx",
    },
    resumeToBuyClause: {
      was: "{owned} owned · {toBuy} to buy",
      nowSaidBy: "{built} / {bodySize} beside the progress bar",
      surface: "resume-decks.tsx",
    },

    // deck-card.tsx — three ways of saying the deck is finished, beside a
    // full green bar that is a fourth. The bar and the count carry it.
    deckCardAllOwned: {
      was: "all owned",
      nowSaidBy: "the progress bar at 100% beside {built} / {bodySize}",
      surface: "deck-card.tsx",
    },
    deckCardLastPlayed: {
      was: "never played",
      nowSaidBy: "nothing — the row it shared is gone",
      surface: "deck-card.tsx",
      note:
        "The only cut with no replacement. If last-played matters it belongs " +
        "in the overflow menu or the deck's own page, not on the tile.",
    },

    // builder-spine.tsx (desktop) — the desktop twin of `all owned`.
    spineDesktopOwnedToBuy: {
      was: "{owned} owned · {toBuy} to buy",
      nowSaidBy: "the progress bar, now inline beside {built} / {bodySize}",
      surface: "spine-desktop.tsx",
      note:
        "NOT cut from the shopping list or the availability roll-up, where the " +
        "same string counts a different thing and stays.",
    },
  },

  /* ── 2 · LABEL ───────────────────────────────────────────────────────── */

  // The `Card details` pill loses its words on every render and every frame.
  // The plate is what makes the control visible against art, which is the job
  // the words were doing — so the words are the redundant part.
  //
  // This makes the accessible name REQUIRED rather than nice: dropping the
  // text removes the only name a screen reader had. It is the one line of the
  // plate spec that is not visual.
  labels: {
    fullCardTrigger: {
      wasVisible: "Card details",
      nowAriaLabel: "Card details",
      surface: "full-card-trigger.tsx",
    },

    // The rename pencil becomes an inline unplated glyph in the title's text
    // run. It never had a visible label, but it is now a bare glyph rather
        // than a plated button, so the name carries more weight.
    renameTrigger: {
      wasVisible: null,
      nowAriaLabel: "Rename deck",
      surface: "spine-mobile.tsx · spine-desktop.tsx",
      note:
        "If the title itself also becomes tappable, it must not duplicate " +
        "this name — one control, one accessible name.",
    },

    // deck-card-overflow.tsx — unchanged copy, listed because the control
    // gains a drawn plate on phone where it had none.
    deckOverflow: {
      wasVisible: null,
      nowAriaLabel: "Deck options",
      surface: "deck-card-overflow.tsx",
      note: "Confirm against the shipped label; this round did not read it.",
    },
  },

  /* ── 3 · KEEP ────────────────────────────────────────────────────────── */

  keeps: {
    // R1 proposed cutting the worded colour from the deck tile and keeping the
    // pips. That was backwards: "Green" beside a green square is the same
    // redundancy one layer down, and the WORD is what survives at 189px.
    // The pips come off instead.
    deckCardColourName: {
      string: "{colourName}",
      surface: "deck-card.tsx",
      instead: "IdentityPips comes off this tile",
    },

    // detail.tsx's rank eyebrow at --fg-body. R6's conflict 2 measured it at
    // 5.06:1 against a 50% dark stop; at labelAt on a 288 band it now sits
    // inside a 73% hold rather than on a rising ramp, so the value it was
    // measured against no longer occurs. The withdrawal of #8FB8E6 stands.
    detailRankEyebrow: {
      string: "RANK {n} · YOUR BEST FIT",
      surface: "detail.tsx",
      instead: "unchanged ink, superseded upward rather than overturned",
    },
  },
} as const;
