import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";

import { MAX_TOKENS, requestBody, sendProse, TIMEOUT_MS } from "./prose-request";

const MODEL = "claude-sonnet-5-5";

const OLD_BODY = JSON.stringify({ model: "claude-sonnet-5-5", max_tokens: 200, thinking: { type: "between_tools" }, messages: [{ role: "user", content: "p" }] });
const reply = JSON.stringify({ id: "m", type: "message", role: "assistant", model: MODEL, content: [{ type: "text", text: "hi" }], stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } });

describe("the commander prose request", () => {
  it("is the body the raw fetch sent", () => {
    expect(requestBody(MODEL, "p")).toBe(OLD_BODY);
    expect(MAX_TOKENS).toBe(200);
  });

  it("goes to the same URL with the same headers and body as the raw fetch did, authenticated by the env key", async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const client = new Anthropic({
      apiKey: "key-for-test", dangerouslyAllowBrowser: true, baseURL: "https://api.anthropic.com",
      fetch: async (url, init) => { calls.push({ url: String(url), init: init ?? {} }); return new Response(reply, { status: 200, headers: { "content-type": "application/json" } }); },
    });
    await sendProse(client, MODEL, "p");
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://api.anthropic.com/v1/messages");
    expect(calls[0].init.method).toBe("POST");
    const headers = new Headers(calls[0].init.headers);
    expect(headers.get("x-api-key")).toBe("key-for-test");
    expect(headers.get("anthropic-version")).toBe("2023-06-01");
    expect(headers.get("content-type")).toContain("application/json");
    expect(JSON.parse(String(calls[0].init.body))).toEqual(JSON.parse(OLD_BODY));
  });

  it("asks for the same 30 second timeout and never retries: one call is one bill", async () => {
    const post = vi.fn(async () => ({}));
    await sendProse({ post } as never, MODEL, "p");
    expect(post).toHaveBeenCalledWith("/v1/messages", { body: JSON.parse(OLD_BODY), timeout: 30_000, maxRetries: 0 });
    expect(TIMEOUT_MS).toBe(30_000);
  });

  it("sends once on a server error, never twice (a retry would spend past the cap)", async () => {
    let n = 0;
    const client = new Anthropic({
      apiKey: "key-for-test", dangerouslyAllowBrowser: true, baseURL: "https://api.anthropic.com",
      fetch: async () => { n += 1; return new Response('{"type":"error","error":{"type":"api_error","message":"boom"}}', { status: 500, headers: { "content-type": "application/json" } }); },
    });
    await expect(sendProse(client, MODEL, "p")).rejects.toMatchObject({ status: 500 });
    expect(n).toBe(1);
  });
});
