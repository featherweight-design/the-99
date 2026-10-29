import { and, desc, eq, isNotNull, sql } from "drizzle-orm";

import { db } from "../../../db";
import { deckSuggestionRuns } from "../../../db/schema";
import { creditsCopy } from "../../copy/credits";
import { deckTuningCopy } from "../../copy/deck-tuning";
import { lockedCardsCopy } from "../../copy/locked-cards";
import {
  profileOfHead, readOwnedOracleIds, readTuningContext, suggestedRunsOfDeck, tuningInputs, withBracketAfter,
} from "../../decks/tuning-read";
import { loadBracketGateFacts } from "../../intake/fill-facts";
import type { Billed } from "../../model/allowance";
import { streamModel } from "../../model/client";
import type { ProfileHead } from "../../profile/load";
import { buildPlayGroup } from "../../profile/play";
import { loadFocusCandidates, planFocusCandidates } from "../../strategy/candidates";
import { focusPack, loadAddCards, loadRunStrategy, strategyChips } from "../../strategy/run";
import { readResolvedRows } from "../answer";
import { buildEvidencePack } from "../evidence";
import { TUNING_EFFORT, TUNING_MODEL, V2_RUN_BUDGET_MS } from "../limits";
import { loadOwnedCandidates } from "../owned-candidates";
import { reapReaderRuns } from "../reap-runs";
import { nameResolver } from "../resolve-names";
import { failV2Run, insertV2Line, markV2CutAsk, markV2Progress, persistV2, startRun, type RunHandle } from "../run-store";
import { stagedStubOutcome, STUB_ADDITIONS } from "../stub";
import type { ResolvedCard } from "../validate";
import { cardFloorOf, type BracketAim, type BracketChoice } from "./bracket-aim";
import { isCount } from "./count";
import { runV2, type V2CallModel, type V2Side } from "./engine";
import { v2Outcome, v2StartReport } from "./report";
import { requestHash } from "./request-hash";
import { lineStream } from "./stream-lines";

/**
 * Suggested changes v2's run (plan 2026-10-27, PR 3), from the press to the settle. SERVER-ONLY. `runTuning` reaches it
 * only when the press carries `requestedCount` (plan P1), so v10's path is untouched; this module adds what v2 changes:
 *
 * - The deck must be at size (spec §3: its total, commanders included, is 100), refused BEFORE a credit is reserved.
 * - No `unchanged` gate and no "Suggest again anyway" (§8). Identical inputs on an unchanged deck ask once instead: the
 *   newest ok v2 run's deck fingerprint AND request hash both match → `confirm`, carrying that run's id and date (G4),
 *   unless the press says `confirmed`.
 * - No `ownedNone` fallback (§4): an owned-only run that cannot fill its count comes back short and says why.
 * - The work is `runV2` inside `V2_RUN_BUDGET_MS` (P2), streamed (`streamModel`); each kept line is saved the moment it
 *   is kept (H1, `insertV2Line`), each list's "in" and "refilling" are written for the wait, and the run settles by
 *   `charge.ts` (`persistV2`). A failed line save fails the run the P4 way: lines saved stay, refunded (`failV2Run`).
 */

export type V2Wire = { requestedCount: number; request: string | undefined; bracket: BracketAim | null; confirmed: boolean };

const CHOICES: readonly BracketChoice[] = ["keep", "down", "up"];

/** The press's v2 fields, or null when any is not what it claims (a server action is a public endpoint). Pure. */
export function parseV2Wire(opts: Record<string, unknown>): V2Wire | null {
  if (!isCount(opts.requestedCount)) return null;
  if (opts.request !== undefined && typeof opts.request !== "string") return null;
  let bracket: BracketAim | null = null;
  if (opts.bracket !== undefined && opts.bracket !== null) {
    const b = opts.bracket as { choice?: unknown; target?: unknown; low?: unknown };
    if (typeof b !== "object" || !CHOICES.includes(b.choice as BracketChoice)) return null;
    if (!Number.isInteger(b.target) || (b.target as number) < 1 || (b.target as number) > 5) return null;
    // A range's bottom, on Keep only, and no higher than its top.
    if (b.low !== undefined && (b.choice !== "keep" || !Number.isInteger(b.low) || (b.low as number) < 1 || (b.low as number) > (b.target as number))) return null;
    bracket = { choice: b.choice as BracketChoice, target: b.target as number, ...(b.low !== undefined ? { low: b.low as number } : {}) };
  }
  return { requestedCount: opts.requestedCount, request: opts.request as string | undefined, bracket, confirmed: opts.confirmed === true };
}

