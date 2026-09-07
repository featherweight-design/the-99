import { eq } from "drizzle-orm";
import { db } from "../../db";
import { cards, commanderSupport } from "../../db/schema";
import type { EdhrecTag } from "../edhrec/parse";
import { acceptProse } from "./accept";
import { buildProsePrompt, PROSE_PROMPT_VERSION, proseInputHash } from "./prompt";
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
  suppressed?: (oracleId: string) => boolean;
  /** Attempts per commander before it is left with its null. */
  attempts?: number;
};

export type GenerateResult = {
  written: number;
  /** Current rows whose stored hash still matches their inputs. */
  fresh: number;
  suppressed: number;
  /** Every attempt produced a string the contract rejected. */
  rejected: number;
  /** The model call failed outright. */
  failed: number;
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

  const candidates = await load();
  const r: GenerateResult = { written: 0, fresh: 0, suppressed: 0, rejected: 0, failed: 0 };

  for (const c of candidates) {
    // Consulted before generation, not after: a suppressed commander is never asked for.
    if (suppressed(c.oracleId)) { r.suppressed++; continue; }

    const hash = proseInputHash(c.oracleId, c.tags);
    if (c.prose !== null && c.proseInputHash === hash) { r.fresh++; continue; }

    const prompt = buildProsePrompt(c.name, c.tags);
    let accepted: string | null = null;
    let called = false;
    for (let i = 0; i < attempts && accepted === null; i++) {
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
      if (acceptProse(trimmed)) accepted = trimmed;
      else console.warn(`prose: rejected for ${c.name} (${trimmed.length} chars): ${trimmed}`);
    }

    if (accepted === null) {
      if (called) r.rejected++; else r.failed++;
      continue;
    }
    await write(c.oracleId, accepted, hash);
    r.written++;
  }

  return r;
}
