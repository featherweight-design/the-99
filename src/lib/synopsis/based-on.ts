import { normalizeName } from "./facts";
import type { CheckedSynopsis, StoredEvidence } from "./types";

/** The claim kinds a stored contract-8 answer keeps evidence for (`StoredEvidence`'s keys). */
export type EvidenceKind = keyof StoredEvidence;

const MARK = /\[\[([^\[\]]+)\]\]/g;

/** The oracle ids a line names as `[[Name]]` marks, resolved as the line renders them. */
function namedIds(content: CheckedSynopsis, line: string): Set<string> {
  const ids = new Set<string>();
  for (const m of line.matchAll(MARK)) {
    const card = content.cards[normalizeName(m[1])];
    if (card) ids.add(card.oracleId);
  }
  return ids;
}

/**
 * The oracle ids a "Based on" line lists for one claim: the stored evidence aligned with that line,
 * once each, in the order stored, less every card the line already names (Hugh, 2026-10-28: the row
 * repeated the line's own cards), so a line citing only what it names draws no row. A Key card also
 * leaves out itself, since its row already is that card. Display only: the stored evidence, which
 * the validator reads, keeps every id. An overview written before evidence existed (contract 7 and
 * earlier) has none, so no line.
 */
export function basedOnIds(content: CheckedSynopsis, kind: EvidenceKind, index: number, line: string, except?: string): string[] {
  const ids = content.evidence?.[kind]?.[index] ?? [];
  const named = namedIds(content, line);
  return [...new Set(ids)].filter((id) => id !== except && !named.has(id));
}

/** As `basedOnIds`, for the two contract-13 lines whose evidence is one flat list (the land line and the alternate). */
export function flatBasedOnIds(content: CheckedSynopsis, kind: "landKeep" | "alternate", line: string): string[] {
  const named = namedIds(content, line);
  return [...new Set(content.evidence?.[kind] ?? [])].filter((id) => !named.has(id));
}

/** Every card any claim of the overview cites, for the read that names them. */
export function allEvidenceIds(content: CheckedSynopsis): string[] {
  const e = content.evidence;
  if (!e) return [];
  return [...new Set(Object.values(e).flat(2))];
}
