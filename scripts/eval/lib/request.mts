import type Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";

import type { ModelRequest } from "../../../src/lib/model/client";

/**
 * The request the harness sends, built from the SAME fields `callModel` takes.
 *
 * The batch path cannot go through `callModel` itself, so this is the one place the harness could
 * drift from the app. `request.test.mts` closes that: it hands `callModel` a fake `messages`,
 * captures what it sends, and asserts the baseline built here is identical. A change to the app's
 * request shape then fails that test rather than quietly changing what the harness measures.
 *
 * A cell's knobs are the only departures from the app, and each one is a named variant:
 *  - `effort` adds `output_config.effort` (Sonnet 5; Haiku 4.5 rejects it);
 *  - `maxTokens` overrides the feature's ceiling;
 *  - `cache` marks the system prompt and the user message with a 5-minute `cache_control`.
 */
export type Cell = {
  id: string;
  model: string;
  effort?: "low" | "medium" | "high";
  maxTokens?: number;
  cache?: boolean;
};

export type Params = Anthropic.MessageCreateParamsNonStreaming;

export function buildParams<T>(req: Pick<ModelRequest<T>, "model" | "system" | "user" | "maxTokens" | "schema">, cell?: Omit<Cell, "id" | "model">): Params {
  const format = zodOutputFormat(req.schema as z.ZodType<T>);
  const outputConfig: Record<string, unknown> = { format: { type: format.type, schema: format.schema } };
  if (cell?.effort) outputConfig.effort = cell.effort;
  const params = {
    model: req.model,
    max_tokens: cell?.maxTokens ?? req.maxTokens,
    system: cell?.cache
      ? [{ type: "text" as const, text: req.system, cache_control: { type: "ephemeral" as const } }]
      : req.system,
    messages: [{
      role: "user" as const,
      content: cell?.cache
        ? [{ type: "text" as const, text: req.user, cache_control: { type: "ephemeral" as const } }]
        : req.user,
    }],
    output_config: outputConfig,
  };
  return params as Params;
}

/**
 * The reply's structured output, parsed exactly as `messages.parse` parses it: the zod format's own
 * `parse` over the text. A reply with no text, one cut off at `max_tokens`, or one that fails the
 * schema is `malformed`, which is how `callModel` classes each of them.
 */
export function parseReply<T>(schema: z.ZodType<T>, message: Pick<Anthropic.Message, "content" | "stop_reason">):
  | { ok: true; value: T }
  | { ok: false; reason: string } {
  const text = message.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
  if (text.length === 0) return { ok: false, reason: `no text (stop_reason ${message.stop_reason})` };
  try {
    return { ok: true, value: zodOutputFormat(schema).parse(text) as T };
  } catch (err) {
    return { ok: false, reason: `${message.stop_reason}: ${err instanceof Error ? err.message.split("\n")[0] : String(err)}` };
  }
}
