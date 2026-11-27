import { beforeEach, describe, expect, it, vi } from "vitest";

const captured = vi.hoisted(() => [] as { error: Error; hint: { tags: Record<string, string> } }[]);
vi.mock("@sentry/nextjs", () => ({
  captureException: (error: Error, hint: { tags: Record<string, string> }) => { captured.push({ error, hint }); },
  addBreadcrumb: vi.fn(),
  captureMessage: vi.fn(),
}));

const { captureClientError, resetClientCaptureForTest } = await import("./capture-client");

beforeEach(() => { captured.length = 0; resetClientCaptureForTest(); });

describe("captureClientError", () => {
  it("sends the tag, the error's class name and its frames, never its message", () => {
    const err = new TypeError("Cannot read Kitchen Table Brew of Atraxa");
    err.stack = "TypeError: Cannot read Kitchen Table Brew of Atraxa\n    at confirm (https://x.test/a.js:10:5)\nsecond line of the message, Sol Ring\n    at least 3 copies of Sol Ring\n    at run (https://x.test/b.js:2:9)\nfn@https://x.test/c.js:3:4";
    captureClientError("test.site", err);
    expect(captured).toHaveLength(1);
    const { error, hint } = captured[0];
    expect(error.message).toBe("test.site");
    expect(error.name).toBe("TypeError");
    expect(hint.tags).toEqual({ site: "test.site" });
    expect(error.stack).toBe("TypeError: test.site\n    at confirm (https://x.test/a.js:10:5)\n    at run (https://x.test/b.js:2:9)\nfn@https://x.test/c.js:3:4");
    expect(JSON.stringify([error.message, error.stack])).not.toMatch(/Kitchen|Atraxa|Sol Ring/);
  });

  it("falls back to Error for a name that is not one plain word, and for a non-error", () => {
    const odd = Object.assign(new Error("x"), { name: "Kitchen Table Brew" });
    captureClientError("test.odd", odd);
    captureClientError("test.string", "a deck name typed by a player");
    expect(captured.map((c) => c.error.name)).toEqual(["Error", "Error"]);
    expect(captured[1].error.stack).toBe("Error: test.string");
  });

  it("reports one event per tag per page session, so a render loop cannot flood the quota", () => {
    for (let i = 0; i < 500; i++) captureClientError("test.loop", new Error("again"));
    expect(captured).toHaveLength(1);
    captureClientError("test.other", new Error("again"));
    expect(captured).toHaveLength(2);
    resetClientCaptureForTest();
    captureClientError("test.loop", new Error("again"));
    expect(captured).toHaveLength(3);
  });

  it("stays silent for an abort and while offline, and does not spend the tag on them", () => {
    captureClientError("test.quiet", Object.assign(new Error("x"), { name: "AbortError" }));
    expect(captured).toHaveLength(0);
    vi.stubGlobal("navigator", { onLine: false });
    captureClientError("test.quiet", new Error("x"));
    expect(captured).toHaveLength(0);
    vi.unstubAllGlobals();
    captureClientError("test.quiet", new Error("x"));
    expect(captured).toHaveLength(1);
  });
});
