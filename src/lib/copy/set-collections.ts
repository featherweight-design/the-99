// Production strings for /collection/sets and /collection/sets/[code].
// Three blocks: setsIndexCopy, setPageCopy, and setFilterCopy shared by both.
//
// Conventions carried from lib/copy/lanes.ts and copy/availability.ts:
//   - figures are interpolated, never baked into a sentence fragment
//   - every plural has an explicit singular
//   - nothing here names an internal noun (no "base_set_size", no "booster")

// Hoisted so the chip labels can reach it from inside the same object literal. A chip is a
// control and takes Title Case, and so do the panel's rows since H13: the trigger counts
// rather than naming a value, so the lowercase value form it once needed has no reader.
import { chassisCopy } from "./filter-chassis";
import { filterCopy } from "./lanes";

const setFilterCopyRarityOptions = {
  common: "Common", uncommon: "Uncommon", rare: "Rare", mythic: "Mythic",
} as const;

/** Hoisted so the chip label reads the control's own words rather than a second copy. */
const setFilterCopyMissingOnly = {
  label: "Missing only",
  // The phone row has two controls and no room for three words.
  short: "Missing",
  ariaOn: "Showing only cards you do not own",
  ariaOff: "Showing every card in the set",
} as const;

const setFilterCopyRarity = {
  label: "Rarity",
  options: setFilterCopyRarityOptions,
} as const;

