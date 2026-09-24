import Anthropic from "@anthropic-ai/sdk";

import type { Params } from "./request.mjs";

/**
 * Sending requests, by batch or one at a time. Either way the caller gets back one result per
 * `customId`, keyed rather than ordered: batch results arrive in any order.
 *
 * A result is the message, or the reason there is none. `errored`, `expired` and `canceled`
 * batch entries all come back as `upstream`, the class `callModel` gives an upstream it could
 * not get an answer from; the runner retries them once, as the app does.
 */
export type Sent = { customId: string; params: Params };
export type Got =
  | { customId: string; ok: true; message: Anthropic.Message; elapsedMs?: number }
  | { customId: string; ok: false; reason: string };

/**
 * The first-party API, named explicitly. The app's client talks to it with no base-URL override,
 * and the harness has to measure the same service. A developer shell may export
 * `ANTHROPIC_BASE_URL` for its own tooling (an observability gateway here), and the SDK would
 * silently follow it. That gateway serves no batches route, and a proxy that rewrote a request
 * would change what is being measured.
 */
export const API_BASE_URL = "https://api.anthropic.com";

let client: Anthropic | null = null;
function anthropic(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("eval: ANTHROPIC_API_KEY is not set");
  client ??= new Anthropic({ maxRetries: 2, baseURL: API_BASE_URL });
  return client;
}

/** Input tokens for one request, from the free counting endpoint. Structured-output schema included. */
export async function countTokens(params: Params): Promise<number> {
  const { model, system, messages, output_config } = params as Params & { output_config?: unknown };
  const r = await anthropic().messages.countTokens({ model, system, messages, output_config } as never);
  return r.input_tokens;
}

export async function sendBatch(requests: Sent[], log: (line: string) => void): Promise<{ batchId: string; results: Got[] }> {
  const api = anthropic().messages.batches;
  const batch = await api.create({ requests: requests.map((r) => ({ custom_id: r.customId, params: r.params })) });
  log(`batch ${batch.id}: ${requests.length} requests submitted`);
  let status = batch.processing_status;
  let last = "";
  while (status !== "ended") {
    await new Promise((r) => setTimeout(r, 20_000));
    const b = await api.retrieve(batch.id);
    status = b.processing_status;
    const line = `batch ${batch.id}: ${status} ${JSON.stringify(b.request_counts)}`;
    if (line !== last) log(line);
    last = line;
  }
  const results: Got[] = [];
  for await (const entry of await api.results(batch.id)) {
    if (entry.result.type === "succeeded") results.push({ customId: entry.custom_id, ok: true, message: entry.result.message });
    else results.push({ customId: entry.custom_id, ok: false, reason: `batch ${entry.result.type}` });
  }
  return { batchId: batch.id, results };
}

/** Sequential real-time calls: calibration, latency, and the cache measurement, where order
 *  matters. Each is timed from request to final token, the span `callModel`'s deadline covers. */
export async function sendRealtime(requests: Sent[], log: (line: string) => void): Promise<Got[]> {
  const out: Got[] = [];
  for (const r of requests) {
    const start = performance.now();
    try {
      // No SDK retries on the call itself: `callModel` sends with `maxRetries: 0` and owns the one
      // retry, which the runner reproduces. SDK retries here would hide a failure and bill twice.
      const message = await anthropic().messages.create(r.params, { maxRetries: 0 });
      out.push({ customId: r.customId, ok: true, message, elapsedMs: Math.round(performance.now() - start) });
    } catch (err) {
      out.push({ customId: r.customId, ok: false, reason: err instanceof Error ? err.message : String(err) });
    }
    log(`realtime ${r.customId}: done`);
  }
  return out;
}
