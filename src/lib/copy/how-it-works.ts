// About, "How the app reaches its answers" (handoff about_how_it_works R1, audit Yellow; Hugh's
// rulings 2026-09-28). Eight reference rows, one per thing the app decides.
//
// RULES
//   1. Rows are NOT `AboutEntry`s: no `since`, no NEW, never in the what's-new index.
//   2. Every figure that lives in code is TEMPLATED from its constant, never typed, so a changed
//      constant changes the sentence (handoff rule 2).
//   3. No clock times: the schedules run on GitHub, which starts them hours late (brief §3).
//      Each cadence below was checked against the workflows on `main` before the PR merged.
//   4. No line promises that a build has already happened: an empty ledger never auto-builds.
//   5. Kept apart from `about.ts`, which the proxy reaches through `visible.ts`: these rows import
//      the scoring and allowance constants, and none of that belongs in the proxy's bundle.
//
// Wording passed /copy-review in lane (2026-09-28), with the audit's five notes applied.

import { RELEASE_DELAY_DAYS, RELEASE_SET_TYPES } from "../catalog/index-due";
import { FLAT_TARGETS } from "../decks/mix";
import { THEME_ORDER } from "../recs/themes";
import { FLOOR_PCT } from "../discovery/floor";
import { MODEL_FRIEND_DAILY_ALLOWANCE, MODEL_OWNER_DAILY_ALLOWANCE } from "../model/allowance-rule";
import { READY_COUNT, READY_SHOWN } from "../recs/ready-to-build";
import { POOL_FULL_AT, POOL_WEIGHT, ROLES_WEIGHT, SYNERGY_WEIGHT } from "../recs/score";
import { howItWorksCopy, type HowMethod } from "./about";
import { deckAnalysisCopy } from "./deck-analysis";

const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const word = (n: number) => NUMBER_WORDS[n] ?? String(n);

/** "monthly, and about two weeks after each new expansion or Commander set": `indexDue`. */
const SET_TYPE_NAMES: Record<string, string> = { expansion: "expansion", commander: "Commander set" };
const INDEX_CADENCE =
  `monthly, and about ${word(Math.round(RELEASE_DELAY_DAYS / 7))} weeks after each new ` +
  RELEASE_SET_TYPES.map((t) => SET_TYPE_NAMES[t] ?? `${t} set`).join(" or ");

const f = FLAT_TARGETS;

export type HowVerdict = "exact" | "partial" | "mixed" | "written";

export type HowRowCopy = {
  id: string;
  title: string;
  methods: readonly HowMethod[];
  verdict: HowVerdict;
  from: string;
  how: string;
  refresh: string;
  exact: string;
};

/** The few labels the client rows draw, handed to them as a prop (see `HowRows`). */
export type HowRowLabels = {
  fields: { from: string; how: string; refresh: string; exact: string };
  verdicts: Record<HowVerdict, string>;
  bracketsLead: string;
  explainedIn: string;
};