export const setFilterCopy = {
  // The colour filter's own strings ship with the component it is mounted from
  // (components/ui/colour-pips.tsx) and are deliberately not redeclared here — a
  // second copy of a label is a second thing to keep in step.
  rarity: setFilterCopyRarity,
  label: "Filters",
  // The name search (addendum R2 §29). The SET is in the accessible name and not in the
  // placeholder: /collection/sets' own field says "Find any set" in the same skin one tap
  // away, and a screen-reader user has no other way to tell which population they are in.
  search: {
    placeholder: "Find a card in this set",
    // Phone. The slot is 173px on the persistent row and the long form does not fit it;
    // the set stays in the accessible name, which is unchanged at both widths.
    placeholderShort: "Find a card",
    ariaLabel: (set: string) => `Search cards in ${set}`,
    clear: "Clear the search",
  },
  missingOnly: setFilterCopyMissingOnly,
  sheetPrimary: (n: number) => (n === 1 ? "Show 1 card" : `Show ${n} cards`),
  // DIMENSIONS only — never missing-only, which sits on the row beside the badge where the
  // reader can already see it. A badge counting a control visible next to it is the same
  // fact twice, and it made `Filters 1` appear with nothing behind `Filters`.
  countBadgeAria: (n: number) => (n === 1 ? "1 filter on" : `${n} filters on`),

  // The chip line (addendum R2 §28). Dimension order, never click order.
  // Every field here READS its canonical source rather than restating it. Four routes share
  // this chip line, and a second copy of a label is what leaves one of them on the old
  // wording after a change — the same reason the chip's markup and its type are the
  // chassis's own.
  chip: {
    // One lit pip is named; past one it collapses to a count. Never one chip per hue —
    // five chips for a five-colour filter is a line that says less than the pips do.
    colourOne: (name: string) => name,
    colour: chassisCopy.colour.collapsed,
    rarity: (r: "common" | "uncommon" | "rare" | "mythic") =>
      setFilterCopyRarityOptions[r],
    // The commander rack's modifier chip, read from where that control's words live.
    match: filterCopy.match.exactlyShort,
    missingOnly: setFilterCopyMissingOnly.label,
  },
  // `Clear all filters` and `No filters on` are the chassis's, reused rather than restated:
  // the addendum's own note says to take them from the chassis once it lands, and it has.
  // Only the accessible name is this page's, because the chassis's names a sort this page
  // does not have.
  // It clears the three dimensions AND the query. Sort is the chassis's exclusion because
  // sort does not narrow; a search does, and a Clear that left it on would leave the reader
  // looking at four cells under a control that claimed to clear everything. The field's own
  // × stays scoped to the field.
  //
  // CONTAINS the visible label, which is the chassis's `Clear all filters` — a voice-control
  // user says what they can see (WCAG 2.5.3), so this extends that phrase rather than
  // replacing it with a synonym the button does not show.
  clearAllAria: "Clear all filters and the search",
  // Row 2 at rest, when a QUERY is the only thing narrowing. The chassis's `No filters on`
  // would be a contradiction there: the field IS on, the result line says so, and the chip
  // line has no chip for it because the field is visible on the row above.
  noOtherFilters: "No other filters on",

  // The rarity panel. `FilterPanel` mounted, never forked (§28's named dependency).
  rarityPanel: {
    triggerLabel: setFilterCopyRarity.label,
    // Counts, as `/collection`'s Type does (H13: rarity matches that control fully). Multi-
    // select retired the `Rarity · all` / `Rarity · uncommon` pair: past one value a name
    // has nowhere to go, and a counting trigger holds one width from nothing to four. The
    // names live in the chip row. Queued for /copy-review.
    triggerCount: (n: number) => (n <= 1 ? `Rarity ${n}` : `Rarities ${n}`),
    triggerAriaCollapsed: "Filter by rarity, collapsed",
    triggerAriaWithSelection: (n: number) => `Filter by rarity, ${n} selected, collapsed`,
    panelAriaLabel: "Filter by rarity",
    sheetTitle: "Rarity",
    // Inert: four values have nothing to search, so the panel is mounted with
    // `searchable={false}` and never renders these. Present because the shape demands
    // them, exactly as the shipped `type` and `availability` blocks carry them.
    searchPlaceholder: "Search rarities",
    searchAriaLabel: "Search rarities",
    clearSearch: "Clear search",
    groupDefault: "All rarities",
    groupSelected: (n: number) => `Selected · ${n}`,
    groupMatches: (n: number) => (n === 1 ? "1 match" : `${n} matches`),
    // Through the same `en-US` formatter the rest of the filter-panel copy uses: the
    // visible count renders `1,234` while a bare interpolation announced `1234 cells`.
    optionAria: (name: string, count: number) =>
      `${name}, ${count === 1 ? "1 cell" : `${count.toLocaleString("en-US")} cells`}`,
    optionAriaUnavailable: (name: string) => `${name}, no cells match your other filters`,
    // Numbers since the chassis's own change: `FilterPanelCopy` formats them itself now.
    footerTotal: (total: number) => `${total} rarities`,
    footerSelected: (n: number, total: number) => `${n} of ${total} on`,
    clear: "Clear rarity",
    done: "Done",
    closeLabel: "Close",
    emptyTitle: "No rarities to show",
    emptyBody: (query: string) => ({ before: "No rarity matches ", query: `“${query}”`, after: "." }),
    announceMatches: (n: number, query: string) =>
      n === 0 ? `No rarities match ${query}` : `${n} ${n === 1 ? "rarity matches" : "rarities match"} ${query}`,
    announceAdded: (name: string, _n: number, shown: number, total: number) =>
      `${name} on. ${shown} of ${total} cells shown.`,
    announceRemoved: (name: string, _n: number, shown: number, total: number) =>
      `${name} off. ${shown} of ${total} cells shown.`,
    announceCleared: (total: number) => `Rarity filter cleared. ${total} cells shown.`,
  },
} as const;

