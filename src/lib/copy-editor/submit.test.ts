import { beforeEach, describe, expect, it, vi } from "vitest";

const capture = vi.hoisted(() => vi.fn());
vi.mock("../sentry/capture-client", () => ({ captureClientError: capture }));

const { submitEdits } = await import("./submit");

const edits = [{ key: "src/lib/copy/a.ts#x", from: "One", to: "Two" }];
const reply = (status: number, body: unknown = {}) => (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

beforeEach(() => capture.mockReset());

describe("submitEdits", () => {
  it("keeps the server's reason and the edit it names on a 400 (the route reports it, not the client)", async () => {
    const r = await submitEdits(edits, reply(400, { error: "bad-edits", message: "an edit cannot leave a line empty", keys: [edits[0].key] }));
    expect(r).toEqual({ kind: "invalid", message: "an edit cannot leave a line empty", keys: [edits[0].key] });
    expect(capture).not.toHaveBeenCalled();
  });

  it("drops a reason that is not a short phrase", async () => {
    const r = await submitEdits(edits, reply(400, { message: "x".repeat(500), keys: [3, "k"] }));
    expect(r).toEqual({ kind: "invalid", message: "", keys: ["k"] });
  });

  it("shows unavailable for 502 and 503 without a second report, and reports a status nothing planned", async () => {
    expect(await submitEdits(edits, reply(502, { error: "dispatch-failed" }))).toEqual({ kind: "unavailable" });
    expect(await submitEdits(edits, reply(503))).toEqual({ kind: "unavailable" });
    expect(capture).not.toHaveBeenCalled();
    expect(await submitEdits(edits, reply(500))).toEqual({ kind: "unavailable" });
    expect(capture).toHaveBeenCalledWith("copy-editor-submit-unavailable", expect.any(Error));
  });

  it("stays silent for the outcomes it expects: success, stale, rule, limit, offline", async () => {
    expect(await submitEdits(edits, reply(202, { branch: "copy-edit-20261127-101010-ab12" }))).toEqual({ kind: "ok", branch: "copy-edit-20261127-101010-ab12" });
    expect((await submitEdits(edits, reply(409, { keys: ["k"] }))).kind).toBe("stale");
    expect((await submitEdits(edits, reply(422, { rows: [{ key: "k" }] }))).kind).toBe("rule");
    expect((await submitEdits(edits, reply(429))).kind).toBe("limit");
    expect(await submitEdits(edits, (async () => { throw new TypeError("Failed to fetch"); }) as unknown as typeof fetch)).toEqual({ kind: "network" });
    expect(capture).not.toHaveBeenCalled();
  });
});
