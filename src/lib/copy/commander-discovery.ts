// src/lib/copy/commander-discovery.ts — commander discovery (#213 / #214, brief 2026-09-05).
// Shape follows src/lib/copy/availability.ts: flat const object, functions for interpolated
// strings, no JSX. Voice: Kitchen Table — utility copy stays straight; the two expressive
// moments are marked.
//
// THIS MODULE EDITS NOTHING. `availability.ts` is reused BY REFERENCE for the `Score against`
// labels, the receipt line's clauses and the degraded strings. Nothing below replaces a shipped
// string; the one shipped string this handoff asks to change is a `toLocaleString` call on the
// filter bar's "Showing N of M" count, which is not copy.
//
// VOCABULARY IS LOAD-BEARING, and two words carry the §5 correction:
//   • "lists"       — EDHREC LISTS cards for a commander. Never "the 99", never "the deck",
//                     never a bare "of 99". The 99 is not the denominator and never was.
//   • "support"     — the noun for that list, used in the column LABEL only. It is not a claim.
// Two more, from ruling 2:
//   • "built"       — a commander you have a deck around. The excluded population. There is no
//                     "finished" deck: `decks` carries `filled`, not a completion flag, so the
//                     novelty sort unlocks on the first deck of any kind.
//   • "never built" — owned, unbuilt. The row ruling 2 exists for, and it must stay a fact, not
//                     a nudge: no "why not?", no "ready to build", no exclamation.
// The `buy` verb from the Add panel is BANNED here. Discovery states ownership; it does not shop.
//
// EVERY FIGURE PRINTS ITS DENOMINATOR. There is no string below that renders N without M, at any
// width. If a commander has no `edhrec_total`, the caller renders NEITHER figure and falls back to
// the receipt line — see `README.md` notes for engineering.
//
// NUMBERS ARE LOCALE-FORMATTED HERE, unlike availability.ts. Every count on this surface can reach
// four digits (3,342 indexed, 3,334 unbuilt, 1,704 clearing the floor), which is the whole
// difference between this list and the 242-row one it extends. Note the unbuilt figure: ruling 2
// excludes the 8 commanders with decks, not the 3,100 the player does not own.
// Every COUNT below goes through `n`, including the small ones, so the rule has no exceptions to
// remember. Percentages do not: a separator in a percentage would be a bug, not a formatting.

const n = (v: number) => v.toLocaleString("en-US");