/** The deck's total as the profile counts it (`countCards`): every `deck_cards` copy, and each commander that is not
 *  also a row. Read off the head the run already holds, so the size gate costs no query. Pure. */
export function deckTotal(head: Pick<ProfileHead, "cards" | "commanderOracleId" | "partnerOracleId">): number {
  const ids = new Set(head.cards.map((c) => c.oracleId));
  const commanders = [head.commanderOracleId, head.partnerOracleId].filter((id): id is string => id !== null && !ids.has(id));
  return head.cards.reduce((n, c) => n + c.quantity, 0) + commanders.length;
}

/** Spec §3's "at size": the deck's total, commanders included. */
export const V2_DECK_TOTAL = 100;

/** The newest ok v2 run of this deck, for the same-request check (G4). */
export async function readLastV2Run(deckId: string, userId: string) {
  const [row] = await db.select({
    id: deckSuggestionRuns.id,
    fingerprint: deckSuggestionRuns.inputFingerprint,
    at: deckSuggestionRuns.createdAt,
    requestHash: sql<string | null>`${deckSuggestionRuns.validationReport} -> 'v2' ->> 'requestHash'`,
  }).from(deckSuggestionRuns)
    .where(and(suggestedRunsOfDeck(deckId), eq(deckSuggestionRuns.userId, userId), eq(deckSuggestionRuns.status, "ok"), isNotNull(deckSuggestionRuns.requestedCount)))
    .orderBy(desc(deckSuggestionRuns.createdAt)).limit(1);
  return row ?? null;
}

export type V2Start =
  | { kind: "refused"; message: string }
  | { kind: "confirm"; runId: string; at: string }
  | { kind: "started"; runId: string; work: (revalidate: () => void) => Promise<void> };

export async function startTuningV2(args: {
  deckId: string; userId: string; env: NodeJS.ProcessEnv; runId?: string; wire: V2Wire;
  /** The request as `resolveBoxText` resolved it, trimmed; "" for none. */
  request: string;
}): Promise<V2Start> {
  const { deckId, userId, env, wire, request } = args;
  const inputs = await tuningInputs(deckId, userId, env);
  if (!inputs) return { kind: "refused", message: deckTuningCopy.run.refused };
  if (inputs.allLocked) return { kind: "refused", message: lockedCardsCopy.tuning.allLocked(inputs.allLocked) };
  // Spec §3: Suggested changes v2 is 99 to 99. The panel offers it only at size; this is the server's own word on it.
  if (deckTotal(inputs.head) !== V2_DECK_TOTAL) return { kind: "refused", message: deckTuningCopy.run.refused };

  const hash = requestHash({
    count: wire.requestedCount, text: request, bracketChoice: wire.bracket?.choice ?? "none", bracketTarget: wire.bracket?.target ?? 0,
    ...(wire.bracket?.low !== undefined ? { bracketLow: wire.bracket.low } : {}),
  });
  if (!wire.confirmed) {
    const last = await readLastV2Run(deckId, userId);
    if (last && last.fingerprint === inputs.fingerprint && last.requestHash === hash) {
      return { kind: "confirm", runId: last.id, at: last.at.toISOString() };
    }
  }

  // An abandoned run would hold the one-pending index and read as "already running": the panel's read reaps it, and so
  // does this press, since v2 reads no panel state first.
  await reapReaderRuns(deckId, userId);
  const startReport = v2StartReport({ requestHash: hash, restrictions: inputs.limits, hadRequest: request !== "", focus: inputs.focus ?? undefined });
  const started = await startRun(userId, deckId, inputs.fingerprint, inputs.readVersion, {
    runId: args.runId, env,
    v2: { requestedCount: wire.requestedCount, requestText: request === "" ? null : request, bracket: wire.bracket, report: startReport },
  });
  if (started.kind === "ownerShare") return { kind: "refused", message: creditsCopy.ownerShare(new Date()) };
  if (started.kind === "allowance") return { kind: "refused", message: deckTuningCopy.allowance.spent };
  if (started.kind === "in_flight") return { kind: "refused", message: deckTuningCopy.announce.started };
  if (started.kind === "allLocked") return { kind: "refused", message: deckTuningCopy.run.refused };
  const run: RunHandle = { runId: started.runId, callId: started.callId };
  return { kind: "started", runId: run.runId, work: (revalidate) => workV2({ run, inputs, wire, request, startReport, env, revalidate }) };
}

