import type { z } from "zod";

import type { ModelErrorClass, ModelUsage } from "../../model/client";
import type { EvidencePack } from "../evidence";
import { buildPromptV2, type PromptV2Stage } from "../prompt";
import { OWNED_OFF_INDEX_MAX, OWNED_SHORTLIST_MAX } from "../limits";
import { lineSchemaV2, suggestedChangesV2Schema } from "../response-schema";
import { quotableOf, validateSuggestions, type Drop, type ResolvedCard, type ValidatedSuggestion } from "../validate";
import { aimDrops, type BracketAim } from "./bracket-aim";
import { chargeFor, type Charge } from "./charge";
import { askFor, cutPlanFor, replyCeilingFor, schemaCapFor } from "./count";
import { reasonFor, refillShortfall } from "./refill";
import { lineStream } from "./stream-lines";
import { asksWhy, buildWhyPrompt, checkWhy, WHY_EFFORT, WHY_MODEL, WHY_REPLY_TOKENS, whySchema, type V2Why } from "./why";

/**
 * Suggested changes v2's run (spec 2026-10-27 §5; plan PR 2 with the handoff's H1, H2, H3). Model-agnostic: the caller
 * injects `callModel`, so this module holds the ORDER of the calls and what each line must pass, and nothing about
 * transport, the ledger or the database.
 *
 * 1. Call 1 asks ceil(1.5N) additions. Each line is validated the moment it completes in the stream (H1) and kept up to
 *    the ask; `onLine` fires per kept line.
 * 2. As soon as call 1 settles (H2), the cut call starts, asked ceil(1.5 min(N, K1)) for call 1's K1 kept additions
 *    (`cutPlanFor`) and shown them as "Coming in", IN PARALLEL with the additions refill when call 1 kept fewer than N
 *    (asked the shortfall, told what was kept and what was rejected and why, `reasonFor`). A call 1 that kept nothing has
 *    nothing to cut for: its refill runs alone, and only if that keeps additions does a cut call follow, sized to them
 *    (`cutPlanFor`, spec §5.1a). Nothing kept at all skips the cut call, and the run is `ungrounded`.
 * 3. The cut list's target is min(N, the additions finally kept); a cut list short of it (the refill brought more
 *    additions than call 1 kept, or cuts dropped) refills once.
 *
 * An owned-only run whose pool is complete (the shortlist, `ownedCandidatesComplete`, under `OWNED_SHORTLIST_MAX`, and the
 * off-index tier, `ownedOffIndexComplete`, under its room) holds every owned card that fits: once each
 * of them is kept or dropped, the additions list is `poolExhausted`, no refill is asked (there is nothing left to ask
 * for), and a short list is the player's limit, not the model's shortfall (`charge.ts`, `report.ts`).
 *
 * A failed or malformed cut call ends the cuts (plan P4): the additions stand, the run is refunded (`cutsFailed`).
 * Each call's deadline is the smaller of its own cap and what the run's budget has left (P2); a call the budget cannot
 * fit is not made, and the report says `budgetReached`.
 *
 * Duplicates are dropped ACROSS calls and lists (spec §5.2) by oracle id; a line past its list's ask is ignored (a reply
 * that runs over keeps its first ask-many valid lines). With a bracket choice and a `bracketAfter` reader, a line that
 * breaks Keep or Down is dropped as `bracketAim` (`aimDrops`), a restriction the player chose (`charge.ts`).
 *
 * An owned-only run's additions list puts the index tier (the commander's index cards and the focus candidates) before
 * the off-index tier (`pack.ownedOffIndex`), whatever order the model answered in, and keeps the model's order inside
 * each tier (`additionPosition`). The prompt asks it to prefer the first list, and a paid eval showed it does not always.
 */

/** `why` is the why-these-cards call (`v2/why.ts`), made once both lists are final; it writes no line. */
export type V2Stage = "additions" | "additionsRefill" | "cuts" | "cutsRefill" | "why";
export type V2Side = "add" | "cut";

