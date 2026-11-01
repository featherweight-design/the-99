// The proxy callback itself: what it protects, what it forwards and the one cookie it writes (an invite's claim
// secret). The About gate that once redirected from here retired with About visual PR 6b; these pin that it never
// comes back: no redirect to /about, no About read, no About cookie.

import { NextRequest, NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ENV_VIEW, envViewWith } from "@/test/env-view";

const protect = vi.fn(async () => ({ userId: "user_1" }));
const session = vi.fn(async () => ({ userId: "user_1" as string | null }));
const aboutVersionSeen = vi.fn(async (_userId?: string) => 0);

vi.mock("@clerk/nextjs/server", async (importActual) => ({
  // The real one wraps the callback; here it IS the callback, so a test can
  // call it with an auth double. The route matcher is the real one, so a pattern is matched as Clerk will.
  clerkMiddleware: (fn: unknown) => fn,
  createRouteMatcher: (await importActual<typeof import("@clerk/nextjs/server")>()).createRouteMatcher,
}));
// No overrides: the reader's switches are the environment's, as they were before the resolver.
const resolveSwitchEnv = vi.hoisted(() => vi.fn(async (): Promise<NodeJS.ProcessEnv> => (await import("@/test/env-view")).ENV_VIEW));
const switchSnapshotState = vi.hoisted(() => vi.fn((): "hit" | "pending" | "miss" => "hit"));
vi.mock("./lib/switches/snapshot", () => ({ resolveSwitchEnv, switchSnapshotState }));
// The proxy reads no About state now; the mock is here so a test can say it was never asked.
vi.mock("./lib/about/read", () => ({
  aboutVersionSeen,
  aboutSeen: async (userId: string) => ({ version: await aboutVersionSeen(userId), ids: [] }),
}));

/** Let through untouched: no redirect and no cookie. A pass is a `next()` response rather than none at all. */
function expectPassed(res: NextResponse | undefined) {
  expect(res?.status).toBe(200);
  expect(res?.headers.get("location")).toBeNull();
  expect(res?.headers.get("set-cookie")).toBeNull();
  expect(res?.headers.get("x-middleware-request-x-about-sheet-on")).toBeNull();
}

const { config: proxyConfig } = await import("./proxy");
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

describe("About (the gate and the sheet retired, About visual PR 6b)", () => {
  afterEach(() => resolveSwitchEnv.mockImplementation(async () => ENV_VIEW));

  it.each([0, 8, 14, 16])("never redirects a reader at floor %i to /about, on a document load or a client transition", async (floor) => {
    aboutVersionSeen.mockResolvedValue(floor);
    for (const path of ["/", "/decks", "/collection?q=a%26b", "/about"]) {
      expectPassed(await proxy(auth, request(path)));
      expectPassed(await proxy(auth, request(path, { RSC: "1" })));
    }
  });

  it("never reads the reader's About state, and never writes About's cookies", async () => {
    const res = await proxy(auth, request("/decks", {}, "user_1.3"));
    expectPassed(res);
    expect(aboutVersionSeen).not.toHaveBeenCalled();
  });

  it("forwards the reader's resolved switches for the page to read, and never a client's", async () => {
    resolveSwitchEnv.mockImplementation(async () => envViewWith({ FEEDBACK_ENABLED: "true" }));
    const forged = "1".repeat(40);
    const res = await proxy(auth, request("/about", { "x-switches": forged }));
    const bits = res?.headers.get("x-middleware-request-x-switches");
    const { switchBits } = await import("./lib/switches/resolve");
    expect(bits).toBe(switchBits(envViewWith({ FEEDBACK_ENABLED: "true" })));
    session.mockResolvedValue({ userId: null });
    const out = await proxy(auth, request("/", { "x-switches": forged }));
    expect(out?.headers.get("x-middleware-request-x-switches")).toBeNull();
  });

  it("leaves a signed-out reader to Clerk", async () => {
    session.mockResolvedValue({ userId: null });
    expectPassed(await proxy(auth, request("/")));
    expect(protect).not.toHaveBeenCalled();
  });
});

describe("the newcomer's pages", () => {
  // A newcomer has no account: the invite page and the invite-only sign-up page answer to nobody signed in.
  it("makes /join/<token> and /sign-up public, and nothing that only starts with them", async () => {
    for (const path of ["/join/abc", "/sign-up", "/sign-up/", "/sign-up/tasks"]) {
      protect.mockClear();
      await proxy(auth, request(path));
      expect(protect).not.toHaveBeenCalled();
    }
    for (const path of ["/join", "/sign-upx", "/joined/abc"]) {
      protect.mockClear();
      await proxy(auth, request(path));
      expect(protect).toHaveBeenCalled();
    }
  });
});

