import { colorNames } from "../copy/color-labels";
import { BRACKET_NAMES } from "../copy/deck-analysis";
import { helpMeChooseCopy as copy } from "../copy/help-me-choose";
import type { ChooseParams } from "./params";
import type { AnswerKey, SearchResult } from "./rank";
import type { ResultRow } from "./rows";

/**
 * What the results screen says, from the search and the answers (plan, PR 5b). Pure: every
 * sentence and every choice of which figure is lit is decided here and tested here, so the
 * components only lay it out.
 */

/** Names the page needs that the answers hold only as ids. */
export type Labels = { theme: (slug: string) => string; card: string | null };

export const colorsPhrase = (colors: readonly string[]) => colorNames(colors.map((c) => c.toUpperCase())).join(" · ");

/** The order line: which answer ranks the rows, and the sentence under it. */
export function orderLine(order: SearchResult["order"], p: ChooseParams, labels: Labels): { title: string; sub: string } {
  if (order === "owned") return { title: copy.results.byOwned, sub: copy.results.subOwned };
  const names = [...p.themes.map(labels.theme), ...(p.card && labels.card ? [labels.card] : [])];
  if (names.length === 1) {
    return {
      title: copy.results.byOne(names[0]),
      sub: p.themes.length === 1 ? copy.results.subTheme(names[0]) : copy.results.subCard(names[0]),
    };
  }
  return { title: copy.results.all, sub: copy.results.subSeveral(names[0], names[1]) };
}

export type Figure = {
  pct: number;
  /** The sentence's rest, drawn beside the figure: the two read as one sentence. */
  text: string;
  /** The weakest figure, which the row ranks by: lit and tagged SETS RANK when there are several. */
  setsRank: boolean;
  /** Dimmed beside the one that sets the rank. */
  dim: boolean;
};

/** A row's figures, in the order the answers were given. Ties on the weakest each set the rank. */
export function figures(row: ResultRow, order: SearchResult["order"], labels: Labels): Figure[] {
  if (order === "owned") {
    return [{ pct: row.ownedSupport, text: copy.results.figOwnedTail(row.supportTotal), setsRank: false, dim: false }];
  }
  const raw = [
    ...row.themeFits.map((t) => ({ share: t.share, text: copy.results.figThemeTail(labels.theme(t.slug)) })),
    ...(row.cardFit !== null && labels.card ? [{ share: row.cardFit, text: copy.results.figCardTail(labels.card) }] : []),
  ];
  const low = Math.min(...raw.map((f) => f.share));
  const several = raw.length > 1;
  return raw.map((f) => {
    const pct = Math.round(f.share * 100);
    const sets = several && f.share === low;
    return { pct, text: f.text, setsRank: sets, dim: several && !sets };
  });
}

export type NarrowOption = {
  label: string;
  reason: string | null;
  count: string;
  /** Where the option goes: the same answers with this one loosened, still on the results. */
  params: ChooseParams;
};

/** At most three, most restoring first, and never one that brings nothing back. */
export const NARROW_OPTIONS = 3;

export function narrowOptions(narrow: NonNullable<SearchResult["tooNarrow"]>, p: ChooseParams, labels: Labels): NarrowOption[] {
  const options: (NarrowOption & { n: number })[] = narrow.without.map(({ answer, count }) => ({
    label: copy.narrow.drop(answerName(answer, p, labels)),
    reason: answer.kind === "card" && narrow.cardOverBracket === "gameChanger" && labels.card && p.bracket !== null
      ? copy.narrow.gameChanger(labels.card, p.bracket)
      : null,
    count: copy.narrow.count(count),
    params: without(p, answer),
    n: count,
  }));
  if (narrow.widen) {
    options.push({
      label: copy.narrow.widenColors(colorsPhrase(p.colors)),
      reason: null,
      count: copy.narrow.count(narrow.widen.count),
      params: { ...p, match: "contains" },
      n: narrow.widen.count,
    });
  }
  return options
    .filter((o) => o.n > 0)
    .sort((a, b) => b.n - a.n)
    .slice(0, NARROW_OPTIONS)
    .map(({ n: _n, ...o }) => o);
}

function answerName(a: AnswerKey, p: ChooseParams, labels: Labels): string {
  switch (a.kind) {
    case "colors": return colorsPhrase(p.colors);
    case "theme": return labels.theme(a.slug);
    case "card": return labels.card ?? copy.readAs.kinds.card;
    case "budget": return `$${p.budgetDollars}`;
    case "bracket": return `bracket ${p.bracket}`;
  }
}

/** The answers with one removed: a drop on the results, and what a chip's own drop does. */
export function without(p: ChooseParams, a: AnswerKey): ChooseParams {
  switch (a.kind) {
    case "colors": return { ...p, colors: [], match: "contains" };
    case "theme": return { ...p, themes: p.themes.filter((s) => s !== a.slug) };
    case "card": return { ...p, card: null };
    case "budget": return { ...p, budgetDollars: null };
    case "bracket": return { ...p, bracket: null };
  }
}

export type AnswerChip = { kind: string; value: string };

/** The *We read this as* bar's chips, in the form's order. */
export function answerChips(p: ChooseParams, labels: Labels): AnswerChip[] {
  const k = copy.readAs.kinds;
  return [
    ...(p.colors.length > 0 ? [{ kind: p.match === "exactly" ? `${k.colors} · ${k.exactly}` : k.colors, value: colorsPhrase(p.colors) }] : []),
    ...p.themes.map((s) => ({ kind: k.theme, value: labels.theme(s) })),
    ...(p.card && labels.card ? [{ kind: k.card, value: labels.card }] : []),
    ...(p.budgetDollars !== null ? [{ kind: k.budget, value: `$${p.budgetDollars}` }] : []),
    ...(p.bracket !== null ? [{ kind: k.bracket, value: `${p.bracket} · ${BRACKET_NAMES[p.bracket]}` }] : []),
  ];
}
