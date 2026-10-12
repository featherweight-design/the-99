import { capBody, plainText } from "../decks/notes-body";
import { matchWords, type Chip, type MatchResult, type PhraseIndex } from "./match";
import { READ_TAGS_MAX, READ_WORDS_MAX_CHARS, wordsLength } from "./limits";
import { resolveWords, serializeChooseParams, type ChooseParams } from "./params";

const WORDS_CAP = { measure: wordsLength, maxTags: READ_TAGS_MAX };

export const CHOOSE_PATH = "/decks/new/choose";

/**
 * RETIRED AS THE SUBMIT (rework plan PR 3): the form now submits through `submitChoose`, and its
 * words are never matched into answers (ruling 2). Kept for `scripts/measure-intake-tribes.mts`,
 * which measures what the free match makes of an ask.
 *
 * The form's submit, resolved (plan decision 2): the words are matched ONCE, here, their chips
 * folded into the controls the player set, and the results address carries what that produced.
 * The words stay in `w` for *Change answers*; *Not used* goes in `n`, the words' unmatched
 * phrases first and then anything `resolveWords` set aside, so the results page never matches.
 * The order matters: `n` keeps twelve entries, and the player's own phrases go before a figure.
 *
 * A card already in the params (an address that carries one) is an answer the player kept, and
 * stays: a card the words name besides it goes under *Not used*, as a second card does.
 *
 * Pure over the index, so the redirect a page makes is tested without a request.
 */
export function submitTarget(p: ChooseParams, index: PhraseIndex | null): string {
  // Bounded here as the parser bounds `w`, so no answer comes from words the results would cut.
  const words = plainText(capBody(p.words, READ_WORDS_MAX_CHARS, WORDS_CAP)).trim();
  const match: Pick<MatchResult, "chips" | "phrases" | "themeJoin"> = words && index
    ? matchWords(words, index)
    : { chips: [], phrases: [], themeJoin: "all" };
  // A carried card is the card, when it is still one the intake could offer (the index is built
  // from exactly those, the search's own card rule). One that is not, from an old or hand-edited
  // address, is no answer: the words may then supply the card, as if none were carried.
  const carried = p.card !== null && (index === null || index.cardIds.has(p.card)) ? p.card : null;
  // With a carried card, the words' card chips are all set aside, except the carried card itself,
  // which is simply the answer already given. Without one, `resolveWords` keeps the first.
  const cardChips = match.chips.filter((c): c is Extract<Chip, { kind: "card" }> => c.kind === "card");
  const displaced = carried === null
    ? []
    : [...new Set(cardChips.filter((c) => c.oracleId !== carried).map((c) => c.name))];
  const resolved = resolveWords(carried === null ? match.chips : match.chips.filter((c) => c.kind !== "card"), {
    themes: p.themes,
    themeJoin: p.themeJoin,
    sets: p.sets,
    pool: p.pool,
    budgetDollars: p.budgetDollars,
    bracket: p.bracket,
  }, match.themeJoin);
  return `${CHOOSE_PATH}${serializeChooseParams({
    ...p,
    words,
    themes: resolved.themes,
    themeJoin: resolved.themeJoin,
    sets: resolved.sets,
    pool: resolved.pool,
    card: carried ?? resolved.card,
    budgetDollars: resolved.budgetDollars,
    bracket: resolved.bracket,
    notUsed: [...match.phrases, ...displaced, ...resolved.notUsed],
    // A submit is a new ask: whatever address it came from, it carries no earlier read or marks.
    readId: null,
    deeper: [],
    results: true,
  })}`;
}

/**
 * Where the form's submit lands (rework plan PR 3): the answers as the player set them, the words
 * kept whole for *Change answers* and for the read, and `r` naming the read the submit started, if
 * it started one. NOTHING IS MATCHED (ruling 2): the words never become answers, so no card, no
 * *Not used* and no marks. A card a stale address carries is dropped (F1: the form has no card).
 */
/**
 * How the player arrived, when the page says so: a stored answer (7m), another read running, or the
 * form's own submit that started the read (`form`), after which the player has not seen the free
 * list and the page does not draw it while the read is pending.
 */
export type Arrival = "repeat" | "busy" | "form";

export function resultsTarget(p: ChooseParams, readId: string | null, arrival: Arrival | null = null): string {
  const target = `${CHOOSE_PATH}${serializeChooseParams({
    ...p,
    words: capBody(p.words, READ_WORDS_MAX_CHARS, WORDS_CAP).trim(),
    card: null,
    notUsed: [],
    deeper: [],
    readId,
    results: true,
  })}`;
  if (arrival === "repeat" && readId) return `${target}&${REPEAT_PARAM}=1`;
  if (arrival === "busy" && !readId) return `${target}&${BUSY_PARAM}=1`;
  if (arrival === "form" && readId) return `${target}&${FORM_PARAM}=1`;
  return target;
}

/**
 * Marks a results address whose read `r` was this ask's stored answer, charged nothing (state 7m).
 * Outside `ChooseParams`: it says how the player arrived, not what they asked, so *Change answers*,
 * the paging actions and the row's press never carry it. Hand-written, it changes one line of the
 * player's own panel and nothing else.
 */
export const REPEAT_PARAM = "rr";

/**
 * Marks an unread results address whose read did not start because another of the player's was
 * still running (a second tab, a second press). Outside `ChooseParams` for the same reasons as
 * `REPEAT_PARAM`, and hand-written it changes only the unread panel's lead.
 */
export const BUSY_PARAM = "rb";

/** The form with these answers in it: where an old `v=submit` address goes, so a GET never charges. */
export function formTarget(p: ChooseParams): string {
  return `${CHOOSE_PATH}${serializeChooseParams({ ...p, card: null, notUsed: [], deeper: [], readId: null, results: false })}`;
}

/**
 * Marks a results address the form's own submit started a read for. The player came straight from
 * the form, so the free list was never on screen, and while the read is pending the page draws the
 * results' loading state rather than a list that is replaced moments later. A read started from the
 * results (a retry) carries no mark: the player was already looking at the free list, which stays
 * under the reading panel. Outside `ChooseParams` for the same reasons as `REPEAT_PARAM`.
 */
export const FORM_PARAM = "rf";