describe("the legal pages", () => {
  // /privacy and /terms are read before an account exists (launch epic B1): public at their exact path, either slash form.
  it("makes /privacy and /terms public at their exact path, and nothing that only starts with them", async () => {
    for (const path of ["/privacy", "/privacy/", "/terms", "/terms/"]) {
      protect.mockClear();
      await proxy(auth, request(path));
      expect(protect).not.toHaveBeenCalled();
    }
    for (const path of ["/privacy-policy", "/terms-x", "/privacy/x", "/terms/x"]) {
      protect.mockClear();
      await proxy(auth, request(path));
      expect(protect).toHaveBeenCalled();
    }
  });
});

describe("Report a problem", () => {
  // /report is read by a reader the crash screen sends there, signed in or not: public at its exact path, either slash form.
  it("makes /report public at its exact path, and nothing that only starts with it", async () => {
    for (const path of ["/report", "/report/"]) {
      protect.mockClear();
      await proxy(auth, request(path));
      expect(protect).not.toHaveBeenCalled();
    }
    for (const path of ["/reports", "/report-a-problem", "/report/x"]) {
      protect.mockClear();
      await proxy(auth, request(path));
      expect(protect).toHaveBeenCalled();
    }
  });
});

describe("the Clerk webhook", () => {
  // Clerk calls it with no session, so it must not be session-protected; its route checks the signature.
  it("is public at its exact path, with or without the trailing slash", async () => {
    for (const path of ["/api/clerk-webhook", "/api/clerk-webhook/"]) {
      protect.mockClear();
      await proxy(auth, request(path));
      expect(protect).not.toHaveBeenCalled();
    }
  });

  it("does not make a longer path public", async () => {
    await proxy(auth, request("/api/clerk-webhook-other"));
    expect(protect).toHaveBeenCalled();
  });
});

describe("the Stripe webhook", () => {
  // Stripe calls it with no session, so it must not be session-protected; its route checks the signature.
  it("is public at its exact path, with or without the trailing slash", async () => {
    for (const path of ["/api/stripe-webhook", "/api/stripe-webhook/"]) {
      protect.mockClear();
      await proxy(auth, request(path));
      expect(protect).not.toHaveBeenCalled();
    }
  });

  it("does not make a longer path public", async () => {
    await proxy(auth, request("/api/stripe-webhook-other"));
    expect(protect).toHaveBeenCalled();
  });
});

describe("the CSP report endpoint", () => {
  // A browser sends a report with no session, so it must not be session-protected.
  it("is public at its exact path, with or without the trailing slash", async () => {
    for (const path of ["/api/csp-report", "/api/csp-report/"]) {
      protect.mockClear();
      await proxy(auth, request(path));
      expect(protect).not.toHaveBeenCalled();
    }
  });

  it("does not make a longer path public", async () => {
    await proxy(auth, request("/api/csp-report-other"));
    expect(protect).toHaveBeenCalled();
  });
});

describe("the proxy's [perf] line", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("logs auth, the switch resolve and the memo state for a signed-in request with PERF_TIMING=1", async () => {
    vi.stubEnv("PERF_TIMING", "1");
    switchSnapshotState.mockReturnValueOnce("pending");
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await proxy(auth, request("/decks"));
    const lines = log.mock.calls.map((c) => String(c[0])).filter((l) => l.startsWith("[perf] proxy"));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/^\[perf\] proxy auth=\d+ switches=\d+ memo=pending$/);
  });

  it("reads no clock and logs nothing without PERF_TIMING", async () => {
    vi.stubEnv("PERF_TIMING", "");
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const now = vi.spyOn(performance, "now");
    switchSnapshotState.mockClear();
    await proxy(auth, request("/decks"));
    expect(log.mock.calls.filter((c) => String(c[0]).startsWith("[perf]"))).toHaveLength(0);
    expect(now).not.toHaveBeenCalled();
    expect(switchSnapshotState).not.toHaveBeenCalled();
  });
});

describe("a friend link (Social R1 E8)", () => {
  it("opens without a session, and /friends does not", async () => {
    session.mockResolvedValue({ userId: null });
    await proxy(auth, request("/friend/AbCdEfGhIjKlMnOpQrStUv"));
    expect(protect).not.toHaveBeenCalled();
    await proxy(auth, request("/friends"));
    expect(protect).toHaveBeenCalledTimes(1);
  });
});

describe("the public card and commander pages (launch epic F3)", () => {
  it("open without a session, and the signed-in commander list does not", async () => {
    session.mockResolvedValue({ userId: null });
    await proxy(auth, request("/card/sol-ring-0b3f2c9e6a41"));
    await proxy(auth, request("/commander/atraxa-praetors-voice-0b3f2c9e6a41"));
    expect(protect).not.toHaveBeenCalled();
    await proxy(auth, request("/commanders"));
    expect(protect).toHaveBeenCalledTimes(1);
  });

  it("never send a member to About from a public page, nor hand them its cookie", async () => {
    aboutVersionSeen.mockResolvedValue(0);
    const res = await proxy(auth, request("/card/sol-ring-0b3f2c9e6a41"));
    expectPassed(res);
    expect(aboutVersionSeen).not.toHaveBeenCalled();
  });
});

