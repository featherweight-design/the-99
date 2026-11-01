/**
 * The precon Overview build's loop (`scripts/build-precon-overviews.ts`): which requests go out, in
 * which batch, under the dollar cap, and what is stored. The script builds the requests from the
 * database and hands this a sender; the probe hands it the synopsis stub, so the paid model never
 * runs outside the staging build.
 *
 * THE CAP IS A WORST-CASE STOP, measured in dollars. A batch is sent only when the dollars already
 * spent plus that batch's worst case (each request's counted input plus its full `max_tokens` of
 * output, at batch rates) stay within the cap, so the run can never spend past it whatever the
 * replies are. The cap is clamped to `PRECON_OVERVIEW_CAP_USD`: no environment value or flag raises it.
 *
 * One repair per precon, as the app's write makes (contract B): a first answer with a refused
 * section, or one the stages checks name (`extra`, `stagesRepairTargets`), is sent once more with the
 * repair prompt, in a later batch under the same cap. What is stored passes through `settle` first
 * (the explained-once pass, `settleStages`), as the write's does. Only an Overview whose every
 * section passed is stored; anything less is reported and left unstored, so a deck never carries
 * over a partial one.
 */
import { batchCostMicroUsd } from "../../src/lib/model/prices";
import type { CheckedSynopsis, SectionId } from "../../src/lib/synopsis/types";

/** The hard ceiling, in dollars, for one run (Hugh's $15 for the full catalog, 2026-10-27). */
export const PRECON_OVERVIEW_CAP_USD = 15;

/** The run's cap in micro-dollars: the flag, else the environment, else the ceiling, and never above it. */
export function capMicroUsd(envValue: string | undefined, flag: number | undefined): number {
  const raw = flag ?? (envValue === undefined || envValue === "" ? PRECON_OVERVIEW_CAP_USD : Number(envValue));
  if (!Number.isFinite(raw) || raw < 0) throw new Error(`precon overviews: the cap must be a dollar amount, not ${String(flag ?? envValue)}`);
  return Math.round(Math.min(raw, PRECON_OVERVIEW_CAP_USD) * 1_000_000);
}

/** What one request can cost at most: its counted input and its whole output ceiling, at batch rates. */
export function worstMicroUsd(model: string, inputTokens: number, maxTokens: number): number {
  return batchCostMicroUsd(model, { inTokens: inputTokens, outTokens: maxTokens, cacheWriteTokens: 0, cacheReadTokens: 0 });
}

/** The longest prefix of `queue` whose worst case still fits beside `spentMicro` under `capMicro`. */
export function takeWithinCap<T extends { worstMicro: number }>(queue: readonly T[], spentMicro: number, capMicro: number): { take: T[]; rest: T[] } {
  let room = capMicro - spentMicro;
  let n = 0;
  while (n < queue.length && queue[n].worstMicro <= room) {
    room -= queue[n].worstMicro;
    n += 1;
  }
  return { take: queue.slice(0, n), rest: queue.slice(n) };
}

/** One request as the sender sends it. `params` is opaque here: built and hashed by the caller. */
export type Outgoing = { customId: string; params: unknown; worstMicro: number };

/** One reply, parsed: the value the schema accepted, or why there is none. `micro` is what it cost. */
export type Reply<V> =
  | { customId: string; ok: true; value: V; micro: number; usage: { input: number; output: number } }
  | { customId: string; ok: false; reason: string; micro: number; usage: { input: number; output: number } };

/** Sends one batch and returns every reply, keyed by `customId`, with the batch's id. */
export type Send<V> = (batch: readonly Outgoing[]) => Promise<{ batchId: string; replies: Reply<V>[] }>;

/** One precon's first request, built by the caller. */
export type Job<V> = {
  file: string;
  first: Outgoing;
  /** The checked content of a reply: the app's own `checkReply` over this precon's facts. */
  check: (value: V) => Promise<CheckedSynopsis>;
  /** The repair request for a first answer, built with the app's own `repairPrompt`. */
  repair: (content: CheckedSynopsis, failing: SectionId[], value: V) => Promise<Outgoing>;
  /** The app's own merge of a repair over the first answer (`applyRepair`). */
  merge: (first: CheckedSynopsis, value: V, failing: SectionId[]) => Promise<CheckedSynopsis>;
  /** Contract 13: sections to send for the one repair beyond the refused ones (`stagesRepairTargets`). First answers only. */
  extra?: (content: CheckedSynopsis, value: V) => SectionId[];
  /** Contract 13: the explained-once pass the write applies after its checks and repair (`settleStages`). */
  settle?: (content: CheckedSynopsis) => CheckedSynopsis;
};

