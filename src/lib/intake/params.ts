import type { JoinMode } from "../commanders/filter";
import { parseColors } from "../color-param";
import { isUuid } from "../uuid";
import { MAX_BUDGET_DOLLARS } from "./answers";
import type { Chip } from "./match";
import type { Answers, Bracket } from "./rank";
import { READ_WORDS_MAX_CHARS } from "./limits";

// The words box's limit is the deeper read's (`limits.ts`), so the URL, the submit and the read
// never disagree about how much of the words there is. Re-exported for the form.
export { READ_WORDS_MAX_CHARS };

/**
 * Help me choose's answers as the URL carries them (plan, PR 5a; orchestrator-approved). Pure and
 * client-safe. The URL holds RESOLVED answers, never words to match again: the form resolves the
 * words once, on submit, and the results page reads what that produced. That is what lets a narrow
 * option or a dropped chip remove any single answer, a card the player typed included, by removing
 * its param.
 *
 * | Param | Answer |
 * |---|---|
 * | `w` | the words, kept for *Change answers* and the Not used line; never matched again here |
 * | `c`, `m` | colors and their mode, in the lanes' own encoding, so Discover's link parses as-is |
 * | `t` | theme slugs, comma-separated |
 * | `a` | the build-around card's oracle id |
 * | `b` | the budget, whole dollars |
 * | `k` | the bracket, 1 to 5 |
 * | `r` | a deeper read's id (PR 6) |
 * | `n` | *Not used*: what the submit read in the words and set aside, joined by U+001F |
 * | `v=results` | the results screen; absent, the form, pre-filled from the rest |
 *
 * Defaults are absences, as the lanes serialize them. Anything malformed is dropped rather than
 * refused: a URL is untrusted and the page should still draw.
 */

const WUBRG = ["w", "u", "b", "r", "g"] as const;

export type ChooseParams = {
  words: string;
  /** Lower-case WUBRG letters, as the lanes carry them. */
  colors: string[];
  match: JoinMode;
  themes: string[];
  card: string | null;
  budgetDollars: number | null;
  bracket: Bracket | null;
  readId: string | null;
  /**
   * What the submit set aside, written once by the server when it resolved the words, so the
   * results page never matches again: the words' unmatched phrases and anything `resolveWords`
   * listed. Capped at `NOT_USED_MAX` entries of `NOT_USED_CHARS` each.
   */
  notUsed: string[];
  /**
   * Which answers a deeper look added (`d`), written by the panel when it sends the player to the
   * results it produced: `t:{slug}`, `a` (the card), `b`, `k`. Only marks, drawn only when `r`
   * names the reader's own delivered read, so a hand-edited mark changes nothing it could mislead.
   */
  deeper: string[];
  results: boolean;
};

/** A deeper mark: a theme by its slug, or the card, budget or bracket. */
const DEEPER_MARK = /^(t:[a-z0-9-]{1,80}|a|b|k)$/;

export const NOT_USED_MAX = 12;
export const NOT_USED_CHARS = 120;
/** The ASCII unit separator: a character no phrase a player types can hold. */
export const NOT_USED_SEPARATOR = "\u001f";

export const emptyParams = (): ChooseParams => ({
  words: "", colors: [], match: "contains", themes: [], card: null,
  budgetDollars: null, bracket: null, readId: null, notUsed: [], deeper: [], results: false,
});

const SLUG = /^[a-z0-9][a-z0-9-]{0,79}$/;

function wholeNumber(raw: string | null, min: number, max: number): number | null {
  if (raw === null || !/^\d{1,6}$/.test(raw)) return null;
  const n = Number(raw);
  return n >= min && n <= max ? n : null;
}

export function parseChooseParams(sp: URLSearchParams): ChooseParams {
  const raw = parseColors(sp.get("c"));
  const readId = sp.get("r");
  const card = sp.get("a");
  return {
    words: (sp.get("w") ?? "").slice(0, READ_WORDS_MAX_CHARS),
    colors: WUBRG.filter((c) => raw.includes(c.toUpperCase())),
    match: sp.get("m") === "exact" ? "exactly" : "contains",
    themes: [...new Set((sp.get("t") ?? "").split(",").filter((s) => SLUG.test(s)))],
    // Lowercased: Postgres prints uuids lower, and every id this is compared with (the index, a
    // candidate, a row) comes from there. An address typed or pasted in upper case is the same card.
    card: card !== null && isUuid(card) ? card.toLowerCase() : null,
    budgetDollars: wholeNumber(sp.get("b"), 1, MAX_BUDGET_DOLLARS),
    bracket: wholeNumber(sp.get("k"), 1, 5) as Bracket | null,
    readId: readId !== null && isUuid(readId) ? readId.toLowerCase() : null,
    notUsed: notUsedList((sp.get("n") ?? "").split(NOT_USED_SEPARATOR)),
    deeper: [...new Set((sp.get("d") ?? "").split(",").filter((m) => DEEPER_MARK.test(m)))],
    results: sp.get("v") === "results",
  };
}