describe("/sign-in, the public pages' way in", () => {
  const redirectToSignIn = vi.fn((opts: { returnBackUrl: string }) => NextResponse.redirect(`https://accounts.test/sign-in?redirect_url=${encodeURIComponent(opts.returnBackUrl)}`));
  const withRedirect = Object.assign(vi.fn(async () => ({ userId: null as string | null, redirectToSignIn })), { protect });

  it("sends a stranger to Clerk's hosted sign-in, landing on Home after", async () => {
    const res = await proxy(withRedirect, request("/sign-in"));
    expect(redirectToSignIn).toHaveBeenCalledWith({ returnBackUrl: "https://the99.test/" });
    expect(res?.headers.get("location")).toContain("accounts.test/sign-in");
    expect(protect).not.toHaveBeenCalled();
  });

  it("sends a reader already signed in to Home", async () => {
    withRedirect.mockResolvedValueOnce({ userId: "user_1", redirectToSignIn });
    const res = await proxy(withRedirect, request("/sign-in"));
    expect(res?.headers.get("location")).toBe("https://the99.test/");
  });
});

describe("the invite claim cookie (signed out, /join/<token>)", () => {
  const TOKEN = "A".repeat(43);
  const join = (path: string, method = "GET", cookie?: string) => {
    const req = new NextRequest(`https://the99.test${path}`, { method, headers: { accept: "text/html" } });
    if (cookie) req.cookies.set("invite_claim", cookie);
    return req;
  };
  beforeEach(() => session.mockResolvedValue({ userId: null }));

  it("hands a browser with none a fresh httpOnly secret scoped to the token's page", async () => {
    const res = await proxy(auth, join(`/join/${TOKEN}`));
    const set = res?.headers.get("set-cookie") ?? "";
    expect(set).toMatch(/invite_claim=[A-Za-z0-9_-]{43};/);
    expect(set).toContain(`Path=/join/${TOKEN}`);
    expect(set).toContain("Max-Age=604800");
    expect(set).toContain("HttpOnly");
    expect(set.toLowerCase()).toContain("samesite=lax");
  });
  it("sets a different secret per request", async () => {
    const a = (await proxy(auth, join(`/join/${TOKEN}`)))?.headers.get("set-cookie");
    const b = (await proxy(auth, join(`/join/${TOKEN}`)))?.headers.get("set-cookie");
    expect(a).not.toEqual(b);
  });
  it("leaves a browser that has one, a POST, a malformed token and other paths alone", async () => {
    expectPassed(await proxy(auth, join(`/join/${TOKEN}`, "GET", "x".repeat(43))));
    expectPassed(await proxy(auth, join(`/join/${TOKEN}`, "POST")));
    expectPassed(await proxy(auth, join("/join/short")));
    const prefetch = new NextRequest(`https://the99.test/join/${TOKEN}`, { headers: { accept: "text/html", "next-router-prefetch": "1" } });
    expectPassed(await proxy(auth, prefetch));
    expectPassed(await proxy(auth, join("/")));
  });
});

describe("the proxy's matcher", () => {
  it("runs on a public address whose name part carries a dot, as Next itself matches it", async () => {
    const { unstable_doesMiddlewareMatch } = await import("next/experimental/testing/server");
    for (const url of ["/card/sol.ring-6ad8011d3471", "/commander/ob.nixilis-0b3f2c9e6a41", "/card/sol-ring-6ad8011d3471"]) {
      expect(unstable_doesMiddlewareMatch({ config: proxyConfig, url }), url).toBe(true);
    }
    // A static file elsewhere is still left alone.
    expect(unstable_doesMiddlewareMatch({ config: proxyConfig, url: "/mana/sprite.svg" })).toBe(false);
  });
  it("runs on a dotted path under every signed-in tree whose pages read the session (THE-99-1), and not on a file", async () => {
    const { unstable_doesMiddlewareMatch } = await import("next/experimental/testing/server");
    for (const url of ["/decks/x.png", "/collection/sets/a.b", "/commanders/foo.php", "/friends/x.y", "/friend/a.b", "/join/a.b", "/admin/accounts/x.y", "/about/foo.php", "/out/wizards/x.y"]) {
      expect(unstable_doesMiddlewareMatch({ config: proxyConfig, url }), url).toBe(true);
    }
    // About's images are files deeper under its path; the proxy never runs on one.
    for (const url of ["/about/shots/amonkhet/sets.webp", "/about/pages/a.png", "/icon.svg"]) {
      expect(unstable_doesMiddlewareMatch({ config: proxyConfig, url }), url).toBe(false);
    }
  });
});
