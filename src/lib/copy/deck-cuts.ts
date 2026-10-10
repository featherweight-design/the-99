// Proposed cuts, the model tier's copy. ONE exported object so it can go to /copy-review as a block.
// Everything here is a PLACEHOLDER owed to /copy-review. US English, no em dashes.
// The `panel` block is the Tuning hub R2 canvas's `cuts` block (design/design_handoff_the99_tuning_hub),
// carried as drawn with the engineering additions marked below.

import { numberWord } from "./deck-analysis";

/** "sixth": the shortfall slot's ordinal, spelled up to twelfth and a numeral past it. */
const ORDINAL_WORDS = [
  "zeroth", "first", "second", "third", "fourth", "fifth", "sixth",
  "seventh", "eighth", "ninth", "tenth", "eleventh", "twelfth",
] as const;
export function ordinalWord(n: number): string {
  if (Number.isInteger(n) && n >= 1 && n < ORDINAL_WORDS.length) return ORDINAL_WORDS[n];
  const rem100 = n % 100;
  const suffix = rem100 >= 11 && rem100 <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th";
  return `${n}${suffix}`;
}
const BODY_WORDS: Record<number, string> = { 99: "ninety-nine", 98: "ninety-eight" };
const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);

export const deckCutsCopy = {
  /** The rules the model is told and the validator holds it to: one text, so the two cannot drift. */
  rules: {
    onlyListed: "Cut only cards in the list below, spelled as the list spells them.",
    noKeyCards: "Never cut a Key card.",
    citeFigures: "Every reason must cite a fact you were given. Add one cites entry for each fact the reason uses.",
    citeExact: "A cited figure must equal the figure given for that card or that deck. A figure that differs is discarded.",
    noBracketClaim: "No reason may name a bracket.",
    noResultClaim: "No reason may promise a result: not that a cut will win, lose, or make the deck stronger.",
    quotedNote: "A quoted part of the player's intent must be byte-identical to the intent as shown, in quotation marks.",
    noInvention: "Do not state what a card does. Use only the names and figures you were given.",
    noOwnershipRanking: "Ownership and price may not affect which cards you cut or their order.",
  },
  prompt: {
    task: (over: number) =>
      `You propose cuts for a Magic: The Gathering Commander deck that is ${over} ${over === 1 ? "card" : "cards"} over 100.`,
    count: (over: number) =>
      `Propose exactly ${over} ${over === 1 ? "cut" : "cuts"}. Propose fewer only if the deck genuinely has fewer defensible cuts.`,
    cites: "Cite with one of six kinds: inclusion (the card's percent), offList, role (role, have, target), curve (cmc, have), flag, intent.",
    reasonLength: "Write each reason in one plain line, 200 characters at most.",
  },
  /** Refusals from the run action. The in-flight, allowance and locked refusals reuse the Suggested
   *  changes copy, which says the same thing in the same words. */
  run: {
    refused: "We couldn\u2019t read that deck.",
    notOver: "This deck isn\u2019t over 100 cards, so there is nothing to cut. No credit is used.",
    tooBig: "This deck is too large for Proposed cuts to read. No credit is used.",
  },
  /** Plain words for what the facts had to go without. */
  missing: {
    inclusion: "No EDHREC list was available, so cards carry no inclusion figure.",
    roleTargets: "Role targets are the defaults, not measured for this commander.",
    curve: "No average curve was available.",
  },
  flags: {
    gameChanger: "Game Changer",
    massLandDenial: "mass land denial",
    extraTurn: "extra turn",
    combo: "combo piece",
  },
  reasonMaxLength: 200,
  panel: {
    heading: "Proposed cuts",
    sub: "free count · look deeper 1 credit",
    counting: "Counting your cards.",
    /** Over-99 lead's bold half comes from `overCopy`; these are the sentences after it. */
    lead: "Below is what we counted. To have the cards named, look deeper.",
    /** The over lead, against the deck's own body: 99, or 98 with a partner. */
    overLead: (words: string, bodySize: number) => `${words} over the ${BODY_WORDS[bodySize] ?? bodySize}.`,
    leadBare: "Below is what we counted.",
    leadNamed: (n: number) => `${cap(numberWord(n))} ${n === 1 ? "card" : "cards"} named. Cut writes to the list straight away.`,
    leadPart: (cut: number, kept: number, named: number, open: number) =>
      `${cap(numberWord(cut))} cut, ${numberWord(kept)} kept. ${cap(numberWord(named))} ${named === 1 ? "was" : "were"} named, so ${numberWord(open)} ${open === 1 ? "is" : "are"} left open.`,
    facts: {
      head: "What we counted",
      read: (cards: number, commander: string, decks: number | null, bracket: number | null) =>
        `from ${cards} cards${decks === null ? "" : ` · EDHREC for ${commander}, ${decks.toLocaleString("en-US")} decks`}${bracket === null ? "" : ` · bracket ${bracket}, as declared`} · free`,
      dividerResult: "The count",
      dividerPart: "The count, as the list is now",
      none: "Nothing runs long: no role, slot or flag is over.",
    },
    sources: { role: "role", curve: "curve", bracket: "bracket", edhrec: "edhrec" },
    cut: "Cut",
    keep: "Keep",
    cutDone: "cut",
    kept: "kept",
    undo: "Undo",
    showAgain: "Show it again",
    suggestion: "Suggestion",
    neverCut: (commander: string, locked: number, key: number) =>
      `Never named: ${commander}${locked > 0 ? `, the ${locked} ${locked === 1 ? "card" : "cards"} you locked` : ""}${key > 0 ? `${locked > 0 ? " and" : ", and"} the ${key} Key ${key === 1 ? "card" : "cards"}` : ""}.`,
    done: {
      head: (body: number, cut: number) => `Back to ${body} / ${body}. You cut ${cut}.`,
      body: "The deck isn\u2019t over any more, so Proposed cuts closes here.",
    },
    deeper: {
      offerTitle: (n: number) => `Name the ${numberWord(n)} ${n === 1 ? "cut" : "cuts"}`,
      offerLead: (n: number) =>
        `A deeper look names ${numberWord(n)} ${n === 1 ? "card" : "cards"} to cut, each with a reason taken from the count below. It also reads your description.`,
      offerLeadThin: "EDHREC has no list for this commander to count against, so a deeper look names cuts from roles, curve, bracket and your description only.",
      action: "Look deeper",
      credit: "1 credit",
      actionAria: "Look deeper. Uses 1 credit.",
      actionAriaSpent: "Look deeper. No credits left.",
      pending: "Looking deeper\u2026",
      pendingLead: (n: number) => `Naming ${numberWord(n)} ${n === 1 ? "cut" : "cuts"} from the count below. You can keep editing the deck while it reads.`,
      pendingRead: "reading the count and your description",
      stop: "Stop",
      stopNote: "stopping gives the credit back",
      resultHead: (n: number) => `${cap(numberWord(n))} to cut`,
      resultRead: "named by a deeper look \u00b7 read the count below and your description",
      resultFoot: (named: number, asked: number) => `${named} of ${asked} named \u00b7 each figure checked against the count`,
      shortRow: (n: number) => `A ${ordinalWord(n)} wasn\u2019t named`,
      shortWhy: "it cited a figure the count doesn\u2019t have \u00b7 left out, not replaced",
      refused: "The deeper look didn\u2019t name a cut it could back with a count, so nothing is shown. Your credit is back.",
      refusedFoot: "your list is untouched \u00b7 the count below stands",
      failedTag: "Didn\u2019t finish",
      failedHeading: "The deeper look didn\u2019t finish",
      failedBody: "No answer came back in time, so no card was named. Your credit is back.",
      retry: "Try again",
      untouched: "your list is untouched",
    },
    allLocked: (commander: string) =>
      `Every card but ${commander} is locked or a Key card, so a deeper look has nothing it may name. Unlock a card on Your deck and it is offered here.`,
    failed: { tag: "Couldn\u2019t count", heading: "We couldn\u2019t count this deck\u2019s cards", body: "The card catalog didn\u2019t answer. It is usually back within a minute." },
    refusals: {
      cutGone: "That card is no longer in the deck, so nothing was cut.",
      cutLocked: "That card is locked, so it was not cut.",
      moved: "The deck has changed since that cut, so it could not be put back.",
      stale: "The deck has changed since these cuts were named, so nothing was cut. Look deeper again for the list as it is now.",
      generic: "We couldn\u2019t do that. Nothing changed.",
    },
    announce: {
      started: "Looking deeper.",
      ready: (n: number) => `${numberWord(n)} ${n === 1 ? "cut" : "cuts"} named.`,
      refused: "The deeper look named nothing. Your credit is back.",
      failed: "The deeper look didn\u2019t finish. Your credit is back.",
      stopped: "Stopped. Your credit is back.",
      cut: (name: string) => `Cut ${name}.`,
      undone: (name: string) => `Put ${name} back.`,
      kept: "Kept.",
      restored: "Shown again.",
    },
  },
} as const;

export type CutsRuleKey = keyof typeof deckCutsCopy.rules;
