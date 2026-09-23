import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";

/**
 * The one model client. SERVER-ONLY: it holds the API key.
 *
 * FEATURE-NEUTRAL, deliberately: deck tuning (#10) and the deck synopsis both call it, each with
 * its own model, prompt and schema, and nothing here names a model, a feature or a prompt. The
 * per-player allowance is a separate module (`allowance.ts`) that callers reserve against in
 * their own transaction; this module makes the call and nothing else.
 *
 * THE CONTRACT, which the SDK's own retries would break, so they are off (`maxRetries: 0`):
 *  - ONE deadline across both attempts, not a budget each. A second attempt armed with a fresh
 *    budget could outrun the route's `maxDuration` and leave no time to record the failure.
 *  - AT MOST ONE RETRY, spent on whichever retryable condition comes first: an overloaded or
 *    unreachable upstream (429, 5xx, 529, a dropped connection) or a reply that fails the
 *    caller's schema. A timeout is never retried.
 *  - IT NEVER THROWS for an upstream, configuration or unexpected fault. A bad key, a retired model id or a
 *    malformed request comes back as `upstream_busy` with a server-side log line naming it, so
 *    the caller always reaches a terminal outcome (and refunds the allowance unit) rather than
 *    leaving a run pending for the reaper.
 *
 * The reply is constrained server-side to the caller's zod schema (`output_config.format`),
 * which guarantees its SHAPE. It guarantees nothing about its truth: grounding, in-deck cards
 * and verbatim quotes are the caller's validation rules, and still run.
 */

export type ModelErrorClass = "upstream_busy" | "timeout" | "malformed";

export type ModelOutcome<T> =
  | { ok: true; value: T; usage: { inputTokens: number; outputTokens: number } }
  | { ok: false; errorClass: ModelErrorClass };

export type ModelRequest<T> = {
  /** The caller's. This module names none. */
  model: string;
  system: string;
  user: string;
  maxTokens: number;
  schema: z.ZodType<T>;
  /** One budget for the whole call, both attempts included. */
  deadlineMs: number;
};

type Messages = Pick<Anthropic["messages"], "parse">;

export type ModelDeps = {
  /** Injected in tests; the real client otherwise. */
  messages?: Messages;
  now?: () => number;
  log?: (line: string) => void;
};

type Attempt<T> =
  | { kind: "ok"; value: T; usage: { inputTokens: number; outputTokens: number } }
  | { kind: "retryable"; errorClass: "upstream_busy" | "malformed" }
  | { kind: "final"; errorClass: ModelErrorClass };

export async function callModel<T>(req: ModelRequest<T>, deps: ModelDeps = {}): Promise<ModelOutcome<T>> {
  const now = deps.now ?? Date.now;
  const log = deps.log ?? ((line: string) => console.error(line));

  const messages = deps.messages ?? realMessages(log);
  if (!messages) return { ok: false, errorClass: "upstream_busy" };

  const deadline = now() + req.deadlineMs;
  let last: ModelErrorClass = "upstream_busy";

  for (let attempt = 0; attempt < 2; attempt++) {
    const remaining = deadline - now();
    if (remaining <= 0) return { ok: false, errorClass: attempt === 0 ? "timeout" : last };

    const result = await tryOnce(messages, req, remaining, log);
    if (result.kind === "ok") return { ok: true, value: result.value, usage: result.usage };
    if (result.kind === "final") return { ok: false, errorClass: result.errorClass };
    last = result.errorClass;
  }
  return { ok: false, errorClass: last };
}

function realMessages(log: (line: string) => void): Messages | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    log("[model] configuration: ANTHROPIC_API_KEY is not set; no request made");
    return null;
  }
  return new Anthropic({ apiKey, maxRetries: 0 }).messages;
}

async function tryOnce<T>(
  messages: Messages,
  req: ModelRequest<T>,
  remainingMs: number,
  log: (line: string) => void,
): Promise<Attempt<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), remainingMs);
  try {
    const response = await messages.parse(
      {
        model: req.model,
        max_tokens: req.maxTokens,
        system: req.system,
        messages: [{ role: "user", content: req.user }],
        output_config: { format: zodOutputFormat(req.schema) },
      },
      { signal: controller.signal, timeout: remainingMs, maxRetries: 0 },
    );
    // A refusal or a reply cut off at max_tokens parses to nothing: the shape was not met.
    if (response.parsed_output == null) {
      log(`[model] malformed: no parsed output (stop_reason ${response.stop_reason})`);
      return { kind: "retryable", errorClass: "malformed" };
    }
    return {
      kind: "ok",
      value: response.parsed_output as T,
      usage: { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens },
    };
  } catch (err) {
    return classify(err, controller.signal.aborted, log);
  } finally {
    clearTimeout(timer);
  }
}

/** Most specific first: every timeout class extends a connection or abort error. */
function classify<T>(err: unknown, aborted: boolean, log: (line: string) => void): Attempt<T> {
  if (aborted || err instanceof Anthropic.APIConnectionTimeoutError || err instanceof Anthropic.APIUserAbortError) {
    return { kind: "final", errorClass: "timeout" };
  }
  if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
    log(`[model] configuration: ${err.status} ${err.message}`);
    return { kind: "final", errorClass: "upstream_busy" };
  }
  if (err instanceof Anthropic.RateLimitError || err instanceof Anthropic.InternalServerError || err instanceof Anthropic.APIConnectionError) {
    // Logged on every attempt, not only the last: a run that fails twice leaves two lines, and
    // a run that recovers on its retry still shows the upstream was struggling.
    log(`[model] upstream: ${err.status ?? "connection"} ${err.message}`);
    return { kind: "retryable", errorClass: "upstream_busy" };
  }
  if (err instanceof Anthropic.APIError) {
    // 400, 404, 409, 413 and anything else unnamed: a request a second attempt cannot fix.
    log(`[model] request: ${err.status ?? "?"} ${err.message}`);
    return { kind: "final", errorClass: "upstream_busy" };
  }
  if (err instanceof Anthropic.AnthropicError) {
    // Thrown by the zod output format when the reply is not JSON or fails the schema.
    log(`[model] malformed: ${err.message}`);
    return { kind: "retryable", errorClass: "malformed" };
  }
  // Anything else — a transport fault outside the SDK's classes, a bug in schema conversion.
  // Still a terminal outcome rather than a throw, so the caller writes its failure and refunds
  // the unit; the log line is what says it was none of the expected kinds.
  log(`[model] unexpected: ${err instanceof Error ? `${err.name} ${err.message}` : String(err)}`);
  return { kind: "final", errorClass: "upstream_busy" };
}
