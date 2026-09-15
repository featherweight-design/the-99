// The proxy callback itself: the Location it builds and the Set-Cookie it
// attaches. `gate.ts` holds the rules and is tested pure; what only this can
// answer is whether the callback WIRES them — which branch becomes a redirect,
// whether the cookie rides on both, and whether a signed-in reader on the
// public "/" is judged at all.

import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const protect = vi.fn(async () => ({ userId: "user_1" }));
const session = vi.fn(async () => ({ userId: "user_1" as string | null }));
const aboutVersionSeen = vi.fn(async () => 0);

vi.mock("@clerk/nextjs/server", () => ({
  // The real one wraps the callback; here it IS the callback, so a test can
  // call it with an auth double.
  clerkMiddleware: (fn: unknown) => fn,
  createRouteMatcher: (routes: string[]) => (req: NextRequest) =>
    routes.some((r) => r === req.nextUrl.pathname || (r.includes("(") && false)),
}));
vi.mock("./lib/about/read", () => ({ aboutVersionSeen }));

const proxy = (await import("./proxy")).default as unknown as (
  auth: unknown,
  req: NextRequest,
) => Promise<NextResponse | undefined>;

const auth = Object.assign(session, { protect });

function request(path: string, headers: Record<string, string> = {}, cookie?: string) {
  const req = new NextRequest(`https://the99.test${path}`, {
    headers: { accept: "text/html", ...headers },
  });
  if (cookie) req.cookies.set("about_v", cookie);
  return req;
}

beforeEach(() => {
  protect.mockClear();
  session.mockClear();
  aboutVersionSeen.mockClear();
  aboutVersionSeen.mockResolvedValue(0);
  session.mockResolvedValue({ userId: "user_1" });
});

describe("a reader who is behind", () => {
  it("is redirected, carrying where they were going", async () => {
    const res = await proxy(auth, request("/decks?sort=name"));
    expect(res?.status).toBe(307);
    expect(res?.headers.get("location")).toBe(
      `https://the99.test/about?next=${encodeURIComponent("/decks?sort=name")}`,
    );
  });

  it("gets the cookie ON that redirect, or the redirect is a trap", async () => {
    // Without this a reader who reads the page and navigates away without
    // pressing anything is sent straight back to it.
    const res = await proxy(auth, request("/decks"));
    expect(res?.headers.get("set-cookie")).toContain("about_v=user_1.");
    expect(res?.headers.get("set-cookie")).toContain("HttpOnly");
  });

  // The finding this test exists for: "/" is public by PATH, and it is where a
  // signed-in reader lands after sign-in and where Home lives. Returning early
  // on the whole public matcher left the likeliest arrival in the app ungated.
  it("is redirected from Home too, which is public but not anonymous", async () => {
    const res = await proxy(auth, request("/"));
    expect(res?.status).toBe(307);
    expect(res?.headers.get("location")).toContain("/about");
    expect(protect).not.toHaveBeenCalled();
  });
});

describe("a reader who is current", () => {
  it("passes, and is given the cookie so the read does not repeat", async () => {
    aboutVersionSeen.mockResolvedValue(99);
    const res = await proxy(auth, request("/decks"));
    expect(res?.headers.get("location")).toBeNull();
    expect(res?.headers.get("set-cookie")).toContain("about_v=user_1.");
  });

  it("costs no read at all once the cookie is in place", async () => {
    const { cookieValue } = await import("./lib/about/gate");
    const res = await proxy(auth, request("/decks", {}, cookieValue("user_1")));
    expect(res).toBeUndefined();
    expect(aboutVersionSeen).not.toHaveBeenCalled();
  });
});

describe("requests the gate keeps its hands off", () => {
  it("leaves a signed-out reader to Clerk", async () => {
    session.mockResolvedValue({ userId: null });
    expect(await proxy(auth, request("/"))).toBeUndefined();
    expect(aboutVersionSeen).not.toHaveBeenCalled();
  });

  it("never redirects /about itself", async () => {
    expect(await proxy(auth, request("/about"))).toBeUndefined();
  });

  it("never redirects a prefetch", async () => {
    const res = await proxy(auth, request("/decks", { RSC: "1", "Next-Router-Prefetch": "1" }));
    expect(res).toBeUndefined();
  });

  it("redirects a client transition, which is how the reader actually moves", async () => {
    const res = await proxy(auth, request("/decks", { RSC: "1" }));
    expect(res?.status).toBe(307);
  });

  it("lets the reader through when the read fails", async () => {
    // The page is a reference; the app is the point.
    aboutVersionSeen.mockRejectedValue(new Error("no database"));
    expect(await proxy(auth, request("/decks"))).toBeUndefined();
  });
});
