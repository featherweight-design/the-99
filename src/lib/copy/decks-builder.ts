// Decks builder copy — transcribed verbatim from
// design/design_handoff_the99_richness/The 99 - Surfaces v2.dc.html §Decks.
// The mock's instance is Korvold; the templates below reproduce it exactly
// when passed "Korvold".
//
// The exported *text* is untouched by this pass — "plain text is sacred"
// (mock, Decks deltas). The export dialog's own chrome does draw copy from
// here: see `overCopy.exportNote` and `exportLinkOutCopy`.

// The one number this file does not own: the deck-name limit is the action's
// rule, and a copy of it here would keep naming the old one after a change.
import { DECK_NAME_MAX } from "../decks/deck-name";

/** The mock names the commander in the short register ("Korvold"), not the full
 *  "Korvold, Fae-Cursed King" shown in the builder header. Everything up to the
 *  first comma. */
export function shortCommanderName(name: string): string {
  return name.split(",")[0].trim();
}

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
    // Round 0's word for the second tab. No count: the tab carries a verdict rather than a
    // number of things, and a figure beside it would be read as one of the counts inside.
    analysis: "Analysis",
    consider: "Consider",
    deckAria: (n: number) => `Your deck, ${plural(n, "card", "cards")}`,
    analysisAria: "Analysis of this deck",
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
    sortCheapest: "Cheapest to cast",
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
    // this is four authored groupings rather than a map over the mix.
    // Each body opens with the em dash that joins it to its bold heading; the
    // heading itself is composed from the deck's own mix so the panel can never
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
    // Two adds, one geometry. The owned/unowned difference lives in these
    // words and nowhere in the button's weight: two hairline pills separated
    // by border alpha is a distinction that survives a design review and
    // disappears in a panel of fourteen tiles being skimmed. R3.1 §4.
    add: "Add",
    addAria: (name: string) => `Add ${name} to the deck`,
    addUnowned: "Add · to buy",
    // Names the To buy list rather than trailing off in "to buy": the visible
    // label can lean on the status vocabulary around it for that noun, and a
    // screen reader has none of it. No em dash either — this surface's copy
    // bans one, and Design's draft used one to join the clauses.
    addUnownedAria: (name: string) =>
      `Add ${name} to the deck, and to your To buy list, because you do not own it`,
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
  // getDeckSuggestions appends up to six unowned EDHREC staples, which used
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
      `Every card in your collection that fits ${commanderShortName} is already in this deck.`,
    // The second sentence this body used to carry ("Add more to the pile and
    // we'll have more to say") was the CTA rendered directly beneath it, said
    // twice — and a second joke under a heading that already made one.
    cta: "Add to your collection",
  },

  // ── Degraded (straight — a service outage is not a place to be charming) ──
  degraded: {
    heading: "EDHREC isn’t answering right now.",
    body: (commanderShortName: string) =>
      `These are ranked by what your deck is short of, not by what other ${commanderShortName} decks run. The percentages are missing until it answers.`,
    retry: "Try again",
  },

  // ── Quick add (retrieval) ─────────────────────────────────────────────
  quickAdd: {
    // The identity rides in the field rather than under it. The bar used to
    // carry a standing `{identity} only` line while idle — a note that said the
    // same thing on every visit, in a slot the eye had to learn to ignore. It
    // is the field's own constraint, so it is written where the player is about
    // to type, and the count below repeats it only while a search is landing
    // and the placeholder is gone.
    placeholder: (identity: string) => `Add a card by name · ${identity} only`,
    fieldAria: (identity: string) => `Add a card to this deck by name, ${identity} only`,
    keyboardHint: "↑↓ to move · ↵ to add · Esc to dismiss",

    resultsAria: "Card search results",
    resultCountWithIdentity: (n: number, identity: string) =>
      `${n === 1 ? "1 match" : `${n} matches`} · ${identity} only`,

    rowAdd: "Add",
    rowAddActive: "↵ add",
    rowInDeck: "✓ In deck",
    rowOwned: (qty: number) => `×${qty} owned`,
    // The phone row's short form, used ONLY on a row that also carries a combo partner: that
    // line holds the type, the count and the partner at 390px, and the word is what gives.
    // Ruled by Hugh 2026-09-22 (quick-add combo row, option E). Every other row keeps `rowOwned`.
    rowOwnedShort: (qty: number) => `×${qty}`,
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

    // A row found by the name printed on a Secret Lair card is titled with the card's
    // oracle name, which is not what the player typed. Prefixed rather than bare: the
    // meta line already holds a type line, and a second name with no gloss reads as one.
    rowFlavorNamePrefix: "printed as ",

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
  // Replaces the builder's earlier empty-state strings, which were deleted
  // rather than kept alongside — two copies of the same three strings is the
  // duplicate-surface defect this overhaul exists to stop shipping.
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
    announceRemoved: (name: string, built: number, bodySize: number) =>
      `${name} removed · ${builtFragment(built, bodySize)} · undo available`,
    announceUndone: (name: string, built: number, bodySize: number) =>
      `${name} back in the deck · ${builtFragment(built, bodySize)}`,
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
      bodySize: number,
    ) =>
      `${name} added · ${builtFragment(built, bodySize)} · ${role} ${have} of ${target}`,
    addedNoRole: (name: string, built: number, bodySize: number) =>
      `${name} added · ${builtFragment(built, bodySize)}`,
  },

  // ── /decks/new — the Create button becomes the route's dock (#177) ─────
  // No new string: `Create deck →` keeps its label and its aria. The summary
  // line above it is new, because a docked button covers the selection it is
  // about to act on.
  createPicker: {
    dockSummary: (commander: string, identity: string) =>
      `${commander} · ${identity}`,
    dockSummaryEmpty: "Pick a commander to start",

    // EXTRACTED 2026-09-19. These shipped inline in `create-picker.tsx`, which
    // Design flagged while drawing the `new-deck` About entry: that entry's
    // figure mounts the picker, so a rename in the component would have moved
    // the page silently and the copy pass would never have seen these strings.
    //
    // The two titles are one control at two widths, not two strings with the
    // same job: the phone names the ACT because the page arrives with no
    // context around it, and desktop names the destination because the rail
    // beside it already says where you are.
    titlePhone: "Pick a commander",
    titleDesktop: "New deck",
    sub: "Choose a commander from your collection.",
    searchPlaceholder: "Search commanders…",
    namePlaceholder: "Deck name…",
    selectedLabel: "Selected",
    submit: "Create deck →",
    submitPending: "Creating…",
    failed: "Failed to create deck. Try again.",
  },
} as const;