export const howItWorksRowsCopy = {
  pageIntroClause: "And if you want to see the working, How the app reaches its answers, at the very end, says where every answer comes from.",
  title: "How the app reaches its answers",
  sub:
    "One row for each thing the app decides. Open a row to see where its answer comes from, how " +
    "we get there, when it refreshes and what it can miss.",
  keyHeading: "Five ways we reach an answer",
  keyDefs: {
    rules: "Read straight off a card: its rules text and type line.",
    decks: "What other players actually run, measured on EDHREC and Commander Spellbook.",
    model: "Written by a model and checked before you see it.",
    you: "What you’ve told the app, from your Collection to the choices you make in your decks.",
    list: "A list someone else publishes, used as they publish it.",
  } satisfies Record<HowMethod, string>,
  fields: { from: "comes from", how: "decided by", refresh: "refreshes", exact: "exact or partial" },
  explainedIn: "explained in",
  verdicts: { exact: "exact", partial: "partial", mixed: "exact and partial", written: "written" },
  rowToggle: (title: string) => `How the app decides ${title.toLowerCase()}`,
  bracketsLead: "Partial, count by count:",

  rows: [
    {
      id: "how-brackets",
      title: "Brackets",
      // Two tags, as the handoff draws it: `published list` belongs to Game Changers, and its
      // sub-row carries it.
      methods: ["rules", "decks"],
      verdict: "partial",
      from:
        "The Commander Format Panel’s bracket rules, which we write into the app ourselves. Game " +
        "Changers are Wizards’ own list, as Scryfall carries it. For mass land denial and extra " +
        "turns, we put Commander Spellbook’s estimate together with our own read of the rules text. " +
        "Two-card infinite combos come from Commander Spellbook, and tutors from the rules text.",
      how:
        "The lowest bracket your cards fit. Brackets 1 and 2 can come back as a range, and so can " +
        "4 and 5, because those turn on what you meant the deck to be. You pick. Between 3 and 4, " +
        "it comes down to whether the deck’s searches can find every piece of a two-card combo. A piece " +
        "in the command zone already counts as found.",
      refresh:
        "Worked out when you press Analyze, then kept. It goes stale when you edit the deck, and " +
        "only then. Card data refreshes daily, combos weekly.",
      exact: "Partial, count by count:",
    },
    {
      id: "how-roles",
      title: "Roles and targets",
      methods: ["rules", "decks"],
      verdict: "partial",
      from:
        "Each card’s role comes from its rules text and type line. The deck’s targets come from " +
        "EDHREC: what decks with your commander run, each card counted by the share of decks " +
        "that run it.",
      how:
        "A land is read from its type line. Ramp, draw, removal and wipes are patterns in the " +
        "rules text, and one card can fill several. A target comes " +
        "from the closest group of decks we can measure: your pair, then your commander, then " +
        "decks in your colors, then decks with the same number of colors. With none of those to " +
        "go on, we fall back to " +
        `${f.ramp} ramp, ${f.draw} draw, ${f.removal} removal, ${f.wipes} wipes and ${f.land} ` +
        `lands (${f.land - 1} beside a partner), and the strip tells you which you got.`,
      // Brief §5.4: the fit score (recs/score.ts), Role Coverage (commanders/coverage-section.tsx)
      // and the thinnest role (recs/weakest-role.ts) all grade against the same measured targets.
      refresh: `Roles are read live. The measured targets update ${INDEX_CADENCE}. The fallback stays put.`,
      exact:
        "Partial, and we have no miss rate to give you for the role reading. The same targets " +
        "feed the fit score, Role Coverage on a commander’s page and the thinnest role in Why " +
        "this commander.",
    },
    {
      id: "how-themes",
      title: "Card and commander themes",
      methods: ["decks", "rules"],
      verdict: "mixed",
      from:
        `Two different things share the name. A commander’s themes are EDHREC’s tags. A card’s themes are ${THEME_ORDER.length} ` +
        "patterns we read from its rules text.",
      how:
        "Commander themes drive Discover’s line, Help me choose and Something new. What you’ve " +
        "played counts every deck you have, drafts included. Card themes show up only in " +
        "stand-ins and Find a deck.",
      refresh: `Commander themes update ${INDEX_CADENCE}. Card themes are read live.`,
      exact: "Commander themes match EDHREC exactly. Card themes are partial, with no miss rate to give.",
    },
    {
      id: "how-recommendations",
      title: "Commander recommendations",
      methods: ["decks", "you", "rules"],
      verdict: "exact",
      from: "Your Collection, held up against each commander’s list on EDHREC.",
      how:
        `The fit score adds up Pool ${POOL_WEIGHT}, Roles ${ROLES_WEIGHT} and Synergy ${SYNERGY_WEIGHT}. ` +
        `Pool is full at ${POOL_FULL_AT} legal cards. Synergy is how much of the commander’s list ` +
        `you own. A commander with no list scores out of ${POOL_WEIGHT + ROLES_WEIGHT}. Something new ` +
        `needs you to own ${FLOOR_PCT}% of the list. Ready to build shows ${word(READY_SHOWN)} of ` +
        `the top ${READY_COUNT}, picked afresh at midnight UTC each day, and all of them when ` +
        `${word(READY_SHOWN)} or fewer qualify.`,
      refresh: `Your Collection is read live. The lists update ${INDEX_CADENCE}.`,
      exact: "The arithmetic is exact. Its Roles part grades against the same targets your deck does, measured wherever we can.",
    },
    {
      id: "how-availability",
      title: "Availability and claims",
      methods: ["you"],
      verdict: "exact",
      from:
        "Your Collection and your decks, plus the copies you’ve assigned, the ones you’ve pulled " +
        "and the cards you’ve marked as proxies.",
      how:
        "A committed deck claims the cards in its newest version. A deck you’ve never committed " +
        "claims softly, from its list. Commanders claim their copies too. When decks want the same " +
        "copy, the one that’s held that card longest keeps it, unless you hand it to another. A " +
        "card you mark as a proxy claims nothing.",
      refresh: "Live.",
      exact: "Exact.",
    },
    {
      id: "how-prices",
      title: "Prices",
      methods: ["list"],
      verdict: "exact",
      from: "ManaPool’s singles feed.",
      how:
        "We price one printing per card: one in stock first, then non-foil over foil, then the " +
        "cheapest. No figure means we have no usable price for it. Foil-only means every " +
        "copy for sale is foil or etched. Sold out means the newest price we have is from an " +
        "earlier refresh.",
      refresh: "Daily.",
      exact: "Exact to the feed.",
    },
    {
      id: "how-stand-ins",
      title: "Stand-ins and Find a deck",
      methods: ["rules", "decks", "you"],
      verdict: "partial",
      from: "The rules text, your deck’s colors, Commander Spellbook, card themes and EDHREC.",
      how:
        "A stand-in does at least one of the same jobs, at the same mana value or less. A card " +
        "with no role we can name gets no stand-ins. Find a deck lists first a deck where the " +
        "card completes a combo, then one whose theme it joins, then the rest by EDHREC synergy, " +
        "then by name. For a staple, the decks go by name alone.",
      refresh:
        "Worked out when you ask, from your deck as it is right now. The combos behind it refresh weekly, " +
        `prices daily, and EDHREC’s synergy ${INDEX_CADENCE}.`,
      exact: "Partial, because it rests on the role and theme readings above.",
    },
    {
      id: "how-written",
      title: "Written text and credits",
      methods: ["model"],
      verdict: "written",
      from:
        "A model writes the opening sentence of Why this commander, the Overview, Suggested " +
        "changes and Look deeper.",
      how:
        "In the Overview and Suggested changes, the figures are the app’s own and the model only " +
        "puts them into words. Look deeper turns what you write into the app’s own theme, card, " +
        "budget and bracket choices, and never names a commander. Every answer is checked before " +
        `you see it, and one that fails the check is dropped. Credits: the owner has ${MODEL_OWNER_DAILY_ALLOWANCE} and friends ` +
        `have ${MODEL_FRIEND_DAILY_ALLOWANCE} in any 24 hours, shared by the Overview, Suggested ` +
        "changes and Look deeper. A credit is spent only when an answer arrives. The commander " +
        "sentence costs you nothing.",
      refresh:
        `The commander sentence updates ${INDEX_CADENCE}. The Overview and Suggested changes are ` +
        "written when you press for them, and the Overview stays until the list changes. Look " +
        "deeper keeps its answer while your words, budget and bracket stay the same, and asks again when " +
        "any of them changes.",
      exact: "Neither. It’s written, not measured.",
    },
  ] as const satisfies readonly HowRowCopy[],
} as const;

