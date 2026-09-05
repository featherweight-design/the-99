// Decks builder copy — transcribed verbatim from
// design/design_handoff_the99_richness/The 99 - Surfaces v2.dc.html §Decks.
// The mock's instance is Korvold; the templates below reproduce it exactly
// when passed "Korvold".
//
// Exports are untouched by this pass — "plain text is sacred" (mock, Decks
// deltas). No copy here reaches export-dialog.tsx.

/** The mock names the commander in the short register ("Korvold has a full
 *  deck"), not the full "Korvold, Fae-Cursed King" shown in the builder
 *  header. Everything up to the first comma. */
export function shortCommanderName(name: string): string {
  return name.split(",")[0].trim();
}

export const decksBuilderCopy = {
  completion: {
    heading: "Ninety-nine.",
    caption: (commander: string) =>
      `${commander} has a full deck. Sleeve it up before you change your mind.`,
    primaryCta: "Export decklist",
    secondaryCta: "Back to the deck",
  },
} as const;

// Add panel overhaul (#158) — transcribed from
// design/design_handoff_the99_add_panel/add-panel · copy strings.ts.
// Functions for interpolated strings, no JSX. Counts arrive as raw numbers and
// are branched on for singular/plural below; they are simply never
// locale-formatted. Voice is Kitchen Table — utility copy stays
// straight, and the two expressive moments are marked below.
// The handoff's own `resultCount` sets the singular/plural pattern for this
// block; the count strings below follow it. Applied by eng where the handoff
// pluralised unconditionally — flagged to Design for ratification, since a
// deck of one card reads "1 cards" otherwise.
const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