/** One streamed call, as the engine asks for it. PR 3 adapts `client.ts`'s `callModel` to this. */
export type V2CallRequest = {
  stage: V2Stage;
  /** How many lines this call asks for (its prompt's count): the staged stub answers exactly that many. */
  ask: number;
  system: string;
  /** The user message's cached prefix, the deck's evidence: byte for byte the same on every call of a run, so the transport
   *  sends it as a cached block (\`client.ts\`'s \`cachedUser\`) and calls 2 to 4 read it, and \`system\`, at 0.1x. Absent on
   *  the why call, which runs on its own model and so could read no other call's cache. */
  cachedUser?: string;
  /** The rest of the user message: this call's own step (\`buildPromptV2\`). */
  user: string;
  schema: z.ZodTypeAny;
  maxTokens: number;
  deadlineMs: number;
  stream: true;
  /** The call's model, when it is not the run's (`TUNING_MODEL`): the why call's is `WHY_MODEL`. */
  model?: string;
  /** The call's reasoning effort, when it is not the run's (`TUNING_EFFORT`): the why call's is `WHY_EFFORT`. */
  effort?: "low" | "medium" | "high";
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

/** Where an off-index addition's positions start: past any list's ask (`askFor(20)` is 30), so every index-tier line
 *  sorts first by `position`, the order every reader of a run's lines takes (`tuning-read.ts`, `apply-set.ts`). */
export const OFF_INDEX_POSITION_BASE = 1000;

/**
 * A kept line's `position` and its index in `kept`: an index-tier line counts the index-tier lines before it, an
 * off-index line `OFF_INDEX_POSITION_BASE` plus the off-index lines before it. A stable partition by tier: every
 * index-tier line before every off-index one, each tier in the order its lines were kept. Lines are saved the moment
 * they are kept, so the order is settled here, by the key, rather than by moving lines already written.
 */
export function additionPosition(kept: readonly Pick<V2Line, "position">[], offIndex: boolean): { position: number; at: number } {
  const tier = kept.filter((l) => (l.position >= OFF_INDEX_POSITION_BASE) === offIndex).length;
  const position = (offIndex ? OFF_INDEX_POSITION_BASE : 0) + tier;
  const after = kept.findIndex((l) => l.position > position);
  return { position, at: after < 0 ? kept.length : after };
}

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
  /** Additions only: an owned-only run's whole pool, both tiers (complete, so every owned card that fits), was
   *  kept or dropped. No card is left to ask for, so the list is short by the player's own limit (`charge.ts`). */
  poolExhausted: boolean;
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
  /** Why these cards, checked against both final lists (`checkWhy`); null when none was asked or it failed. */
  why: V2Why | null;
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
  /** The cut call is about to ask for `ask` cuts: the figure the wait's "asked for" states (plan PR 7, follow-up c). */
  onCutAsk?: (ask: number) => void | Promise<void>;
};

/**
 * An owned-only run's whole pool, both tiers, when it is COMPLETE: the index tier (focus cards included) holds every card
 * that qualifies (`ownedCandidatesComplete`) and is under `OWNED_SHORTLIST_MAX`, and the off-index tier ran out of ranked
 * cards below its room (`ownedOffIndexComplete`; a tier that filled its room is the top of a longer list), with the two
 * together under `OWNED_SHORTLIST_MAX` and the second under `OWNED_OFF_INDEX_MAX`. Null for any other run, or a pool that
 * may be the top of a longer list.
 */
