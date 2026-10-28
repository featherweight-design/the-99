/**
 * The precon Overview build's Batch API transport, in two halves so a paid batch is never lost:
 * `submitBatch` returns the batch's id the moment the API accepts it (the build records the batch's
 * worst case under that id before it waits), and `collectBatch` waits for it and downloads its results.
 * A run that dies in between leaves the id in the log and the worst case on the Costs page, and
 * `db:build:precon-overviews --collect <id>` picks the results up later (the API keeps them 29 days).
 *
 * The client names the first-party endpoint, as the eval harness's does (`API_BASE_URL`): `.env`'s
 * `ANTHROPIC_BASE_URL` proxy serves no batches route.
 */
import Anthropic from "@anthropic-ai/sdk";
import { API_BASE_URL, retryable, type Got, type Sent } from "../eval/lib/batch.mjs";

let client: Anthropic | null = null;
function anthropic(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("precon overviews: ANTHROPIC_API_KEY is not set");
  client ??= new Anthropic({ maxRetries: 2, baseURL: API_BASE_URL });
  return client;
}

const RETRYABLE_ERROR_TYPES = new Set(["rate_limit_error", "overloaded_error", "api_error"]);

/** Submits one batch and returns its id. Never retried: a lost reply after acceptance would bill a second batch. */
export async function submitBatch(requests: readonly Sent[]): Promise<string> {
  const batch = await anthropic().messages.batches.create({ requests: requests.map((r) => ({ custom_id: r.customId, params: r.params })) }, { maxRetries: 0 });
  return batch.id;
}

/** Waits for `batchId` to end and returns every result, keyed by `customId`. A failed status check is retried next tick. */
export async function collectBatch(batchId: string, log: (line: string) => void): Promise<Got[]> {
  const api = anthropic().messages.batches;
  let last = "";
  for (;;) {
    let b: Awaited<ReturnType<typeof api.retrieve>>;
    try {
      b = await api.retrieve(batchId);
    } catch (err) {
      const transient = retryable(err) || err instanceof Anthropic.APIConnectionTimeoutError;
      log(`batch ${batchId}: status check failed (${err instanceof Error ? err.message : String(err)})${transient ? "; retrying" : ""}`);
      if (!transient) throw err;
      await new Promise((r) => setTimeout(r, 20_000));
      continue;
    }
    const line = `batch ${batchId}: ${b.processing_status} ${JSON.stringify(b.request_counts)}`;
    if (line !== last) log(line);
    last = line;
    if (b.processing_status === "ended") break;
    await new Promise((r) => setTimeout(r, 20_000));
  }
  const results: Got[] = [];
  for await (const entry of await api.results(batchId)) {
    if (entry.result.type === "succeeded") results.push({ customId: entry.custom_id, ok: true, message: entry.result.message });
    else if (entry.result.type === "errored") {
      const e = (entry.result.error ?? {}) as { type?: string; error?: { type?: string } };
      const type = e.error?.type ?? e.type ?? "unknown";
      results.push({ customId: entry.custom_id, ok: false, reason: `batch errored: ${type}`, retry: RETRYABLE_ERROR_TYPES.has(type) });
    } else results.push({ customId: entry.custom_id, ok: false, reason: `batch ${entry.result.type}`, retry: true });
  }
  return results;
}

/**
 * A request's custom id carries a prefix of its request hash, so results collected later (`--collect`)
 * are stored only against the very request they answered: a precon whose inputs moved since does not
 * match and is left to the next run. 40 hex characters, inside the API's 64-character limit.
 */
export const customIdFor = (index: number, hash: string, repair = false) => `p${index}-${hash.slice(0, 40)}${repair ? "-r" : ""}`;