/**
 * The page intro with the appendix named, as a paragraph of its own after the intro. Built from
 * `aboutCopy.pageIntro` rather than restating it, so an edit to the intro reaches both forms. Read
 * only while `HOW_IT_WORKS_ENABLED` is on.
 */
export function introWithAppendix(intro: string): string {
  return `${intro}\n\n${howItWorksRowsCopy.pageIntroClause}`;
}

/**
 * The Brackets row's five counts, one sub-row each. Four are the sentences "How we make these
 * decisions" shows, read from the same keys, so the page and the sheet cannot disagree about how a
 * count is reached. The fifth is tutors, which the sheet carries too (brief §5.5), though no bracket
 * limits them.
 */
export function bracketSubRows(): { label: string; methods: readonly HowMethod[]; lines: string[] }[] {
  const d = deckAnalysisCopy.detection;
  const l = deckAnalysisCopy.findings.labels;
  const m = howItWorksCopy.bracketMethods;
  const lines = (...xs: (string | null)[]) => xs.filter((x): x is string => !!x);
  return [
    { label: l.gameChangers, methods: m.gameChangers, lines: lines(d.gameChangers.from) },
    { label: l.massLandDenial, methods: m.landDenial, lines: lines(d.landDenial.from, d.landDenial.misses) },
    { label: l.extraTurns, methods: m.extraTurns, lines: lines(d.extraTurns.from, d.extraTurns.misses) },
    { label: l.twoCardCombos, methods: m.combos, lines: lines(d.combos.from, d.combos.misses) },
    { label: l.tutors, methods: m.tutors, lines: lines(d.tutors.from, d.tutors.misses) },
  ];
}
