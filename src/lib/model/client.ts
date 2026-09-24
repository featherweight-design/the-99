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
 *    caller's schema. A timeout is never retried, and a caller's `retryFloorMs` refuses a retry
 *    that would start with too little of the deadline left to finish.
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

/**
 * What the call was billed for, ACCUMULATED across both attempts: a malformed first reply still
 * came back, and still burned its tokens. The cache meters are zero while the app sends no
 * `cache_control`, and are read anyway so a price can never silently leave them out.
 */
export type ModelUsage = {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
};

export type ModelOutcome<T> =
  | { ok: true; value: T; usage: ModelUsage }
  /** `usage` is present whenever any attempt got a response back, and absent when none did. */
  | { ok: false; errorClass: ModelErrorClass; usage?: ModelUsage };

export type ModelRequest<T> = {
  /** The caller's. This module names none. */
  model: string;
  system: string;
  user: string;
  maxTokens: number;
  schema: z.ZodType<T>;
  /** One budget for the whole call, both attempts included. */
  deadlineMs: number;
  /** The reasoning effort (`output_config.effort`, Sonnet 5). Omitted, the request carries none
   *  and is byte for byte what it was before the field existed. */
  effort?: "low" | "medium" | "high";
  /** The least of the deadline a RETRY needs to start. A retry that cannot finish still bills its
   *  tokens and keeps the player waiting for a certain failure, so with less than this left the
   *  call fails with the first attempt's class instead. Omitted, a retry takes whatever is left. */
  retryFloorMs?: number;
};

/**
 * `create`, never the SDK's `parse`. `parse` is `create(...).then(parseMessage)`, and a reply that
 * fails the schema THROWS out of the second half — after the reply arrived and was billed, with
 * its usage on the message the throw discards. Calling `create` and parsing here keeps the usage
 * of every reply that came back, malformed or not.
 */
type Messages = Pick<Anthropic["messages"], "create">;

export type ModelDeps = {
  /** Injected in tests; the real client otherwise. */
  messages?: Messages;
  now?: () => number;
  log?: (line: string) => void;
};

type Attempt<T> =
  | { kind: "ok"; value: T; usage: ModelUsage }
  | { kind: "retryable"; errorClass: "upstream_busy" | "malformed"; usage?: ModelUsage }
  | { kind: "final"; errorClass: ModelErrorClass; usage?: ModelUsage };

type ApiUsage = {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
};

function usageOf(u: ApiUsage): ModelUsage {
  return {
    inputTokens: u.input_tokens,
    outputTokens: u.output_tokens,
    cacheReadTokens: u.cache_read_input_tokens ?? 0,
    cacheWriteTokens: u.cache_creation_input_tokens ?? 0,
  };
}

function addUsage(a: ModelUsage | undefined, b: ModelUsage | undefined): ModelUsage | undefined {
  if (!a) return b;
  if (!b) return a;
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    cacheReadTokens: a.cacheReadTokens + b.cacheReadTokens,
    cacheWriteTokens: a.cacheWriteTokens + b.cacheWriteTokens,
  };
}

/** A failure outcome, carrying the usage only when some attempt got a response. */
function failed<T>(errorClass: ModelErrorClass, usage: ModelUsage | undefined): ModelOutcome<T> {
  return usage ? { ok: false, errorClass, usage } : { ok: false, errorClass };
}

export async function callModel<T>(req: ModelRequest<T>, deps: ModelDeps = {}): Promise<ModelOutcome<T>> {
  const now = deps.now ?? Date.now;
  const log = deps.log ?? ((line: string) => console.error(line));

  const messages = deps.messages ?? realMessages(log);
  if (!messages) return { ok: false, errorClass: "upstream_busy" };

  const deadline = now() + req.deadlineMs;
  let last: ModelErrorClass = "upstream_busy";
  let usage: ModelUsage | undefined;

  for (let attempt = 0; attempt < 2; attempt++) {
    const remaining = deadline - now();
    if (remaining <= 0) return failed(attempt === 0 ? "timeout" : last, usage);
    if (attempt > 0 && req.retryFloorMs !== undefined && remaining < req.retryFloorMs) {
      log(`[model] retry skipped: ${Math.round(remaining / 1000)}s left, ${Math.round(req.retryFloorMs / 1000)}s needed`);
      return failed(last, usage);
    }

    const result = await tryOnce(messages, req, remaining, log);
    usage = addUsage(usage, result.usage);
    if (result.kind === "ok") return { ok: true, value: result.value, usage: usage ?? result.usage };
    if (result.kind === "final") return failed(result.errorClass, usage);
    last = result.errorClass;
  }
  return failed(last, usage);
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
  // Built inside the `try`: a fault converting the schema is still a terminal outcome, never a throw.
  let format: ReturnType<typeof zodOutputFormat<z.ZodType<T>>>;
  let response: Anthropic.Message;
  try {
    format = zodOutputFormat(req.schema);
    response = await messages.create(
      {
        model: req.model,
        max_tokens: req.maxTokens,
        system: req.system,
        messages: [{ role: "user", content: req.user }],
        output_config: req.effort ? { format, effort: req.effort } : { format },
      },
      { signal: controller.signal, timeout: remainingMs, maxRetries: 0 },
    );
  } catch (err) {
    return classify(err, controller.signal.aborted, log);
  } finally {
    clearTimeout(timer);
  }

  // The reply is here and billed: every outcome from now on carries its usage.
  const usage = usageOf(response.usage);
  // Every text block, joined, as the eval harness reads a reply (`scripts/eval/lib/request.mts`), so
  // the app and the harness judge one reply the same way. No text at all (a refusal, or a reply
  // that was all thinking when it hit max_tokens) is the shape not met.
  const text = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
  let parsed: T | null = null;
  if (text.length > 0) {
    try {
      parsed = format.parse(text) as T;
    } catch (err) {
      // The zod output format throws when the reply is not JSON or fails the schema.
      log(`[model] malformed: ${err instanceof Error ? err.message : String(err)}`);
      return { kind: "retryable", errorClass: "malformed", usage };
    }
  }
  if (parsed == null) {
    log(`[model] malformed: no parsed output (stop_reason ${response.stop_reason})`);
    return { kind: "retryable", errorClass: "malformed", usage };
  }
  return { kind: "ok", value: parsed, usage };
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