export const setsIndexCopy = {
  title: "Your sets",
  subtitle: (n: number) =>
    n === 1
      ? "1 set you hold cards in. Completion counts the base numbered run."
      : `${n} sets you hold cards in, newest first. Completion counts the base numbered run.`,

  search: {
    placeholder: "Find any set",
    ariaLabel: "Search every collectible set",
    clear: "Clear the search",
    // A request in flight is not an answer, and the no-match line used to stand in for it.
    pending: "Looking…",
  },

  // At rest.
  // The locale is pinned: an unpinned toLocaleString formats differently in the browser
  // than in the server runtime, and a four-figure count would hydrate mismatched.
  restLine: (sets: number, cards: number) =>
    `${sets === 1 ? "1 set" : `${sets} sets`}`
    + ` · ${cards.toLocaleString("en-US")} ${cards === 1 ? "card" : "cards"}`,

  // Search active. The second clause only prints when newToYou > 0.
  resultLine: (matched: number, newToYou: number) => {
    const head = matched === 1 ? "1 collectible set matches" : `${matched} collectible sets match`;
    if (newToYou === 0) return head;
    return `${head} · ${newToYou === 1 ? "1 of them is" : `${newToYou} of them are`} new to you`;
  },

  notIndexed: {
    tag: "not indexed yet",
    aria: "This set's checklist has not been indexed yet",
  },

  row: {
    ratioAria: (have: number, total: number, name: string) =>
      `${name}: you have ${have} of ${total} in the base run`,
    zeroAria: (total: number, name: string) =>
      `${name}: you have none of ${total} in the base run`,
    // Visible, under the base ratio, one type step down. Lowercase, so it reads as a unit
    // on a figure rather than as a heading.
    //
    // The noun agrees with the DENOMINATOR, which is what it counts: a set with a single
    // extra printing reads `0 / 1 extra` and `1 / 1 extra`, never `1 / 1 extras`. Rare and
    // reachable — one variant in a small set is all it takes.
    extrasLine: (have: number, total: number) =>
      `${have} / ${total} ${total === 1 ? "extra" : "extras"}`,
    // MANDATORY, not optional. The row is one <Link> with an explicit aria-label, which
    // REPLACES everything its descendants contribute — so a second visible figure that is
    // not in the label is announced to nobody. Appended to ratioAria / zeroAria, never
    // rendered on its own.
    extrasAria: (have: number, total: number) =>
      `, and ${have} of ${total} ${total === 1 ? "extra" : "extras"}`,
  },

  firstRun: {
    heading: "Upload your collection and the sets appear",
    body:
      "This page is built from what you own. Bring a ManaBox or CSV export and every set you have a card from lands here, counted.",
    primary: "Upload a collection",
    secondary: "or search a set to browse it at 0%",
  },

  // A request that failed is not an answer about the catalogue, and the no-match copy
  // would have spoken for a database that was simply unreachable.
  searchFailed: {
    heading: "That search did not get through",
    body: "Something went wrong reaching the set catalog. Try again in a moment.",
    action: "Try again",
  },

  // A real collection made entirely of products with no numbered run to complete.
  // Neutral about WHY. This branch is reached whenever the index finds no collectible set
  // against a non-empty collection, and that is not only the all-promos case: a catalog
  // refresh that has not yet loaded a set reaches it too, and naming the wrong cause is
  // worse than naming none.
  noCollectibleSets: {
    heading: "No sets to complete yet",
    body:
      "Nothing in your collection belongs to a set with a fixed numbered run that we have indexed. Search above to open any set at 0%.",
  },

  noMatch: {
    // Describes the search that actually ran: it is a substring match on name AND code,
    // so "no set called war" is wrong about both the query and the result.
    heading: (q: string) => `No collectible set matches ${q}`,
    body:
      "Search covers every collectible set, not only yours, so this is a spelling rather than a gap in your collection.",
    action: "Clear the search",
  },

  tail: (remaining: number) =>
    remaining === 1 ? "… 1 more set" : `… ${remaining} more sets`,
} as const;