export function serializeChooseParams(p: ChooseParams): string {
  const sp = new URLSearchParams();
  if (p.words) sp.set("w", p.words);
  if (p.colors.length > 0) sp.set("c", p.colors.join(","));
  if (p.colors.length > 0 && p.match === "exactly") sp.set("m", "exact");
  if (p.themes.length > 0) sp.set("t", p.themes.join(","));
  if (p.card) sp.set("a", p.card);
  if (p.budgetDollars !== null) sp.set("b", String(p.budgetDollars));
  if (p.bracket !== null) sp.set("k", String(p.bracket));
  if (p.readId) sp.set("r", p.readId);
  const notUsed = notUsedList(p.notUsed);
  if (notUsed.length > 0) sp.set("n", notUsed.join(NOT_USED_SEPARATOR));
  if (p.deeper.length > 0) sp.set("d", p.deeper.join(","));
  if (p.results) sp.set("v", "results");
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

/** Trimmed, deduplicated, each cut to `NOT_USED_CHARS`, at most `NOT_USED_MAX`. */
export function notUsedList(raw: readonly string[]): string[] {
  const out: string[] = [];
  for (const r of raw) {
    const s = r.replaceAll(NOT_USED_SEPARATOR, " ").trim().slice(0, NOT_USED_CHARS);
    if (s && !out.includes(s)) out.push(s);
    if (out.length === NOT_USED_MAX) break;
  }
  return out;
}

/** The search's input. Colors go upper-case here: `filterByColors` compares card identities. */
export function answersOf(p: ChooseParams): Answers {
  return {
    colors: p.colors.map((c) => c.toUpperCase()),
    match: p.match,
    themes: p.themes,
    card: p.card,
    budgetDollars: p.budgetDollars,
    bracket: p.bracket,
  };
}

export type ResolvedWords = {
  themes: string[];
  card: string | null;
  budgetDollars: number | null;
  bracket: Bracket | null;
  /**
   * What the words said that the answers do not use, as the player would recognize it. A second
   * card, budget or bracket in the words (the first of each kind counts), and a figure a control
   * the player set overrides (control beats words, plan decision 2).
   */
  notUsed: string[];
};

/**
 * The form's submit: the words' chips folded into the controls the player set. Themes are the
 * union, picked first. For the card, the budget and the bracket the FIRST of each kind in the
 * words counts, and a set control beats any of them.
 */
export function resolveWords(
  chips: readonly Chip[],
  controls: { themes: readonly string[]; budgetDollars: number | null; bracket: Bracket | null },
): ResolvedWords {
  const themes = [...controls.themes];
  let card: string | null = null;
  let budget: number | null = null;
  let bracket: Bracket | null = null;
  const notUsed: string[] = [];
  for (const c of chips) {
    switch (c.kind) {
      case "theme":
        if (!themes.includes(c.slug)) themes.push(c.slug);
        break;
      case "card":
        if (card === null) card = c.oracleId;
        else notUsed.push(c.name);
        break;
      case "budget":
        // A figure past the create path's range is not a budget it can hold: listed, never used.
        if (c.dollars > MAX_BUDGET_DOLLARS) notUsed.push(`$${c.dollars}`);
        else if (controls.budgetDollars !== null || budget !== null) {
          if (c.dollars !== (controls.budgetDollars ?? budget)) notUsed.push(`$${c.dollars}`);
        } else budget = c.dollars;
        break;
      case "bracket":
        if (controls.bracket !== null || bracket !== null) {
          if (c.bracket !== (controls.bracket ?? bracket)) notUsed.push(`bracket ${c.bracket}`);
        } else bracket = c.bracket;
        break;
    }
  }
  return {
    themes,
    card,
    budgetDollars: controls.budgetDollars ?? budget,
    bracket: controls.bracket ?? bracket,
    notUsed: [...new Set(notUsed)],
  };
}