export const addPanelCopy = {
  // ── Tabs (replaces the Suggestions | Search tab bar) ──────────────────
  tabs: {
    deck: "Your deck",
    consider: "Consider",
    deckAria: (n: number) => `Your deck, ${plural(n, "card", "cards")}`,
    considerAria: (n: number) =>
      `Cards to consider, ${plural(n, "suggestion", "suggestions")}`,
    // No `panelAria`: each tabpanel is named by its tab through
    // aria-labelledby, which wins over aria-label, so a panel-side name would
    // never reach a screen reader.
  },

  // ── Consider toolbar ──────────────────────────────────────────────────
  consider: {
    // Replaces the old "Based on your collection and EDHREC data…" sub-caption.
    // Provenance for the collection; the EDHREC claim now sits on the shelf
    // that actually uses it.
    provenance: (n: number) => `${plural(n, "card", "cards")} you already own`,
    // Used only once the unowned append has put something on the shelves, so
    // the line above never over-claims. Deliberately not the app's `N to buy`
    // (builder-spine.tsx, deck-card.tsx): there it counts cards in this deck
    // you do not own, here it would count suggestions you have not added.
    provenanceWithUnowned: (owned: number, unowned: number) =>
      `${owned} owned · ${unowned} you don’t own`,

    sortLabel: "Sort",
    sortGaps: "Coverage gaps first",
    sortEdhrec: "EDHREC first",
    sortCheapest: "Cheapest first",
    sortAria: "Sort suggestions",

    showAll: (n: number) => `Show all ${n}`,
    showAllAria: (role: string, n: number) =>
      `Show all ${n} ${role} ${n === 1 ? "suggestion" : "suggestions"}`,
    collapse: "Show fewer",
  },

  // ── Coverage strip — the cell is the link (#184) ──────────────────────
  // The separate anchor beneath the cell is gone: a short cell IS the control
  // and this label is a caption inside it. Ten targets become six.
  strip: {
    cellLink: "consider →",
    // The whole cell is the control, so its accessible name carries the
    // figures a sighted user reads off the cell face. Two sentences, no dash —
    // the no-em-dash rule covers aria as much as visible copy.
    // A null `have` is the in-flight cell, whose face draws a dash for the
    // numerator. Announcing "0 of 10" there would be the zero-for-no-data the
    // dash exists to avoid, said in the one channel nobody can see it in.
    cellLinkAria: (role: string, have: number | null, target: number) =>
      have === null
        ? `${role}, count not yet known, target ${target}. See ${role.toLowerCase()} cards to consider.`
        : `${role}, ${have} of ${target}. See ${role.toLowerCase()} cards to consider.`,
    // A cell with no shelf to send anyone to is a figure and not a control.
    // Two cases reach it: the role has met its target, and the role is short
    // but Consider drew it no shelf because nothing owned fills it.
    cellStaticAria: (role: string, have: number | null, target: number) =>
      have === null
        ? `${role}, count not yet known, target ${target}`
        : `${role}, ${have} of ${target}`,
    // One disclosure for the strip instead of five per-cell buttons.
    rationaleToggle: "Why these numbers?",
    rationaleToggleAria: "Show why each role has the target it has",
    rationaleClose: "Hide",
    // The disclosure's four lines, verbatim from the canvas (CV:466-469).
    // Four lines for five roles: Removal and Wipes share line 3 as drawn, so
    // this is four authored groupings rather than a map over RECOMMENDED_MIX.
    // Each body opens with the em dash that joins it to its bold heading; the
    // heading itself is composed from RECOMMENDED_MIX so the panel can never
    // quote a target the cell above it disagrees with. These are the one
    // surface in the addendum that ships em dashes — the rationale copy is
    // quoted, not rewritten, and must not be "fixed".
    rationaleBodies: {
      ramp: "— you want your commander out a turn early, every game.",
      draw: "— a four-player table runs you out of cards before it runs you out of life.",
      removalWipes:
        "— three opponents means three threats you did not plan for.",
      land: "— advisory: a cheap curve wants fewer, a heavy one wants more.",
    },
  },

  // ── Shelf headers ─────────────────────────────────────────────────────
  // The header quotes the same numbers as the coverage cell above it.
  shelf: {
    coverage: (have: number, target: number) => `you have ${have} of ${target}`,
    count: (n: number) => `${n} to consider`,
    // The "Threats & synergy" shelf has no target — decision 7.
    noTarget: "no target · this is the deck’s plan",
    labels: {
      ramp: "Ramp",
      draw: "Draw",
      removal: "Removal",
      wipes: "Wipes",
      land: "Land",
      // Replaces role "other". The `role` value on the payload is unchanged.
      other: "Threats & synergy",
      // The EDHREC-sourced shelf, when suggestions are not coverage-driven.
      edhrec: (commanderShortName: string) =>
        `Top picks for ${commanderShortName}`,
    },
  },

  // ── Suggestion tile ───────────────────────────────────────────────────
  tile: {
    add: "+ Add",
    addAria: (name: string) => `Add ${name} to deck`,
    inDeck: "✓ In deck",
    inDeckAria: (name: string) => `${name} is already in this deck`,
    // The art and the name are both CardDetailTrigger; the modal owns its own
    // aria (cardDetailCopy.triggerAria), so nothing is redeclared here.
    detailHint: "details ↗",
    // Honest omissions — never a 0% bar, never a blank plate.
    noArt: "no art on file",
    noInclusion: "no EDHREC figure",
    // Non-degraded, role-sourced picks (no EDHREC percentage for this card).
    fillsRole: (role: string) => `fills a ${role} slot`,
    inclusion: (pct: string) => `${pct}%`,
    inclusionAria: (pct: string, commanderShortName: string) =>
      `in ${pct}% of ${commanderShortName} decks on EDHREC`,
    // Both figures name their baseline on screen. Without the label a bare
    // `10%` reads as a share of something on this page rather than an EDHREC
    // inclusion rate.
    evidenceLabel: "edhrec",
    lift: (pts: string) => `+${pts} pts vs. all decks`,
  },

  // ── Unowned suggestions ───────────────────────────────────────────────
  // getDeckSuggestions appends up to five unowned EDHREC staples, which used
  // to say so only by the absence of an aria-hidden dot. There is no tile note
  // to go with these: it would restate the tag and the shelf heading in a noun
  // this app does not have. Ownership already has three independent carriers —
  // the tag word, its aria, and the trailing shelf's own heading.
  unowned: {
    tag: "buy",
    tagAria: (name: string) => `${name} is not in your collection`,
    // The trailing shelf's coverage clause. The heading above it is the
    // existing shelf.labels.edhrec, so no new role or taxonomy is introduced.
    shelfCoverage: "not in your collection",
  },

  // The decklist's own empty line, distinct from Shopping's empty state: this
  // one says the deck holds nothing at all, not that nothing is left to buy.
  emptyList: "No cards in this deck.",

  // ── Consider, empty (expressive moment — zero suggestions is a win) ────
  considerEmpty: {
    heading: "We’re out of ideas, and that’s a compliment",
    body: (commanderShortName: string) =>
      `Every card in your collection that fits ${commanderShortName} is already in this deck. Add more to the pile and we’ll have more to say.`,
    cta: "Add to your collection",
  },

  // ── Degraded (straight — a service outage is not a place to be charming) ──
  degraded: {
    heading: "EDHREC isn’t answering right now.",
    body: (commanderShortName: string) =>
      `These are ranked by what your deck is short of, not by what other ${commanderShortName} decks run. The shelves are honest and the percentages are missing.`,
    retry: "Try again",
  },

  // ── Quick add (retrieval) ─────────────────────────────────────────────
  quickAdd: {
    placeholder: "Add a card by name…",
    fieldAria: "Add a card to this deck by name",
    identityNote: (identity: string) => `${identity} only`,
    keyboardHint: "↑↓ to move · ↵ to add · Esc to dismiss",

    resultsAria: "Card search results",
    resultCountWithIdentity: (n: number, identity: string) =>
      `${n === 1 ? "1 match" : `${n} matches`} · ${identity} only`,

    rowAdd: "Add",
    rowAddActive: "↵ add",
    rowInDeck: "✓ In deck",
    rowOwned: (qty: number) => `×${qty} owned`,
    rowNotOwned: "not owned",
    // `availability` is one of the availabilityCopy.marker.*Aria strings, or
    // null. It is prose, not the visual label: the eye reads "none free — in
    // Atraxa", the ear hears "no free copies; this one is on your Atraxa list"
    // — the same reason the diamond glyph is aria-hidden. A free card passes
    // nothing and produces the exact shipped string.
    rowAria: (
      name: string,
      typeLine: string,
      owned: boolean,
      availability?: string | null,
    ) =>
      `${name}, ${typeLine}, ${owned ? "owned" : "not owned"}` +
      (availability ? `, ${availability}` : ""),

    ownedToggle: "Owned only",
    ownedToggleAria: "Show only cards you own",
    ownedFilterOffNote: (n: number) =>
      n === 1
        ? "filter off · 1 result you don’t own"
        : `filter off · ${n} results you don’t own`,

    clear: "Clear search",
  },

  // ── Quick add, no results ─────────────────────────────────────────────
  quickAddEmpty: {
    heading: "Nothing in the pile by that name",
    body: (query: string, commanderShortName: string) =>
      `No card you own matches “${query}” in ${commanderShortName}’s colours.`,
    dropFilter: "Search all cards instead",
    // Shown when the owned filter is already off — then it really is a miss.
    bodyAllCards: (query: string, identity: string) =>
      `No ${identity} card matches “${query}”.`,
  },

  // ── Empty builder ─────────────────────────────────────────────────────
  // Replaces decksBuilderCopy.builderEmpty, which is deleted rather than kept
  // alongside — two copies of the same three strings is the duplicate-surface
  // defect this overhaul exists to stop shipping.
  //
  // 1. `cta: "Open suggestions"` is DELETED. Its only job was opening the
  //    bottom sheet. In the finished shape the Consider tab sits 40px above the
  //    mark with its count on it and the quick-add bar is focusable at the
  //    bottom of the same screen — two live entrances, no button. Both landed
  //    with the shell rewiring, which is what made deleting the string safe:
  //    without them a mobile empty deck would have had no way to add a first
  //    card. builder-empty-entrance.test.tsx pins both entrances.
  // 2. `captionFor` / `captionForMobile` COLLAPSE INTO ONE. The split existed
  //    only because the two widths pointed at different constructs ("on the
  //    right" vs "one tap away"); they now point at the same two. This also
  //    closes the "flagged for Design ratification" note on captionForMobile —
  //    by deletion rather than ratification.
  // 3. `roleHint` is promoted to both widths — mobile spent that vertical
  //    budget on the CTA, and it is the only line telling a first-time builder
  //    what to fill first.
  //
  // "A king with no army." and "eats everything anyway" are locked and
  // verbatim. Only the middle clause changed, and that was direction rather
  // than flavour.
  builderEmpty: {
    heading: "A king with no army.",
    caption: (commander: string) =>
      `Ninety-nine slots, zero filled. Type a name below, or take the ones we’ve already picked out. ${commander} eats everything anyway.`,
    roleHint: "Try filling your ramp, draw, removal, and wipe slots first.",
  },

  // ── Decklist row — remove, at both widths (#179) ──────────────────────
  row: {
    remove: "✕",
    // Addendum C5 / C-N4. Visual only: the name's own button already speaks the
    // card and the ✕'s aria carries the same count in prose, so a screen reader
    // that also read this glyph would say the number twice.
    quantity: (n: number) => `×${n}`,
    removeAria: (name: string) => `Remove ${name}`,
    // A stack of basics decrements rather than unmounting, so the phone label
    // says which of the two is about to happen.
    removeCopyAria: (name: string, quantity: number) =>
      `Remove one copy of ${name}, ${quantity} in deck`,
  },

  // ── Undo (#185) ───────────────────────────────────────────────────────
  // The removed row is replaced in place by this one. No toast, no timer —
  // see decision 5 in design/design_handoff_the99_add_panel/ADDENDUM-README.md.
  undo: {
    removed: (name: string) => `${name} removed`,
    action: "Undo",
    actionAria: (name: string) => `Undo removing ${name}`,
    // Read on the builder's existing live region, after the removal itself.
    announceRemoved: (name: string, built: number) =>
      `${name} removed · ${builtFragment(built)} · undo available`,
    announceUndone: (name: string, built: number) =>
      `${name} back in the deck · ${builtFragment(built)}`,
    // The undo row is the only thing standing between a mis-tap and a lost
    // card, so a failed undo says so where the row is, not in a banner.
    failed: "Couldn’t put that back. Try adding it again.",
  },

  // ── Live region ───────────────────────────────────────────────────────
  // Announces an add, which is otherwise silent: the three numbers it moves —
  // the tile's button, the tab count, a role cell — are all ordinary text
  // elsewhere in the tree. There is no `results` member: the quick-add bar's
  // visible match count is already a `role="status"`, so a second region
  // saying the same thing would double-announce every keystroke.
  announce: {
    added: (
      name: string,
      built: number,
      role: string,
      have: number,
      target: number,
    ) => `${name} added · ${builtFragment(built)} · ${role} ${have} of ${target}`,
    addedNoRole: (name: string, built: number) =>
      `${name} added · ${builtFragment(built)}`,
  },

  // ── /decks/new — the Create button becomes the route's dock (#177) ─────
  // No new string: `Create deck →` keeps its label and its aria. The summary
  // line above it is new, because a docked button covers the selection it is
  // about to act on.
  createPicker: {
    dockSummary: (commander: string, identity: string) =>
      `${commander} · ${identity}`,
    dockSummaryEmpty: "Pick a commander to start",
  },
} as const;