export const discoveryCopy = {
  // ── Scope (§7.2, tier 1) — page header ────────────────────────────────
  // Two segments, always both available. The long labels are the desktop ones;
  // the phone buys the short pair and lets `subtitle` carry the meaning.
  scope: {
    label: "Show",
    owned: "Commanders I own",
    play: "Something to play",
    ownedShort: "I own",
    playShort: "To play",
    ownedAria: "Rank the commanders you already own",
    playAria: "Rank commanders you have not built a deck around",

    // Restated under the title on every flip. Population · ordering · basis.
    subtitleOwned: (candidates: number, cards: number) =>
      `${n(candidates)} commanders you own · ranked by fit · read against ${n(cards)} cards`,
    subtitlePlay: (candidates: number, cards: number, sort: "fit" | "new") =>
      `${n(candidates)} commanders you have not built · ranked by ${
        sort === "new" ? "what is new to you" : "best fit"
      } · read against ${n(cards)} cards`,

    // The availability clause, appended to either subtitle above. The shipped
    // pair names the ORDERING — "ranked by fit" — which both leads have already
    // named for themselves, so appending it read "ranked by what is new to you ·
    // ranked by fit". These name the POOL the figures were read against, which
    // is the one thing the lead does not say.
    subtitleAll: "every card you own",
    subtitleFree: "free cards only",

    // Announced on the page's existing live region.
    announce: (scope: "owned" | "play", count: number, sort: "fit" | "new") =>
      scope === "owned"
        ? `Showing the ${n(count)} commanders you own · ranked by fit`
        : `Showing ${n(count)} commanders you have not built · ranked by ${
            sort === "new" ? "what is new to you" : "best fit"
          }`,
  },

  // ── Sort (§7.2, tier 2) — filter bar, discovery scope only ────────────
  // A menu, not segments: one option can be unavailable WITH A REASON (ruling 8),
  // and each option names its own sort key because ruling 3 forbids a blend.
  sort: {
    label: "Sort",
    fit: "Best fit",
    new: "Something new",
    fitKey: "most of the cards popular with it already owned",
    newKey: "farthest from the themes you have built",
    triggerAria: (current: string) => `Sort: ${current}. Choose how these are ranked`,
    fitAria: "Rank by how much of each commander's popular cards you already own",
    newAria: "Rank by distance from the themes the decks you have built play",

    // Ruling 8. Short form on the menu row; the long form is `empty.noDecks`.
    newDisabled: "needs a deck to compare against. Build one and this turns on",
    newDisabledAria:
      "Something new is unavailable. We need a deck to compare against",

    announce: (sort: "fit" | "new", count: number) =>
      sort === "new"
        ? `Re-ranked by what is new to you · ${n(count)} commanders clear the floor`
        : `Re-ranked by best fit · ${n(count)} commanders`,
  },

  // ── Availability (§7.6) — the shared toggle, spoken on this surface ────
  // The wording is `availabilityCopy.ranking.announce`'s, restated rather than
  // reused: that one interpolates the count raw, which is right for the 242-row
  // owned list and wrong here, where the same figure reaches four digits.
  avail: {
    announce: (mode: "all" | "free", count: number) =>
      `${
        mode === "free"
          ? "Re-ranked by what’s free"
          : "Re-ranked by everything you own"
      } · ${count === 1 ? "1 commander" : `${n(count)} commanders`}`,
  },

  // ── The justification slot is GONE (§7.1) ─────────────────────────────
  // Every string that drew it retired with the composition: the overlap
  // sentence and its bar became Fit, the tag list and the nearest-deck clause
  // became the mechanic gap line, and the floor note went because the lane
  // header states the floor once rather than every row claiming to clear it.
  //
  // Fifteen keys in this block alone, and twenty-one across the PR — counted off
  // the diff rather than by eye, after two attempts here said eleven and then
  // seventeen. The handoff's list named nine; the rest were this slot's own
  // labels and units plus the ownership block below. Grep finds the callers, but
  // only the diff counts the keys.

  // ── Ownership on the row is GONE (§7.3) ───────────────────────────────
  // The whole block went with the composition. D1: nothing on the row may be
  // read off ownership, because one component now serves a lane of commanders
  // the reader owns and a lane of commanders they do not — so `not in your
  // collection` distinguished nothing, and the pip's two readings and the
  // accessible name's leading clause went with it.
  //
  // Three keys, missed by the first sweep of this file and found by the pre-open
  // review: `unowned`, `unownedShort`, `unownedAria`. An earlier comment here
  // claimed `ownedShort` and `unownedShort` were among the deleted — `ownedShort`
  // belongs to `scope` and is live, and `unownedShort` was still sitting three
  // lines below the claim.

  // ── Price and stock (§7.4, #288) ──────────────────────────────────────
  // `null` price renders NOTHING — no string exists for it, on purpose, so a
  // future edit cannot accidentally give absence a label. Same for an owned
  // commander: the slot unmounts rather than saying why.
  price: {
    // Lower-case on purpose, and not a typo for the brand name: §7.4 draws provenance as a mono
    // 10px stamp in `--fg-locked`, the same register as a field label, because a price with no
    // source is a claim the product cannot stand behind but the source is not the point of the
    // row. The brand capitalisation appears where it is spoken — see `aria` below.
    source: "manapool",
    notStocked: "not stocked",
    aria: (formatted: string) => `${formatted}, in stock at Mana Pool`,
    notStockedAria: "Mana Pool has none in stock",
  },

  // ── Untagged commanders (ruling 5) ────────────────────────────────────
  // The shipped `absent` note with one word changed, and NO retry: EDHREC not
  // tagging a commander is settled, and a button that cannot change anything is
  // worse than a sentence that explains it.
  // The gap slot's third occupant, drawn by the SHARED row on both lanes — so
  // the body may not name a sort only one of them has. It used to end "so it
  // cannot appear under Something new", which is true on /discover and false on
  // /commanders, where such a commander is listed normally. Named by review.
  //
  // The novelty sort's exclusions are still explained, by `planeCopy.exclusion.*`
  // on the lane that has them, which is where a claim about a sort belongs.
  untagged: {
    heading: "No theme data",
    body:
      "EDHREC lists cards for this commander but no themes, so there is nothing to measure against your decks.",
  },

  // ── The three empty states (§6.8, §7.6) ───────────────────────────────
  empty: {
    // 1 · No decks built. The list beneath is FULL; this is a disabled control
    // with a stated reason, not an empty list. Expressive heading, marked.
    noDecksHeading: "Something new needs something old first",
    // No card count: the page header directly above this banner already ends
    // "read against N cards", and the figure is the same one.
    noDecksBody:
      "We rank “new” by how far a commander sits from the themes the decks you have built already play, and you have not built one yet. Best fit works from day one: it only needs your collection.",
    /** The one clause the banner marks. A substring of `noDecksBody` rather than
        a fragment the component splices in, so the sentence has one author. */
    noDecksEmphasis: "Best fit works from day one",

    // 2 · The floor excludes everything. Names the floor, names the nearest miss
    // so 30% is not arbitrary, and offers THE OTHER SORT — never a looser floor.
    // "the collection is just early" is the second expressive moment.
    floorHeading: "Nothing clears the bar for “new” yet",
    floorBody: (floorPct: number, candidates: number, cards: number, bestPct: number) =>
      `Something new only shows commanders you could actually build: at least ${floorPct}% of the cards decks with them play already in your collection. None of the ${n(
        candidates,
      )} clears that against ${n(
        cards,
      )} cards, and the closest sits at ${bestPct}%. Nothing is broken; the collection is just early.`,
    /** Likewise a substring of `floorBody` — the floor clause only, so the mark
        lands on the rule being explained and not on the misses it caused. */
    floorEmphasis: (floorPct: number) =>
      `at least ${floorPct}% of the cards decks with them play already in your collection`,
    floorCta: "Rank by best fit instead",
    floorCtaNote: (candidates: number) => `${n(candidates)} commanders, no floor`,

    // 3 · Filtered to zero inside discovery. The shipped FilteredEmpty plus ONE
    // clause — the only genuinely new reason this state has under discovery.
    // Rendered only when at least one built deck matches the filtered identity.
    // The population is an ownership one, not a build one: discover lists the
    // commanders the player does not own, and every one of them is unbuilt by
    // construction. Naming the wrong axis had the state describe a list nobody
    // is looking at.
    filteredHeading: "No commander in those colors",
    filteredBody: (colors: string, candidates: number) =>
      `${colors} together leave nothing in the ${n(candidates)} you don't own.`,
    // "cover", not "are": the count behind this clause comes from the list's own
    // `selected ⊆ colorIdentity` test, so an Esper deck is counted under an
    // Orzhov filter. The drawn line claimed those decks ARE Orzhov, which is
    // false of every deck whose identity is wider than the filter.
    filteredBuiltClause: (matching: number, total: number, identity: string) =>
      // `matching` can never exceed `total`, so a one-deck player is always the
      // whole count and "One of your 1 decks" never needs to be said.
      total === 1
        ? `Your only deck covers ${identity}. That is where those commanders went.`
        : `${matching === 1 ? "One" : n(matching)} of your ${n(
            total,
          )} decks ${matching === 1 ? "covers" : "cover"} ${identity}. That is where those commanders went.`,
    filteredCta: "Clear the color filter",
    // When Printed in emptied the list rather than the colors (decision 9). The set filter
    // matches printings the reader does not own, so this lane can be emptied by it outright.
    filteredSetsHeading: "No commander printed there",
    filteredSetsBody: (sets: string, candidates: number) =>
      `${sets} leaves nothing in the ${n(candidates)} you don't own.`,
    filteredSetsCta: "Clear the printed-in filter",
    // Both lit: the COMBINATION left nothing, so neither is named as the cause on its own.
    filteredTogetherHeading: "No commander fits both",
    // `colors` arrives lower-case (`colorWords`), and `sets` as the chip names it (`Printed in
    // CMM`), so the sentence opens on the count and lowers the chip's first letter.
    filteredTogetherBody: (colors: string, sets: string, candidates: number) =>
      `None of the ${n(candidates)} you don't own is ${colors} and ${sets.charAt(0).toLowerCase()}${sets.slice(1)}.`,
    filteredBothCta: "Clear both filters",
    // Names the lane, the way `discoverCopy.otherLane` names it. The old wording
    // was the deleted scope control's option label, and it opened on "or", which
    // read as a trailing clause of the button beside it rather than a link.
    filteredScopeLink: "Your commanders",
  },

  // ── Windowing at 3,342 (§7.7) ─────────────────────────────────────────
  // The reveal control's shipped strings are UNCHANGED. This adds one dimmer
  // second line: at 242 rows the rank band was implicit, at 3,100 it is not.
  window: {
    // The band alone. The advice that used to follow it sat inside the reveal
    // button, arguing against the press, and named a filter bar already on screen.
    revealBand: (from: number, to: number, total: number) =>
      `ranks ${n(from)}–${n(to)} of ${n(total)}`,
  },
} as const;
