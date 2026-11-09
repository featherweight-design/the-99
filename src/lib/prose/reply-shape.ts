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

/**
 * An OK reply that carries no text block. The run stops on the first one rather than retrying it: a reply with no sentence
 * is priced all the same, so a request shape that produces none (a thinking block spending the whole `max_tokens`, say) would
 * otherwise burn the cap one commander at a time, as the 2026-11-03 run did across 1,017 calls.
 */
export class NoTextReplyError extends Error {
  constructor(shape: ReplyShape) {
    super(
      `the reply carried no text block: blocks [${shape.blockTypes.join(", ")}], stop_reason ${shape.stopReason}, ` +
      `${shape.outputTokens ?? "?"} output tokens`,
    );
    this.name = "NoTextReplyError";
  }
}

/** The first text block of a reply, or a `NoTextReplyError` when there is none. */
export function proseText(body: ProseReply): string {
  const text = body.content?.find((b) => b.type === "text")?.text;
  if (text === undefined) throw new NoTextReplyError(describeReply(body));
  return text;
}

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
