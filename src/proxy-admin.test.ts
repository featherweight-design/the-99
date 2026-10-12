// The proxy has NO admin rule, and that is the rule (admin STATES must-not: no hint that `/admin`
// exists). The matcher protects every non-public path, an unknown one included, so a signed-out
// reader of `/admin` is sent to sign-in exactly as a reader of `/no-such-page` is, and a signed-in
// stranger then gets `requireAdmin()`'s 404, exactly as an unknown path 404s. Exempting `/admin` to
// answer a signed-out reader with a 404 would make it the one private path that does not redirect,
// which says it is there.
import { NextRequest, type NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const protect = vi.fn(async () => ({ userId: null as string | null }));
const session = vi.fn(async () => ({ userId: null as string | null }));

vi.mock("@clerk/nextjs/server", async () => {
  const actual = await vi.importActual<typeof import("@clerk/nextjs/server")>("@clerk/nextjs/server");
  return { clerkMiddleware: (fn: unknown) => fn, createRouteMatcher: actual.createRouteMatcher };
});
vi.mock("./lib/about/read", () => ({
  aboutVersionSeen: async () => 0,
  aboutSeen: async () => ({ version: 0, ids: [] }),
}));

const proxy = (await import("./proxy")).default as unknown as (
  auth: unknown,
  req: NextRequest,
) => Promise<NextResponse | undefined>;
const auth = Object.assign(session, { protect });

beforeEach(() => {
  protect.mockClear();
  session.mockClear();
});

describe("the admin route in the proxy", () => {
  it.each(["/admin", "/admin/switches", "/no-such-page"])("protects %s like any other private path", async (path) => {
    await proxy(auth, new NextRequest(`https://the99.test${path}`, { headers: { accept: "text/html" } }));
    expect(protect).toHaveBeenCalledOnce();
    expect(session).not.toHaveBeenCalled();
  });
});
