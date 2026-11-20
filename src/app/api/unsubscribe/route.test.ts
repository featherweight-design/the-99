import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ over: false, unsubscribe: vi.fn(), limit: vi.fn() }));
vi.mock("../../../lib/flyer/launch-unsubscribe", async (orig) => ({
  ...(await orig<typeof import("../../../lib/flyer/launch-unsubscribe")>()),
  unsubscribeByToken: m.unsubscribe,
}));
vi.mock("../../../lib/rate/anon", () => ({ overAnonymousLimit: m.limit }));

import { POST } from "./route";

const TOKEN = "A".repeat(43);
const post = (t: string | null) => POST(new Request(`https://the-99.dev/api/unsubscribe${t === null ? "" : `?t=${t}`}`, { method: "POST" }));

beforeEach(() => {
  m.unsubscribe.mockReset().mockResolvedValue({ outcome: "done", matched: false });
  m.limit.mockReset().mockImplementation(async () => m.over);
  m.over = false;
});

describe("POST /api/unsubscribe", () => {
  it("answers 200 for a well-formed token whether or not it matched", async () => {
    expect((await post(TOKEN)).status).toBe(200);
    m.unsubscribe.mockResolvedValue({ outcome: "done", matched: true });
    expect((await post(TOKEN)).status).toBe(200);
    expect(m.limit).toHaveBeenCalledWith(expect.anything(), "launch-one-click");
  });

  it("refuses a malformed or missing token with 400 before counting or reading", async () => {
    expect((await post("short")).status).toBe(400);
    expect((await post(null)).status).toBe(400);
    expect(m.limit).not.toHaveBeenCalled();
    expect(m.unsubscribe).not.toHaveBeenCalled();
  });

  it("answers 429 over the visitor's limit and deletes nothing", async () => {
    m.over = true;
    expect((await post(TOKEN)).status).toBe(429);
    expect(m.unsubscribe).not.toHaveBeenCalled();
  });
});
