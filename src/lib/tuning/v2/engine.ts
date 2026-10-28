import type { z } from "zod";

import type { ModelErrorClass, ModelUsage } from "../../model/client";
import type { EvidencePack } from "../evidence";
import { buildPromptV2, type PromptV2Stage } from "../prompt";
import { lineSchemaV2, suggestedChangesV2Schema } from "../response-schema";
import { validateSuggestions, type Drop, type ResolvedCard, type ValidatedSuggestion } from "../validate";
import { aimDrops, type BracketAim } from "./bracket-aim";
import { chargeFor, type Charge } from "./charge";
import { askFor, cutPlanFor, replyCeilingFor, schemaCapFor } from "./count";
import { reasonFor, refillShortfall } from "./refill";
import { lineStream } from "./stream-lines";

/**
 * Suggested changes v2's run (spec 2026-10-27 §5; plan PR 2 with the handoff's H1, H2, H3). Model-agnostic: the caller
 * injects `callModel`, so this module holds the ORDER of the calls and what each line must pass, and nothing about
 * transport, the ledger or the database.
 *
 * 1. Call 1 asks ceil(1.5N) additions. Each line is validated the moment it completes in the stream (H1) and kept up to
 *    the ask; `onLine` fires per kept line.
 * 2. As soon as call 1 settles (H2), the cut call starts, asked ceil(1.5N) and shown call 1's kept additions as "Coming
 *    in", IN PARALLEL with the additions refill when call 1 kept fewer than N (asked the shortfall, told what was kept and
 *    what was rejected and why, `reasonFor`). A call 1 that kept nothing has nothing to cut for: its refill runs alone,
 *    and only if that keeps additions does a cut call follow, sized to them (`cutPlanFor`, spec §5.1a). Nothing kept at
 *    all skips the cut call, and the run is `ungrounded`.
 * 3. The cut list's target is min(N, the additions finally kept); a cut list short of it refills once.
 *
 * A failed or malformed cut call ends the cuts (plan P4): the additions stand, the run is refunded (`cutsFailed`).
 * Each call's deadline is the smaller of its own cap and what the run's budget has left (P2); a call the budget cannot
 * fit is not made, and the report says `budgetReached`.
 *
 * Duplicates are dropped ACROSS calls and lists (spec §5.2) by oracle id; a line past its list's ask is ignored (a reply
 * that runs over keeps its first ask-many valid lines). With a bracket choice and a `bracketAfter` reader, a line that
 * breaks Keep or Down is dropped as `bracketAim` (`aimDrops`), a restriction the player chose (`charge.ts`).
 */

export type V2Stage = "additions" | "additionsRefill" | "cuts" | "cutsRefill";
export type V2Side = "add" | "cut";

/** One streamed call, as the engine asks for it. PR 3 adapts `client.ts`'s `callModel` to this. */
export type V2CallRequest = {
  stage: V2Stage;
  system: string;
  user: string;
  schema: z.ZodTypeAny;
  maxTokens: number;
  deadlineMs: number;
  stream: true;
};
export type V2CallOutcome = { ok: true; usage?: ModelUsage } | { ok: false; errorClass: ModelErrorClass; usage?: ModelUsage };
/** The reply's text deltas as they arrive, and the call's outcome once it ends (`ok` only for a reply that parsed whole). */
export type V2CallModel = (req: V2CallRequest) => { deltas: AsyncIterable<string>; outcome: Promise<V2CallOutcome> };

/** One call's own deadline cap (the eval's figure, spec §10). */
export const V2_CALL_CAP_MS = 300_000;
/** A call with less of the budget left than this is not made: it could not finish, and would bill for nothing. */
export const V2_MIN_CALL_MS = 15_000;

/** A kept line: the validated suggestion and the card as the model spelled it (the refill names it back). */
export type V2Line = ValidatedSuggestion & { card: string };

export type V2CallReport = {
  stage: V2Stage;
  ask: number;
  ok: boolean;
  errorClass?: ModelErrorClass;
  usage?: ModelUsage;
  ms: number;
  /** Line objects the stream completed, kept or not. */
  lines: number;
  kept: number;
  /** Line objects that did not parse, or failed the line's shape. */
  malformed: number;
};

export type V2List = {
  kept: V2Line[];
  drops: Drop[];
  /** What the list had to reach: N for additions, min(N, kept additions) for cuts. */
  target: number;
  refilled: boolean;
  /** Lines that arrived once the list already held its ask (spec §5.2), ignored. Most are not validated (the list was
   *  full when they arrived), so this counts arrivals past the ask, not lines that would have passed. */
  overAsk: number;
  /** Some call on this list returned fewer lines than it asked for (`charge.ts`: a short list with it is refunded). */
  underProduced: boolean;
};

export type V2Report = {
  additions: V2List;
  cuts: V2List & { skipped: boolean };
  calls: V2CallReport[];
  callCount: number;
  cutsFailed: { errorClass: ModelErrorClass } | null;
  budgetReached: boolean;
  strippedCites: number;
  charge: Charge;
};

