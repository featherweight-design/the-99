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
 *  - IT NEVER THROWS for an upstream, configuration or unexpected fault, so the caller always
 *    reaches a terminal outcome (and refunds the allowance unit) rather than leaving a run
 *    pending for the reaper. Two classes keep the faults apart, because they call for opposite
 *    responses: `upstream_busy` is an upstream that was overloaded or unreachable (429, 5xx,
 *    529, a dropped connection), which a later attempt may well get past; `upstream_rejected`
 *    is a request the upstream REFUSED (a bad or missing key, a retired model id, a malformed
 *    request: 401, 403 and every other non-429 4xx), which no retry fixes. Both carry the HTTP
 *    `status` when there was one, so a stored failure can name what happened without a log.
 *
 * The reply is constrained server-side to the caller's zod schema (`output_config.format`),
 * which guarantees its SHAPE. It guarantees nothing about its truth: grounding, in-deck cards
 * and verbatim quotes are the caller's validation rules, and still run.
 */

export type ModelErrorClass = "upstream_busy" | "upstream_rejected" | "timeout" | "malformed";

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
  /** `usage` is present whenever any attempt got a response back, and absent when none did.
   *  `status` is the HTTP status of the LAST attempt's error, when that error carried one. */
  | { ok: false; errorClass: ModelErrorClass; usage?: ModelUsage; status?: number };

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
  /** Stream the request and read the final message. Needed for a ceiling high enough that a
   *  non-streaming request would risk the SDK's HTTP timeout, as with thinking at a higher effort.
   *  Omitted, the request is the plain `create` it always was. */
  stream?: boolean;
  /** Called with every response that came back, before it is parsed: what the eval harness records
   *  per arm (why the model stopped). The outcome itself is unchanged. */
  onResponse?: (meta: { stopReason: string | null; outputTokens: number }) => void;
};

/**
 * `create`, never the SDK's `parse`. `parse` is `create(...).then(parseMessage)`, and a reply that
 * fails the schema THROWS out of the second half — after the reply arrived and was billed, with
 * its usage on the message the throw discards. Calling `create` and parsing here keeps the usage
 * of every reply that came back, malformed or not.
 */
type Messages = Pick<Anthropic["messages"], "create" | "stream">;

export type ModelDeps = {
  /** Injected in tests; the real client otherwise. */
  messages?: Messages;
  now?: () => number;
  log?: (line: string) => void;
};

type Attempt<T> =
  | { kind: "ok"; value: T; usage: ModelUsage }
  | { kind: "retryable"; errorClass: "upstream_busy" | "malformed"; usage?: ModelUsage; status?: number }
  | { kind: "final"; errorClass: ModelErrorClass; usage?: ModelUsage; status?: number };

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

/** A failure outcome, carrying the usage only when some attempt got a response, and the status
 *  only when the failing attempt's error had one. */
function failed<T>(errorClass: ModelErrorClass, usage: ModelUsage | undefined, status?: number): ModelOutcome<T> {
  return {
    ok: false,
    errorClass,
    ...(usage ? { usage } : {}),
    ...(status !== undefined ? { status } : {}),
  };
}

