// The commander prose call's request, apart from the run so a test can pin exactly what is sent (`prose-request.test.ts`).
import type Anthropic from "@anthropic-ai/sdk";

// Sonnet 5.5 since 2026-10-30 (Hugh: the 5.5 model wherever one exists); it was Sonnet 4.6.
export const MODEL = "claude-sonnet-5-5";

export const MAX_TOKENS = 200;
// Thinking is off for this call. `--diagnose` on 2026-11-09 showed claude-sonnet-5-5 answering the prompt with a lone thinking
// block that spent all 200 `max_tokens` (stop_reason max_tokens, 467 in / 200 out, no text): a call billed and unreadable, which
// is the likely cause of the 2026-11-03 run's $2.99 for nothing. One sentence needs no reasoning. Sonnet 5.5 answers
// `{type: "disabled"}` with a 400; `between_tools` is its way to turn thinking off (effort `high` or below, no other field, and
// the default effort is `high`). It also rejects a non-default `temperature`, so none is sent.
const THINKING = { type: "between_tools" } as const;
export const requestBody = (prompt: string) =>
  JSON.stringify({ model: MODEL, max_tokens: MAX_TOKENS, thinking: THINKING, messages: [{ role: "user", content: prompt }] });

/** The request's timeout. */
export const TIMEOUT_MS = 30_000;

/**
 * One call. The SDK authenticates (`ANTHROPIC_API_KEY`, or an `ant` profile) and sends the same URL, headers (`x-api-key`,
 * `anthropic-version`, `content-type`) and body the raw fetch did. A non-2xx reply throws an `APIError` with its status and body.
 * NEVER retried: one call is one bill, and a retry would spend past the run's cap.
 */
export const sendProse = <T>(client: Pick<Anthropic, "post">, prompt: string) =>
  client.post<T>("/v1/messages", { body: JSON.parse(requestBody(prompt)), timeout: TIMEOUT_MS, maxRetries: 0 });
