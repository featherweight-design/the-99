// What one Messages reply to a prose prompt looks like, said without the sentence in it. The commander prose run reads only
// the first `text` block; a reply with none (the 2026-11-03 run: 1,017 replies, every one priced, none carrying a sentence)
// is invisible to that read, so the diagnostic mode and the run's own stop both describe the reply with this.

export type ProseReply = {
  content?: { type: string; text?: string }[];
  stop_reason?: string | null;
  model?: string;
  usage?: { input_tokens?: number; output_tokens?: number };
};

export type ReplyShape = {
  /** The `type` of every content block, in order (`text`, `thinking`, `tool_use`, ...). */
  blockTypes: string[];
  stopReason: string | null;
  /** Length of the first text block, 0 when there is none. */
  textChars: number;
  inputTokens: number | null;
  outputTokens: number | null;
  model: string | null;
};

export function describeReply(body: ProseReply): ReplyShape {
  const blocks = body.content ?? [];
  const text = blocks.find((b) => b.type === "text")?.text ?? "";
  return {
    blockTypes: blocks.map((b) => b.type),
    stopReason: body.stop_reason ?? null,
    textChars: text.length,
    inputTokens: body.usage?.input_tokens ?? null,
    outputTokens: body.usage?.output_tokens ?? null,
    model: body.model ?? null,
  };
}
