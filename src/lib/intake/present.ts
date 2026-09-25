import { colorNames } from "../copy/color-labels";
import { BRACKET_NAMES } from "../copy/deck-analysis";
import { helpMeChooseCopy as copy } from "../copy/help-me-choose";
import type { Chip } from "./match";
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
  if (order === "owned") {
    const sub = p.colors.length > 0
      ? copy.results.subOwnedColors(copy.intake.colorsJoin(colorNames(p.colors.map((c) => c.toUpperCase()))))
      : copy.results.subOwned;
    return { title: copy.results.byOwned, sub };
  }
  const names = [...p.themes.map(labels.theme), ...(p.card && labels.card ? [labels.card] : [])];
  // A card the catalog could not name (a stale link): the order is still fit, with nothing to cite.
  if (names.length === 0) return { title: copy.results.all, sub: "" };
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
    .map((o) => ({ label: o.label, reason: o.reason, count: o.count, params: o.params }));
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

/**
 * The deeper marks the page may draw. `d` is honored only when `r` named the reader's own delivered
 * read (`loadOwnRead`), and then only mark by mark: each must name an answer that read actually
 * gave AND that the answers still hold. So an address with `d` appended, or `r` reused under other
 * answers, marks nothing the read did not add.
 */
export function verifiedDeeperMarks(
  p: ChooseParams,
  settled: { kind: "read" | "nothing"; read: { chips: readonly Chip[] } } | null,
): string[] {
  if (settled?.kind !== "read") return [];
  const chips = settled.read.chips;
  return p.deeper.filter((m) => {
    if (m.startsWith("t:")) {
      const slug = m.slice(2);
      return p.themes.includes(slug) && chips.some((c) => c.kind === "theme" && c.slug === slug);
    }
    if (m === "a") return p.card !== null && chips.some((c) => c.kind === "card" && c.oracleId === p.card);
    if (m === "b") return p.budgetDollars !== null && chips.some((c) => c.kind === "budget" && c.dollars === p.budgetDollars);
    if (m === "k") return p.bracket !== null && chips.some((c) => c.kind === "bracket" && c.bracket === p.bracket);
    return false;
  });
}

/**
 * The controls the look was pressed under, recovered from its own results: a budget or bracket the
 * read added (a verified `b` or `k`) was unset at the press, and every other one stood as it is now.
 * Hashed with the words, this is the ask the read answered (`readForThisAsk`).
 */
export function pressControls(p: ChooseParams, marks: readonly string[]): { budgetDollars: number | null; bracket: number | null } {
  return { budgetDollars: marks.includes("b") ? null : p.budgetDollars, bracket: marks.includes("k") ? null : p.bracket };
}

/**
 * The read `r` names, honored only for the ask it answered: its stored hash must be this address's
 * words under the controls the look was pressed with. So `r` carried onto other answers, by hand
 * or by a stale link, draws no finished look and relabels nothing as still unused.
 */
export function readForThisAsk<T extends { kind: "read" | "nothing"; read: { chips: readonly Chip[] }; wordsHash: string }>(
  p: ChooseParams,
  loaded: T | null,
  hash: (words: string, controls: { budgetDollars: number | null; bracket: number | null }) => string,
): T | null {
  if (loaded === null) return null;
  return loaded.wordsHash === hash(p.words, pressControls(p, verifiedDeeperMarks(p, loaded))) ? loaded : null;
}

export type AnswerChip = { kind: string; value: string; /** Added by the deeper look (`d`). */ deeper: boolean };

/**
 * The *We read this as* bar's chips, in the form's order. `deeper` holds the marks the page has
 * checked against the reader's own delivered read; an empty list marks nothing.
 */
export function answerChips(p: ChooseParams, labels: Labels, deeper: readonly string[] = []): AnswerChip[] {
  const k = copy.readAs.kinds;
  const marked = (m: string) => deeper.includes(m);
  return [
    ...(p.colors.length > 0 ? [{ kind: p.match === "exactly" ? k.exactly : k.colors, value: colorsPhrase(p.colors), deeper: false }] : []),
    ...p.themes.map((s) => ({ kind: k.theme, value: labels.theme(s), deeper: marked(`t:${s}`) })),
    ...(p.card && labels.card ? [{ kind: k.card, value: labels.card, deeper: marked("a") }] : []),
    ...(p.budgetDollars !== null ? [{ kind: k.budget, value: `$${p.budgetDollars}`, deeper: marked("b") }] : []),
    ...(p.bracket !== null ? [{ kind: k.bracket, value: `${p.bracket} · ${BRACKET_NAMES[p.bracket]}`, deeper: marked("k") }] : []),
  ];
}
