/**
 * What the precon Overview copy (`scripts/copy-precon-overviews.ts`) does to the target, decided
 * from three reads and nothing else. Pure, so every outcome is a unit test.
 *
 * A source row is INSTALLED only when it fits the target exactly: the request the TARGET's own
 * catalog builds for that precon hashes to the source row's `input_hash`, and the target's list
 * fingerprint is the row's. That is the `db:copy:prose` rule, per row, so a daily card-text or
 * label edit on either side never blocks the rows it did not touch.
 *
 * The copy is also the target's RE-CHECK: an installed row whose hash no longer matches the
 * target's own request is marked not current, so a deck started there never carries over an
 * Overview of inputs the target no longer has. Nothing is ever deleted.
 */
export type SourceRow<C> = { file: string; listFingerprint: string; inputHash: string; model: string; content: C; inputTokens: number | null; outputTokens: number | null; costMicroUsd: number | null };
export type TargetRow = { file: string; inputHash: string; current: boolean };
/** The target's own request for a precon, or why it has none (`buildPreconRequest`). */
export type TargetRequest = { file: string; ok: true; list: string; hash: string } | { file: string; ok: false; why: string };

export type CopyPlan<C> = {
  install: SourceRow<C>[];
  /** Installed rows the target's inputs no longer match: marked not current. */
  stale: string[];
  /** Installed rows that still match and are current already: left alone. */
  fresh: number;
  /** Installed rows that match again after a re-check had marked them not: stamped current. */
  restamp: string[];
  /** Target precons with no source row (not built yet, or the build refused them). */
  missing: string[];
  /** Source rows built from inputs the target does not have: rebuild on staging, then copy. */
  drifted: string[];
  /** Target precons it could not build a request for (an illegal commander, an unread label). */
  unbuildable: { file: string; why: string }[];
};

export function planPreconOverviewCopy<C>(input: {
  source: readonly SourceRow<C>[];
  target: readonly TargetRow[];
  requests: readonly TargetRequest[];
}): CopyPlan<C> {
  const source = new Map(input.source.map((r) => [r.file, r]));
  const target = new Map(input.target.map((r) => [r.file, r]));
  const plan: CopyPlan<C> = { install: [], stale: [], fresh: 0, restamp: [], missing: [], drifted: [], unbuildable: [] };
  for (const req of input.requests) {
    const had = target.get(req.file);
    if (!req.ok) {
      plan.unbuildable.push({ file: req.file, why: req.why });
      if (had?.current) plan.stale.push(req.file);
      continue;
    }
    const src = source.get(req.file);
    if (had && had.inputHash === req.hash) {
      // The target's row was written for exactly these inputs (the request carries the list), so it
      // fits: left alone, or stamped current again if an earlier re-check had marked it not.
      if (had.current) plan.fresh += 1;
      else plan.restamp.push(req.file);
      continue;
    }
    // A source row that fits REPLACES the target's (installed current); only a target row nothing
    // replaces is marked not current. Never both, or the publish's stale UPDATE would undo its install.
    if (src && src.inputHash === req.hash && src.listFingerprint === req.list) {
      plan.install.push(src);
      continue;
    }
    if (had?.current) plan.stale.push(req.file);
    if (!src) plan.missing.push(req.file);
    else plan.drifted.push(req.file);
  }
  return plan;
}
