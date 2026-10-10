import { describe, expect, it } from "vitest";
import type { z } from "zod";

import { callModel } from "../../../src/lib/model/client";
import { tuningResponseSchema } from "../../../src/lib/tuning/response-schema";
import { synopsisResponseSchema } from "../../../src/lib/synopsis/response-schema";
import { buildParams, parseReply } from "./request.mjs";

/** What `callModel` hands `messages.create`, captured through its injected `messages`. */
async function sentByApp(schema: z.ZodType<unknown>) {
  let captured: unknown;
  const messages = {
    create: async (params: unknown) => {
      captured = params;
      return { content: [], stop_reason: "end_turn", usage: { input_tokens: 0, output_tokens: 0 } };
    },
  };
  await callModel(
    { model: "claude-sonnet-5", system: "SYS", user: "USER", maxTokens: 3000, schema, deadlineMs: 60_000 },
    { messages: messages as never, log: () => {} },
  );
  // JSON drops the format's `parse` function, which is client-side only and never on the wire.
  return JSON.parse(JSON.stringify(captured));
}

describe("buildParams", () => {
  for (const [name, schema] of [["tuning", tuningResponseSchema], ["synopsis", synopsisResponseSchema]] as [string, z.ZodType<unknown>][]) {
    it(`builds exactly the request callModel sends (${name})`, async () => {
      const app = await sentByApp(schema);
      const harness = buildParams({ model: "claude-sonnet-5", system: "SYS", user: "USER", maxTokens: 3000, schema });
      expect(JSON.parse(JSON.stringify(harness))).toEqual(app);
    });
  }

  it("applies each variant knob, and only that knob", () => {
    const base = { model: "claude-haiku-4-5", system: "SYS", user: "USER", maxTokens: 3000, schema: tuningResponseSchema };
    const plain = JSON.parse(JSON.stringify(buildParams(base)));
    const p = JSON.parse(JSON.stringify(buildParams(base, { effort: "low", maxTokens: 1200, cache: true })));
    // What no knob touches stays exactly as the app builds it.
    expect(p.model).toBe(plain.model);
    expect(p.output_config.format).toEqual(plain.output_config.format);
    expect(Object.keys(p).sort()).toEqual(Object.keys(plain).sort());
    expect(p).toMatchObject({
      max_tokens: 1200,
      output_config: { effort: "low" },
      system: [{ cache_control: { type: "ephemeral" } }],
      messages: [{ content: [{ cache_control: { type: "ephemeral" } }] }],
    });
  });
});

describe("parseReply", () => {
  const msg = (text: string, stop: "end_turn" | "max_tokens" = "end_turn") =>
    ({ content: [{ type: "text", text, citations: null }], stop_reason: stop }) as never;

  it("parses a valid reply", () => {
    expect(parseReply(tuningResponseSchema, msg('{"additions":[],"cuts":[]}'))).toEqual({ ok: true, value: { additions: [], cuts: [] } });
  });

  it("classes truncated, off-schema and empty replies as malformed", () => {
    expect(parseReply(tuningResponseSchema, msg('{"suggestions":[', "max_tokens")).ok).toBe(false);
    expect(parseReply(tuningResponseSchema, msg('{"suggestions":"no"}')).ok).toBe(false);
    expect(parseReply(tuningResponseSchema, { content: [], stop_reason: "refusal" } as never).ok).toBe(false);
  });
});