export async function callModel<T>(req: ModelRequest<T>, deps: ModelDeps = {}): Promise<ModelOutcome<T>> {
  const now = deps.now ?? Date.now;
  const log = deps.log ?? ((line: string) => console.error(line));

  const messages = deps.messages ?? realMessages(log);
  // No key is a configuration fault: nothing was sent, and nothing a retry does will change it.
  if (!messages) return { ok: false, errorClass: "upstream_rejected" };

  const deadline = now() + req.deadlineMs;
  let last: ModelErrorClass = "upstream_busy";
  let lastStatus: number | undefined;
  let usage: ModelUsage | undefined;

  for (let attempt = 0; attempt < 2; attempt++) {
    const remaining = deadline - now();
    if (remaining <= 0) return attempt === 0 ? failed("timeout", usage) : failed(last, usage, lastStatus);
    if (attempt > 0 && req.retryFloorMs !== undefined && remaining < req.retryFloorMs) {
      log(`[model] retry skipped: ${Math.round(remaining / 1000)}s left, ${Math.round(req.retryFloorMs / 1000)}s needed`);
      return failed(last, usage, lastStatus);
    }

    const result = await tryOnce(messages, req, remaining, log);
    usage = addUsage(usage, result.usage);
    if (result.kind === "ok") return { ok: true, value: result.value, usage: usage ?? result.usage };
    if (result.kind === "final") return failed(result.errorClass, usage, result.status);
    last = result.errorClass;
    lastStatus = result.status;
  }
  return failed(last, usage, lastStatus);
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
    const params = {
      model: req.model,
      max_tokens: req.maxTokens,
      system: req.system,
      messages: [{ role: "user" as const, content: req.user }],
      output_config: req.effort ? { format, effort: req.effort } : { format },
    };
    const options = { signal: controller.signal, timeout: remainingMs, maxRetries: 0 };
    response = req.stream
      ? await messages.stream(params, options).finalMessage()
      : await messages.create(params, options);
  } catch (err) {
    return classify(err, controller.signal.aborted, log);
  } finally {
    clearTimeout(timer);
  }

  // The reply is here and billed: every outcome from now on carries its usage.
  const usage = usageOf(response.usage);
  req.onResponse?.({ stopReason: response.stop_reason ?? null, outputTokens: usage.outputTokens });
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
      // The stop reason and the output count tell a reply cut off at max_tokens (an unterminated
      // string, output at the ceiling) from one the model finished and got wrong. Two overview
      // runs failed seven times with this line saying neither, and the cause had to be inferred
      // from what each failed call cost.
      log(`[model] malformed: ${err instanceof Error ? err.message : String(err)} (stop_reason ${response.stop_reason}, ${usage.outputTokens}/${req.maxTokens} output tokens)`);
      return { kind: "retryable", errorClass: "malformed", usage };
    }
  }
  if (parsed == null) {
    log(`[model] malformed: no parsed output (stop_reason ${response.stop_reason}, ${usage.outputTokens}/${req.maxTokens} output tokens)`);
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
    return { kind: "final", errorClass: "upstream_rejected", status: err.status };
  }
  if (err instanceof Anthropic.RateLimitError || err instanceof Anthropic.InternalServerError || err instanceof Anthropic.APIConnectionError) {
    // Logged on every attempt, not only the last: a run that fails twice leaves two lines, and
    // a run that recovers on its retry still shows the upstream was struggling.
    log(`[model] upstream: ${err.status ?? "connection"} ${err.message}`);
    return { kind: "retryable", errorClass: "upstream_busy", ...(err.status !== undefined ? { status: err.status } : {}) };
  }
  if (err instanceof Anthropic.APIError && err.status !== undefined) {
    // 400, 404, 409, 413 and any other 4xx the SDK names or not: a request the upstream refused,
    // which a second attempt cannot fix. (Every 5xx is an InternalServerError, taken above.)
    log(`[model] request: ${err.status} ${err.message}`);
    return { kind: "final", errorClass: "upstream_rejected", status: err.status };
  }
  if (err instanceof Anthropic.APIError) {
    // An API error with no status names no request fault, so it is not called a rejection.
    log(`[model] request: ? ${err.message}`);
    return { kind: "final", errorClass: "upstream_busy" };
  }
  if (err instanceof Anthropic.AnthropicError) {
    // Thrown by the zod output format when the reply is not JSON or fails the schema.
    log(`[model] malformed: ${err.message}`);
    return { kind: "retryable", errorClass: "malformed" };
  }
  // Anything else: a transport fault outside the SDK's classes, a bug in schema conversion.
  // Still a terminal outcome rather than a throw, so the caller writes its failure and refunds
  // the unit; the log line is what says it was none of the expected kinds. Kept `upstream_busy`
  // rather than `upstream_rejected`, deliberately: nothing says the upstream refused the request,
  // and a rejection tells the player not to try again, which would be a claim this cannot make.
  log(`[model] unexpected: ${err instanceof Error ? `${err.name} ${err.message}` : String(err)}`);
  return { kind: "final", errorClass: "upstream_busy" };
}