export function completeOwnedPool(
  pack: Pick<EvidencePack, "limits" | "ownedCandidates" | "ownedCandidatesComplete" | "ownedOffIndex" | "ownedOffIndexComplete">,
): { oracleId: string; name: string }[] | null {
  const first = pack.ownedCandidates;
  const offIndex = pack.ownedOffIndex ?? [];
  if (!pack.limits.ownedOnly || !first || !pack.ownedCandidatesComplete || !pack.ownedOffIndexComplete) return null;
  const pool = [...first, ...offIndex];
  if (first.length >= OWNED_SHORTLIST_MAX || offIndex.length >= OWNED_OFF_INDEX_MAX || pool.length >= OWNED_SHORTLIST_MAX) return null;
  return pool;
}

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
  const additions: V2List = { kept: [], drops: [], target: n, refilled: false, overAsk: 0, underProduced: false, poolExhausted: false };
  const cuts: V2List & { skipped: boolean } = {
    kept: [], drops: [], target: 0, refilled: false, overAsk: 0, underProduced: false, poolExhausted: false, skipped: false,
  };
  const listOf = (side: V2Side) => (side === "add" ? additions : cuts);
  const caps: Record<V2Side, number> = { add: askFor(n), cut: 0 };
  // The owned pool's second tier, by id; empty for every run but an owned-only one that found such cards.
  const offIndexIds = new Set((pack.ownedOffIndex ?? []).map((c) => c.oracleId));

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
    const placed = side === "add"
      ? additionPosition(list.kept, v.addOracleId !== null && offIndexIds.has(v.addOracleId))
      : { position: list.kept.length, at: list.kept.length };
    const kept: V2Line = { ...v, bracketAfter: after, position: placed.position, card: line.card };
    list.kept.splice(placed.at, 0, kept);
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
    const { system, cachedUser, user } = buildPromptV2(pack, prompt);
    const here: V2CallReport = { stage, ask: prompt.ask, ok: false, ms: 0, lines: 0, kept: 0, malformed: 0 };
    calls.push(here);
    const t = now();
    const call = args.callModel({
      stage, ask: prompt.ask, system, cachedUser, user,
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
    // The reply closed whole, but the client's whole-reply parse failed it on a constraint each line is checked for here
    // (a line with an empty `rationaleShort`, more lines than the cap). Every line was already judged one by one, so the
    // call stands and only those lines are lost; failing it would refund the run over one bad line. All eight malformed
    // attempts M1 recorded were this, a single empty `rationaleShort` in an otherwise complete reply.
    const judgedWhole = !outcome.ok && outcome.errorClass === "malformed" && end.complete;
    here.ok = (outcome.ok || judgedWhole) && !streamFailed && end.complete;
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

  /**
   * Whether an owned-only run has used its whole pool, both tiers: the pool is complete (`completeOwnedPool`), and each
   * of its cards was kept or dropped on the additions side. A drop is matched by the card it resolves to, else by the
   * name the model wrote.
   */
  function poolExhausted(): boolean {
    const pool = completeOwnedPool(pack);
    if (!pool) return false;
    const seen = new Set<string>(additions.kept.map((l) => l.addOracleId).filter((id): id is string => id !== null));
    const names = new Set<string>();
    for (const d of additions.drops) {
      if (!d.name) continue;
      names.add(d.name.toLowerCase());
      const id = args.resolveName(d.name)?.oracleId;
      if (id) seen.add(id);
    }
    return pool.every((c) => seen.has(c.oracleId) || names.has(c.name.toLowerCase()));
  }

  /** The additions refill: one call for the shortfall below N, told what stands and what fell. None when the owned pool
   *  is spent: every card it could name is already kept or rejected. */
  async function refillAdditions() {
    additions.poolExhausted = poolExhausted();
    if (additions.poolExhausted) return;
    const short = refillShortfall(additions.kept.length, n, additions.refilled);
    if (short === 0) return;
    additions.refilled = true;
    await run("additionsRefill", "add", { list: "additions", n, ask: short, aim: args.aim, refill: { kept: names(additions), rejected: rejected(additions) } });
  }

  /** The cut call, asked `ask`, shown `comingIn`; true when it ended well. */
  async function cutCall(ask: number, comingIn: string[]): Promise<boolean> {
    caps.cut = ask;
    await args.onCutAsk?.(ask);
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
    // H2: the cut call starts now, beside any additions refill; "Coming in" is what call 1 kept, and the cut ask is sized
    // to it (ceil(1.5 min(N, K1)), `cutPlanFor`), taken before the refill can add to the list. `refillCuts` tops the cuts
    // up to min(N, the final K) once both are in.
    const comingIn = names(additions);
    const k1 = additions.kept.length;
    // Both branches settle before an error goes up, so neither is still writing lines after the caller has finalized
    // the run (a save that throws in one branch must not leave the other streaming into a run already settled).
    const [adds, cut] = await Promise.allSettled([
      refillAdditions().then(() => args.onListIn?.("add")),
      cutCall(cutPlanFor(n, k1).ask, comingIn),
    ]);
    if (adds.status === "rejected") throw adds.reason;
    if (cut.status === "rejected") throw cut.reason;
    if (cut.value) await refillCuts();
  }
  cuts.target = Math.min(n, additions.kept.length);
  additions.poolExhausted = poolExhausted();
  await args.onListIn?.("cut");

  const charge = chargeFor({
    additions: {
      kept: additions.kept.length, target: additions.target, drops: additions.drops, underProduced: additions.underProduced,
      poolExhausted: additions.poolExhausted,
    },
    cuts: { kept: cuts.kept.length, target: cuts.target, drops: cuts.drops, underProduced: cuts.underProduced },
    cutsFailed: cutsFailed !== null,
    budgetReached,
  });
  const why = await whyCall();
  return { additions, cuts, calls, callCount: calls.length, cutsFailed, budgetReached, strippedCites, charge, why };

  /**
   * Why these cards: one small call once both lists are final, shown the kept rows (`v2/why.ts`). Its failure, or a reply
   * that fails its checks, costs the run nothing but the box: the lists and the charge stand.
   */
  async function whyCall(): Promise<V2Why | null> {
    if (!asksWhy({ n, adds: additions.kept.length, cuts: cuts.kept.length, cutsFailed: cutsFailed !== null })) return null;
    const left = args.budgetMs - (now() - start);
    if (left < minCall) return null;
    const { system, user } = buildWhyPrompt({
      commanders: pack.commanders.map((c) => c.name), request: pack.notes, adds: additions.kept, cuts: cuts.kept,
    });
    const here: V2CallReport = { stage: "why", ask: 0, ok: false, ms: 0, lines: 0, kept: 0, malformed: 0 };
    calls.push(here);
    const t = now();
    const call = args.callModel({
      stage: "why", ask: 0, system, user, schema: whySchema, maxTokens: WHY_REPLY_TOKENS,
      deadlineMs: Math.min(callCap, left), stream: true, model: WHY_MODEL, effort: WHY_EFFORT,
    });
    let text = "";
    try {
      for await (const delta of call.deltas) text += delta;
    } catch {
      // A broken stream is the call's failure, settled below.
    }
    const outcome: V2CallOutcome = await call.outcome.catch(() => ({ ok: false as const, errorClass: "upstream_busy" as const }));
    here.ms = now() - t;
    if (outcome.usage) here.usage = outcome.usage;
    if (!outcome.ok) {
      here.errorClass = outcome.errorClass;
      return null;
    }
    let reply: unknown;
    try {
      reply = JSON.parse(text);
    } catch {
      here.errorClass = "malformed";
      return null;
    }
    here.ok = true;
    return checkWhy(reply, additions.kept, cuts.kept, quotableOf(pack));
  }
}
