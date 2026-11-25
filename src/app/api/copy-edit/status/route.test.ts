import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const session = vi.fn(async () => ({ userId: null as string | null }));
vi.mock("@clerk/nextjs/server", () => ({ auth: () => session() }));
const find = vi.hoisted(() => vi.fn());
vi.mock("../../../../lib/copy-editor/github", () => ({ findCopyEditPr: find }));

const { GET } = await import("./route");

const ADMIN = "user_admin";
const BRANCH = "copy-edit-20261124-183512";
const get = (branch: string | null = BRANCH) => GET(new NextRequest(`http://localhost/api/copy-edit/status${branch === null ? "" : `?branch=${encodeURIComponent(branch)}`}`));

beforeEach(() => {
  vi.stubEnv("ADMIN_USER_IDS", ADMIN);
  vi.stubEnv("ADMIN_ENV_LABEL", "staging");
  vi.stubEnv("VERCEL_ENV", "preview");
  vi.stubEnv("COPY_EDIT_DISPATCH_TOKEN", "tok_stub");
  session.mockResolvedValue({ userId: ADMIN });
  find.mockReset().mockResolvedValue({ state: "open", number: 7, url: "https://example.test/7" });
});
afterEach(() => vi.unstubAllEnvs());

describe("GET /api/copy-edit/status", () => {
  it("is a bare 404 when any one leg of the gate is shut, and asks GitHub nothing", async () => {
    session.mockResolvedValue({ userId: "user_player" });
    expect((await get()).status).toBe(404);
    session.mockResolvedValue({ userId: ADMIN });
    vi.stubEnv("ADMIN_ENV_LABEL", "production");
    expect((await get()).status).toBe(404);
    vi.stubEnv("ADMIN_ENV_LABEL", "staging");
    vi.stubEnv("VERCEL_ENV", "production");
    const res = await get();
    expect(res.status).toBe(404);
    expect(await res.text()).toBe("");
    expect(find).not.toHaveBeenCalled();
  });

  it("is 400 for a branch the route would never have named", async () => {
    expect((await get("main")).status).toBe(400);
    expect((await get(null)).status).toBe(400);
    expect(find).not.toHaveBeenCalled();
  });

  it("is 503 without the token", async () => {
    vi.stubEnv("COPY_EDIT_DISPATCH_TOKEN", "");
    expect((await get()).status).toBe(503);
  });

  it("answers the pull request's state, uncached", async () => {
    const res = await get();
    expect(await res.json()).toEqual({ state: "open", number: 7, url: "https://example.test/7" });
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(find).toHaveBeenCalledWith("tok_stub", BRANCH);
  });
});
