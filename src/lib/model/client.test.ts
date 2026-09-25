import Anthropic from "@anthropic-ai/sdk";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { callModel, type ModelDeps } from "./client";

const schema = z.object({ answer: z.string() });
const req = { model: "caller-model", system: "s", user: "u", maxTokens: 100, schema, deadlineMs: 90_000 };

type ApiUsage = { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number | null; cache_creation_input_tokens?: number | null };
const u10 = { input_tokens: 10, output_tokens: 2 };
/** A reply as `messages.create` returns it: the value as its text, or no text block at all for
 *  null (a refusal, or a reply that was all thinking when it hit max_tokens). */
const reply = (value: unknown, usage: ApiUsage = u10) => ({
  content: value === null ? [] : [{ type: "text", text: JSON.stringify(value) }],
  usage,
  stop_reason: value === null ? "max_tokens" : "end_turn",
});
/** A reply that CAME BACK, billed, and fails the schema: `answer` should be a string. */
const badShapeReply = (usage: ApiUsage = u10) => ({ content: [{ type: "text", text: '{"answer": 3}' }], usage, stop_reason: "end_turn" });
/** A reply that is not JSON at all, cut off mid-object. */
const truncatedReply = (usage: ApiUsage = u10) => ({ content: [{ type: "text", text: '{"answ' }], usage, stop_reason: "max_tokens" });
const busy = () => new Anthropic.InternalServerError(529, undefined, "overloaded", new Headers());
const rateLimited = () => new Anthropic.RateLimitError(429, undefined, "slow down", new Headers());
/** An SDK-side parse failure THROWN rather than returned: still classified, though `create` itself
 *  no longer parses. */
const badShape = () => new Anthropic.AnthropicError("Failed to parse structured output");
const unauthorized = () => new Anthropic.AuthenticationError(401, undefined, "bad key", new Headers());
const badRequest = () => new Anthropic.BadRequestError(400, undefined, "bad model", new Headers());

type Call = { body: { model: string; output_config?: Record<string, unknown> }; opts: { timeout?: number; maxRetries?: number } };

/** A fake `messages` whose attempts play out a script: a value to return or an error to throw. */
function scripted(script: Array<unknown | Error>) {
  const calls: Call[] = [];
  const messages = {
    create: vi.fn(async (body: Call["body"], opts: Call["opts"]) => {
      calls.push({ body, opts });
      const step = script[calls.length - 1];
      if (step instanceof Error) throw step;
      return step;
    }),
  } as unknown as ModelDeps["messages"];
  return { messages, calls };
}

