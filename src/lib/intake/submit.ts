import { matchWords, type Chip, type MatchResult, type PhraseIndex } from "./match";
import { READ_WORDS_MAX_CHARS, resolveWords, serializeChooseParams, type ChooseParams } from "./params";
import type { StoredRead } from "./run-store";

export const CHOOSE_PATH = "/decks/new/choose";

/**
 * The form's submit, resolved (plan decision 2): the words are matched ONCE, here, their chips
 * folded into the controls the player set, and the results address carries what that produced.
 * The words stay in `w` for *Change answers*; *Not used* goes in `n`, the words' unmatched
 * phrases first and then anything `resolveWords` set aside, so the results page never matches.
 * The order matters: `n` keeps twelve entries, and the player's own phrases go before a figure.
 *
 * A card already in the params (an address that carries one) is an answer the player kept, and
 * stays: a card the words name besides it goes under *Not used*, as a second card does. The form
 * itself never carries one (`submitHref`): it has no card control, so its card is its words'.
 *
 * Pure over the index, so the redirect a page makes is tested without a request.
 */
export function submitTarget(p: ChooseParams, index: PhraseIndex | null): string {
  // Bounded here as the parser bounds `w`, so no answer comes from words the results would cut.
  const words = p.words.slice(0, READ_WORDS_MAX_CHARS).trim();
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
    budgetDollars: p.budgetDollars,
    bracket: p.bracket,
  }, match.themeJoin);
  return `${CHOOSE_PATH}${serializeChooseParams({
    ...p,
    words,
    themes: resolved.themes,
    themeJoin: resolved.themeJoin,
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
 * Where a delivered deeper look sends the player (plan, PR 6): the same answers with the read's
 * chips folded in, as the submit folds the words' (a control, and a card already given, still win),
 * `r` naming the read, and `d` marking what it added, so the bar can say which answers came from it.
 * The read's leftovers replace *Not used*: what it could not place, then what it set aside.
 */
export function deeperTarget(p: ChooseParams, read: StoredRead, readId: string): string {
  const cards = read.chips.filter((c): c is Extract<Chip, { kind: "card" }> => c.kind === "card");
  // The read joins nothing: the themes keep the join the answers already had.
  const resolved = resolveWords(p.card === null ? read.chips : read.chips.filter((c) => c.kind !== "card"), {
    themes: p.themes,
    themeJoin: p.themeJoin,
    budgetDollars: p.budgetDollars,
    bracket: p.bracket,
  }, p.themeJoin);
  const displaced = p.card === null ? [] : [...new Set(cards.filter((c) => c.oracleId !== p.card).map((c) => c.name))];
  const card = p.card ?? resolved.card;
  const deeper = [
    ...resolved.themes.filter((t) => !p.themes.includes(t)).map((t) => `t:${t}`),
    ...(p.card === null && card !== null ? ["a"] : []),
    ...(p.budgetDollars === null && resolved.budgetDollars !== null ? ["b"] : []),
    ...(p.bracket === null && resolved.bracket !== null ? ["k"] : []),
  ];
  return `${CHOOSE_PATH}${serializeChooseParams({
    ...p,
    themes: resolved.themes,
    themeJoin: resolved.themeJoin,
    card,
    budgetDollars: resolved.budgetDollars,
    bracket: resolved.bracket,
    readId,
    notUsed: [...read.notUnderstood, ...read.notUsed, ...displaced, ...resolved.notUsed],
    deeper,
    results: true,
  })}`;
}