export const setPageCopy = {
  breadcrumb: (code: string) => `Collection / Sets / ${code.toUpperCase()}`,

  head: {
    // The collapsed bar's search control is NOT a second field. §29 forbids two controls
    // with one accessible name on this page, and the field is one scroll away — so this
    // returns the reader to it rather than duplicating it.
    backToSearch: "Show the search and the full header",
    meta: (code: string, released: string, base: number, extras: number) =>
      `${code.toUpperCase()} · released ${released} · ${base} in the base run`
      + ` · ${extras} ${extras === 1 ? "extra" : "extras"}`,
    ratioNote: "base run only · extras counted apart",
    // R3 finding 6, move 1. The scope note is a whole line saying what the denominator
    // counts, so on a phone the word goes INTO the figure and the line goes away. Desktop
    // keeps both, and the unindexed state keeps the standalone note — there is no ratio
    // there for `base` to ride on.
    // `percent` is nullable on the section summary even though an indexed set always has
    // one; the desktop form has always interpolated it raw. Taken as nullable here so the
    // phone form cannot be the place that prints "null%".
    ratioScoped: (have: number, total: number, percent: number | null) =>
      percent === null ? `${have} / ${total} base` : `${have} / ${total} base · ${percent}%`,
    // The extras ratio, trailing the scoped figure. It is what the absorbed note promised
    // was counted apart, so dropping the note without it would lose the fact.
    // The noun agrees with the denominator, as `head.meta` and the set index both do:
    // a one-printing extras section reads "0 / 1 extra".
    extrasTrail: (have: number, total: number) =>
      `${have} / ${total} ${total === 1 ? "extra" : "extras"}`,
    // R3 finding 6, move 2. `meta` is one interpolated string of four values; this is the
    // phone form beside it, never a replacement. The two counts it drops are the two
    // figures move 1 puts on the line above, which is the only reason dropping them is free.
    // The year is optional, because an indexed set with no recorded release date is a
    // supported catalog state and the code alone still identifies the set. The desktop
    // string says "an unrecorded date" rather than dropping itself, and the set index
    // falls back the same way.
    metaShort: (code: string, released: string | null) =>
      released ? `${code.toUpperCase()} · ${released.slice(0, 4)}` : code.toUpperCase(),
    ratioAria: (have: number, total: number) =>
      `You have ${have} of ${total} ${total === 1 ? "card" : "cards"} in the base run`,
  },

  cost: {
    label: "Cost to complete",
    // R3 finding 6, move 3. The phone's one-row form: the figure, what it covers, and the
    // control that opens the rest. `to finish` rather than the label above it — the row has
    // no room for a caption and a figure, and the phrase has to carry both.
    // Two nodes rather than one string, because the figure takes --accent and the rest
    // does not — the same split the expanded form already makes.
    collapsedTail: (priced: number, missing: number) =>
      `to finish · ${priced} of ${missing}`,
    collapsedTailExtras: (priced: number, missing: number) =>
      `to finish the extras · ${priced} of ${missing}`,
    // The count is in the name because the caveats are the reason this expands at all: a
    // reader who cannot see the row needs to know whether opening it says anything.
    // The figure and its coverage are IN the name, not only on the screen. An explicit
    // `aria-label` replaces the button's descendant text, so a name that stated only the
    // action removed the very audit information this row exists to keep.
    // `hasSend` because the strip renders without a link when the filters left nothing to
    // buy, and a name promising a send button there announces an action that is not there.
    expandAria: (figure: string, caveats: number, hasSend: boolean) =>
      `${figure}. Show the full cost`
      // "link", not "button": the expanded action is an `<a>` to ManaPool, and naming a
      // control type the reader will not find is worse than naming none.
      + (hasSend ? ", with the ManaPool link" : "")
      + (caveats === 0 ? "" : caveats === 1 ? " and 1 note" : ` and ${caveats} notes`),
    collapseAria: "Hide the full cost",
    // R3: at 100% the same strip re-scopes to the extras rather than being
    // replaced by a button. Same component, same sentence shape, same selector.
    labelExtras: "Cost to finish the extras",
    lineExtras: (priced: number, missing: number) =>
      `over ${priced} of the ${missing} you are missing`,
    // Always states its own gap. Never a bare total.
    line: (priced: number, missing: number) =>
      `over ${priced} of the ${missing} missing`,
    // Split at review: the aggregate said every uncosted card had "never been stocked",
    // which is false for one that was stocked and has since sold out.
    unpriced: (n: number) =>
      n === 1
        ? "1 has never been stocked and is not in this figure"
        : `${n} have never been stocked and are not in this figure`,
    // Stocked, but the feed carries no usable figure for it. Neither "never stocked" nor
    // "sold out" is true of these.
    noFigure: (n: number) =>
      n === 1
        ? "1 has no price in this feed and is not in this figure"
        : `${n} have no price in this feed and are not in this figure`,
    soldOut: (n: number) =>
      n === 1
        ? "1 is sold out and is not in this figure"
        : `${n} are sold out and are not in this figure`,
    // Page-level staleness. Prints only when the feed itself trails.
    stale: (asOf: string) => `prices as of ${asOf}`,
    // The page's one selector. Its count always equals the sentence's.
    send: (n: number) => (n === 1 ? "Send 1 to ManaPool" : `Send ${n} to ManaPool`),
    // The list travels in a URL, so a full set does not fit. The button says what it is
    // actually sending rather than implying it sends everything missing.
    sendCapped: (n: number) => `Send the first ${n} to ManaPool`,
    // Why only the first N (H15, Hugh's walk 2026-10-02): the cap was stated on the button
    // and never explained. Drawn under it only when the cap bites. Through /copy-review: the
    // missing count is already the figure's own line above, so it is not said twice.
    capNote: (cap: number) => `One send holds up to ${cap} cards. Filter the grid to send the rest.`,
    // No price: the figure above costs every missing card, and this link carries only the
    // first N of them.
    sendCappedAria: (n: number) =>
      `Open ManaPool Mass Entry with the first ${n} missing cards. Opens in a new tab`,
    // Mass Entry, not a cart: #330 ships no cart or checkout, and the link goes to
    // /add-deck. Telling a screen-reader user "cart" names an action that does not exist.
    sendAria: (n: number, total: string) =>
      `Open ManaPool Mass Entry with ${n} missing ${n === 1 ? "card" : "cards"}, ${total}.`
      + " Opens in a new tab",
    emptyTotal: "$0.00 over 0 of 0",
    // Stands in for the figure when nothing missing can be costed. A zero would read as a
    // set that costs nothing to finish rather than one nobody is selling.
    noneCostable: "no price",
  },

  sections: {
    base: "Base run",
    baseNote: (first: string, last: string) => `${first}–${last} · this is the run the figure counts`,
    extras: "Extras",
    extrasNote: (first: string, last: string) =>
      `${first}–${last} · showcase, borderless and promos. Not in the headline figure.`,
    jump: "extras ↓",
  },

  result: {
    rest: (cells: number, have: number, missing: number) =>
      `${cells} ${cells === 1 ? "cell" : "cells"} · ${have} yours, ${missing} missing`,
    // R3 finding 6, move 4. The second half restates a subtraction the ratio in the head
    // has already made two lines above, so the phone keeps the count and drops it. The
    // filtered and missing-only forms are untouched: neither is stated anywhere else.
    restShort: (cells: number) => `${cells} ${cells === 1 ? "cell" : "cells"}`,
    missingOnly: (n: number) =>
      `${n} missing · numbers skip, because the cards you own are hidden`,
    filtered: (shown: number, total: number) =>
      `${shown} of ${total} ${total === 1 ? "cell" : "cells"}`,
  },

  // A printing the feed has never carried, as distinct from one that has sold out.
  cellPrice: {
    neverStocked: "Never stocked at ManaPool",
    soldOut: "Sold out at ManaPool",
    noFigure: "No price in this feed",
  },

  cell: {
    // The cell is the target; this is its accessible name.
    aria: (name: string, num: string, owned: boolean, price?: string) =>
      owned
        ? `${name}, ${num}, in your collection`
        : `${name}, ${num}, not in your collection${price ? `, ${price}` : ""}`,
    foil: "◆ FOIL",
    foilAria: "You hold this in foil",
    noStock: "no stock",
    noStockAria: "Never stocked at ManaPool",
    // The qualifier is the finish word the buy tag chose — foil or etched — because
    // priceState collapses both into one state and only the column says which.
    qualifiedPrice: (finish: string, p: string) => `◆ ${finish} ${p}`,
    qualifiedPriceAria: (finish: string, p: string) => `Available in ${finish} only, ${p}`,
  },

  // Ruling 4, ruled at R2: a per-cell mark, not a head line. The outlined
  // diamond is the unset half of printing_picker's filled "Your pick".
  unpinned: {
    mark: "BY NAME",
    // States the inference and stops there. It used to say "open the card to pick which
    // printing you own", which a name-only holding cannot do: it carries no collector
    // number, so the modal has one owned entry and renders no printing picker, and the
    // preference action validates an exact number. Promising an unreachable action is
    // worse than saying nothing about it.
    aria: (name: string) =>
      `${name}: matched to this set by name, so which printing you own is inferred.`,
  },

  // An upload completed while this page was open. The delta is for THIS set
  // only, and the strip does not render when it is zero.
  staleAfterUpload: {
    line: (n: number) =>
      n === 1
        ? "Your upload finished. 1 more card from this set is in your collection now."
        : `Your upload finished. ${n} more cards from this set are in your collection now.`,
    // The mirror of the line above. An upload that REMOVES cards leaves the grid just as
    // stale as one that adds them, and the strip detected that before it could say it.
    removed: (n: number) =>
      n === 1
        ? "Your upload finished. 1 card from this set is no longer in your collection."
        : `Your upload finished. ${n} cards from this set are no longer in your collection.`,
    // Deliberately says nothing about WHAT changed it. The same-count case is reached by
    // picking a different printing in the card modal, which is not an upload, and
    // announcing one would name an act the reader did not perform.
    swapped: "Which printings you own from this set has changed.",
    action: "Refresh the grid",
  },

  complete: {
    heading: (set: string) => `${set}, complete`,
    line: (total: number) => `all ${total} of the base run`,
    // R3: `nothing left to buy` and `nothing missing to show` are deleted as
    // superfluous, and Missing-only is REMOVED at 100% rather than greyed —
    // so there is no inert-toggle gloss to write.
    extrasCount: (have: number, total: number) => `Extras ${have} / ${total}`,
    extrasGloss: "the only thing left in this set",
    noExtras: "Nothing left in this set",
  },

  // Zero WITH a query is its own branch: the heading names the query, because "nothing
  // matches" on a page reached from a catalogue-wide search reads as a claim about the
  // catalogue. Two corrections, narrowest first.
  searchZero: {
    heading: (set: string, q: string) => `Nothing in ${set} matches \u201C${q}\u201D`,
    // Only ever shown when the query is the ONLY thing narrowing. With a colour or rarity
    // on, the name may well be in the set and a filter removed it — calling that a spelling
    // would be false, so that case takes the ordinary filtered-empty heading instead.
    // Says what was searched, and offers spelling as ONE reading rather than asserting it:
    // a perfectly-spelled card from another set reaches this branch too, and telling that
    // reader they mistyped is a misdiagnosis.
    body:
      "This searches the names in this set only. Check the spelling, or the card may be from another set.",
  },

  zeroResults: {
    // With missing-only ON, zero is good news and the copy has to say so.
    headingOwnsAll: (what: string) => `You are not missing any ${what}`,
    bodyOwnsAll: (n: number, set: string) =>
      `There ${n === 1 ? "is 1" : `are ${n}`} in ${set} and you hold ${n === 1 ? "it" : "all of them"}.`,
    // With missing-only OFF, zero means the filters excluded everything.
    headingNone: (what: string) => `No ${what} in this set`,
    showAll: (n: number) => (n === 1 ? "Show it" : `Show all ${n}`),
    clear: "Clear filters",
  },

  // A real set, on a real page, whose checklist the catalog has not written yet. Distinct
  // from an unknown code: nothing here is wrong and nothing needs correcting.
  notIndexed: {
    heading: (name: string) => `${name} has not been indexed yet`,
    // Ownership-neutral: search reaches sets the reader holds nothing from, so this page
    // is opened at 0% as often as it is opened over a collection.
    body:
      "The checklist for this set is written when the catalog refreshes, which happens weekly. Anything you own from it is already in your collection.",
    action: "Back to your sets",
  },

  unknownCode: {
    heading: (code: string) => `No set with the code ${code.toUpperCase()}`,
    body: "Either the link is wrong or the set is too new for our checklist. Your sets are all one tap away.",
    action: "Back to your sets",
  },

  nonCollectible: {
    heading: (name: string) => `${name} has no set to complete`,
    // The ownership clause only prints when there IS ownership: this page is also reached
    // by searching, where the reader may hold nothing from the set at all.
    body: (n: number) =>
      n === 0
        ? "It has no fixed numbered run, so there is no denominator and nothing to be missing from."
        : `It has no fixed numbered run, so there is no denominator and nothing to be missing from. Your ${n} ${
            n === 1 ? "card" : "cards"
          } from it ${n === 1 ? "is" : "are"} all in your collection.`,
    primary: (n: number) => `See ${n === 1 ? "it" : `those ${n}`} in Collection`,
    browse: "Back to your sets",
    secondary: "Back to your sets",
  },
} as const;
