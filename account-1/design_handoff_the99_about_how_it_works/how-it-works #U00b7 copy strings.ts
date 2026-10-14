// how-it-works · copy strings — About R1 addendum: "How the app reaches its answers".
// Destination: src/lib/copy/about.ts, as `howItWorksCopy` beside `aboutCopy`. Goes through /copy-review.
// Brief: docs/superpowers/design-briefs/2026-09-28-how-it-works.md (§2 rows, §3 locked).
//
// RULES
//   1. Rows are NOT AboutEntry: no `since`, no NEW, never in the sheet or index. They ride the
//      next batched ABOUT_VERSION bump (brief §3) with the pageIntro clause below.
//   2. Every figure that lives in code is TEMPLATED, never typed: the bracket sub-rows are built
//      from MLD_DETECTION / EXTRA_TURN_DETECTION / COMBO_DETECTION exactly as
//      deckAnalysisCopy.detection is, and ROLE_TARGETS, the fit weights, the 200-card pool, 30%,
//      28, credits (allowance-rule.ts) are read from their constants. Literals below are fixtures.
//   3. No em dashes in shipping strings.
//   4. Nothing is a score or a percentage that is not already one in the app.

export type Method = 'rules' | 'decks' | 'model' | 'you';

export const howItWorksCopy = {
  /** Appended to aboutCopy.pageIntro's first sentence. */
  pageIntroClause: ', then how the app reaches its answers',
  title: 'How the app reaches its answers',
  sub: 'Grouped by what the app decides. Each row says where an answer comes from, how it is decided, how often it refreshes, and what it might miss.',
  keyHeading: 'Four ways an answer is reached',

  /** MethodTag labels + key definitions. `short` is the in-page key; `def` is the long form (sheet, tooltips). */
  methods: {
    rules: {
      tag: 'rules text',
      short: 'Read from a card’s own rules text and type line.',
      def: 'Read from a card’s own rules text and type line. It is a reading, so a card worded in an unusual way can slip past it.',
    },
    decks: {
      tag: 'other decks',
      short: 'Measured from other players’ decks, on EDHREC and Commander Spellbook.',
      def: 'Measured from decks other players have built, as EDHREC and Commander Spellbook record them. It is as good as their data, and as fresh as our last read of it.',
    },
    model: {
      tag: 'model-written',
      short: 'Written by a model, then checked before it is shown.',
      def: 'Written by a model, from figures the app has already worked out. Every answer is checked before it is shown. It is written rather than measured.',
    },
    you: {
      tag: 'your input',
      short: 'What you told the app: your cards, your decks, your choices.',
      def: 'What you have told the app: your collection, your decks, and the choices you make in them. It is exactly as right as what you entered.',
    },
  },

  fields: { from: 'comes from', how: 'decided by', refresh: 'refreshes', exact: 'exact or partial' },
  explainedIn: 'explained in',
  verdicts: { exact: 'exact', partial: 'partial', mixed: 'exact and partial', written: 'written' },
  /** Entry link line, after an entry's keys. */
  entryLink: 'How this is decided',
  rowToggle: (title: string) => `How the app decides ${title.toLowerCase()}`,
  railGroup: 'How the app reaches its answers',
  railCount: (n: number) => `${n} rows`,

  rows: [
    {
      id: 'how-brackets', title: 'Brackets', methods: ['rules', 'decks'], verdict: 'partial',
      from: 'The Commander Format Panel’s bracket rules, which we transcribe. Game Changers are Wizards’ list, as Scryfall carries it. Land denial and extra turns combine Commander Spellbook’s estimate with our reading of the rules text. Two-card infinites come from Commander Spellbook. Tutors come from the rules text.',
      how: 'The lowest bracket your cards satisfy. 1 and 2 stay a range, and so do 4 and 5: which one it is, is yours to say. Whether a deck is 3 or 4 turns on whether it can find every piece of one combo, and a piece in the command zone counts as found.',
      refresh: 'Worked out when you press Analyze, and kept. An edit makes it stale; time never does. Card data and combos refresh weekly.',
      exact: 'Partial, count by count:',
      // Sub-rows: label from deckAnalysisCopy.findings.labels; text from deckAnalysisCopy.detection
      // (misses lines), Game Changers = 'Exact.'. Tutors: ⚠ brief §5.5, no stated accuracy — engineering.
      sub: ['gameChangers', 'massLandDenial', 'extraTurns', 'twoCardCombos', 'tutors'],
    },
    {
      id: 'how-roles', title: 'Roles and targets', methods: ['rules', 'decks'], verdict: 'partial',
      from: 'A card’s role is read from its rules text and type line. The deck’s targets come from EDHREC: what decks with your commander run, weighted by how often they run it.',
      how: 'Each role is a pattern in the rules text, and one card can fill several. A target comes from the closest group of decks we can measure: your pair, then your commander, then decks in your colors, then decks with as many colors. With none, it falls back to 10 ramp, 10 draw, 8 removal, 3 wipes and 37 lands, and the strip says which it used.',
      refresh: 'Roles are read live. The measured targets update monthly. The fallback never moves.',
      exact: 'Partial. We state no miss rate for the role reading. The fit score, Role Coverage on a commander’s page and the thinnest role in Why this commander all use the fallback, never the measured targets.',
    },
    {
      id: 'how-themes', title: 'Themes', methods: ['decks', 'rules'], verdict: 'mixed',
      from: 'Two different things. A commander’s themes are EDHREC’s tags. A card’s themes are 21 patterns we read from its rules text.',
      how: 'Commander themes drive Discover’s line, Help me choose and Something new, and what you have played counts every deck you have, drafts included. Card themes drive only stand-ins and Find a deck.',
      refresh: 'Commander themes update monthly. Card themes are read live.',
      exact: 'Commander themes are exact to EDHREC. Card themes are partial, and we state no miss rate.',
    },
    {
      id: 'how-recommendations', title: 'Commander recommendations', methods: ['decks', 'you'], verdict: 'exact',
      from: 'Your collection, set against each commander’s list on EDHREC.',
      how: 'A fit score adds Pool 15, Roles 25 and Synergy 60. Pool is full at 200 legal cards. Synergy is how much of the commander’s list you own. With no list, the score is out of 40. Something new needs you to own 30% of the list. Ready to build shows two of the top 28, changing daily at midnight UTC.',
      refresh: 'Your collection is read live. The lists update monthly.',
      exact: 'The arithmetic is exact. Its Roles part uses the fallback targets.',
    },
    {
      id: 'how-availability', title: 'Availability and claims', methods: ['you'], verdict: 'exact',
      from: 'Your collection and your decks, with the copies you have assigned and the ones you have pulled.',
      how: 'A committed deck claims from its newest version. A deck never committed claims softly, from its list. Commanders claim too. When decks share a copy, the one that sleeved it first keeps it, unless you give it to another.',
      refresh: 'Live.',
      exact: 'Exact.',
    },
    {
      // ⚠ OPEN 1: fits none of the four methods. Untagged until ruled.
      id: 'how-prices', title: 'Prices', methods: [], verdict: 'exact',
      from: 'ManaPool’s singles feed.',
      how: 'One printing per card: one in stock first, then non-foil over foil, then the cheapest. No figure means ManaPool has never stocked it. Foil-only is a real state. Sold out means the newest price is from an earlier week.',
      refresh: 'Weekly, Monday 09:00 UTC.',
      exact: 'Exact to the feed.',
    },
    {
      id: 'how-stand-ins', title: 'Stand-ins and Find a deck', methods: ['rules', 'decks'], verdict: 'partial',
      from: 'The rules text, your deck’s colors, Commander Spellbook, card themes and EDHREC.',
      how: 'A stand-in shares a job at the same or lower mana value, and a card with no role gets none. Find a deck puts a combo the card completes first, then a theme it joins, then EDHREC synergy, then the name. A staple’s decks are listed by name alone.',
      refresh: 'Live.',
      exact: 'Partial, because it rests on the role and theme readings above.',
    },
    {
      id: 'how-written', title: 'Written text and credits', methods: ['model'], verdict: 'written',
      from: 'A model writes the opening sentence of Why this commander, the Overview, Suggested changes and Look deeper.',
      how: 'In the Overview and Suggested changes the figures are the app’s, and the model only phrases them. Look deeper turns your words into the app’s own theme, card, budget and bracket choices, and never names a commander. Every answer is checked, and one that fails is not shown. Credits: 10 a day for the owner and 3 for friends, over a rolling 24 hours, shared by the Overview, Suggested changes and Look deeper. Only an answer that arrives spends one. The commander sentence costs you nothing.',
      refresh: 'The commander sentence updates monthly. The Overview and Suggested changes are written when you press, and the Overview is kept until the list changes.',
      exact: 'Neither. It is written, not measured.',
    },
  ],
} as const;

/**
 * Entry id → row id. ONE row per entry: the row behind the entry's main figure. An entry with no
 * key draws no link line. A row's `explained in` is this map inverted, in page order.
 * Card labels are excluded (brief §3): nothing reads them.
 */
export const entryRow: Record<string, string> = {
  'decklist-marks': 'how-brackets',
  'combo-awareness': 'how-brackets',
  'roles': 'how-roles',
  'informed-build': 'how-roles',
  'role-coverage': 'how-roles',
  'auto-fill': 'how-roles',
  'discover': 'how-themes',
  'ready-to-build': 'how-recommendations',
  'fit-score': 'how-recommendations',
  'commander-lane': 'how-recommendations',
  'help-me-choose': 'how-recommendations',
  'availability': 'how-availability',
  'commander-availability': 'how-availability',
  'reservations': 'how-availability',
  'post-import': 'how-availability',
  'commitments': 'how-availability',
  'buy-tag': 'how-prices',
  'sets': 'how-prices',
  'shopping': 'how-prices',
  'stand-ins': 'how-stand-ins',
  'fits-your-decks': 'how-stand-ins',
};
