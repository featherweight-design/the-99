/**
 * Commanders whose generated sentence was wrong enough to pull.
 *
 * The recourse for bad prose is this list and nothing else: no admin surface, no
 * feedback widget, no per-user override. A checked-in list is reviewable in a diff,
 * and the failure it guards against — a sentence that reads as confident and is
 * false — is rare enough that a UI for it would cost more than it saves.
 *
 * The generator consults this *before* asking for a string, so a suppressed
 * commander is never generated for. A suppressed id also keeps its null prose
 * column, which is the prose-absent state the design already draws.
 */
export const SUPPRESSED_ORACLE_IDS: ReadonlySet<string> = new Set<string>([
  // (empty — add an oracle id here, with a comment saying what the sentence got wrong)
]);

export function isSuppressed(oracleId: string): boolean {
  return SUPPRESSED_ORACLE_IDS.has(oracleId);
}
