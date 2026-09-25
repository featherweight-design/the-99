import { callModel, type ModelOutcome } from "../model/client";
import { INTAKE_DEADLINE_MS, INTAKE_EFFORT, INTAKE_MAX_TOKENS, INTAKE_MODEL, INTAKE_RETRY_FLOOR_MS } from "./limits";
import type { PhraseIndex } from "./match";
import { buildReadPrompt, readResponseSchema, validateRead, type ReadResponse } from "./read";
import { settleRead, startRead, type ReadErrorClass, type StoredRead } from "./run-store";
import { intakeLive, STUB_MODEL, stubMode, stubReply } from "./stub";
import { loadPhraseIndex, loadThemeVocabulary } from "./search";

/**
 * One press of *Look deeper*, end to end: reserve, call, validate, settle. SERVER-ONLY. The Server
 * Action authenticates and checks its input, then calls this; `probe:help-me-choose-read` calls it
 * directly with the model injected, which is how a probe reaches the late answer.
 *
 * VALIDATION RUNS BEFORE THE SETTLE (F4): the unit is spent only when a chip survived it.
 */

export type DeeperReadOutcome =
  | ({ kind: "read" } & StoredRead)
  /** The read was valid in shape but nothing in it held up: refunded. */
  | { kind: "nothing"; notUnderstood: string[] }
  /** The call failed: refunded. */
  | { kind: "failed"; errorClass: ReadErrorClass }
  /** Stopped, or reaped, before the answer came back: it wrote nothing. */
  | { kind: "stopped" }
  | { kind: "allowance" | "paused" | "ownerShare" | "in_flight" }
  /** The press reused the id of a read that already exists. */
  | { kind: "reused" };

export type DeeperReadDeps = {
  /** Stored on the read, so the ledger prices it and a probe can prove the stub ran. */
  modelName: string;
  model: (req: { system: string; user: string }, words: string, index: PhraseIndex) => Promise<ModelOutcome<ReadResponse>>;
  loadIndex: () => Promise<{ labels: string[]; index: PhraseIndex }>;
  now: () => Date;
};

async function loadIndex(): Promise<{ labels: string[]; index: PhraseIndex }> {
  const themes = await loadThemeVocabulary();
  return { labels: themes.map((t) => t.label), index: await loadPhraseIndex(themes) };
}

/** The real model in production or under `INTAKE_LIVE=1`; the stub everywhere else. */
export function defaultDeps(): DeeperReadDeps {
  const live = intakeLive();
  return {
    modelName: live ? INTAKE_MODEL : STUB_MODEL,
    model: live
      ? (req) => callModel({
        model: INTAKE_MODEL,
        system: req.system,
        user: req.user,
        maxTokens: INTAKE_MAX_TOKENS,
        effort: INTAKE_EFFORT,
        schema: readResponseSchema,
        deadlineMs: INTAKE_DEADLINE_MS,
        retryFloorMs: INTAKE_RETRY_FLOOR_MS,
      })
      : async (_req, words, index) => stubReply(words, index, stubMode()),
    loadIndex,
    now: () => new Date(),
  };
}

export async function runDeeperRead(
  userId: string,
  input: { readId: string; words: string; controls: { budgetDollars: number | null; bracket: number | null } },
  deps: DeeperReadDeps = defaultDeps(),
): Promise<DeeperReadOutcome> {
  // The index is read before the unit is reserved: a failed read of it costs the player nothing.
  const { labels, index } = await deps.loadIndex();
  const started = await startRead(userId, input.words, deps.modelName, { readId: input.readId, now: deps.now() });
  if (started.kind !== "started") return { kind: started.kind };

  const outcome = await deps.model(buildReadPrompt(input.words, labels), input.words, index);
  const billed = outcome.usage ? { model: deps.modelName, usage: outcome.usage } : undefined;
  if (!outcome.ok) {
    const settled = await settleRead(started, { kind: "failed", errorClass: outcome.errorClass }, billed);
    return settled ? { kind: "failed", errorClass: outcome.errorClass } : { kind: "stopped" };
  }
  const result = validateRead({ reply: outcome.value, words: input.words, index, controls: input.controls });
  const settled = await settleRead(started, { kind: "read", result }, billed);
  if (!settled) return { kind: "stopped" };
  return result.useful
    ? { kind: "read", chips: result.chips, notUsed: result.notUsed, notUnderstood: result.notUnderstood }
    : { kind: "nothing", notUnderstood: result.notUnderstood };
}
