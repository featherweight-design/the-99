import { describe, expect, it } from "vitest";
import { NoTextReplyError, describeReply, proseText } from "./reply-shape";

describe("describeReply", () => {
  it("names a reply that spent its tokens on a block that is not text", () => {
    const shape = describeReply({
      content: [{ type: "thinking" }],
      stop_reason: "max_tokens",
      model: "claude-sonnet-5-5",
      usage: { input_tokens: 340, output_tokens: 200 },
    });
    expect(shape).toEqual({
      blockTypes: ["thinking"],
      stopReason: "max_tokens",
      textChars: 0,
      inputTokens: 340,
      outputTokens: 200,
      model: "claude-sonnet-5-5",
    });
  });

  it("measures the first text block and lists every block in order", () => {
    const shape = describeReply({
      content: [{ type: "thinking" }, { type: "text", text: "A sentence." }, { type: "text", text: "ignored" }],
      stop_reason: "end_turn",
      usage: { input_tokens: 10, output_tokens: 5 },
    });
    expect(shape.blockTypes).toEqual(["thinking", "text", "text"]);
    expect(shape.textChars).toBe("A sentence.".length);
    expect(shape.model).toBeNull();
  });

  it("reads an empty reply as no blocks and no usage", () => {
    expect(describeReply({})).toEqual({
      blockTypes: [], stopReason: null, textChars: 0, inputTokens: null, outputTokens: null, model: null,
    });
  });
});

describe("proseText", () => {
  it("returns the first text block, wherever it sits", () => {
    expect(proseText({ content: [{ type: "thinking" }, { type: "text", text: "A sentence." }] })).toBe("A sentence.");
  });
  it("throws on a reply with no text block, naming what it did carry", () => {
    const reply = { content: [{ type: "thinking" }], stop_reason: "max_tokens", usage: { output_tokens: 200 } };
    expect(() => proseText(reply)).toThrow(NoTextReplyError);
    expect(() => proseText(reply)).toThrow("blocks [thinking], stop_reason max_tokens, 200 output tokens");
    expect(() => proseText({})).toThrow(NoTextReplyError);
  });
});
