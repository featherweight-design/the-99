// Mana Balance (Tuning hub handoff R3b, `mana-balance R3 · copy strings.ts`), the evidence view.
// Edited by /copy-review on 2026-10-11 against the handoff's placeholders; the changes are named in
// `docs/superpowers/gap-report-tuning-hub-mana.md`. Two rulings shape every string here:
//   - No verdict (Hugh, 2026-10-10): nothing says a color is short, fine, met or covered.
//   - Karsten is named only in the "What Needs means" line and the citation (brief ruling 2).

/** Karsten's article, the source of every Needed figure and the land formula. */
export const KARSTEN_ARTICLE_URL =
  "https://www.tcgplayer.com/content/article/How-Many-Sources-Do-You-Need-to-Consistently-Cast-Your-Spells-A-2022-Update/dc23a7d2-0a16-4c0b-ad36-586fcca03ad8/";

/** A basic's plural: `Forests`, and `Plains` as it is. */
const basics = (name: string) => (name.endsWith("s") ? name : `${name}s`);

export const manaBalanceCopy = {
  title: "Mana Balance",
  sub: (pips: number, sources: number) =>
    `free · counted just now · ${pips} ${pips === 1 ? "pip" : "pips"} · ${sources} ${sources === 1 ? "source" : "sources"}, as on Deck stats`,
  lead: "Pips and sources for each color, counted the way the Colors card counts them, beside what each color’s tightest cost needs.",
  table: {
    head: { color: "Color", pips: "Pips", sources: "Sources", needed: "Needed" },
    share: (n: number, pct: number) => `${n} · ${pct}%`,
    without: (n: number, commander: string) => `${n} without ${commander}`,
    /** A zero side is left out: `5 other`, `3 lands`, or both. */
    split: (lands: number, other: number) => {
      const landsText = `${lands} ${lands === 1 ? "land" : "lands"}`;
      return lands > 0 && other > 0 ? `${landsText} · ${other} other` : lands > 0 ? landsText : `${other} other`;
    },
    neededFor: (card: string, more: number, code: string) => (more > 0 ? `for ${card} and ${more} more (${code})` : `for ${card} (${code})`),
    noPips: "no pips to cast",
    /** A color with pips and no cost Karsten publishes a figure for (a hybrid or X cost alone). */
    noPublished: "no published figure",
    /** `pct` is the share of all sources, drawn beside colored rows; the colorless deck draws none. */
    colorless: (pips: number, sources: number, pct: number | null) =>
      `${pips === 0 ? "no" : pips} {C} ${pips === 1 ? "pip" : "pips"} · ${sources} ${sources === 1 ? "source" : "sources"}${pct === null ? "" : ` · ${pct}%`}`,
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
    /** Cause-neutral: the panel lands here for any failed read, not only the catalog's. */
    body: "The count didn’t finish, so there is nothing to show yet. Open Mana Balance again to count once more.",
    kept: "your list is untouched · nothing was spent",
  },
  door: {
    title: "Improve my mana",
    lead: (commander: string) => `Basic swaps and staples ${commander} decks run, the ones you own first, for a color you pick.`,
    leadOne: (commander: string, color: string) => `Basic swaps and staples ${commander} decks run, the ones you own first, for ${color}.`,
    button: "Improve my mana",
  },
  step: {
    head: "Which color?",
    close: "Close",
    order: "Listed by how close each color’s sources are to what its tightest cost needs, counting costs two or more cards share. Pick any.",
    group: "Which color",
    cost: (code: string, cards: number) => `${code} · ${cards} ${cards === 1 ? "card" : "cards"}`,
    noPips: (sources: number) => `${sources} ${sources === 1 ? "source" : "sources"} · no pips`,
    /** A color with pips and no cost Karsten publishes a figure for. */
    noPublished: "no published figure",
    have: (have: number) => `You have ${have}`,
  },
  help: {
    head: (color: string) => `Help adding ${color}`,
    change: "Change color",
    swaps: "Swap basics",
    swap: (n: number, out: string, into: string) => (n === 1 ? `1 ${out} → ${into}` : `Up to ${n} ${basics(out)} → ${basics(into)}`),
    change_: (color: string, before: number, after: number) => `${color} ${before} → ${after}`,
    noSwap: (color: string) => `No basic swap for ${color}.`,
    howLabel: "How moves are picked",
    /** Reworded by /copy-review (audit finding 4): the guard is each color's HARDEST published cost,
     *  which can sit above the table's Needed, so it never says "tightest". */
    how: (color: string) =>
      `A swap or a trade is offered only if ${color} gains a source and no other color drops below what its hardest published cost needs, or loses a source while already below it. A locked basic never moves.`,
    staples: (commander: string) => `Staples ${commander} decks run · owned first`,
    owned: (free: number) => `owned · ${free} free`,
    toBuy: "to buy",
    buyLink: "Mana Pool ↗",
    buyAria: (name: string) => `Buy ${name} at Mana Pool, opens in a new tab`,
    rate: {
      commander: (p: number, name: string) => `in ${p}% of ${name} decks`,
      pair: (p: number) => `in ${p}% of this pairing’s decks`,
      identity: (p: number, bucket: string) => `${bucket} average, ${p}%`,
      /** The bucket a commander with no page of its own falls back to: `3-color`. */
      countBucket: (n: number) => `${n}-color`,
    },
    adds: "adds",
    trade: (basic: string, changes: string) => `1 ${basic} for it: ${changes}`,
    tradeTag: "trade",
    noTrade: "no basic trade for it",
    noStaples: (color: string) => `No staples to show for ${color}.`,
    failed: (color: string) => `We couldn’t read help for ${color}. The count above is unchanged, and nothing was spent.`,
    failedMark: "Couldn’t read",
    retry: "Try again",
  },
  cite: {
    before: "Needed figures are from Frank Karsten, “How Many Sources Do You Need to Consistently Cast Your Spells? A 2022 Update”,",
    after: "using its 99-card column. The land count is his Commander formula, with its constants as quoted in secondary write-ups. They’re a reference point for reading the count, not a target.",
    landOnlyBefore: "The land count is Frank Karsten’s Commander formula, from “How Many Sources Do You Need to Consistently Cast Your Spells? A 2022 Update”,",
    landOnlyAfter: "with its constants as quoted in secondary write-ups. It’s a reference point, not a target.",
    link: "TCGplayer",
  },
} as const;
