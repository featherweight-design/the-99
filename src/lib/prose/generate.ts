import { eq } from "drizzle-orm";
import { db } from "../../db";
import { cards, commanderSupport } from "../../db/schema";
import { stampCatalogRefresh } from "../cache/stamp-catalog";
import type { EdhrecTag } from "../edhrec/parse";
import { checkProse, type ProseRejection } from "./accept";
import {
  buildProsePrompt,
  buildProseRetryPrompt,
  PROSE_PROMPT_VERSION,
  legacyProseInputHash,
  proseInputHash,
} from "./prompt";
import { isSuppressed } from "./suppressed";

export type ProseCandidate = {
  oracleId: string;
  name: string;
  tags: EdhrecTag[];
  prose: string | null;
  proseInputHash: string | null;
};

export type GenerateOptions = {
  /** Asks the model for one sentence. Returns null when the call itself failed. */
  complete: (prompt: string) => Promise<string | null>;
  loadCandidates?: () => PromiseLike<ProseCandidate[]>;
  write?: (oracleId: string, prose: string, hash: string) => Promise<void>;
  /** Replaces a row's stored hash and nothing else: the re-stamp from the legacy hash. */
  restamp?: (oracleId: string, hash: string) => Promise<void>;
  /**
   * Retires every cached list built from the catalog, once the run has written anything.
   * `/commanders` caches its rankings, sentences included, keyed on the catalog generation,
   * and this job runs after `Commander index` has already stamped: without its own stamp, a
   * payload cached in between keeps its null sentences for up to the hour ceiling.
   */
  stamp?: () => Promise<void>;
  suppressed?: (oracleId: string) => boolean;
  /** Attempts per commander before it is left with its null. */
  attempts?: number;
  /**
   * At most this many commanders are asked for a sentence in one run; the rest are counted as
   * `deferred` and picked up by the next run, since a written row is skipped as fresh. A spend
   * ceiling, so a run the hash check did not expect to be large (a prompt version bump, a moved
   * tag set) cannot spend without bound.
   */
  maxCommanders?: number;
  /** Count what would be generated, and call nothing. */
  dryRun?: boolean;
  /**
   * Asked before each commander; true stops the run cleanly, deferring the rest to the next run.
   * The spend stop: the caller measures what the calls so far cost and answers whether one more
   * commander could cross its cap.
   */
  shouldStop?: () => boolean;
};

export type GenerateResult = {
  written: number;
  /** Current rows whose stored hash still matches their inputs. */
  fresh: number;
  /**
   * Current under the legacy hash (`legacyProseInputHash`) and re-stamped with the new one, with
   * no model call: a sentence the old hash called fresh describes the same inputs today.
   */
  restamped: number;
  suppressed: number;
  /**
   * At least one attempt produced a string and none of them were accepted. A commander whose
   * attempts mixed rejections with failed calls counts here rather than under `failed`: a
   * string came back and the contract turned it down, which is the fixable half.
   */
  rejected: number;
  /** No attempt produced a string at all — every call failed or returned nothing. */
  failed: number;
  /**
   * Rejected attempts by the rule that rejected them, counted per attempt rather than per
   * commander — a run that rejects most of what it generates is only fixable if the summary
   * says which rule did it, and the four rules are fixed by four different changes.
   */
  rejectedBy: Record<ProseRejection, number>;
  /** Needed a sentence and were not asked for one: a cap was reached, or the run was dry. */
  deferred: number;
};

const DEFAULT_ATTEMPTS = 3;

const loadFromDb = () =>
  db.select({
    oracleId: commanderSupport.commanderOracleId,
    name: cards.name,
    tags: commanderSupport.tags,
    prose: commanderSupport.prose,
    proseInputHash: commanderSupport.proseInputHash,
  })
    .from(commanderSupport)
    .innerJoin(cards, eq(cards.oracleId, commanderSupport.commanderOracleId));

const restampInDb = async (oracleId: string, hash: string) => {
  await db.update(commanderSupport)
    .set({ proseInputHash: hash })
    .where(eq(commanderSupport.commanderOracleId, oracleId));
};

const writeToDb = async (oracleId: string, prose: string, hash: string) => {
  await db.update(commanderSupport)
    .set({ prose, proseInputHash: hash, prosePromptVersion: PROSE_PROMPT_VERSION })
    .where(eq(commanderSupport.commanderOracleId, oracleId));
};

export type RestampResult = { restamped: number; fresh: number; stale: number };

/**
 * The one-time move to the set-and-lead hash, with no model call (`db:restamp:prose`): a row
 * current under `legacyProseInputHash` takes the new stamp, and every other row is left exactly
 * as it is. `generateCommanderProse` makes the same move row by row; `copyCommanderProse` only
 * accepts a legacy-stamped source row and never re-stamps the target's own. This lets a database
 * take the move before its inputs change, which neither of those can do for it.
 */
