import { callModel, type ModelOutcome } from "../model/client";
import { INTAKE_DEADLINE_MS, INTAKE_EFFORT, INTAKE_MAX_TOKENS, INTAKE_MODEL, INTAKE_RETRY_FLOOR_MS } from "./limits";
import type { PhraseIndex } from "./match";
import { buildReadPrompt, readResponseSchema, validateRead, type ReadResponse } from "./read";
import { readStatus, settleRead, startRead, wordsHash, type ReadErrorClass, type StoredRead } from "./run-store";
import { intakeLive, STUB_MODEL, stubDelayMs, stubMode, stubReply } from "./stub";
import { loadIntakeCatalog } from "./search";

/**
 * One press of *Look deeper*, end to end: reserve, call, validate, settle. SERVER-ONLY. The Server
 * Action authenticates and checks its input, then calls this; `probe:help-me-choose-read` calls it
 * directly with the model injected, which is how a probe reaches the late answer.
 *
 * VALIDATION RUNS BEFORE THE SETTLE (F4): the unit is spent only when a chip survived it.
 */

export type DeeperReadOutcome =
  /** `readId` names the row holding it: the press's own, or a stored read's when the ask repeats. */
  | ({ kind: "read"; readId: string } & StoredRead)
  /** The read was valid in shape but nothing in it held up: refunded. */
  | { kind: "nothing"; readId: string; notUsed: string[]; notUnderstood: string[] }
  /** The call failed: refunded. */
  | { kind: "failed"; errorClass: ReadErrorClass }
  /** Stopped, or reaped, before the answer came back: it wrote nothing. */
  | { kind: "stopped" }
  | { kind: "allowance" | "paused" | "ownerShare" | "in_flight" }
  /** The press reused the id of a read that already exists. */
  | { kind: "reused" };
// A repeat of an ask already read returns `read`, from the store, and reserves nothing.

/** Where an ask stands while a press waits on another look: its settled read, or not yet, or never. */
export type DeeperStatus =
  | Extract<DeeperReadOutcome, { kind: "read" | "nothing" }>
  | { kind: "running" }
  | { kind: "idle" };

/** A waiting press's poll. Read only: it reserves nothing and starts nothing. */
export async function deeperStatus(
  userId: string,
  input: { words: string; controls: { budgetDollars: number | null; bracket: number | null } },
): Promise<DeeperStatus> {
  const status = await readStatus(userId, wordsHash(input.words, input.controls));
  if (status.kind !== "stored") return status;
  return status.useful
    ? { kind: "read", readId: status.readId, ...status.read }
    : { kind: "nothing", readId: status.readId, notUsed: status.read.notUsed, notUnderstood: status.read.notUnderstood };
}

export type DeeperReadDeps = {
  /** Stored on the read, so the ledger prices it and a probe can prove the stub ran. */
  modelName: string;
  model: (req: { system: string; user: string }, words: string, index: PhraseIndex) => Promise<ModelOutcome<ReadResponse>>;
  loadIndex: () => Promise<{ labels: string[]; index: PhraseIndex }>;
  now: () => Date;
};

/** The vocabulary and the phrase index from the search's memo, so a press never rebuilds them. */
async function loadIndex(): Promise<{ labels: string[]; index: PhraseIndex }> {
  const { themes, index } = await loadIntakeCatalog();
  return { labels: themes.map((t) => t.label), index };
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
      : async (_req, words, index) => {
        const hold = stubDelayMs();
        if (hold > 0) await new Promise((r) => setTimeout(r, hold));
        return stubReply(words, index, stubMode());
      },
    loadIndex,
    now: () => new Date(),
  };
}

export async function runDeeperRead(
  userId: string,
  input: {
    readId: string;
    words: string;
    controls: { budgetDollars: number | null; bracket: number | null };
    /** The player's themes and card before this read, so a chip that only repeats one of them
     *  charges nothing (F4 / Hugh's ruling 2026-10-06) — see `validateRead`'s `existing`. */
    existing?: { themes: string[]; card: string | null };
  },
  deps: DeeperReadDeps = defaultDeps(),
): Promise<DeeperReadOutcome> {
  // The index is read before the unit is reserved: a failed read of it costs the player nothing.
  const hash = wordsHash(input.words, input.controls);
  const { labels, index } = await deps.loadIndex();
  const started = await startRead(userId, hash, deps.modelName, { readId: input.readId, now: deps.now() });
  // An ask already read is offered once: its chips come back and no unit was reserved.
  if (started.kind === "stored") {
    return started.useful
      ? { kind: "read", readId: started.readId, ...started.read }
      : { kind: "nothing", readId: started.readId, notUsed: started.read.notUsed, notUnderstood: started.read.notUnderstood };
  }
  if (started.kind !== "started") return { kind: started.kind };

  const outcome = await deps.model(buildReadPrompt(input.words, labels), input.words, index);
  const billed = outcome.usage ? { model: deps.modelName, usage: outcome.usage } : undefined;
  if (!outcome.ok) {
    // A rejection is stored as busy here: the distinction is kept for the overview only, for now.
    const errorClass = outcome.errorClass === "upstream_rejected" ? "upstream_busy" : outcome.errorClass;
    const settled = await settleRead({ ...started, userId }, { kind: "failed", errorClass }, billed);
    return settled ? { kind: "failed", errorClass } : { kind: "stopped" };
  }
  const result = validateRead({
    reply: outcome.value, words: input.words, index, controls: input.controls, existing: input.existing,
  });
  const settled = await settleRead({ ...started, userId }, { kind: "read", result }, billed);
  if (!settled) return { kind: "stopped" };
  return result.useful
    ? { kind: "read", readId: started.readId, chips: result.chips, notUsed: result.notUsed, notUnderstood: result.notUnderstood }
    : { kind: "nothing", readId: started.readId, notUsed: result.notUsed, notUnderstood: result.notUnderstood };
}