// ── Over the ninety-nine (#280) ─────────────────────────────────────────
// Transcribed from design/design_handoff_the99_amendments/over-99 · copy
// strings.ts. Over is a working state, so the copy never apologises and never
// warns — it states the arithmetic and names the way out.
export const overCopy = {
  // The fifth pill value. One word, like the other four, and it names the
  // deck's state rather than the player's activity.
  pill: "Over",

  figure: {
    // The denominator never becomes the total: 99 is a rule of the format, not
    // a target the deck outgrew. Callers pass both figures pre-formatted.
    over: (built: string) => built,
    denominator: " / 99",
    // A second figure, not a recolour — a lone amber 104 beside a 99 asks the
    // player to do the subtraction.
    delta: (n: string) => `+${n}`,
  },

  // The deck card's line, in the unresolved marker's slot. Terse because it
  // sits in a card the player is scanning past, and the spine says it properly.
  toCut: (n: string) => (n === "1" ? "1 to cut" : `${n} to cut`),

  // The spine's trim line. Three clauses, and the third is load-bearing: it is
  // the sentence that tells a first-time overfiller they have not broken
  // anything. Words, not digits, because the figure above already printed the
  // number twice.
  trim: {
    lead: (words: string) => `${words} over the ninety-nine.`,
    body: (n: string) =>
      n === "1"
        ? "Cut one and it is legal. Building long and trimming back is a normal way to get there."
        : `Cut ${n} and it is legal. Building long and trimming back is a normal way to get there.`,
    // 390px drops the trailing clause — the same shortening RollupBands
    // applies when it stacks two lines.
    bodyShort: (n: string) =>
      n === "1" ? "Cut one and it is legal." : `Cut ${n} and it is legal.`,
    // Spelled out to nineteen, then digits. Deliberately small: past twenty
    // the player has pasted something wholesale and "Thirty-eight" is more
    // precious than useful.
    words: [
      "Zero",
      "One",
      "Two",
      "Three",
      "Four",
      "Five",
      "Six",
      "Seven",
      "Eight",
      "Nine",
      "Ten",
      "Eleven",
      "Twelve",
      "Thirteen",
      "Fourteen",
      "Fifteen",
      "Sixteen",
      "Seventeen",
      "Eighteen",
      "Nineteen",
    ],
  },

  // Stating a fact where the list leaves the app. Not a warning, not a blocker
  // — the player is very likely exporting it in order to cut somewhere else.
  exportNote: (built: string, n: string) =>
    n === "1"
      ? `This list is ${built} cards. One over what a Commander deck can hold.`
      : `This list is ${built} cards. ${n} over what a Commander deck can hold.`,

  aria: {
    // Replaces `${built} of 99 cards built` on the progressbar when over.
    // aria-valuemax moves to Math.max(99, built) in the same edit: a valuenow
    // of 104 against a max of 99 is an invalid range and some readers clamp it
    // to 100%, which is the one reading this amendment exists to stop.
    progress: (built: string, n: string) =>
      n === "1"
        ? `${built} cards, 1 over the 99`
        : `${built} cards, ${n} over the 99`,
  },
} as const;

/** Spelled out to nineteen, digits past it — see `overCopy.trim.words`. */
export function overWord(n: number): string {
  return overCopy.trim.words[n] ?? String(n);
}

/** The count fragment every live region uses to say where the deck stands.
 *  Past 99 it borrows the progressbar's phrasing rather than saying "104 of
 *  99", which is a range a screen reader cannot make sense of — the same
 *  reading the amber bar exists to stop, in the one place the bar is not. */
export function builtFragment(built: number): string {
  if (built <= 99) return `${built} of 99`;
  return overCopy.aria.progress(String(built), String(built - 99));
}
