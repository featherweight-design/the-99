// A feature switch flipping on, walked through the REAL proxy, Home's notice rule and the real catalog, whose
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
import { sheetCookieIsCurrent, sheetCookieValue } from "./lib/about/gate";
import { aboutLine, aboutNotice } from "./lib/about/notice";
import { visibleEntries } from "./lib/about/visible";

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
  const req = new NextRequest("https://the99.test/", { headers: { accept: "text/html" } });
  if (cookie) req.cookies.set("about_sheet", cookie);
  return proxy(auth, req);
};
const header = (res: NextResponse | undefined) => res?.headers.get("x-middleware-request-x-about-sheet") ?? null;

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

// Since About moved to Home's banner (plan 2026-10-15, PR A) the proxy announces nothing: Home's line does, from the
// reader's seen state and this browser's sheet cookie. The walk is the same one the sheet made, through the real
// catalog: the cookie written before a flip stops suppressing, and only the newly switched entry is told.
describe("a switch flipped on", () => {
  const line = (cookie: string | undefined) => {
    const visible = visibleEntries(process.env);
    const current = sheetCookieIsCurrent(cookie, "user_1", visible);
    return aboutLine(aboutNotice({ version: stored.version, ids: [...stored.ids] }, visible, current), visible);
  };

  it("is told once on Home, and a later flip tells only the new entry; the proxy writes nothing throughout", async () => {
    // A browser that showed the sheet before PR A holds a cookie for what it showed then.
    const before = sheetCookieValue("user_1", visibleEntries(process.env));
    expect(line(before)).toBeNull();
    const quiet = await load(before);
    expect(header(quiet)).toBeNull();
    expect(quiet?.cookies.get("about_sheet")).toBeUndefined();

    // Change commander switched on: the old cookie no longer matches, so Home names the one entry not met.
    process.env.CHANGE_COMMANDER_ENABLED = "true";
    expect(line(before)).toMatchObject({ kind: "behind", ids: ["change-commander"] });
    const first = await load(before);
    expect(header(first)).toBeNull();
    expect(first?.cookies.get("about_sheet")).toBeUndefined();

    // The reader opens /about (or presses ✕), which records the switched ids the line drew.
    stored.ids = ["change-commander"];
    expect(line(before)).toBeNull();

    // Locked switched on LATER. A version number would call this reader current.
    process.env.NEVER_CUT_ENABLED = "true";
    expect(line(before)).toMatchObject({ kind: "behind", ids: ["locked-cards"] });
    expect(header(await load(before))).toBeNull();
  });

  it("is suppressed in a browser whose cookie already covers the flipped entries", () => {
    process.env.NEVER_CUT_ENABLED = "true";
    const shown = sheetCookieValue("user_1", visibleEntries(process.env));
    stored.version = 0; // a first-run reader, whom that browser already introduced
    expect(line(shown)).toBeNull();
    expect(line(undefined)).toEqual({ kind: "firstRun", ids: visibleEntries(process.env).map((e) => e.id) });
  });
});
