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
//   • "built"       — a commander you finished a deck around. The excluded population.
//   • "never built" — owned, unbuilt. The row ruling 2 exists for, and it must stay a fact, not
//                     a nudge: no "why not?", no "ready to build", no exclamation.
// The `buy` verb from the Add panel is BANNED here. Discovery states ownership; it does not shop.
//
// EVERY FIGURE PRINTS ITS DENOMINATOR. There is no string below that renders N without M, at any
// width. If a commander has no `edhrec_total`, the caller renders NEITHER figure and falls back to
// the receipt line — see `README.md` notes for engineering.
//
// NUMBERS ARE LOCALE-FORMATTED HERE, unlike availability.ts. Every count on this surface can reach
// four digits (3,342 indexed, 3,100 unbuilt, 1,704 clearing the floor), which is the whole
// difference between this list and the 242-row one it extends.

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
    fitKey: "most of its support list already owned",
    newKey: "farthest from the archetypes you have built",
    triggerAria: (current: string) => `Sort: ${current}. Choose how these are ranked`,
    fitAria: "Rank by how much of each commander's support list you already own",
    newAria: "Rank by distance from the archetypes your finished decks play",

    // Ruling 8. Short form on the menu row; the long form is `empty.noDecks`.
    newDisabled: "needs a finished deck to compare against — build one and this turns on",
    newDisabledAria:
      "Something new is unavailable — we need a finished deck to compare against",

    announce: (sort: "fit" | "new", count: number) =>
      sort === "new"
        ? `Re-ranked by what is new to you · ${n(count)} commanders clear the floor`
        : `Re-ranked by best fit · ${n(count)} commanders`,
  },

  // ── The justification slot (§7.1) ─────────────────────────────────────
  // ONE slot, contents chosen by the sort key. The accent marks the sort key and
  // nothing else, so `overlap` brasses its bar and `distance` brasses its tags.
  justify: {
    // §5's correction, at three lengths. All three print M.
    overlapLabel: "Overlap",
    overlap: (owned: number, total: number) =>
      `you own ${owned} of the ${total} cards EDHREC lists for this commander`,
    overlapShort: (owned: number, total: number) =>
      `own ${owned} of ${total} EDHREC lists`,
    overlapAria: (owned: number, total: number, name: string) =>
      `you own ${owned} of the ${total} cards EDHREC lists for ${name}`,

    // Column label + figure unit. "Support" is a noun for the list, not a claim.
    figureLabelFit: "Support owned",
    figureUnitFit: (total: number) => `of ${total}`,

    // Novelty. Up to three tag names, then a count — a fourth name buys nothing.
    distanceLabel: "New to you",
    tagList: (tags: string[], extra: number) =>
      extra > 0 ? `${tags.join(" · ")} — and ${extra} more` : tags.join(" · "),
    // Nothing built plays any of them. Plain, and it does not congratulate.
    distanceNone: "Nothing you have built plays these.",
    // Partial: name the nearest deck, and say what it shares. One deck, never a
    // count — severity, not inventory, matching the availability receipt's rule.
    distanceNear: (deckName: string, shared: string) =>
      `Closest is your ${deckName} list, which shares ${shared}.`,
    distanceAria: (unplayed: number, total: number) =>
      `${unplayed} of its ${total} archetypes are ones you have never built`,

    figureLabelNew: "Unplayed tags",
    figureUnitNew: (total: number) => `of ${total} tags`,
    // Ruling 4's floor, stated as a qualifying fact. It explains PRESENCE, never
    // position — the percentage is never added to the figure above it.
    floorNote: (pct: number) => `clears the floor — you own ${pct}% of its support list`,
    floorNoteShort: (pct: number) => `clears the floor — you own ${pct}% of its list`,
  },

  // ── Ownership on the row (§7.3) ───────────────────────────────────────
  // BOTH clauses always render, so row height never changes between two rows or
  // two players. The pip is the glyph; these are the words beside it. Facts, not
  // nudges: the owned one is the row ruling 2 exists for and it stays a fact.
  ownership: {
    owned: "in your collection, never built",
    unowned: "not in your collection",
    ownedShort: "yours, never built",
    unownedShort: "not yours",
    // Leads the row's accessible name, before any figure.
    ownedAria: "in your collection, no deck built around it",
    unownedAria: "not in your collection",
  },

  // ── Price and stock (§7.4, #288) ──────────────────────────────────────
  // `null` price renders NOTHING — no string exists for it, on purpose, so a
  // future edit cannot accidentally give absence a label. Same for an owned
  // commander: the slot unmounts rather than saying why.
  price: {
    source: "manapool",
    notStocked: "not stocked",
    aria: (formatted: string) => `${formatted}, in stock at ManaPool`,
    notStockedAria: "ManaPool has none in stock",
  },

  // ── Untagged commanders (ruling 5) ────────────────────────────────────
  // The shipped `absent` note with one word changed, and NO retry: EDHREC not
  // tagging a commander is settled, and a button that cannot change anything is
  // worse than a sentence that explains it.
  untagged: {
    heading: "No tag data",
    body:
      "EDHREC lists cards for this commander but no archetypes, so it cannot appear under Something new.",
  },

  // ── The three empty states (§6.8, §7.6) ───────────────────────────────
  empty: {
    // 1 · No decks built. The list beneath is FULL; this is a disabled control
    // with a stated reason, not an empty list. Expressive heading, marked.
    noDecksHeading: "Something new needs something old first",
    noDecksBody: (cards: number) =>
      `We rank “new” by how far a commander sits from the archetypes your finished decks already play — and you have not finished one yet. Best fit works from day one: it only needs your collection, and you have ${n(
        cards,
      )} cards in it.`,

    // 2 · The floor excludes everything. Names the floor, names the nearest miss
    // so 30% is not arbitrary, and offers THE OTHER SORT — never a looser floor.
    // "the collection is just early" is the second expressive moment.
    floorHeading: "Nothing clears the bar for “new” yet",
    floorBody: (floorPct: number, candidates: number, cards: number, bestPct: number) =>
      `Something new only shows commanders you could actually build — at least ${floorPct}% of their support list already in your collection. None of the ${n(
        candidates,
      )} clears that against ${n(
        cards,
      )} cards, and the closest sits at ${bestPct}%. Nothing is broken; the collection is just early.`,
    floorCta: "Rank by best fit instead",
    floorCtaNote: (candidates: number) => `${n(candidates)} commanders, no floor`,

    // 3 · Filtered to zero inside discovery. The shipped FilteredEmpty plus ONE
    // clause — the only genuinely new reason this state has under discovery.
    // Rendered only when at least one built deck matches the filtered identity.
    filteredHeading: "No unbuilt commander matches those colours",
    filteredBody: (colors: string, candidates: number) =>
      `${colors} together leave nothing in the ${n(candidates)} you have not built.`,
    filteredBuiltClause: (matching: number, total: number, identity: string) =>
      `${matching === 1 ? "One" : matching} of your ${n(
        total,
      )} decks ${matching === 1 ? "is" : "are"} ${identity} — that is where those commanders went.`,
    filteredCta: "Clear the colour filter",
    filteredScopeLink: "or switch to Commanders I own",
  },

  // ── Windowing at 3,342 (§7.7) ─────────────────────────────────────────
  // The reveal control's shipped strings are UNCHANGED. This adds one dimmer
  // second line: at 242 rows the rank band was implicit, at 3,100 it is not.
  window: {
    revealBand: (from: number, to: number, total: number) =>
      `ranks ${n(from)}–${n(to)} of ${n(total)} · narrowing by colour is faster than scrolling`,
  },
} as const;
