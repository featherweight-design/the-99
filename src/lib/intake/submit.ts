import { matchWords, type PhraseIndex } from "./match";
import { resolveWords, serializeChooseParams, type ChooseParams } from "./params";

export const CHOOSE_PATH = "/decks/new/choose";

/**
 * The form's submit, resolved (plan decision 2): the words are matched ONCE, here, their chips
 * folded into the controls the player set, and the results address carries what that produced.
 * The words stay in `w` for *Change answers*; *Not used* goes in `n`, the words' unmatched
 * phrases first and then anything `resolveWords` set aside, so the results page never matches.
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
  return `${CHOOSE_PATH}${serializeChooseParams({
    ...p,
    words,
    themes: resolved.themes,
    card: resolved.card,
    budgetDollars: resolved.budgetDollars,
    bracket: resolved.bracket,
    notUsed: [...resolved.notUsed, ...match.phrases],
    results: true,
  })}`;
}
