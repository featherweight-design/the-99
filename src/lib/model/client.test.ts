import Anthropic from "@anthropic-ai/sdk";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { callModel, type ModelDeps } from "./client";

const schema = z.object({ answer: z.string() });
const req = { model: "caller-model", system: "s", user: "u", maxTokens: 100, schema, deadlineMs: 90_000 };

type ApiUsage = { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number | null; cache_creation_input_tokens?: number | null };
const reply = (value: unknown, usage: ApiUsage = { input_tokens: 10, output_tokens: 2 }) => ({ parsed_output: value, usage, stop_reason: "end_turn" });
const busy = () => new Anthropic.InternalServerError(529, undefined, "overloaded", new Headers());
const rateLimited = () => new Anthropic.RateLimitError(429, undefined, "slow down", new Headers());
const badShape = () => new Anthropic.AnthropicError("Failed to parse structured output");
const unauthorized = () => new Anthropic.AuthenticationError(401, undefined, "bad key", new Headers());
const badRequest = () => new Anthropic.BadRequestError(400, undefined, "bad model", new Headers());

type Call = { body: { model: string }; opts: { timeout?: number; maxRetries?: number } };

/** A fake `messages` whose attempts play out a script: a value to return or an error to throw. */
function scripted(script: Array<unknown | Error>) {
  const calls: Call[] = [];
  const messages = {
    parse: vi.fn(async (body: Call["body"], opts: Call["opts"]) => {
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

  it("sends the caller's model, and turns the SDK's own retries off", async () => {
    const { messages, calls } = scripted([reply({ answer: "x" })]);
    await callModel(req, { messages, log: quiet });
    expect(calls[0].body.model).toBe("caller-model");
    expect(calls[0].opts.maxRetries).toBe(0);
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
    const { messages } = scripted([badShape(), badShape()]);
    await callModel(req, { messages, log: (l) => lines.push(l) });
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatch(/^\[model\] malformed:/);
  });

  it("retries once on a reply that fails the schema, then reports malformed", async () => {
    const { messages, calls } = scripted([badShape(), badShape()]);
    expect(await callModel(req, { messages, log: quiet })).toEqual({ ok: false, errorClass: "malformed" });
    expect(calls).toHaveLength(2);
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
      parse: (_body: unknown, opts: { signal: AbortSignal }) => new Promise((_r, reject) => {
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
      parse: async (body: Call["body"], opts: Call["opts"]) => {
        const out = messages!.parse(body as never, opts as never);
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
      parse: async (body: Call["body"], opts: Call["opts"]) => {
        const out = messages!.parse(body as never, opts as never);
        clock += 90_000;
        return out;
      },
    } as unknown as ModelDeps["messages"];
    expect(await callModel(req, { messages: slow, now: () => clock, log: quiet })).toEqual({ ok: false, errorClass: "upstream_busy" });
    expect(calls).toHaveLength(1);
  });
});
