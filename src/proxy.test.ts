// The proxy callback itself: the Location it builds and the Set-Cookie it
// attaches. `gate.ts` holds the rules and is tested pure; what only this can
// answer is whether the callback WIRES them — which branch becomes a redirect,
// whether the cookie rides on both, and whether a signed-in reader on the
// public "/" is judged at all.

import { NextRequest, NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const protect = vi.fn(async () => ({ userId: "user_1" }));
const session = vi.fn(async () => ({ userId: "user_1" as string | null }));
const aboutVersionSeen = vi.fn(async (_userId?: string) => 0);

vi.mock("@clerk/nextjs/server", () => ({
  // The real one wraps the callback; here it IS the callback, so a test can
  // call it with an auth double.
  clerkMiddleware: (fn: unknown) => fn,
  createRouteMatcher: (routes: string[]) => (req: NextRequest) =>
    routes.some((r) => r === req.nextUrl.pathname || (r.includes("(") && false)),
}));
// The sheet reads the whole seen state; its version half is the same mock, so every test that
// sets a version sets both. No switched entry exists yet, so the ids are always empty here.
vi.mock("./lib/about/read", () => ({
  aboutVersionSeen,
  aboutSeen: async (userId: string) => ({ version: await aboutVersionSeen(userId), ids: [] }),
}));

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

describe("a bump with nothing new to draw (legacy gate)", () => {
  // Every switch is off here, and version 12 added only switched entries.
  it("does not redirect a reader one version behind, and remembers it", async () => {
    aboutVersionSeen.mockResolvedValue(11);
    const res = await proxy(auth, request("/decks"));
    expect(res?.status).not.toBe(307);
    expect(res?.headers.get("location")).toBeNull();
    expect(res?.headers.get("set-cookie")).toContain("about_v=user_1.12;");
  });

  it("skips the database read on the next navigation", async () => {
    aboutVersionSeen.mockResolvedValue(11);
    await proxy(auth, request("/decks", {}, "user_1.12"));
    expect(aboutVersionSeen).not.toHaveBeenCalled();
  });

  it("sends a reader once a switch draws an entry they have not met, though their version is current", async () => {
    // Seen version 12 with no ids; the switch turns an entry on afterwards.
    aboutVersionSeen.mockResolvedValue(12);
    vi.stubEnv("COLLECTION_EDIT_ENABLED", "true");
    try {
      const res = await proxy(auth, request("/decks", {}, "user_1.12"));
      expect(res?.status).toBe(307);
      expect(res?.headers.get("set-cookie")).toContain("about_v=user_1.12%2Bcollection-add");
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("still redirects a brand-new account", async () => {
    aboutVersionSeen.mockResolvedValue(0);
    expect((await proxy(auth, request("/decks")))?.status).toBe(307);
  });
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

// The sheet (About R6). With the switch on the proxy never redirects: it decides
// on a DOCUMENT load whether the root layout draws the sheet, and says so on a
// request header the layout reads back.
describe("with the sheet switch on", () => {
  const sheetHeader = (res: NextResponse | undefined) =>
    res?.headers.get("x-middleware-request-x-about-sheet") ?? null;
  // The forwarded request's header list. A missing list means the request went
  // through UNTOUCHED, carrying whatever the client sent, which is the failure
  // these cases exist for, so it fails rather than reading as an empty list.
  const overridden = (res: NextResponse | undefined) => {
    const list = res?.headers.get("x-middleware-override-headers");
    expect(list, "request forwarded with its own headers").toBeTruthy();
    return (list ?? "").split(",");
  };

  beforeEach(() => {
    process.env.ABOUT_SHEET_ENABLED = "true";
  });
  afterEach(() => {
    delete process.env.ABOUT_SHEET_ENABLED;
  });

  // What the header names for a reader at `seen`: the entries newer than it, in page order.
  const unseenAfter = async (seen: number) => {
    const { aboutEntries } = await import("./lib/copy/about");
    // Every feature switch is off here, so an entry tied to one is neither drawn nor named.
    return aboutEntries.filter((e) => !e.switch && e.since > seen).map((e) => e.id).join(",");
  };

  it("never redirects a reader who is behind, and names what they have not seen", async () => {
    aboutVersionSeen.mockResolvedValue(8);
    const res = await proxy(auth, request("/decks"));
    expect(res?.status).not.toBe(307);
    expect(res?.headers.get("location")).toBeNull();
    expect(sheetHeader(res)).toBe(await unseenAfter(8));
    expect(res?.cookies.get("about_sheet")?.value).toMatch(/^user_1\./);
  });

  it("hands the layout the first-run mark for a brand-new account", async () => {
    aboutVersionSeen.mockResolvedValue(0);
    expect(sheetHeader(await proxy(auth, request("/")))).toBe("0");
  });

  it("draws nothing for a current reader, but marks the browser", async () => {
    aboutVersionSeen.mockResolvedValue(99);
    const res = await proxy(auth, request("/decks"));
    expect(sheetHeader(res)).toBeNull();
    expect(res?.cookies.get("about_sheet")?.value).toMatch(/^user_1\./);
  });

  it("leaves a client transition alone, so an undrawn sheet is never marked shown", async () => {
    aboutVersionSeen.mockResolvedValue(8);
    const res = await proxy(auth, request("/decks", { RSC: "1", accept: "*/*" }));
    expect(res?.cookies.get("about_sheet")).toBeUndefined();
    expect(sheetHeader(res)).toBeNull();
    expect(aboutVersionSeen).not.toHaveBeenCalled();
  });

  it("ignores the gate's about_v cookie, which means sent and not shown (E1)", async () => {
    const { cookieValue } = await import("./lib/about/gate");
    aboutVersionSeen.mockResolvedValue(8);
    const res = await proxy(auth, request("/decks", {}, cookieValue("user_1")));
    expect(sheetHeader(res)).toBe(await unseenAfter(8));
  });

  it("costs no read once this browser has shown the sheet", async () => {
    const { cookieValue } = await import("./lib/about/gate");
    const req = request("/decks");
    req.cookies.set("about_sheet", cookieValue("user_1"));
    const res = await proxy(auth, req);
    expect(aboutVersionSeen).not.toHaveBeenCalled();
    expect(sheetHeader(res)).toBeNull();
  });

  it("strips a forged header even when it draws nothing", async () => {
    aboutVersionSeen.mockResolvedValue(99);
    const res = await proxy(auth, request("/decks", { "x-about-sheet": "0" }));
    expect(sheetHeader(res)).toBeNull();
    expect(overridden(res)).not.toContain("x-about-sheet");
  });

  it("strips a forged header on a request it otherwise ignores", async () => {
    const res = await proxy(auth, request("/decks", { RSC: "1", "x-about-sheet": "0" }));
    expect(sheetHeader(res)).toBeNull();
    expect(overridden(res)).not.toContain("x-about-sheet");
  });

  it("never draws it over /about", async () => {
    aboutVersionSeen.mockResolvedValue(8);
    const res = await proxy(auth, request("/about"));
    expect(sheetHeader(res)).toBeNull();
    expect(aboutVersionSeen).not.toHaveBeenCalled();
  });

  it("lets the reader through with no sheet when the read fails", async () => {
    aboutVersionSeen.mockRejectedValue(new Error("no database"));
    const res = await proxy(auth, request("/decks"));
    expect(res?.headers.get("location") ?? null).toBeNull();
    expect(sheetHeader(res)).toBeNull();
    expect(res?.cookies.get("about_sheet")).toBeUndefined();
  });

  it("strips a forged header from a signed-out request too, and reads nothing", async () => {
    session.mockResolvedValue({ userId: null });
    const res = await proxy(auth, request("/", { "x-about-sheet": "0" }));
    expect(sheetHeader(res)).toBeNull();
    expect(overridden(res)).not.toContain("x-about-sheet");
    expect(res?.cookies.get("about_sheet")).toBeUndefined();
    expect(aboutVersionSeen).not.toHaveBeenCalled();
  });
});
