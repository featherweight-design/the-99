// A feature switch flipping on, walked through the REAL proxy and the real catalog, whose
// Locked cards and Change commander entries follow their features' switches (Hugh,
// 2026-09-25). Everything between the catalog and the response — `visibleEntries`, the
// cookie, the decision, the header — is the code that ships.
//
// What it proves that the pure tests cannot: a browser holding the cookie from BEFORE a flip
// is decided again after it, and the reader who met the first entry is shown only the second.
// The same walk in a browser, against a server restarted with the switch on, is
// `probe:about`'s flip walk.

import { NextRequest, NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ABOUT_VERSION } from "./lib/copy/about";

const session = vi.fn(async () => ({ userId: "user_1" as string | null }));
const stored = { version: ABOUT_VERSION, ids: [] as string[] };

vi.mock("@clerk/nextjs/server", () => ({
  clerkMiddleware: (fn: unknown) => fn,
  createRouteMatcher: () => () => false,
}));
vi.mock("./lib/about/read", () => ({
  aboutVersionSeen: async () => stored.version,
  aboutSeen: async () => ({ version: stored.version, ids: [...stored.ids] }),
}));

const proxy = (await import("./proxy")).default as unknown as (
  auth: unknown,
  req: NextRequest,
) => Promise<NextResponse | undefined>;
const auth = Object.assign(session, { protect: vi.fn(async () => ({ userId: "user_1" })) });

const load = (cookie?: string) => {
  const req = new NextRequest("https://the99.test/decks", { headers: { accept: "text/html" } });
  if (cookie) req.cookies.set("about_sheet", cookie);
  return proxy(auth, req);
};
const header = (res: NextResponse | undefined) => res?.headers.get("x-middleware-request-x-about-sheet") ?? null;
const cookieOf = (res: NextResponse | undefined) => res?.cookies.get("about_sheet")?.value;

beforeEach(() => {
  process.env.ABOUT_SHEET_ENABLED = "true";
  stored.version = ABOUT_VERSION;
  stored.ids = [];
});
afterEach(() => {
  delete process.env.ABOUT_SHEET_ENABLED;
  delete process.env.NEVER_CUT_ENABLED;
  delete process.env.CHANGE_COMMANDER_ENABLED;
});

describe("a switch flipped on", () => {
  it("is announced once, and a later flip announces only the new entry", async () => {
    // Nothing switched on: a current reader sees nothing, and the browser is marked.
    const quiet = await load();
    expect(header(quiet)).toBeNull();
    expect(cookieOf(quiet)).toBe(`user_1.${ABOUT_VERSION}`);

    // Change commander switched on: the old cookie no longer matches, so the proxy decides
    // again, and names the one entry the reader has not met.
    process.env.CHANGE_COMMANDER_ENABLED = "true";
    const first = await load(cookieOf(quiet));
    expect(header(first)).toBe("change-commander");
    expect(cookieOf(first)).toBe(`user_1.${ABOUT_VERSION}+change-commander`);

    // The reader opens /about, which records the switched ids the page drew.
    stored.ids = ["change-commander"];
    expect(header(await load(cookieOf(first)))).toBeNull();

    // Locked switched on LATER. A version number would call this reader current.
    process.env.NEVER_CUT_ENABLED = "true";
    const second = await load(cookieOf(first));
    expect(header(second)).toBe("locked-cards");
    expect(cookieOf(second)).toBe(`user_1.${ABOUT_VERSION}+locked-cards+change-commander`);
  });

  it("costs no read once this browser has shown the sheet for these entries", async () => {
    process.env.NEVER_CUT_ENABLED = "true";
    const shown = await load();
    stored.version = 0; // were the read made, a first-run sheet would draw
    expect(header(await load(cookieOf(shown)))).toBeNull();
  });
});