type Inputs = NonNullable<Awaited<ReturnType<typeof tuningInputs>>>;

async function workV2(args: {
  run: RunHandle; inputs: Inputs; wire: V2Wire; request: string; startReport: ReturnType<typeof v2StartReport>;
  env: NodeJS.ProcessEnv; revalidate: () => void;
}): Promise<void> {
  const { run, inputs, wire, request, env } = args;
  const { head, games, intent, declared, locked, limits, focus } = inputs;
  const { deckId, userId } = head;
  // One entry per streamed call that billed, settled together under the one reservation, whatever ends the run.
  const billed: Billed[] = [];
  try {
    const profile = await profileOfHead(head, env);
    const inDeckIds = new Set(profile.cards.map((c) => c.oracleId));
    const [owned, { overview, universal }] = await Promise.all([
      readOwnedOracleIds(userId, [...profile.cards.map((c) => c.oracleId), ...profile.skeleton.staples.map((s) => s.oracleId)]),
      readTuningContext(head),
    ]);
    const focusRun = focus ? await loadRunStrategy(head, focus) : null;
    const shared = {
      userId, deckId, commanderOracleIds: profile.commanderOracleIds, colorIdentity: [...profile.colours.identity], inDeck: inDeckIds, env,
    };
    const ownedCandidates = limits.ownedOnly ? await loadOwnedCandidates({ ...shared, limits }) : undefined;
    const focusPlan = focusRun
      ? await planFocusCandidates(limits, ownedCandidates, (l) => loadFocusCandidates({
        ...shared, limits: l, focus: focusRun.key,
        stapleCondition: profile.skeleton.condition, roleBasis: profile.skeleton.roleBasis ?? "classifier",
      }))
      : null;
    // Spec §4: no owned-only fallback. The limits stay as the player set them, whatever fits.
    const pack = buildEvidencePack({
      profile, play: buildPlayGroup(games), intent, owned, overview, universal, locked: new Set(locked), limits,
      ownedCandidates: focusPlan ? focusPlan.shortlist : ownedCandidates,
    });
    if (focusRun && focusPlan) pack.focus = focusPack(focusRun, focusPlan.candidates);

    // The validator's name lookup is synchronous, and a line's names are known only once it streams in: each line's
    // card is read (`readResolvedRows`, v10's own read) before its last delta reaches the engine. The READ is what is
    // cached per name, not the fact of asking (PR #2316 review): the cut call streams beside the additions refill, and a
    // stream naming a card the other is still reading awaits that same read rather than reaching the validator without
    // the row.
    const rows: (ResolvedCard & { name: string })[] = [];
    const reads = new Map<string, Promise<void>>();
    let resolve = nameResolver(rows, inDeckIds);
    const ensure = async (names: string[]) => {
      const unique = [...new Set(names)];
      const fresh = unique.filter((n) => !reads.has(n));
      if (fresh.length > 0) {
        const read = readResolvedRows({ userId, deckId, limits, names: fresh, env }).then((found) => {
          rows.push(...found);
          resolve = nameResolver(rows, inDeckIds);
        });
        for (const n of fresh) reads.set(n, read);
      }
      await Promise.all([...new Set(unique.map((n) => reads.get(n)!))]);
    };

    const commanders = new Set(profile.commanderOracleIds);
    const stub = stagedStubOutcome(env, {
      adds: STUB_ADDITIONS.filter((n) => !pack.cards.some((c) => c.name === n)),
      cuts: pack.cards.filter((c) => !commanders.has(c.oracleId) && !locked.includes(c.oracleId)).map((c) => c.name),
    });
    // A catalog read failing inside a call's stream is the APP's failure, not the model's: the engine would read a throw
    // from `next()` as the stream failing (malformed, refunded as the model's shortfall). So it is held here, the stream
    // ends, and the run fails through `failV2Run` once the engine returns.
    let appError: unknown = null;
    const sideOf = (stage: string): V2Side => (stage.startsWith("additions") ? "add" : "cut");
    const callModel: V2CallModel = (req) => {
      // After a catalog read failed, no further call is made (PR #2316 review): the run is failing as the app's error,
      // and a refill or cut call started now would be paid for nothing. The throw rejects `runV2` (its `run` makes the
      // call outside the stream's own try), which is the app-error path below.
      if (appError !== null) throw appError;
      const refill = req.stage.endsWith("Refill");
      if (refill) void markV2Progress(run.runId, "refilling", sideOf(req.stage), true).catch(() => undefined);
      const call = stub
        ? stub({ stage: req.stage, ask: req.ask })
        : streamModel({
          model: TUNING_MODEL, system: req.system, user: req.user, maxTokens: req.maxTokens, schema: req.schema,
          deadlineMs: req.deadlineMs, effort: TUNING_EFFORT,
        });
      const shadow = lineStream();
      const deltas = (async function* () {
        for await (const delta of call.deltas) {
          const names = shadow.push(delta).flatMap((l) => {
            const card = (l as { card?: unknown } | null)?.card;
            return typeof card === "string" ? [card] : [];
          });
          try {
            await ensure(names);
          } catch (err) {
            appError ??= err;
            return;
          }
          yield delta;
        }
      })();
      const outcome = call.outcome.then((o) => {
        if (o.usage) billed.push({ model: TUNING_MODEL, usage: o.usage, step: req.stage, effort: TUNING_EFFORT });
        if (refill) void markV2Progress(run.runId, "refilling", sideOf(req.stage), false).catch(() => undefined);
        return o.ok ? { ok: true as const, usage: o.usage } : { ok: false as const, errorClass: o.errorClass, usage: o.usage };
      });
      return { deltas, outcome };
    };

    const report = await runV2({
      callModel, pack, n: wire.requestedCount, request, aim: wire.bracket,
      resolveName: (name) => resolve(name),
      // The bracket flag, per line, through the Analysis tab's own verdict on the changed list (`withBracketAfter`).
      // About 0.36s a line measured from a laptop against local-dev, and it overlaps the stream: the reply keeps
      // arriving into `streamModel`'s buffer while a line is checked.
      bracketAfter: async (_side, line) => (await withBracketAfter(head, profile, declared, [line], env))[0].bracketAfter,
      // Only Down reads a card's floor (`aimDrops`); Keep and Up have what they need from `bracketAfter`.
      cardFloor: async (side, line) =>
        wire.bracket?.choice === "down" && side === "add" && line.addOracleId ? cardFloorOf(line.addOracleId, await loadBracketGateFacts([line.addOracleId])) : null,
      budgetMs: V2_RUN_BUDGET_MS,
      // AFTER validation, as v10 does (`runTuning`): the focus chips are the app's figures, which the validator would drop
      // from the model. A line's own addition is read for its chip, so each line is chipped as it is saved.
      onLine: async (_side, line) => {
        const [chipped] = focusRun
          ? strategyChips([line], focusRun, await loadAddCards(line.addOracleId ? [line.addOracleId] : []))
          : [line];
        // False: the run is no longer pending (the deck was deleted, or the run was settled). Fail it here, so the engine
        // makes no further paid call for a run that cannot keep its lines (Copilot round 2).
        if (!(await insertV2Line(run.runId, chipped))) throw new Error(`v2 run ${run.runId} is no longer pending`);
      },
      onListIn: (side) => markV2Progress(run.runId, "in", side, true),
      onCutAsk: (ask) => markV2CutAsk(run.runId, ask),
    });
    if (appError !== null) throw appError;
    const { outcome, validationReport, settleAs } = v2Outcome(report, args.startReport, limits.capCents);
    if (await persistV2(run, outcome, validationReport, settleAs, billed)) args.revalidate();
  } catch (err) {
    // Nobody is waiting on this request: logged, and the run settled with its saved lines and its credit back.
    console.error(`[tuning] v2 run ${run.runId} threw after its reservation`, err);
    if (await failV2Run(run, billed).catch(() => false)) args.revalidate();
  }
}