export async function restampCommanderProse(
  opts: Pick<GenerateOptions, "loadCandidates" | "restamp" | "suppressed"> & { dryRun?: boolean } = {},
): Promise<RestampResult> {
  const load = opts.loadCandidates ?? loadFromDb;
  const restamp = opts.restamp ?? restampInDb;
  const suppressed = opts.suppressed ?? isSuppressed;
  const r: RestampResult = { restamped: 0, fresh: 0, stale: 0 };
  for (const c of await load()) {
    if (c.prose === null || suppressed(c.oracleId)) continue;
    const hash = proseInputHash(c.oracleId, c.name, c.tags);
    if (c.proseInputHash === hash) { r.fresh++; continue; }
    if (c.proseInputHash === legacyProseInputHash(c.oracleId, c.name, c.tags)) {
      if (!opts.dryRun) await restamp(c.oracleId, hash);
      r.restamped++;
      continue;
    }
    r.stale++;
  }
  return r;
}

/**
 * Generate, validate and store one sentence per commander.
 *
 * Only accepted strings are written. A commander whose every attempt fails the contract
 * keeps its null prose column, which is the prose-absent state the design draws — the
 * alternative, truncating to fit, produces a sentence nobody wrote and hides that it did.
 */
export async function generateCommanderProse(opts: GenerateOptions): Promise<GenerateResult> {
  const load = opts.loadCandidates ?? loadFromDb;
  const write = opts.write ?? writeToDb;
  const restamp = opts.restamp ?? restampInDb;
  const suppressed = opts.suppressed ?? isSuppressed;
  const attempts = opts.attempts ?? DEFAULT_ATTEMPTS;
  const stamp = opts.stamp ?? stampCatalogRefresh;

  const candidates = await load();
  const r: GenerateResult = {
    written: 0,
    fresh: 0,
    restamped: 0,
    suppressed: 0,
    rejected: 0,
    failed: 0,
    rejectedBy: { length: 0, sentences: 0, "front-loading": 0, hedge: 0 },
    deferred: 0,
  };
  let asked = 0;

  // In a `finally`, so a run that dies part-way still retires the payloads its writes changed.
  try {
    for (const c of candidates) {
      // Consulted before generation, not after: a suppressed commander is never asked for.
      if (suppressed(c.oracleId)) { r.suppressed++; continue; }

      const hash = proseInputHash(c.oracleId, c.name, c.tags);
      if (c.prose !== null && c.proseInputHash === hash) { r.fresh++; continue; }
      // Before the dry run and the cap: a re-stamp calls no model, so it is never a commander asked.
      if (c.prose !== null && c.proseInputHash === legacyProseInputHash(c.oracleId, c.name, c.tags)) {
        if (!opts.dryRun) await restamp(c.oracleId, hash);
        r.restamped++;
        continue;
      }
      if (opts.dryRun || (opts.maxCommanders !== undefined && asked >= opts.maxCommanders) || opts.shouldStop?.()) {
        r.deferred++;
        continue;
      }
      asked++;

      let accepted: string | null = null;
      let called = false;
      // Carried between attempts so a retry can be told which rule it broke. Null until the
      // first rejection, and the last real rejection then stands until a newer one replaces
      // it — a call that returned nothing produces no sentence to feed back, and the rule the
      // attempt before it broke is still the most useful thing to say.
      let last: { text: string; reason: ProseRejection } | null = null;
      for (let i = 0; i < attempts && accepted === null; i++) {
        const prompt =
          last === null
            ? buildProsePrompt(c.name, c.tags)
            : buildProseRetryPrompt(c.name, c.tags, last.text, last.reason);
        // A model client that throws is failing the same way the documented `null` names,
        // and one commander's timeout is not a reason to abandon the rest of the batch.
        // Narrow on purpose: only the call is guarded, so a bug in the accept contract
        // below still surfaces as a crash rather than a silently failed attempt.
        let reply: string | null;
        try {
          reply = await opts.complete(prompt);
        } catch (err) {
          console.warn(`prose: request failed for ${c.name}: ${String(err)}`);
          continue;
        }
        if (reply === null) continue;
        called = true;
        const trimmed = reply.trim();
        const reason = checkProse(trimmed);
        if (reason === null) {
          accepted = trimmed;
        } else {
          r.rejectedBy[reason]++;
          last = { text: trimmed, reason };
          console.warn(
            `prose: rejected for ${c.name} (${reason}, ${trimmed.length} chars): ${trimmed}`,
          );
        }
      }

      if (accepted === null) {
        if (called) r.rejected++; else r.failed++;
        continue;
      }
      await write(c.oracleId, accepted, hash);
      r.written++;
    }
  } finally {
    if (r.written > 0) await stamp();
  }

  return r;
}
