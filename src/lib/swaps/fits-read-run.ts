import { readAllowance, type Billed } from "../model/allowance";
import type { Allowance } from "../model/allowance-rule";
import { callModel, type ModelOutcome } from "../model/client";
import type { FitsRead } from "./fits";
import { buildFitsReadPrompt, fitsReadSchema, validFitsRead, type FitsReadReply, type PlanSource } from "./fits-read";
import { FITS_READ_DEADLINE_MS, FITS_READ_EFFORT, FITS_READ_INPUT_CEILING, FITS_READ_MAX_TOKENS, FITS_READ_MODEL } from "./fits-read-limits";
import { loadFitsReadInputs, type FitsReadLoad } from "./fits-read-load";
import { fitsReadView, readRefunds, type FitsReadView } from "./fits-read-state";
import { candidateHashes, finishFitsRead, reapFitsReads, readFitsReadRows, startFitsRead } from "./fits-read-store";
import { fitsReadLive, fitsStubDelayMs, fitsStubMode, STUB_MODEL, stubFitsReply } from "./fits-read-stub";

/**
 * Find a deck read's press and its view (brief locks 4 to 8, handoff §2 to §6). SERVER-ONLY. The
 * actions (`fits-read-actions.ts`) re-apply the switch and the session, then call these.
 */

export type FitsReadPanel = {
  /** The free list, as `loadFits` reads it: the view draws the read and the list from one call. */
  fits: FitsRead;
  view: FitsReadView;
  /** How many candidate decks the card has now. Zero draws no press (lock 8). */
  candidates: number;
  /** Where each candidate's plan came from, for the row's source line (handoff addendum, G12). */
  planSources: Record<string, PlanSource>;
  allowance: Allowance;
};

export type FitsReadPress =
  | { ok: true; panel: FitsReadPanel }
  | { ok: false; reason: "notFound" | "noCandidates" | "tooBig" | "current" | "allowance" | "paused" | "ownerShare" };

type Deps = {
  load: (userId: string, oracleId: string) => Promise<FitsReadLoad | null>;
  model: () => string;
  call: (req: { inputs: FitsReadLoad["inputs"]; prompt: ReturnType<typeof buildFitsReadPrompt>; model: string }) => Promise<ModelOutcome<FitsReadReply>>;
  now: () => Date;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const LIVE_DEPS: Deps = {
  load: (u, o) => loadFitsReadInputs(u, o),
  model: () => (fitsReadLive() ? FITS_READ_MODEL : STUB_MODEL),
  call: async ({ inputs, prompt, model }) => {
    if (model === STUB_MODEL) {
      const ms = fitsStubDelayMs();
      if (ms > 0) await sleep(ms);
      return stubFitsReply(inputs, prompt, fitsStubMode());
    }
    return callModel({
      model, system: prompt.system, user: prompt.user, cacheSystem: prompt.cacheSystem,
      maxTokens: FITS_READ_MAX_TOKENS, schema: fitsReadSchema, deadlineMs: FITS_READ_DEADLINE_MS, effort: FITS_READ_EFFORT,
    });
  },
  now: () => new Date(),
};

/** The view for one card: free, never a call. */
export async function readFitsRead(userId: string, oracleId: string, deps: Deps = LIVE_DEPS): Promise<FitsReadPanel | null> {
  const now = deps.now();
  await reapFitsReads(userId, oracleId, now);
  const load = await deps.load(userId, oracleId);
  if (!load) return null;
  return panelFor(userId, oracleId, load, deps.model(), now);
}

async function panelFor(userId: string, oracleId: string, load: FitsReadLoad, model: string, now: Date): Promise<FitsReadPanel> {
  const [rows, allowance] = await Promise.all([readFitsReadRows(userId, oracleId), readAllowance(userId, now, "fits_read")]);
  const planSources = Object.fromEntries(load.inputs.candidates.map((c) => [c.deckId, load.planOf.get(c.deckId)?.source ?? "none"]));
  return { fits: load.fits, view: fitsReadView(rows, candidateHashes(load.inputs, model)), candidates: load.inputs.candidates.length, planSources, allowance };
}

/**
 * A press. Refused, costing nothing, when the card has no candidate (lock 8), when its prompt would
 * pass the input ceiling, and when the stored read is still current (handoff §6: the same inputs
 * would say the same thing, a no fit included). A run in flight is returned as it stands, never
 * charged twice (lock 5). Otherwise one unit is reserved, the model is asked once, and the outcome
 * settles it: spent for a read that held up, refunded for a failure, a no fit or a thin read.
 */
export async function pressFitsRead(userId: string, oracleId: string, deps: Deps = LIVE_DEPS): Promise<FitsReadPress> {
  const now = deps.now();
  await reapFitsReads(userId, oracleId, now);
  const load = await deps.load(userId, oracleId);
  if (!load) return { ok: false, reason: "notFound" };
  const { inputs } = load;
  if (inputs.candidates.length === 0) return { ok: false, reason: "noCandidates" };
  const model = deps.model();
  const hashes = candidateHashes(inputs, model);
  const before = fitsReadView(await readFitsReadRows(userId, oracleId), hashes);
  if (before.pending) return { ok: true, panel: await panelFor(userId, oracleId, load, model, now) };
  if (before.stored?.current) return { ok: false, reason: "current" };

  const prompt = buildFitsReadPrompt(inputs, "per-press");
  if (Math.ceil((prompt.system.length + prompt.user.length) / 3) > FITS_READ_INPUT_CEILING) return { ok: false, reason: "tooBig" };

  const started = await startFitsRead(userId, oracleId, hashes, model, now);
  if (started.kind === "in_flight") return { ok: true, panel: await panelFor(userId, oracleId, load, model, now) };
  if (started.kind !== "started") return { ok: false, reason: started.kind };

  let billed: Billed | undefined;
  try {
    const outcome = await deps.call({ inputs, prompt, model });
    if (outcome.usage) billed = { model, usage: outcome.usage };
    if (!outcome.ok) {
      const errorClass = outcome.errorClass === "upstream_rejected" ? "upstream_busy" : outcome.errorClass;
      await finishFitsRead(started, { status: "failed", errorClass }, billed, deps.now());
    } else {
      const v = validFitsRead({ reply: outcome.value, prompt, inputs });
      const returned = outcome.value.picks.length;
      if (v.outcome === "failed") {
        await finishFitsRead(started, { status: "failed", errorClass: "ungrounded", returned, drops: v.drops }, billed, deps.now());
      } else {
        await finishFitsRead(started, {
          status: "done", outcome: v.outcome, picks: v.picks, returned, drops: v.drops,
          refunded: readRefunds(v.outcome, v.picks.length, returned),
        }, billed, deps.now());
      }
    }
  } catch (err) {
    await finishFitsRead(started, { status: "failed", errorClass: "upstream_busy" }, billed, deps.now());
    throw err;
  }
  return { ok: true, panel: await panelFor(userId, oracleId, load, model, deps.now()) };
}
