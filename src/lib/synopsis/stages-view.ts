/**
 * What the Overview modal needs to draw a contract-13 row (lane e7, PR 3), pure and free of the
 * server so the client component can import it. `stages.ts` holds the checks that wrote the row;
 * this reads what it stored.
 */
import { normalizeName } from "./facts";
import { SYNOPSIS_CONTRACT_VERSION_STAGES } from "./limits";
import { statedLandNumbers } from "./land-count";
import type { CheckedSynopsis } from "./types";

const MARK = /\[\[([^\[\]]+)\]\]/g;

/**
 * Whether a row is drawn in the stages shape: it was written at contract 13 or later AND holds what
 * the shape needs, three stage lines and two tips. A 13 row that lacks either falls back to the shape
 * every older row draws; so does a row whose contract is not known to the caller.
 */
export function usesStagesShape(contractVersion: number | null | undefined, content: CheckedSynopsis): boolean {
  if (contractVersion == null || contractVersion < SYNOPSIS_CONTRACT_VERSION_STAGES) return false;
  return content.primer?.strategy.length === 3 && content.primer.tips.length === 2;
}

/** The cards a line marks, in order, resolved through the row's own card map. Repeats and unresolved marks are skipped. */
export function markedCards(text: string, cards: CheckedSynopsis["cards"], limit = Infinity): { oracleId: string; name: string }[] {
  const out: { oracleId: string; name: string }[] = [];
  const seen = new Set<string>();
  for (const m of text.matchAll(MARK)) {
    const card = cards[normalizeName(m[1])];
    if (!card || seen.has(card.oracleId)) continue;
    seen.add(card.oracleId);
    out.push({ oracleId: card.oracleId, name: m[1] });
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * The land figure beside the stored land line: the one number the line states, read off the line
 * itself, since the facts are not in the browser and the line was checked against the app's number
 * when it was stored. A line that states no number, a range ("3 or 4 lands") or two different
 * numbers draws no figure.
 */
export function landFigure(line: string): number | null {
  const found = [...new Set(statedLandNumbers(line))];
  return found.length === 1 ? found[0] : null;
}

export type SeverityWord = "Critical" | "Moderate" | "Minor";

/** A weakness line's leading severity ("Critical: ...", "Moderate: ...", "Minor: ..."), split off to become a chip. */
export function splitSeverity(line: string): { tier: SeverityWord; rest: string } | null {
  const m = /^(Critical|Moderate|Minor):\s*(\S[\s\S]*)$/.exec(line);
  return m ? { tier: m[1] as SeverityWord, rest: m[2] } : null;
}

const SEVERITY_ORDER: Record<SeverityWord, number> = { Critical: 0, Moderate: 1, Minor: 2 };

/** Weakness lines with Critical first, then Moderate, then Minor; the model's order holds within a tier, and an unmarked line keeps its place after the marked ones. */
export function bySeverity(lines: readonly string[]): string[] {
  const rank = (l: string) => { const s = splitSeverity(l); return s ? SEVERITY_ORDER[s.tier] : 3; };
  return lines.map((l, i) => ({ l, i, r: rank(l) })).sort((a, b) => a.r - b.r || a.i - b.i).map((x) => x.l);
}
