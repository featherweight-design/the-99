import type { EdhrecTag } from "../edhrec/parse";
import { legacyProseInputHash, proseInputHash } from "./prompt";
import { isSuppressed } from "./suppressed";

/** A sentence generated elsewhere, with the hash of the inputs it was generated from. */
export type ProseSource = {
  oracleId: string;
  prose: string;
  proseInputHash: string;
  prosePromptVersion: number;
};

/** A row on the target database that may or may not be entitled to one of those sentences. */
export type ProseTarget = {
  oracleId: string;
  name: string;
  tags: EdhrecTag[];
  prose: string | null;
  proseInputHash: string | null;
};

export type CopyOptions = {
  loadSource: () => PromiseLike<ProseSource[]>;
  loadTarget: () => PromiseLike<ProseTarget[]>;
  write: (row: ProseSource) => Promise<void>;
  suppressed?: (oracleId: string) => boolean;
};

export type CopyResult = {
  installed: number;
  /** The target already holds a sentence whose hash matches its own inputs. */
  fresh: number;
  /** On the suppression list, so no sentence is installed whatever the source holds. */
  suppressed: number;
  /** No sentence on the source for this commander at all. */
  missing: number;
  /**
   * The source has a sentence, but it was generated from inputs the target no longer has —
   * its tags or its name have moved. Left alone, so the generator writes it from scratch.
   */
  drifted: number;
};

/**
 * Install sentences generated against one database onto another.
 *
 * A sentence costs a model call to produce and nothing to move, so a database that has never
 * been generated against takes the sentences from one that has, and pays for only the rows the
 * two disagree about.
 *
 * The hash is what makes that safe. Every row is installed only when the hash the source stored
 * equals the hash the *target's* own inputs produce right now, so a sentence describing themes
 * this database no longer records is never written. Those rows keep their null and are picked up
 * by the next generation run exactly as an ungenerated commander is — the staleness mechanism
 * doing the job it already does, rather than a second one invented for copying.
 */
export async function copyCommanderProse(opts: CopyOptions): Promise<CopyResult> {
  const [source, target] = await Promise.all([opts.loadSource(), opts.loadTarget()]);
  const suppressed = opts.suppressed ?? isSuppressed;
  const bySourceOracleId = new Map(source.map((row) => [row.oracleId, row]));
  const r: CopyResult = { installed: 0, fresh: 0, suppressed: 0, missing: 0, drifted: 0 };

  for (const t of target) {
    // First, exactly as the generator consults it first. The list is the only recourse for a
    // sentence that reads as confident and is false, and a source generated before an id was
    // added to it still holds that sentence — so copying is precisely the path that would put
    // a pulled sentence back.
    if (suppressed(t.oracleId)) { r.suppressed++; continue; }

    const hash = proseInputHash(t.oracleId, t.name, t.tags);
    if (t.prose !== null && t.proseInputHash === hash) { r.fresh++; continue; }

    const row = bySourceOracleId.get(t.oracleId);
    if (row === undefined) { r.missing++; continue; }
    // A source still stamped with the legacy hash is installed when that hash matches the
    // target's inputs, and lands stamped with the new one: the same sentence for the same inputs.
    if (row.proseInputHash === hash) {
      await opts.write(row);
    } else if (row.proseInputHash === legacyProseInputHash(t.oracleId, t.name, t.tags)) {
      await opts.write({ ...row, proseInputHash: hash });
    } else {
      r.drifted++;
      continue;
    }
    r.installed++;
  }

  return r;
}
