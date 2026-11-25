import { describe, expect, it, vi } from "vitest";
import { dispatchCopyEdit, findCopyEditPr, REPO } from "./github";

const edits = [{ key: "src/lib/copy/a.ts#x", from: "Zork plinth one", to: "Zork plinth two" }];
const reply = (status: number, body?: unknown) => vi.fn(async () => new Response(body === undefined ? null : JSON.stringify(body), { status })) as unknown as typeof fetch;

describe("dispatchCopyEdit", () => {
  it("starts the workflow on main with the branch and the edits as one JSON string, the token in the header only", async () => {
    const doFetch = reply(204);
    expect(await dispatchCopyEdit("tok_secret", "copy-edit-20261124-183512", edits, doFetch)).toBe(true);
    const [url, init] = (doFetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`https://api.github.com/repos/${REPO}/actions/workflows/copy-edit.yml/dispatches`);
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok_secret");
    const body = JSON.parse(init.body as string);
    expect(body).toEqual({ ref: "main", inputs: { branch: "copy-edit-20261124-183512", edits: JSON.stringify(edits) } });
    expect(init.body as string).not.toContain("tok_secret");
  });

  it("is false for any answer but 204, and when the call throws", async () => {
    expect(await dispatchCopyEdit("t", "b", edits, reply(422, {}))).toBe(false);
    expect(await dispatchCopyEdit("t", "b", edits, vi.fn(async () => Promise.reject(new Error("net"))) as unknown as typeof fetch)).toBe(false);
  });
});

describe("findCopyEditPr", () => {
  const branch = "copy-edit-20261124-183512";

  it("reads the pull request by head branch", async () => {
    const doFetch = reply(200, [{ number: 7, html_url: "https://example.test/7", state: "open", merged_at: null }]);
    expect(await findCopyEditPr("t", branch, doFetch)).toEqual({ state: "open", number: 7, url: "https://example.test/7" });
    const url = (doFetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain(encodeURIComponent(`featherweight-design:${branch}`));
  });

  it("tells merged and closed apart, and none from unknown", async () => {
    expect(await findCopyEditPr("t", branch, reply(200, [{ number: 7, html_url: "u", state: "closed", merged_at: "2026-11-24T00:00:00Z" }]))).toMatchObject({ state: "merged" });
    expect(await findCopyEditPr("t", branch, reply(200, [{ number: 7, html_url: "u", state: "closed", merged_at: null }]))).toMatchObject({ state: "closed" });
    expect(await findCopyEditPr("t", branch, reply(200, []))).toEqual({ state: "none" });
    expect(await findCopyEditPr("t", branch, reply(403, {}))).toEqual({ state: "unknown" });
  });

  it("does not call GitHub for a branch that is not one the route names", async () => {
    const doFetch = reply(200, []);
    expect(await findCopyEditPr("t", "main", doFetch)).toEqual({ state: "unknown" });
    expect(doFetch).not.toHaveBeenCalled();
  });
});