export type RunV2Args = {
  callModel: V2CallModel;
  pack: EvidencePack;
  /** The player's count, 1 to 20. */
  n: number;
  /** The player's words for this run, or empty. Sent and validated as the pack's `notes` (`buildPromptV2`). */
  request: string;
  aim: BracketAim | null;
  resolveName: (name: string) => ResolvedCard | null;
  /** The brackets the deck permits with this one line (`bracketAfter` in `bracket-shift.ts`); absent, no line is checked. */
  bracketAfter?: (side: V2Side, line: ValidatedSuggestion) => number[] | null | Promise<number[] | null>;
  /** For an addition: the lowest bracket any deck holding the card can be (`aimDrops`' Down rule); absent, none is read. */
  cardFloor?: (side: V2Side, line: ValidatedSuggestion) => number | null | Promise<number | null>;
  budgetMs: number;
  now?: () => number;
  callCapMs?: number;
  minCallMs?: number;
  onLine?: (side: V2Side, line: V2Line) => void | Promise<void>;
  /** A list is in: its last call ended (or was skipped). */
  onListIn?: (side: V2Side) => void | Promise<void>;
};

export async function runV2(args: RunV2Args): Promise<V2Report> {
  const now = args.now ?? Date.now;
  const callCap = args.callCapMs ?? V2_CALL_CAP_MS;
  const minCall = args.minCallMs ?? V2_MIN_CALL_MS;
  const start = now();
  const pack: EvidencePack = { ...args.pack, notes: args.request.trim() === "" ? null : args.request };
  const n = args.n;

  const used = new Set<string>();
  const calls: V2CallReport[] = [];
  let budgetReached = false;
  let strippedCites = 0;
  let cutsFailed: V2Report["cutsFailed"] = null;
  const additions: V2List = { kept: [], drops: [], target: n, refilled: false, overAsk: 0, underProduced: false };
  const cuts: V2List & { skipped: boolean } = { kept: [], drops: [], target: 0, refilled: false, overAsk: 0, underProduced: false, skipped: false };
  const listOf = (side: V2Side) => (side === "add" ? additions : cuts);
  const caps: Record<V2Side, number> = { add: askFor(n), cut: 0 };

  /** One line, the moment it completes: shape, the validator's rules (v2), duplicates across everything kept, the aim. */
  async function take(side: V2Side, raw: unknown, position: number, here: V2CallReport) {
    here.lines += 1;
    const parsed = lineSchemaV2.safeParse(raw);
    if (!parsed.success) {
      here.malformed += 1;
      return;
    }
    const list = listOf(side);
    if (list.kept.length >= caps[side]) {
      list.overAsk += 1;
      return;
    }
    const line = parsed.data;
    const r = validateSuggestions({
      response: side === "add" ? { additions: [line], cuts: [] } : { additions: [], cuts: [line] },
      pack,
      resolveName: args.resolveName,
      v2: true,
    });
    strippedCites += r.strippedCites;
    const drop = (d: Omit<Drop, "side" | "position">) => list.drops.push({ ...d, side, position, name: d.name ?? line.card });
    if (r.kept.length === 0) {
      for (const d of r.drops) drop(d);
      return;
    }
    const v = r.kept[0];
    const id = (v.addOracleId ?? v.cutOracleId)!;
    if (used.has(id)) return drop({ rule: "duplicate" });
    const after = args.bracketAfter ? await args.bracketAfter(side, v) : null;
    const floor = args.aim && args.cardFloor ? await args.cardFloor(side, v) : null;
    if (args.aim && aimDrops(args.aim, side, after, floor)) return drop({ rule: "bracketAim" });
    // Re-checked after the await: a parallel call may have filled the list or taken the card meanwhile.
    if (used.has(id)) return drop({ rule: "duplicate" });
    if (list.kept.length >= caps[side]) {
      list.overAsk += 1;
      return;
    }
    used.add(id);
    const kept: V2Line = { ...v, bracketAfter: after, position: list.kept.length, card: line.card };
    list.kept.push(kept);
    here.kept += 1;
    await args.onLine?.(side, kept);
  }

  /** One streamed call, or null when the budget cannot fit it. */
  async function run(stage: V2Stage, side: V2Side, prompt: PromptV2Stage): Promise<V2CallReport | null> {
    const left = args.budgetMs - (now() - start);
    if (left < minCall) {
      budgetReached = true;
      return null;
    }
    const deadlineMs = Math.min(callCap, left);
    const { system, user } = buildPromptV2(pack, prompt);
    const here: V2CallReport = { stage, ask: prompt.ask, ok: false, ms: 0, lines: 0, kept: 0, malformed: 0 };
    calls.push(here);
    const t = now();
    const call = args.callModel({
      stage, system, user,
      schema: suggestedChangesV2Schema(schemaCapFor(prompt.ask), prompt.list),
      maxTokens: replyCeilingFor(prompt.ask),
      deadlineMs,
      stream: true,
    });
    const parser = lineStream();
    let position = 0;
    let streamFailed = false;
    // Only the STREAM failing is the call's failure. A line's validation or save (`take`, its `onLine`) throwing is the
    // app's: the call's outcome is still settled (so nothing is left unhandled), then the error goes to the caller, which
    // fails the run rather than charging for lines it never saved.
    const deltas = call.deltas[Symbol.asyncIterator]();
    try {
      for (;;) {
        let next: IteratorResult<string>;
        try {
          next = await deltas.next();
        } catch {
          streamFailed = true;
          break;
        }
        if (next.done) break;
        for (const raw of parser.push(next.value)) await take(side, raw, position++, here);
      }
    } catch (error) {
      await deltas.return?.().catch(() => undefined);
      await call.outcome.catch(() => undefined);
      throw error;
    }
    const outcome: V2CallOutcome = await call.outcome.catch(() => ({ ok: false as const, errorClass: "upstream_busy" as const }));
    const end = parser.end();
    here.ms = now() - t;
    here.malformed += end.malformed;
    if (here.lines + end.malformed < prompt.ask) listOf(side).underProduced = true;
    if (outcome.usage) here.usage = outcome.usage;
    here.ok = outcome.ok && !streamFailed && end.complete;
    // A shape-invalid line, or a call that failed or was cut off, is the model's shortfall: a short list it touched is
    // refunded (`charge.ts`), however many restriction drops sit beside it.
    if (here.malformed > 0 || !here.ok) listOf(side).underProduced = true;
    if (!here.ok) {
      here.errorClass = outcome.ok ? "malformed" : outcome.errorClass;
      // A call cut off by what the budget left it, rather than by its own cap, is the budget's doing.
      if (here.errorClass === "timeout" && deadlineMs < callCap) budgetReached = true;
    }
    return here;
  }

  const names = (list: V2List) => list.kept.map((l) => l.card);
  const rejected = (list: V2List) => list.drops.map((d) => ({ card: d.name ?? "?", reason: reasonFor(d) }));

  /** The additions refill: one call for the shortfall below N, told what stands and what fell. */
  async function refillAdditions() {
    const short = refillShortfall(additions.kept.length, n, additions.refilled);
    if (short === 0) return;
    additions.refilled = true;
    await run("additionsRefill", "add", { list: "additions", n, ask: short, aim: args.aim, refill: { kept: names(additions), rejected: rejected(additions) } });
  }

  /** The cut call, asked `ask`, shown `comingIn`; true when it ended well. */
  async function cutCall(ask: number, comingIn: string[]): Promise<boolean> {
    caps.cut = ask;
    const r = await run("cuts", "cut", { list: "cuts", n, ask, aim: args.aim, comingIn });
    if (r === null) return false;
    if (!r.ok) cutsFailed = { errorClass: r.errorClass! };
    return r.ok;
  }

  async function refillCuts() {
    cuts.target = Math.min(n, additions.kept.length);
    const short = refillShortfall(cuts.kept.length, cuts.target, cuts.refilled);
    if (short === 0) return;
    cuts.refilled = true;
    caps.cut = Math.max(caps.cut, cuts.kept.length + short);
    await run("cutsRefill", "cut", { list: "cuts", n, ask: short, aim: args.aim, comingIn: names(additions), refill: { kept: names(cuts), rejected: rejected(cuts) } });
  }

  await run("additions", "add", { list: "additions", n, ask: askFor(n), aim: args.aim });

  if (additions.kept.length === 0) {
    // Nothing to cut for yet: the refill runs alone, and a cut call follows only for what it keeps (spec §5.1a).
    await refillAdditions();
    await args.onListIn?.("add");
    if (additions.kept.length === 0) {
      cuts.skipped = true;
    } else {
      const plan = cutPlanFor(n, additions.kept.length);
      cuts.target = plan.target;
      if (await cutCall(plan.ask, names(additions))) await refillCuts();
    }
  } else {
    // H2: the cut call starts now, beside any additions refill; "Coming in" is what call 1 kept.
    const comingIn = names(additions);
    const [, cutOk] = await Promise.all([
      refillAdditions().then(() => args.onListIn?.("add")),
      cutCall(askFor(n), comingIn),
    ]);
    if (cutOk) await refillCuts();
  }
  cuts.target = Math.min(n, additions.kept.length);
  await args.onListIn?.("cut");

  const charge = chargeFor({
    additions: { kept: additions.kept.length, target: additions.target, drops: additions.drops, underProduced: additions.underProduced },
    cuts: { kept: cuts.kept.length, target: cuts.target, drops: cuts.drops, underProduced: cuts.underProduced },
    cutsFailed: cutsFailed !== null,
    budgetReached,
  });
  return { additions, cuts, calls, callCount: calls.length, cutsFailed, budgetReached, strippedCites, charge };
}
