// The submit route with the REAL gate (Clerk's session and the three environment legs are stubbed, not the gate), so each
// leg is shown to shut the route on its own while the other two are open.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const session = vi.fn(async () => ({ userId: null as string | null }));
vi.mock("@clerk/nextjs/server", () => ({ auth: () => session() }));
const read = vi.hoisted(() => vi.fn());
vi.mock("../../../../lib/copy-editor/rows", () => ({ readEditorRows: read }));
const enforce = vi.hoisted(() => vi.fn());
vi.mock("../../../../lib/rate/observe", () => ({ enforceHit: enforce }));
const dispatch = vi.hoisted(() => vi.fn());
vi.mock("../../../../lib/copy-editor/github", () => ({ dispatchCopyEdit: dispatch }));

const { POST } = await import("./route");

const ADMIN = "user_admin";
const row = { key: "src/lib/copy/a.ts#x", kind: "text", text: "Zork plinth one", placeholders: [], context: "", readOnly: "" };
const ro = { ...row, key: "src/lib/copy/a.ts#y", kind: "edit in code", readOnly: "built from a call" };
const edit = { key: row.key, from: row.text, to: "Zork plinth two" };

function post(body: unknown, headers: Record<string, string> = { "content-type": "application/json" }) {
  return POST(new NextRequest("http://localhost/api/copy-edit/submit", { method: "POST", headers, body: typeof body === "string" ? body : JSON.stringify(body) }));
}

beforeEach(() => {
  vi.stubEnv("ADMIN_USER_IDS", ADMIN);
  vi.stubEnv("ADMIN_ENV_LABEL", "staging");
  vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "staging.the-99.dev");
  vi.stubEnv("COPY_EDIT_DISPATCH_TOKEN", "tok_stub");
  session.mockResolvedValue({ userId: ADMIN });
  read.mockReset().mockResolvedValue([row, ro]);
  enforce.mockReset().mockResolvedValue(null);
  dispatch.mockReset().mockResolvedValue(true);
});
afterEach(() => vi.unstubAllEnvs());

describe("POST /api/copy-edit/submit: the gate's three legs", () => {
  const nothingRan = () => {
    expect(read).not.toHaveBeenCalled();
    expect(enforce).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
  };

  it("is a bare 404 for a signed-in player who is not an admin", async () => {
    session.mockResolvedValue({ userId: "user_player" });
    const res = await post({ edits: [edit] });
    expect(res.status).toBe(404);
    expect(await res.text()).toBe("");
    nothingRan();
  });

  it("is a bare 404 when the environment label is not staging, with the admin and the deployment open", async () => {
    vi.stubEnv("ADMIN_ENV_LABEL", "production");
    expect((await post({ edits: [edit] })).status).toBe(404);
    nothingRan();
  });

  it("is a bare 404 when the project variable is unset, with the admin and the label open", async () => {
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "");
    expect((await post({ edits: [edit] })).status).toBe(404);
    nothingRan();
  });

  it("is a bare 404 on the production project, with the admin and the label open", async () => {
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "the-99.dev");
    expect((await post({ edits: [edit] })).status).toBe(404);
    nothingRan();
  });

  it("is a bare 404 signed out", async () => {
    session.mockResolvedValue({ userId: null });
    expect((await post({ edits: [edit] })).status).toBe(404);
    nothingRan();
  });
});

describe("POST /api/copy-edit/submit: the body", () => {
  it("takes JSON only", async () => {
    expect((await post("edits=1", { "content-type": "text/plain" })).status).toBe(415);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("is 400 for bad JSON and for a body the shape check refuses", async () => {
    expect((await post("{not json")).status).toBe(400);
    expect((await post({ edits: [{ key: "x" }] })).status).toBe(400);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("is 413 for a body over the cap", async () => {
    expect((await post("x".repeat(70_000))).status).toBe(413);
  });

  it.each([
    ["an unknown key", { ...edit, key: "src/lib/copy/a.ts#nope" }, "unknown-key"],
    ["a read-only row", { key: ro.key, from: ro.text, to: "Zork plinth two" }, "read-only"],
    ["a text the copy sheet's rules refuse (an em dash)", { ...edit, to: `Zork ${String.fromCharCode(0x2014)} plinth` }, "rule"],
  ])("is 422 for %s, naming the row, and starts nothing", async (_name, bad, reason) => {
    const res = await post({ edits: [bad] });
    expect(res.status).toBe(422);
    expect((await res.json()).rows.map((r: { reason: string }) => r.reason)).toContain(reason);
    expect(enforce).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
  });
});

describe("POST /api/copy-edit/submit: a stale row", () => {
  it("is 409 naming the stale keys (rule-broken rows alongside do not hide them), and starts nothing", async () => {
    const res = await post({ edits: [{ ...edit, from: "Zork plinth zero" }] });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "stale", keys: [edit.key] });
    expect(enforce).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
  });
});

describe("POST /api/copy-edit/submit: the dispatch", () => {
  it("is 503 without the token, before the rate limit counts a hit", async () => {
    vi.stubEnv("COPY_EDIT_DISPATCH_TOKEN", "");
    const res = await post({ edits: [edit] });
    expect(res.status).toBe(503);
    expect(enforce).not.toHaveBeenCalled();
  });

  it("is 429 with Retry-After past one a minute, and starts nothing", async () => {
    enforce.mockResolvedValue(42);
    const res = await post({ edits: [edit] });
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("42");
    expect(enforce).toHaveBeenCalledWith(ADMIN, "copy-edit-submit");
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("starts the workflow with a branch the workflow accepts and only the checked edits, answering 202", async () => {
    const res = await post({ edits: [{ ...edit, extra: "dropped" }] });
    expect(res.status).toBe(202);
    const { branch } = await res.json();
    expect(branch).toMatch(/^copy-edit-\d{8}-\d{6}-[0-9a-f]{4}$/);
    expect(dispatch).toHaveBeenCalledWith("tok_stub", branch, [edit]);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
  });

  it("is 502 when GitHub refuses the dispatch", async () => {
    dispatch.mockResolvedValue(false);
    expect((await post({ edits: [edit] })).status).toBe(502);
  });
});
