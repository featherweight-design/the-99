import type { Job, RampKind } from "../labels/types";

/** The ramp kinds that leave a lasting source. A cost reducer, an extra land drop, a doubler and a burst
 *  of mana make none, and neither does a Treasure maker: its mana is one-shot, and the mana addendum's
 *  counting table says "ritual, Treasure: not a source" (orchestrator ruling, 2026-10-10). */
export const SOURCE_KINDS: ReadonlySet<RampKind> = new Set(["tapsForMana", "fetchesLand"]);

/**
 * The source kinds of a card's fresh labels, one entry per distinct kind: a label keeps one job per
 * ability, so a card can carry a non-source ramp job beside a lasting one, or two lasting ones. Empty
 * for a card with no such job. A ramp job with no kind is not a source.
 */
export function sourceKindsOf(jobs: readonly Job[]): RampKind[] {
  const kinds = new Set<RampKind>();
  for (const j of jobs) {
    if (j.kind !== "ramp") continue;
    const kind = (j as { rampKind?: RampKind | null }).rampKind;
    if (kind && SOURCE_KINDS.has(kind)) kinds.add(kind);
  }
  return [...kinds];
}
