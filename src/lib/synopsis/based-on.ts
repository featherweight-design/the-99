import type { CheckedSynopsis, StoredEvidence } from "./types";

/** The claim kinds a stored contract-8 answer keeps evidence for (`StoredEvidence`'s keys). */
export type EvidenceKind = keyof StoredEvidence;

/**
 * The oracle ids a "Based on" line lists for one claim: the stored evidence aligned with that line,
 * once each, in the order stored. A Key card leaves out itself, since its row already is that card.
 * An overview written before evidence existed (contract 7 and earlier) has none, so no line.
 */
export function basedOnIds(content: CheckedSynopsis, kind: EvidenceKind, index: number, except?: string): string[] {
  const ids = content.evidence?.[kind]?.[index] ?? [];
  return [...new Set(ids)].filter((id) => id !== except);
}

/** Every card any claim of the overview cites, for the read that names them. */
export function allEvidenceIds(content: CheckedSynopsis): string[] {
  const e = content.evidence;
  if (!e) return [];
  return [...new Set(Object.values(e).flat(2))];
}