export type Stored = { file: string; content: CheckedSynopsis; micro: number; usage: { input: number; output: number } };

export type BuildResult = {
  stored: Stored[];
  /** Precons whose Overview came back with a refused section after the repair, or no reply at all. */
  failed: { file: string; reason: string }[];
  /** Precons never sent because the cap had no room left for them. */
  deferred: string[];
  spentMicro: number;
  batches: { id: string; requests: number; micro: number; usage: { input: number; output: number } }[];
  /** Set when `beforeSend` stopped the run before a batch: what it said. The unsent precons are in `deferred`. */
  halted?: Halt;
};

/** Why a run stopped before a batch: the model-call switch was off, or could not be confirmed on. */
export type Halt = { state: "off" | "unconfirmed"; line: string };

const refused = (c: CheckedSynopsis): SectionId[] => c.verdicts.filter((v) => v.status !== "ok").map((v) => v.section);

/**
 * Runs the build: first answers, then one repair each where a section was refused, every batch
 * under the cap. `store` is called for each precon whose every section passed, as soon as it does.
 */
export async function runBuild<V>(input: {
  jobs: readonly Job<V>[];
  send: Send<V>;
  capMicro: number;
  store: (s: Stored) => Promise<void>;
  log: (line: string) => void;
  /**
   * Asked immediately before EVERY batch is sent, first answers and repairs alike: the model-call
   * switch, read fresh, so an earlier "on" never authorizes a later spend. A halt stops the run as
   * the cap does: nothing more is sent, a first answer whose repair was only advisory is stored, and
   * the rest are deferred.
   */
  beforeSend?: () => Promise<Halt | null>;
}): Promise<BuildResult> {
  const result: BuildResult = { stored: [], failed: [], deferred: [], spentMicro: 0, batches: [] };
  type Pending = { job: Job<V>; out: Outgoing; first?: { content: CheckedSynopsis; failing: SectionId[]; micro: number; usage: { input: number; output: number } } };
  let queue: Pending[] = input.jobs.map((job) => ({ job, out: job.first }));
  // A first answer whose repair was only for advisory targets (no section refused) is publishable as it
  // stands once settled, so a repair that fails, comes back empty or is held by the cap never discards it.
  const advisoryOnly = (p: Pending) => !!p.first && refused(p.first.content).length === 0;
  const storeSettled = async (job: Job<V>, first: CheckedSynopsis, micro: number, usage: { input: number; output: number }): Promise<void> => {
    const content = job.settle ? job.settle(first) : first;
    const failing = refused(content);
    if (failing.length > 0) {
      result.failed.push({ file: job.file, reason: `refused: ${failing.join(", ")}` });
      return;
    }
    const s = { file: job.file, content, micro, usage };
    await input.store(s);
    result.stored.push(s);
  };
  /** Stops sending: stores each advisory-only first answer as it stands and defers the rest. */
  const settleUnsent = async (unsent: readonly Pending[]) => {
    for (const p of unsent) {
      if (!advisoryOnly(p)) {
        result.deferred.push(p.job.file);
        continue;
      }
      try {
        await storeSettled(p.job, p.first!.content, p.first!.micro, p.first!.usage);
      } catch (e) {
        result.failed.push({ file: p.job.file, reason: `first answer could not be handled: ${e instanceof Error ? e.message : String(e)}` });
      }
    }
  };
  while (queue.length > 0) {
    const { take, rest } = takeWithinCap(queue.map((p) => ({ ...p, worstMicro: p.out.worstMicro })), result.spentMicro, input.capMicro);
    if (take.length === 0) {
      await settleUnsent(rest);
      input.log(`cap: $${(input.capMicro / 1e6).toFixed(2)} leaves no room for ${rest.length} more request(s); stopping`);
      break;
    }
    const halt = input.beforeSend ? await input.beforeSend() : null;
    if (halt) {
      await settleUnsent(queue);
      result.halted = halt;
      input.log(`model calls: ${halt.line}`);
      break;
    }
    const worst = take.reduce((n, p) => n + p.out.worstMicro, 0);
    input.log(`batch of ${take.length}: worst case $${(worst / 1e6).toFixed(2)}, spent so far $${(result.spentMicro / 1e6).toFixed(2)}`);
    const { batchId, replies } = await input.send(take.map((p) => p.out));
    const got = new Map(replies.map((r) => [r.customId, r]));
    const batch = { id: batchId, requests: take.length, micro: 0, usage: { input: 0, output: 0 } };
    const next: Pending[] = [];
    for (const p of take) {
      const reply = got.get(p.out.customId);
      if (!reply) {
        if (advisoryOnly(p)) {
          try {
            await storeSettled(p.job, p.first!.content, p.first!.micro, p.first!.usage);
          } catch (e) {
            result.failed.push({ file: p.job.file, reason: `first answer could not be handled: ${e instanceof Error ? e.message : String(e)}` });
          }
          continue;
        }
        result.failed.push({ file: p.job.file, reason: "no reply in the batch" });
        continue;
      }
      batch.micro += reply.micro;
      batch.usage.input += reply.usage.input;
      batch.usage.output += reply.usage.output;
      const micro = reply.micro + (p.first?.micro ?? 0);
      const usage = { input: reply.usage.input + (p.first?.usage.input ?? 0), output: reply.usage.output + (p.first?.usage.output ?? 0) };
      if (!reply.ok) {
        // A repair that did not come back leaves the first answer as it was: stored when only advisory
        // targets sent it to repair, failed when it had a refused section.
        if (advisoryOnly(p)) {
          try {
            await storeSettled(p.job, p.first!.content, micro, usage);
          } catch (e) {
            result.failed.push({ file: p.job.file, reason: `first answer could not be handled: ${e instanceof Error ? e.message : String(e)}` });
          }
          continue;
        }
        result.failed.push({ file: p.job.file, reason: p.first ? `repair: ${reply.reason}` : reply.reason });
        continue;
      }
      // ONE PRECON'S TROUBLE IS ITS OWN: the batch is already paid for, so a check, a repair's token
      // count or a store that throws fails that precon and the loop goes on to store the others.
      try {
        let content = p.first
          ? await p.job.merge(p.first.content, reply.value, p.first.failing)
          : await p.job.check(reply.value);
        // The repair is for the refused sections and, at contract 13, the ones the stages checks name.
        const failing0 = p.first ? [] : [...new Set([...refused(content), ...(p.job.extra?.(content, reply.value) ?? [])])];
        if (failing0.length > 0) {
          try {
            next.push({ job: p.job, out: await p.job.repair(content, failing0, reply.value), first: { content, failing: failing0, micro, usage } });
          } catch (e) {
            // A repair that cannot be prepared costs a publishable first answer nothing: only a refused section needs it.
            if (refused(content).length > 0) throw e;
            input.log(`${p.job.file}: the advisory repair could not be prepared (${e instanceof Error ? e.message : String(e)}); storing the first answer`);
            await storeSettled(p.job, content, micro, usage);
          }
          continue;
        }
        if (p.job.settle) content = p.job.settle(content);
        const failing = refused(content);
        if (failing.length === 0) {
          const s = { file: p.job.file, content, micro, usage };
          await input.store(s);
          result.stored.push(s);
        } else if (advisoryOnly(p)) {
          // The first answer was publishable and the repair was advisory: a repaired section that comes back refused
          // costs the precon nothing it already had, so the first answer is stored as it was.
          input.log(`${p.job.file}: the advisory repair came back refused (${failing.join(", ")}); storing the first answer`);
          await storeSettled(p.job, p.first!.content, micro, usage);
        } else {
          result.failed.push({ file: p.job.file, reason: `refused${p.first ? " after the repair" : ""}: ${failing.join(", ")}` });
        }
      } catch (e) {
        result.failed.push({ file: p.job.file, reason: `${p.first ? "repair" : "first answer"} could not be handled: ${e instanceof Error ? e.message : String(e)}` });
      }
    }
    result.spentMicro += batch.micro;
    result.batches.push(batch);
    queue = [...next, ...rest.map((r) => ({ job: r.job, out: r.out, first: r.first }))];
  }
  return result;
}
