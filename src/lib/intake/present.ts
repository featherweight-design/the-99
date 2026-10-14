import { colorNames } from "../copy/color-labels";
import { BRACKET_NAMES } from "../copy/deck-analysis";
import { helpMeChooseCopy as copy, orList } from "../copy/help-me-choose";
import { answersOf, type ChooseParams } from "./params";
import { answerKeys, isAnyOf, type AnswerKey, type SearchResult } from "./rank";
import type { ResultRow } from "./rows";

/**
 * What the results screen says, from the search and the answers (plan, PR 5b). Pure: every
 * sentence and every choice of which figure is lit is decided here and tested here, so the
 * components only lay it out.
 */

/** Names the page needs that the answers hold only as ids. */
export type Labels = {
  theme: (slug: string) => string;
  card: string | null;
  /** A set's name by its code; the code itself, upper-case, when the page has none. */
  set?: (code: string) => string;
};

/** Set codes as the chip and the note print them: upper-case, joined by "or". */
export const setCodesPhrase = (codes: readonly string[]) => codes.map((c) => c.toUpperCase()).join(` ${copy.readAs.joiner} `);

export const colorsPhrase = (colors: readonly string[]) => colorNames(colors.map((c) => c.toUpperCase())).join(" · ");

/** The order line: which answer ranks the rows, and the sentence under it. */
export function orderLine(order: SearchResult["order"], p: ChooseParams, labels: Labels): { title: string; sub: string } {
  if (order === "owned") {
    const sub = p.colors.length > 0
      ? copy.results.subOwnedColors(copy.intake.colorsJoin(colorNames(p.colors.map((c) => c.toUpperCase()))))
      : copy.results.subOwned;
    return { title: copy.results.byOwned, sub };
  }
  // Any of: the group's best figure ranks each row, or the card where it is lower.
  if (isAnyOf(p)) {
    const names = orList(p.themes.map(labels.theme));
    return p.card && labels.card
      ? { title: copy.results.all, sub: copy.results.subAnyCard(names, labels.card) }
      : { title: copy.results.byBestTheme, sub: copy.results.subAny(names) };
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

/**
 * A row's figures, in the order the answers were given. Ties on the weakest each set the rank. Asked
 * as any of, only the group's best figure can set it; the group's other fits are drawn dimmed.
 */
export function figures(row: ResultRow, order: SearchResult["order"], labels: Labels): Figure[] {
  if (order === "owned") {
    return [{ pct: row.ownedSupport, text: copy.results.figOwnedTail(row.supportTotal), setsRank: false, dim: false }];
  }
  const grouped = row.themeFits.some((t) => t.best);
  const raw = [
    ...row.themeFits.map((t) => ({ share: t.share, text: copy.results.figThemeTail(labels.theme(t.slug)), ranks: !grouped || t.best === true })),
    ...(row.cardFit !== null && labels.card ? [{ share: row.cardFit, text: copy.results.figCardTail(labels.card), ranks: true }] : []),
  ];
  const low = Math.min(...raw.filter((f) => f.ranks).map((f) => f.share));
  const several = raw.length > 1;
  return raw.map((f) => {
    const pct = Math.round(f.share * 100);
    const sets = several && f.ranks && f.share === low;
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
  const asked = answerKeys(answersOf(p));
  const options: (NarrowOption & { n: number })[] = narrow.without.map(({ answers, count }) => {
    const kept = asked.filter((k) => !answers.some((d) => sameAnswer(d, k)));
    // Dropping all but one answer reads as keeping that one, which is what the player does.
    const label = answers.length > 1 && kept.length === 1
      ? copy.narrow.keepOnly(answerName(kept[0], p, labels))
      : copy.narrow.drop(answers.map((d) => answerName(d, p, labels)));
    const card = answers.length === 1 && answers[0].kind === "card";
    return {
      label,
      reason: card && narrow.cardOverBracket === "gameChanger" && labels.card && p.bracket !== null
        ? copy.narrow.gameChanger(labels.card, p.bracket)
        : null,
      count: copy.narrow.count(count),
      params: answers.reduce(without, p),
      n: count,
    };
  });
  if (narrow.anyOf) {
    const names = p.themes.map(labels.theme);
    options.push({
      label: copy.narrow.widenThemes(p.themes.length),
      // Said only when it explains the zero: at 1 it says nothing a reader could act on, and when
      // some commander fits every one of them the few who do are why the note is up, not this.
      reason: narrow.anyOf.most >= 2 && narrow.anyOf.most < p.themes.length
        ? copy.narrow.widenThemesWhy(narrow.anyOf.most, names)
        : null,
      count: copy.narrow.count(narrow.anyOf.count),
      params: { ...p, themeJoin: "any", readId: null },
      n: narrow.anyOf.count,
    });
  }
  if (narrow.widen) {
    options.push({
      label: copy.narrow.widenColors(colorsPhrase(p.colors)),
      reason: null,
      count: copy.narrow.count(narrow.widen.count),
      // Widening is a change of answers too, so it carries no read either (`without`).
      params: { ...p, match: "contains", readId: null },
      n: narrow.widen.count,
    });
  }
  return options
    .filter((o) => o.n > 0)
    .sort((a, b) => b.n - a.n)
    .slice(0, NARROW_OPTIONS)
    .map((o) => ({ label: o.label, reason: o.reason, count: o.count, params: o.params }));
}

export function sameAnswer(x: AnswerKey, y: AnswerKey): boolean {
  return x.kind === y.kind && (x.kind !== "theme" || (y.kind === "theme" && x.slug === y.slug));
}

function answerName(a: AnswerKey, p: ChooseParams, labels: Labels): string {
  switch (a.kind) {
    case "colors": return colorsPhrase(p.colors);
    case "theme": return labels.theme(a.slug);
    case "themes": return copy.narrow.anyOfName(p.themes.map(labels.theme));
    case "sets": return setCodesPhrase(p.sets);
    case "card": return labels.card ?? copy.readAs.kinds.card;
    case "budget": return `$${p.budgetDollars}`;
    case "bracket": return `bracket ${p.bracket}`;
  }
}

/**
 * The answers with one removed: a drop on the results, and what a chip's own drop does. A new set of
 * answers is a new ask, so it carries no read (`r`): a read is bound to the ask it answered, so a read
 * `r` names must not be drawn over answers it never read.
 */
export function without(p: ChooseParams, a: AnswerKey): ChooseParams {
  const q = { ...p, readId: null };
  switch (a.kind) {
    case "colors": return { ...q, colors: [], match: "contains" };
    case "theme": return { ...q, themes: p.themes.filter((s) => s !== a.slug) };
    case "themes": return { ...q, themes: [], themeJoin: "all" };
    case "sets": return { ...q, sets: [] };
    case "card": return { ...q, card: null };
    case "budget": return { ...q, budgetDollars: null };
    case "bracket": return { ...q, bracket: null };
  }
}

export type AnswerChip = {
  kind: string;
  value: string;
  /** Drawn after the value, mono and faint: the the-99 chip's *commander owned or not*. */
  tail?: string;
  /** An any-of chip's names, drawn with the joiner between them; `value` is then its spoken name. */
  names?: string[];
  /** A printed-in chip's set codes, drawn mono with the joiner; `value` is then its full names. */
  codes?: string[];
};

/** The *We read this as* bar's chips, in the form's order. */
export function answerChips(p: ChooseParams, labels: Labels): AnswerChip[] {
  const k = copy.readAs.kinds;
  return [
    ...(p.colors.length > 0 ? [{ kind: p.match === "exactly" ? k.exactly : k.colors, value: colorsPhrase(p.colors) }] : []),
    ...(isAnyOf(p)
      ? [{
        kind: k.anyOf,
        // The chip's kind, `any of`, is read before it, so the value is the names alone: with the
        // full name here the group was spoken as "any of Any of Orcs, …".
        value: orList(p.themes.map(labels.theme)),
        names: p.themes.map(labels.theme),
      }]
      : p.themes.map((s) => ({ kind: k.theme, value: labels.theme(s) }))),
    ...(p.sets.length > 0
      ? [{
        kind: k.printedIn,
        // The kind, `printed in`, is read first, so the value is the sets' names alone (#1071's
        // any-of chip was spoken with its kind twice).
        value: p.sets.map((c) => labels.set?.(c) ?? c.toUpperCase()).join(` ${copy.readAs.joiner} `),
        codes: p.sets.map((c) => c.toUpperCase()),
      }]
      : []),
    ...(p.pool === "own" ? [{ kind: k.pool, value: copy.readAs.poolValue, tail: copy.readAs.poolTail }] : []),
    ...(p.card && labels.card ? [{ kind: k.card, value: labels.card }] : []),
    ...(p.budgetDollars !== null ? [{ kind: k.budget, value: `$${p.budgetDollars}` }] : []),
    ...(p.bracket !== null ? [{ kind: k.bracket, value: `${p.bracket} · ${BRACKET_NAMES[p.bracket]}` }] : []),
  ];
}