const quiet = () => {};

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("callModel", () => {
  it("returns the parsed value and the usage the response reported", async () => {
    const { messages } = scripted([reply({ answer: "x" }, { input_tokens: 812, output_tokens: 90 })]);
    expect(await callModel(req, { messages, log: quiet })).toEqual({
      ok: true, value: { answer: "x" }, usage: { inputTokens: 812, outputTokens: 90, cacheReadTokens: 0, cacheWriteTokens: 0 },
    });
  });

  // The eval harness joins every text block before parsing; the app reads a reply the same way.
  it("parses a reply whose JSON arrives across two text blocks", async () => {
    const split = { content: [{ type: "text", text: '{"answer":' }, { type: "text", text: ' "x"}' }], usage: u10, stop_reason: "end_turn" };
    const { messages, calls } = scripted([split]);
    const out = await callModel(req, { messages, log: quiet });
    expect(out.ok && out.value).toEqual({ answer: "x" });
    expect(calls).toHaveLength(1);
  });

  it("sends the caller's model, and turns the SDK's own retries off", async () => {
    const { messages, calls } = scripted([reply({ answer: "x" })]);
    await callModel(req, { messages, log: quiet });
    expect(calls[0].body.model).toBe("caller-model");
    expect(calls[0].opts.maxRetries).toBe(0);
  });

  // Additive: a caller that names no effort sends the request it always sent.
  it("sends an effort only when the caller names one", async () => {
    const plain = scripted([reply({ answer: "x" })]);
    await callModel(req, { messages: plain.messages, log: quiet });
    expect(Object.keys(plain.calls[0].body.output_config ?? {})).toEqual(["format"]);
    const low = scripted([reply({ answer: "x" })]);
    await callModel({ ...req, effort: "low" }, { messages: low.messages, log: quiet });
    expect(low.calls[0].body.output_config?.effort).toBe("low");
  });

  it("retries once on a 529 and succeeds", async () => {
    const { messages, calls } = scripted([busy(), reply({ answer: "x" })]);
    expect((await callModel(req, { messages, log: quiet })).ok).toBe(true);
    expect(calls).toHaveLength(2);
  });

  it("gives up as upstream_busy after the one retry, leaving a log line for each attempt", async () => {
    const lines: string[] = [];
    const { messages, calls } = scripted([rateLimited(), busy()]);
    expect(await callModel(req, { messages, log: (l) => lines.push(l) })).toEqual({ ok: false, errorClass: "upstream_busy" });
    expect(calls).toHaveLength(2);
    expect(lines).toEqual([expect.stringMatching(/^\[model\] upstream: 429/), expect.stringMatching(/^\[model\] upstream: 529/)]);
  });

  it("logs a reply that failed the schema", async () => {
    const lines: string[] = [];
    const { messages } = scripted([badShapeReply(), truncatedReply()]);
    await callModel(req, { messages, log: (l) => lines.push(l) });
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatch(/^\[model\] malformed:/);
  });

  it("retries once on a reply that fails the schema, then reports malformed", async () => {
    const { messages, calls } = scripted([badShape(), badShape()]);
    expect(await callModel(req, { messages, log: quiet })).toEqual({ ok: false, errorClass: "malformed" });
    expect(calls).toHaveLength(2);
  });

  it("keeps the usage of a reply whose TEXT fails the schema, into the retry's success", async () => {
    // The reply arrived and was billed; only its shape was wrong. The SDK's `parse` would have
    // thrown here and taken the usage with it.
    const { messages, calls } = scripted([
      badShapeReply({ input_tokens: 300, output_tokens: 8_000 }),
      reply({ answer: "x" }, { input_tokens: 300, output_tokens: 700 }),
    ]);
    expect(await callModel(req, { messages, log: quiet })).toEqual({
      ok: true, value: { answer: "x" },
      usage: { inputTokens: 600, outputTokens: 8_700, cacheReadTokens: 0, cacheWriteTokens: 0 },
    });
    expect(calls).toHaveLength(2);
  });

  it("keeps the usage of two replies that fail the schema, into the failed outcome", async () => {
    const { messages } = scripted([
      badShapeReply({ input_tokens: 300, output_tokens: 8_000 }),
      truncatedReply({ input_tokens: 300, output_tokens: 8_000 }),
    ]);
    expect(await callModel(req, { messages, log: quiet })).toEqual({
      ok: false, errorClass: "malformed",
      usage: { inputTokens: 600, outputTokens: 16_000, cacheReadTokens: 0, cacheWriteTokens: 0 },
    });
  });

  it("treats a reply that parsed to nothing (a refusal, a cut-off) as malformed", async () => {
    const { messages } = scripted([reply(null), reply(null)]);
    expect(await callModel(req, { messages, log: quiet })).toEqual({
      ok: false, errorClass: "malformed",
      // Both replies came back, so both were billed: the failure carries their sum.
      usage: { inputTokens: 20, outputTokens: 4, cacheReadTokens: 0, cacheWriteTokens: 0 },
    });
  });

  it("reads the cache meters, null as zero", async () => {
    const { messages } = scripted([reply({ answer: "x" }, {
      input_tokens: 5, output_tokens: 1, cache_read_input_tokens: 300, cache_creation_input_tokens: null,
    })]);
    const out = await callModel(req, { messages, log: quiet });
    expect(out.ok && out.usage).toEqual({ inputTokens: 5, outputTokens: 1, cacheReadTokens: 300, cacheWriteTokens: 0 });
  });

  it("accumulates a malformed first reply's usage into a successful retry's", async () => {
    const { messages } = scripted([
      reply(null, { input_tokens: 100, output_tokens: 8000, cache_read_input_tokens: 7, cache_creation_input_tokens: 3 }),
      reply({ answer: "x" }, { input_tokens: 100, output_tokens: 500, cache_read_input_tokens: 1, cache_creation_input_tokens: 2 }),
    ]);
    expect(await callModel(req, { messages, log: quiet })).toEqual({
      ok: true, value: { answer: "x" },
      usage: { inputTokens: 200, outputTokens: 8500, cacheReadTokens: 8, cacheWriteTokens: 5 },
    });
  });

  it("keeps a malformed first reply's usage when the retry is lost upstream", async () => {
    const { messages } = scripted([reply(null, { input_tokens: 40, output_tokens: 9 }), busy()]);
    expect(await callModel(req, { messages, log: quiet })).toEqual({
      ok: false, errorClass: "upstream_busy",
      usage: { inputTokens: 40, outputTokens: 9, cacheReadTokens: 0, cacheWriteTokens: 0 },
    });
  });

  it("spends its one retry once, even when the two failures differ", async () => {
    const { messages, calls } = scripted([busy(), badShape(), reply({ answer: "never reached" })]);
    expect(await callModel(req, { messages, log: quiet })).toEqual({ ok: false, errorClass: "malformed" });
    expect(calls).toHaveLength(2);
  });

  it("does not retry a key the upstream refused, and logs it as configuration", async () => {
    const lines: string[] = [];
    const { messages, calls } = scripted([unauthorized(), reply({ answer: "x" })]);
    expect(await callModel(req, { messages, log: (l) => lines.push(l) })).toEqual({ ok: false, errorClass: "upstream_busy" });
    expect(calls).toHaveLength(1);
    expect(lines[0]).toMatch(/^\[model\] configuration:/);
  });

  it("does not retry a request the upstream rejected, and logs it distinctly", async () => {
    const lines: string[] = [];
    const { messages, calls } = scripted([badRequest(), reply({ answer: "x" })]);
    expect(await callModel(req, { messages, log: (l) => lines.push(l) })).toEqual({ ok: false, errorClass: "upstream_busy" });
    expect(calls).toHaveLength(1);
    expect(lines[0]).toMatch(/^\[model\] request:/);
  });

  it("turns an error of no known kind into a terminal outcome, logged, not a throw", async () => {
    const lines: string[] = [];
    const { messages, calls } = scripted([new TypeError("fetch failed oddly"), reply({ answer: "x" })]);
    expect(await callModel(req, { messages, log: (l) => lines.push(l) })).toEqual({ ok: false, errorClass: "upstream_busy" });
    expect(calls).toHaveLength(1);
    expect(lines[0]).toMatch(/^\[model\] unexpected: TypeError/);
  });

  it("makes no request without a key, logs configuration, and does not throw", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const lines: string[] = [];
    expect(await callModel(req, { log: (l) => lines.push(l) })).toEqual({ ok: false, errorClass: "upstream_busy" });
    expect(lines[0]).toMatch(/configuration: ANTHROPIC_API_KEY/);
  });

  it("reports timeout when the call outruns its deadline, and does not retry it", async () => {
    vi.useFakeTimers();
    const calls: number[] = [];
    const messages = {
      create: (_body: unknown, opts: { signal: AbortSignal }) => new Promise((_r, reject) => {
        calls.push(1);
        opts.signal.addEventListener("abort", () => reject(new Anthropic.APIUserAbortError()));
      }),
    } as unknown as ModelDeps["messages"];
    const pending = callModel(req, { messages, log: quiet });
    await vi.advanceTimersByTimeAsync(req.deadlineMs + 1);
    expect(await pending).toEqual({ ok: false, errorClass: "timeout" });
    expect(calls).toHaveLength(1);
  });

  it("does not retry the SDK's own timeout even with budget left", async () => {
    // The case above cannot tell a retried timeout from an unretried one: by the time its abort
    // fires the deadline is spent, so the loop would stop either way. Here the timeout arrives
    // at t=0 with the whole budget left, so a retryable timeout would make a second call.
    const { messages, calls } = scripted([new Anthropic.APIConnectionTimeoutError(), reply({ answer: "x" })]);
    expect(await callModel(req, { messages, now: () => 0, log: quiet })).toEqual({ ok: false, errorClass: "timeout" });
    expect(calls).toHaveLength(1);
  });

  it("spends one deadline across both attempts, not one each", async () => {
    // The first attempt eats 89s of a 90s budget and fails retryably. The retry must be armed
    // with the ~1s that is left, not a fresh 90s.
    let clock = 0;
    const { messages, calls } = scripted([busy(), reply({ answer: "x" })]);
    const timed = {
      create: async (body: Call["body"], opts: Call["opts"]) => {
        const out = messages!.create(body as never, opts as never);
        clock += 89_000;
        return out;
      },
    } as unknown as ModelDeps["messages"];
    await callModel(req, { messages: timed, now: () => clock, log: quiet });
    expect(calls[0].opts.timeout).toBe(90_000);
    expect(calls[1].opts.timeout).toBe(1_000);
  });

  it("does not start a retry when the deadline is already spent", async () => {
    let clock = 0;
    const { messages, calls } = scripted([busy(), reply({ answer: "x" })]);
    const slow = {
      create: async (body: Call["body"], opts: Call["opts"]) => {
        const out = messages!.create(body as never, opts as never);
        clock += 90_000;
        return out;
      },
    } as unknown as ModelDeps["messages"];
    expect(await callModel(req, { messages: slow, now: () => clock, log: quiet })).toEqual({ ok: false, errorClass: "upstream_busy" });
    expect(calls).toHaveLength(1);
  });

  /** A first attempt that takes `firstMs` of the deadline and fails the schema, then a retry that would succeed. */
  function afterFirst(firstMs: number) {
    let clock = 0;
    const { messages, calls } = scripted([badShapeReply(), reply({ answer: "x" })]);
    const timed = {
      create: async (body: Call["body"], opts: Call["opts"]) => {
        const out = messages!.create(body as never, opts as never);
        if (calls.length === 1) clock += firstMs;
        return out;
      },
    } as unknown as ModelDeps["messages"];
    return { calls, deps: { messages: timed, now: () => clock, log: quiet } };
  }

  it("refuses a retry with less than its floor left, failing as the first attempt did and keeping its usage", async () => {
    // Eldrazi on round 4: the first attempt failed at ~43s of 110, leaving ~67s against a 70s floor.
    const { calls, deps } = afterFirst(43_000);
    const outcome = await callModel({ ...req, deadlineMs: 110_000, retryFloorMs: 70_000 }, deps);
    expect(outcome).toEqual({ ok: false, errorClass: "malformed", usage: { inputTokens: 10, outputTokens: 2, cacheReadTokens: 0, cacheWriteTokens: 0 } });
    expect(calls).toHaveLength(1);
  });

  it("starts the retry when its floor is left", async () => {
    const { calls, deps } = afterFirst(40_000);
    const outcome = await callModel({ ...req, deadlineMs: 110_000, retryFloorMs: 70_000 }, deps);
    expect(outcome.ok).toBe(true);
    expect(calls).toHaveLength(2);
    expect(calls[1].opts.timeout).toBe(70_000);
  });

  it("with no floor, a retry takes whatever is left, as before", async () => {
    const { calls, deps } = afterFirst(43_000);
    expect((await callModel({ ...req, deadlineMs: 110_000 }, deps)).ok).toBe(true);
    expect(calls[1].opts.timeout).toBe(67_000);
  });
});
