import { matchWords, type PhraseIndex } from "./match";
import { resolveWords, serializeChooseParams, type ChooseParams } from "./params";

export const CHOOSE_PATH = "/decks/new/choose";

/**
 * The form's submit, resolved (plan decision 2): the words are matched ONCE, here, their chips
 * folded into the controls the player set, and the results address carries what that produced.
 * The words stay in `w` for *Change answers*; *Not used* goes in `n`, the words' unmatched
 * phrases first and then anything `resolveWords` set aside, so the results page never matches.
 * The order matters: `n` keeps twelve entries, and the player's own phrases go before a figure.
 *
 * A card already in the params (a form pre-filled by *Change answers*) is an answer the player
 * kept, and stays: a card the words name besides it goes under *Not used*, as a second card does.
 *
 * Pure over the index, so the redirect a page makes is tested without a request.
 */
export function submitTarget(p: ChooseParams, index: PhraseIndex | null): string {
  const words = p.words.trim();
  const match = words && index ? matchWords(words, index) : { chips: [], phrases: [] };
  const resolved = resolveWords(match.chips, {
    themes: p.themes,
    budgetDollars: p.budgetDollars,
    bracket: p.bracket,
  });
  const wordsCard = match.chips.find((c) => c.kind === "card" && c.oracleId === resolved.card);
  const displaced = p.card !== null && wordsCard?.kind === "card" && wordsCard.oracleId !== p.card ? [wordsCard.name] : [];
  return `${CHOOSE_PATH}${serializeChooseParams({
    ...p,
    words,
    themes: resolved.themes,
    card: p.card ?? resolved.card,
    budgetDollars: resolved.budgetDollars,
    bracket: resolved.bracket,
    notUsed: [...match.phrases, ...displaced, ...resolved.notUsed],
    results: true,
  })}`;
}
