// Mana Balance R3 / R3a / R3b — proposed additions to src/lib/copy/tuning.ts (or a mana-balance.ts beside it).
// Current as of R3b (LGTM, Hugh, 2026-10-11). Every string is a PLACEHOLDER owed to /copy-review.
// US English. No em dashes in shipped strings.
// Retired: R1 B's status (`covered` / `short N`), `have of covers`, Additions/Cuts, `Apply all`, the tally,
// B7's thin-EDHREC sentence; R3's `Help adding a color` picker, its meta line, the outside-the-colors line,
// the "Nothing changes" foot, the `Reading the Karsten figure` box; R3a's lead line.

export const manaBalanceCopy = {
  title: "Mana Balance",
  sub: (pips: number, sources: number) => `free · counted just now · ${pips} pips · ${sources} sources, as on Deck stats`,
  lead: "Pips and sources for each color, counted the way the Colors card counts them, beside what each color’s tightest cost needs.",
  table: {
    head: { color: "Color", pips: "Pips", sources: "Sources", needed: "Needed" },
    share: (n: number, pct: number) => `${n} · ${pct}%`,
    without: (n: number, commander: string) => `${n} without ${commander}`,
    split: (lands: number, other: number) => `${lands} lands · ${other} other`,
    neededFor: (card: string, more: number, code: string) => (more > 0 ? `for ${card} and ${more} more (${code})` : `for ${card} (${code})`),
    noPips: "no pips to cast",
    colorless: (pips: number, sources: number, pct: number) => `${pips === 0 ? "no" : pips} {C} pips · ${sources} sources · ${pct}%`,
  },
  needs: {
    // StripRationale disclosure (strip-rationale.tsx).
    toggle: "What “Needs” means",
    close: "Hide",
    needsLabel: "Needs",
    needsBody: "Frank Karsten’s math: sources of this color a 99-card deck needs to cast this on curve about 9 times in 10.", // Hugh, verbatim
    sourceLabel: "Source",
    sourceBody: "Frank Karsten, “How Many Sources Do You Need to Consistently Cast Your Spells? A 2022 Update”,",
    sourceLink: "TCGplayer", // + 14px link-out glyph
    sourceTail: "A reference point for reading the count, not a target.",
  },
  sections: {
    // Consider's ShelfSection header.
    hardest: { label: "Hardest costs", clause: (colors: string) => `six per color · ${colors}` },
    lands: { label: "Lands", clause: (lands: number, tapped: number, count: string) => `${lands} lands · ${tapped} can enter tapped · Karsten’s count ${count}` },
  },
  patterns: {
    head: { cost: "Cost", cards: "Cards", needed: "Needed" },
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
    always: "Enter tapped",
    unless: "Tapped unless a condition holds",
    fetch: "Fetch a land that enters tapped",
    average: "Average mana value",
    averageNote: (commander: string) => `counts ${commander} as a card`,
    karsten: "Karsten’s land count",
    formula: (avg: string, ramp: number) => `31.42 + 3.13 × ${avg} − 0.28 × ${ramp} cheap ramp`,
    caveat: (ramp: number) => `Cheap ramp is the ${ramp} mana sources at mana value 3 or less. Draw spells aren’t counted, so for a deck that draws a lot this figure runs high.`,
  },
  thin: {
    colorless: "No card in this deck has a colored pip, so there’s no color to count and no color to help with. The lands and the colorless count below still stand.",
    noSources: "Pips and Karsten’s figures still show, so the count is ready when lands go in.", // after deckStatsCopy.colors.noLands
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
    cost: (code: string, cards: number) => `${code} · ${cards} cards`,
    noPips: (sources: number) => `${sources} sources · no pips`,
  },
  help: {
    head: (color: string) => `Help adding ${color}`,
    change: "Change color",
    swaps: "Swap basics",
    swap: (n: number, out: string, into: string) => `Up to ${n} ${out}s → ${into}s`,
    change_: (color: string, before: number, after: number) => `${color} ${before} → ${after}`,
    noSwap: (color: string) => `No basic swap for ${color}.`,
    howLabel: "How moves are picked",
    how: (color: string) => `A swap or a trade is offered only if ${color} gains a source and every other color either keeps its count or stays at or above what its tightest cost needs. A locked basic never moves.`,
    staples: (commander: string) => `Staples ${commander} decks run · owned first`,
    owned: (free: number) => `owned · ${free} free`,
    toBuy: "to buy",
    buyLink: "Mana Pool ↗",
    rate: { commander: (p: number, name: string) => `in ${p}% of ${name} decks`, pair: (p: number) => `in ${p}% of this pairing’s decks`, identity: (p: number, bucket: string) => `${bucket} average, ${p}%` },
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
    full: "Needed figures are from Frank Karsten, “How Many Sources Do You Need to Consistently Cast Your Spells? A 2022 Update”, TCGplayer, using its 99-card column. The land count is his Commander formula, with its constants as quoted in secondary write-ups. They’re a reference point for reading the count, not a target.",
    landOnly: "Karsten’s land count is his Commander formula, from “How Many Sources Do You Need to Consistently Cast Your Spells? A 2022 Update”, TCGplayer, with its constants as quoted in secondary write-ups. It’s a reference point, not a target.",
    link: "TCGplayer", // + 14px link-out glyph
  },
  strip: { balance: "balance mana →", balanceShort: "balance →" },
} as const;

// About entry (R3 M10), for src/lib/copy/about.ts, chapter 04 after `suggested-changes`.
// switch: 'MANA_BALANCE_ENABLED' (add to AboutSwitch). since: the Tuning line's close-out bump.
export const manaBalanceAboutEntry = {
  id: "mana-balance",
  switch: "MANA_BALANCE_ENABLED",
  chapter: "04",
  title: "Reading your deck’s mana",
  route: "/decks",
  opens: "opens a deck’s Analysis tab",
  width: "plate",
  caption:
    "Wondering whether your deck can cast what it asks for? Mana Balance, under Tuning on a deck’s Analysis tab, puts each color’s pips beside its sources, counted the same way as the Colors card, with what each color’s tightest cost needs alongside.\n\nIt won’t tell you a color is short. That call depends on how the deck plays, so the figures sit side by side and you decide. Want help? Improve my mana lists your colors, tightest first. Pick one to see basics that could swap to it and staples your commander’s decks run, the ones you own first.",
  keys: [
    "Pips count the commander, as the Colors card does. The figure without it sits underneath.",
    "Needs is Frank Karsten’s figure: the sources a 99-card deck needs to cast a cost on curve about 9 times in 10.",
    "Improve my mana only offers your commander’s colors, and nothing is picked for you.",
    "Karsten’s figures come from his 2022 article on TCGplayer. They’re a reference point, not a target.",
  ],
} as const;
