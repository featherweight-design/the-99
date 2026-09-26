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
};

export type GenerateResult = {
  written: number;
  /** Current rows whose stored hash still matches their inputs. */
  fresh: number;
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

const writeToDb = async (oracleId: string, prose: string, hash: string) => {
  await db.update(commanderSupport)
    .set({ prose, proseInputHash: hash, prosePromptVersion: PROSE_PROMPT_VERSION })
    .where(eq(commanderSupport.commanderOracleId, oracleId));
};

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
  const suppressed = opts.suppressed ?? isSuppressed;
  const attempts = opts.attempts ?? DEFAULT_ATTEMPTS;
  const stamp = opts.stamp ?? stampCatalogRefresh;

  const candidates = await load();
  const r: GenerateResult = {
    written: 0,
    fresh: 0,
    suppressed: 0,
    rejected: 0,
    failed: 0,
    rejectedBy: { length: 0, sentences: 0, "front-loading": 0, hedge: 0 },
  };

  // In a `finally`, so a run that dies part-way still retires the payloads its writes changed.
  try {
    for (const c of candidates) {
      // Consulted before generation, not after: a suppressed commander is never asked for.
      if (suppressed(c.oracleId)) { r.suppressed++; continue; }

      const hash = proseInputHash(c.oracleId, c.name, c.tags);
      if (c.prose !== null && c.proseInputHash === hash) { r.fresh++; continue; }

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
