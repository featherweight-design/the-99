// The proxy's one admin rule: `/admin` reads the session and never protects it, so a signed-out
// reader reaches the admin's own `notFound()` (STATES D3) rather than a sign-in redirect that says
// the route exists. The REAL route matcher, so the pattern itself is under test.
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
  it.each(["/admin", "/admin/switches", "/admin/accounts/user_1"])("reads the session on %s without protecting it", async (path) => {
    const res = await proxy(auth, new NextRequest(`https://the99.test${path}`, { headers: { accept: "text/html" } }));
    expect(protect).not.toHaveBeenCalled();
    expect(session).toHaveBeenCalledOnce();
    expect(res?.headers.get("location") ?? null).toBeNull();
  });

  it("still protects every other private route", async () => {
    await proxy(auth, new NextRequest("https://the99.test/decks", { headers: { accept: "text/html" } }));
    expect(protect).toHaveBeenCalledOnce();
  });

  it("does not open a route that merely starts with the word", async () => {
    await proxy(auth, new NextRequest("https://the99.test/administrator", { headers: { accept: "text/html" } }));
    expect(protect).toHaveBeenCalledOnce();
  });
});