// ── Over the ninety-nine (#280) ─────────────────────────────────────────
// Transcribed from design/design_handoff_the99_amendments/over-99 · copy
// strings.ts. Over is a working state, so the copy never apologises and never
// warns — it states the arithmetic and names the way out.
export const overCopy = {
  figure: {
    // The denominator is the deck's body, never its total: a deck is 100 cards
    // including its commanders, so a single reads 99 and a pair reads 98. What
    // it must never become is the count of cards the deck happens to hold.
    // Callers pass both figures pre-formatted.
    denominator: (bodySize: number) => ` / ${bodySize}`,
    // A second figure, not a recolour — a lone amber 104 beside a 99 asks the
    // player to do the subtraction.
    delta: (n: string) => `+${n}`,
  },

  // The spine's trim line. Words, not digits, because the figure above already
  // printed the number twice.
  //
  // ONE body at both widths. The drawn version carried a third clause
  // ("Building long and trimming back is a normal way to get there") that said
  // nothing about this deck, and the phone dropped it — so the phone's line was
  // already the whole message.
  trim: {
    lead: (words: string) => `${words} over the ninety-nine.`,
    // Words in both halves, for the same reason the lead spells its number.
    // "Five over the ninety-nine. Cut 5 and it is legal." changed register
    // mid-paragraph, and the singular already spelled itself, so the sentence
    // disagreed with itself at every count but one.
    body: (words: string) => `Cut ${words.toLowerCase()} and it is legal.`,
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
  // `total` is the whole list, commander included — the same figure the preview
  // header prints — while `n` is measured off the ninety-nine. Both are true of
  // the same list: a Commander deck holds a hundred cards.
  exportNote: (total: string, n: string) =>
    n === "1"
      ? `This list is ${total} cards. One over what a Commander deck can hold.`
      : `This list is ${total} cards. ${n} over what a Commander deck can hold.`,

  aria: {
    // Replaces `${built} of ${bodySize} cards built` on the progressbar when
    // over. aria-valuemax moves to Math.max(bodySize, built) in the same edit:
    // a valuenow of 104 against a max of 99 is an invalid range and some
    // readers clamp it to 100%, which is the one reading this amendment exists
    // to stop.
    //
    // `bodySize` rather than a literal 99 because a Partner deck's body is 98,
    // and a reader hearing "over the 99" beside a visible `/ 98` is being told
    // the deck is one card further from legal than it is.
    progress: (built: string, n: string, bodySize: number) =>
      n === "1"
        ? `${built} cards, 1 over the ${bodySize}`
        : `${built} cards, ${n} over the ${bodySize}`,
  },
} as const;

/** Spelled out to nineteen, digits past it — see `overCopy.trim.words`. */
export function overWord(n: number): string {
  return overCopy.trim.words[n] ?? String(n);
}

/** The count fragment every live region uses to say where the deck stands.
 *  Past the body size it borrows the progressbar's phrasing rather than saying
 *  "104 of 99", which is a range a screen reader cannot make sense of — the
 *  same reading the amber bar exists to stop, in the one place the bar is not.
 *
 *  `bodySize` is the deck's body, so a Partner deck reads "of 98" and crosses
 *  over at 98 — the same figure the visible denominator prints. */
export function builtFragment(built: number, bodySize: number): string {
  if (built <= bodySize) return `${built} of ${bodySize}`;
  return overCopy.aria.progress(
    String(built),
    String(built - bodySize),
    bodySize,
  );
}

/** Export dialog, Shopping tab, and the price strip under the Shopping filter.
 *  "these" is the list rendered above the link on both surfaces, so it never
 *  reads as an offer to buy the whole deck — and since both surfaces now render
 *  the same list, one string across both is right rather than duplicated. */
/**
 * The export dialog's two tabs. Here rather than as literals in the dialog
 * because a second reader appeared — the /about figure documenting this
 * control — and two literals in two files is how a figure goes stale on a
 * rename while every test passes.
 */
/**
 * The deck header's own two controls. Both were literals in their components —
 * `Export` in `spine-desktop.tsx`, `Card details` in `full-card-trigger.tsx` —
 * until the About page needed to draw the header and would otherwise have
 * retyped them. Same split the collection's search placeholder needed.
 */
export const deckHeaderCopy = {
  export: "Export",
  cardDetails: "Card details",
} as const;

export const exportTabCopy = { decklist: "Decklist", shopping: "Shopping list" } as const;

export const exportLinkOutCopy = {
  shopping: "Buy these at Mana Pool",
} as const;

/** The Shopping tab's count meta. It read `unowned` while that tab composed its
 *  own `!owned` list. The tab now renders the Shopping filter's list, which
 *  holds owned cards that are spoken for elsewhere, so `unowned` would be a
 *  claim about every row that is false for some of them. */
export const exportShoppingCopy = {
  countMeta: (copies: number) => `${copies} cards · to buy`,
} as const;

/** Deck rename. The hint is the one string that names both keys, so it is set
    in mono at the same tracking as the rest of the spine's instrument type. */
export const renameCopy = {
  // Named, not bare: the deck header is reachable from list contexts, so a
  // screen-reader user tabbing to this needs to know which deck it renames.
  triggerAria: (name: string) => `Rename deck: ${name}`,
  fieldAria: "Deck name",
  hint: "↵ save · esc cancel",
  save: "Save",
  saving: "Saving…",
  retry: "Retry",
  cancel: "Cancel",
  errorLength: `A deck name is 1–${DECK_NAME_MAX} characters.`,
  errorControl: "That name can’t contain control characters.",
  errorFailed: "That didn’t save. Try again.",
} as const;
