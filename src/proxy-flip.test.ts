// A feature switch flipping on, walked through the REAL proxy, Home's line rule (`aboutLine`), a page visit's write
// (`afterVisit`) and the real About pages, whose labels and rules follow their features' switches. Everything between
// the copy model and the response is the code that ships.
//
// What it proves that the pure tests cannot: since the gate and the sheet retired (About visual PR 6b) the proxy says
// nothing about About on any load, and Home's banner tells a current reader each flipped unit once: after the visit
// that answers it, a second flip tells only the new one. The same walk in a browser is `probe:about-banner`.

import type { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ABOUT_VERSION } from "./lib/copy/about";
import { aboutLine } from "./lib/about/notice";
import { afterVisit, visibleSections } from "./lib/about/pages-visible";
import { switchedIds, visibleEntries } from "./lib/about/visible";
import { DEFAULT_THEME } from "./lib/theme/themes";

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

const load = () => proxy(auth, new NextRequest("https://the99.test/", { headers: { accept: "text/html" } }));
const quiet = (res: NextResponse | undefined) => {
  expect(res?.headers.get("location")).toBeNull();
  expect(res?.headers.get("set-cookie")).toBeNull();
};

beforeEach(() => {
  // Current: the floor, and every switched entry the reader was drawn with every switch off.
  stored.version = ABOUT_VERSION;
  stored.ids = switchedIds(visibleEntries(process.env));
});
afterEach(() => {
  delete process.env.NEVER_CUT_ENABLED;
  delete process.env.ANALYSIS_TAB_ENABLED;
});

describe("a switch flipped on", () => {
  const line = () => aboutLine({ version: stored.version, ids: [...stored.ids] }, visibleSections(process.env), DEFAULT_THEME);
  const visit = (area: "decks") => {
    const after = afterVisit(visibleSections(process.env), area, { version: stored.version, ids: [...stored.ids] });
    stored.version = Math.max(stored.version, after.version);
    stored.ids = [...new Set([...stored.ids, ...after.ids])];
  };

  it("is told once on Home, and a later flip tells only the new unit; the proxy says nothing throughout", async () => {
    expect(line()).toBeNull();
    quiet(await load());

    // Lock cards switched on: Home names its units, and the proxy still redirects nowhere.
    process.env.NEVER_CUT_ENABLED = "true";
    const first = line();
    expect(first?.kind).toBe("launches");
    expect(first?.ids).toContain("decks/your-deck/lock");
    quiet(await load());

    // The reader opens Decks (Show me lands there), which records that page's keys.
    visit("decks");
    expect(line()).toBeNull();

    // The Analysis tab switched on LATER. The floor would call this reader current; the unit is still new.
    process.env.ANALYSIS_TAB_ENABLED = "true";
    const second = line();
    expect(second?.ids.length).toBeGreaterThan(0);
    expect(second?.ids.some((k) => k.startsWith("decks/your-deck/lock"))).toBe(false);
    quiet(await load());
  });
});
