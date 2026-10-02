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
  pageIntroClause: ", then how the app reaches its answers",
  title: "How the app reaches its answers",
  sub:
    "Grouped by what the app decides. Each row says where an answer comes from, how it is " +
    "decided, how often it refreshes, and what it might miss.",
  keyHeading: "Five ways an answer is reached",
  keyDefs: {
    rules: "Read from a card’s own rules text and type line.",
    decks: "Measured from other players’ decks, on EDHREC and Commander Spellbook.",
    model: "Written by a model, then checked before it is shown.",
    you: "What you told the app: your cards, your decks, your choices.",
    list: "Someone else’s published list, read as they publish it.",
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
        "The Commander Format Panel’s bracket rules, which we transcribe. Game changers are " +
        "Wizards’ list, as Scryfall carries it. Land denial and extra turns combine Commander " +
        "Spellbook’s estimate with our reading of the rules text. Two-card infinites come from " +
        "Commander Spellbook. Tutors come from the rules text.",
      how:
        "The lowest bracket your cards satisfy. 1 and 2 stay a range, and so do 4 and 5, and you " +
        "say which. Whether a deck is 3 or 4 turns on whether it can find every piece of one " +
        "combo, and a piece in the command zone counts as found.",
      refresh:
        "Worked out when you press Analyze, and kept. An edit makes it stale; time never does. " +
        "Card data refreshes daily and combos weekly.",
      exact: "Partial, count by count:",
    },
    {
      id: "how-roles",
      title: "Roles and targets",
      methods: ["rules", "decks"],
      verdict: "partial",
      from:
        "A card’s role is read from its rules text and type line. The deck’s targets come from " +
        "EDHREC: what decks with your commander run, weighted by how often they run it.",
      how:
        "A land is read from its type line; ramp, draw, removal and wipes are patterns in the " +
        "rules text, and one card can fill several. A target comes " +
        "from the closest group of decks we can measure: your pair, then your commander, then " +
        "decks in your colors, then decks with as many colors. With none, it falls back to " +
        `${f.ramp} ramp, ${f.draw} draw, ${f.removal} removal, ${f.wipes} wipes and ${f.land} ` +
        `lands (${f.land - 1} beside a partner), and the strip says which it used.`,
      // Brief §5.4: the fit score (recs/score.ts), Role Coverage (commanders/coverage-section.tsx)
      // and the thinnest role (recs/weakest-role.ts) all grade against the same measured targets.
      refresh: `Roles are read live. The measured targets update ${INDEX_CADENCE}. The fallback never moves.`,
      exact:
        "Partial. We state no miss rate for the role reading. The fit score, Role Coverage on a " +
        "commander’s page and the thinnest role in Why this commander all use these targets.",
    },
    {
      id: "how-themes",
      title: "Card and commander themes",
      methods: ["decks", "rules"],
      verdict: "mixed",
      from:
        `Two different things. A commander’s themes are EDHREC’s tags. A card’s themes are ${THEME_ORDER.length} ` +
        "patterns we read from its rules text.",
      how:
        "Commander themes drive Discover’s line, Help me choose and Something new, and what you " +
        "have played counts every deck you have, drafts included. Card themes drive only " +
        "stand-ins and Find a deck.",
      refresh: `Commander themes update ${INDEX_CADENCE}. Card themes are read live.`,
      exact: "Commander themes are exact to EDHREC. Card themes are partial, and we state no miss rate.",
    },
    {
      id: "how-recommendations",
      title: "Commander recommendations",
      methods: ["decks", "you", "rules"],
      verdict: "exact",
      from: "Your collection, set against each commander’s list on EDHREC.",
      how:
        `A fit score adds Pool ${POOL_WEIGHT}, Roles ${ROLES_WEIGHT} and Synergy ${SYNERGY_WEIGHT}. ` +
        `Pool is full at ${POOL_FULL_AT} legal cards. Synergy is how much of the commander’s list ` +
        `you own. With no list, the score is out of ${POOL_WEIGHT + ROLES_WEIGHT}. Something new ` +
        `needs you to own ${FLOOR_PCT}% of the list. Ready to build shows ${word(READY_SHOWN)} of ` +
        `the top ${READY_COUNT}, changing daily at midnight UTC, and all of them when ` +
        `${word(READY_SHOWN)} or fewer qualify.`,
      refresh: `Your collection is read live. The lists update ${INDEX_CADENCE}.`,
      exact: "The arithmetic is exact. Its Roles part uses the same targets as your deck, measured where we can.",
    },
    {
      id: "how-availability",
      title: "Availability and claims",
      methods: ["you"],
      verdict: "exact",
      from:
        "Your collection and your decks, with the copies you have assigned, the ones you have " +
        "pulled, and the cards you have marked as proxies.",
      how:
        "A committed deck claims from its newest version. A deck never committed claims softly, " +
        "from its list. Commanders claim too. When decks share a copy, the one that sleeved it " +
        "first keeps it, unless you give it to another. A card you mark as a proxy claims nothing.",
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
        "One printing per card: one in stock first, then non-foil over foil, then the cheapest. " +
        "No figure means ManaPool has never stocked it. Foil-only is a real state. Sold out means " +
        "the newest price is from an earlier refresh.",
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
        "A stand-in shares a job at the same or lower mana value, and a card with no role gets " +
        "none. Find a deck puts a combo the card completes first, then a theme it joins, then " +
        "EDHREC synergy, then the name. A staple’s decks are listed by name alone.",
      refresh:
        "Worked out when you ask, from your deck as it stands. The combos behind it refresh weekly, " +
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
        "In the Overview and Suggested changes the figures are the app’s, and the model only " +
        "phrases them. Look deeper turns your words into the app’s own theme, card, budget and " +
        "bracket choices, and never names a commander. Every answer is checked, and one that " +
        `fails is not shown. Credits: the owner has ${MODEL_OWNER_DAILY_ALLOWANCE} and friends ` +
        `have ${MODEL_FRIEND_DAILY_ALLOWANCE} in any 24 hours, shared by the Overview, Suggested ` +
        "changes and Look deeper. Only an answer that arrives spends one. The commander sentence " +
        "costs you nothing.",
      refresh:
        `The commander sentence updates ${INDEX_CADENCE}. The Overview and Suggested changes are ` +
        "written when you press, and the Overview is kept until the list changes. Look deeper keeps " +
        "its answer for the same words, and asks again only when you write something new.",
      exact: "Neither. It is written, not measured.",
    },
  ] as const satisfies readonly HowRowCopy[],
} as const;

/**
 * The page intro with the appendix named, placed after its first sentence ("Four chapters, in the
 * order you would use them"). Built from `aboutCopy.pageIntro` rather than restating it, so an edit
 * to the intro reaches both forms. Read only while `HOW_IT_WORKS_ENABLED` is on.
 */
export function introWithAppendix(intro: string): string {
  const end = intro.indexOf(".");
  return end < 0 ? intro : intro.slice(0, end) + howItWorksRowsCopy.pageIntroClause + intro.slice(end);
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
