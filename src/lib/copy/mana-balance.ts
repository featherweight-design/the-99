// Mana Balance (Tuning hub handoff R3b, `mana-balance R3 · copy strings.ts`), the evidence view.
// Edited by /copy-review on 2026-10-11 against the handoff's placeholders; the changes are named in
// `docs/superpowers/gap-report-tuning-hub-mana.md`. Two rulings shape every string here:
//   - No verdict (Hugh, 2026-10-10): nothing says a color is short, fine, met or covered.
//   - Karsten is named only in the "What Needs means" line and the citation (brief ruling 2).
// The Improve my mana door and its help result join in PR 3b.

/** Karsten's article, the source of every Needed figure and the land formula. */
export const KARSTEN_ARTICLE_URL =
  "https://www.tcgplayer.com/content/article/How-Many-Sources-Do-You-Need-to-Consistently-Cast-Your-Spells-A-2022-Update/dc23a7d2-0a16-4c0b-ad36-586fcca03ad8/";

export const manaBalanceCopy = {
  title: "Mana Balance",
  sub: (pips: number, sources: number) =>
    `free · counted just now · ${pips} ${pips === 1 ? "pip" : "pips"} · ${sources} ${sources === 1 ? "source" : "sources"}, as on Deck stats`,
  lead: "Pips and sources for each color, counted the way the Colors card counts them, beside what each color’s tightest cost needs.",
  table: {
    head: { color: "Color", pips: "Pips", sources: "Sources", needed: "Needed" },
    share: (n: number, pct: number) => `${n} · ${pct}%`,
    without: (n: number, commander: string) => `${n} without ${commander}`,
    split: (lands: number, other: number) => (lands > 0 ? `${lands} ${lands === 1 ? "land" : "lands"} · ${other} other` : `${other} other`),
    neededFor: (card: string, more: number, code: string) => (more > 0 ? `for ${card} and ${more} more (${code})` : `for ${card} (${code})`),
    noPips: "no pips to cast",
    /** A color with pips and no cost Karsten publishes a figure for (a hybrid or X cost alone). */
    noPublished: "no published figure",
    colorless: (pips: number, sources: number, pct: number) =>
      `${pips === 0 ? "no" : pips} {C} ${pips === 1 ? "pip" : "pips"} · ${sources} ${sources === 1 ? "source" : "sources"} · ${pct}%`,
    /** Engineering: the row's spoken form, since its figures sit in separate cells. */
    rowAria: (name: string, pips: string, sources: string, needed: string) => `${name}. Pips ${pips}. Sources ${sources}. Needed ${needed}.`,
  },
  needs: {
    toggle: "What “Needs” means",
    close: "Hide",
    needsLabel: "Needs",
    needsBody: "Frank Karsten’s math: sources of this color a 99-card deck needs to cast this on curve about 9 times in 10.", // Hugh, verbatim
    sourceLabel: "Source",
    sourceBody: "Frank Karsten, “How Many Sources Do You Need to Consistently Cast Your Spells? A 2022 Update”,",
    sourceLink: "TCGplayer",
    sourceTail: "A reference point for reading the count, not a target.",
  },
  /** Any link that leaves the app. */
  newTab: (name: string) => `${name}, opens in a new tab`,
  sections: {
    hardest: { label: "Hardest costs", clause: (colors: string) => `six per color · ${colors}` },
    lands: {
      label: "Lands",
      clause: (lands: number, tapped: number, count: string) => `${lands} ${lands === 1 ? "land" : "lands"} · ${tapped} can enter tapped · formula ${count}`,
    },
  },
  patterns: {
    head: { cost: "Cost", cards: "Cards", needed: "Needed" },
    chips: "Color",
    copies: (n: number) => `×${n}`,
    commander: "commander",
    more: (n: number) => `+${n} more`,
    fewer: "show fewer",
    haveNeeds: (have: number, needs: number) => `You have ${have} · Needs ${needs}`,
    haveNeedsAtMost: (have: number, needs: number) => `You have ${have} · Needs at most ${needs}`,
    none: "No published figure",
    foot: (color: string) => `${color}’s six hardest costs, most pips first. Another color’s pips count as other mana.`,
  },
  lands: {
    count: "Lands",
    countOf: (cards: number) => `of ${cards} ${cards === 1 ? "card" : "cards"}`,
    always: "Enter tapped",
    alwaysNote: "always",
    unless: "Tapped unless a condition holds",
    unlessNote: "a check land, a slow land, a battle land",
    fetch: "Fetch a land that enters tapped",
    fetchNote: "the fetcher itself enters untapped",
    /** Engineering: the disclosure on a tapped row, which lists its lands. */
    showNames: (label: string) => `${label}: show which lands`,
    average: "Average mana value",
    averageNote: (commander: string, commanders: number) => `counts ${commander} as ${commanders === 1 ? "a card" : "cards"}`,
    formulaLabel: "Commander land formula",
    formula: (avg: string, ramp: number) => `31.42 + 3.13 × ${avg} − 0.28 × ${ramp} cheap ramp`,
    caveat: (ramp: number) =>
      ramp === 0
        ? "No mana source at mana value 3 or less yet, so cheap ramp is 0. Draw spells aren’t counted."
        : `Cheap ramp is the ${ramp} mana ${ramp === 1 ? "source" : "sources"} at mana value 3 or less. Draw spells aren’t counted, so for a deck that draws a lot this figure runs high.`,
  },
  thin: {
    colorless: "No card in this deck has a colored pip, so there’s no color to count and no color to help with. The lands and the colorless count below still stand.",
    noSources: "Pips and Needed figures still show, so the count is ready when lands go in.", // after deckStatsCopy.colors.noLands
    noteMark: "Note",
  },
  failed: {
    tag: "Couldn’t count",
    heading: "We couldn’t count this deck’s mana",
    body: "The card catalog didn’t answer, so there is nothing to show yet. It is usually back within a minute.",
    kept: "your list is untouched · nothing was spent",
  },
  cite: {
    before: "Needed figures are from Frank Karsten, “How Many Sources Do You Need to Consistently Cast Your Spells? A 2022 Update”,",
    after: "using its 99-card column. The land count is his Commander formula, with its constants as quoted in secondary write-ups. They’re a reference point for reading the count, not a target.",
    landOnlyBefore: "The land count is Frank Karsten’s Commander formula, from “How Many Sources Do You Need to Consistently Cast Your Spells? A 2022 Update”,",
    landOnlyAfter: "with its constants as quoted in secondary write-ups. It’s a reference point, not a target.",
    link: "TCGplayer",
  },
} as const;
