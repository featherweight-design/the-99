import { describe, expect, it, vi, beforeEach } from "vitest";
import { envViewWith } from "@/test/env-view";

const requireUserId = vi.fn(async () => "user_1");
const markAboutSeen = vi.fn(async () => {});
const markAboutVisited = vi.fn(async () => {});
const redirect = vi.fn((to: string) => {
  throw new Error(`REDIRECT:${to}`);
});

vi.mock("../../lib/auth", () => ({ requireUserId }));
// The reader's seen state as it stands, for a page visit to decide its write from.
const stored = vi.hoisted(() => ({ seen: { version: 16, ids: [] as string[] } }));
vi.mock("../../lib/about/read", () => ({ markAboutSeen, markAboutVisited, aboutSeen: async () => stored.seen }));
vi.mock("next/navigation", () => ({ redirect }));
// The reader's switches as the proxy resolved them for this request.
const resolved = vi.hoisted(() => ({ env: {} as Record<string, string> }));
const requestSwitchEnv = vi.fn(async () => envViewWith(resolved.env));
vi.mock("../../lib/switches/request", () => ({ requestSwitchEnv }));
// What this deployment draws. The real rule, handed a catalog with a switched entry in it when a
// test sets one: no shipped entry has a switch yet, and the write must still name them.
const extraEntries: { id: string; switch?: string }[] = [];
vi.mock("../../lib/about/visible", async (importOriginal) => {
  const real = await importOriginal<typeof import("../../lib/about/visible")>();
  return {
    ...real,
    visibleEntries: (env: NodeJS.ProcessEnv) => [...real.visibleEntries(env), ...extraEntries] as ReturnType<typeof real.visibleEntries>,
  };
});

const { recordAboutPageVisit, recordAboutVisit } = await import("./actions");
const { ABOUT_VERSION } = await import("../../lib/copy/about");
const { afterVisit, everyAnnouncement, seenKeysOf, unseenUnits, visibleSections } = await import("../../lib/about/pages-visible");
/** What the page rendered for the visit to write, under the switches it rendered with (`afterVisit`, less what was held). */
const rendered = (area: "decks" | "home" | "friends" | "shopping", env: Record<string, string>) => {
  const after = afterVisit(visibleSections(envViewWith(env)), area, stored.seen);
  return after.ids.filter((id) => !stored.seen.ids.includes(id));
};

beforeEach(() => {
  requireUserId.mockClear();
  markAboutSeen.mockClear();
  markAboutVisited.mockClear();
  redirect.mockClear();
});

describe("recordAboutPageVisit (About visual PR 6b)", () => {
  beforeEach(() => {
    stored.seen = { version: 9, ids: ["kept"] };
    resolved.env = {};
  });

  it("writes that page's keys alone, keeping the reader's floor, and returns them", async () => {
    const written = await recordAboutPageVisit("decks", rendered("decks", {}));
    const keys = seenKeysOf(visibleSections(envViewWith({})), "decks");
    expect(markAboutVisited).toHaveBeenCalledWith("user_1", 9, expect.any(Array));
    const ids = (markAboutVisited.mock.calls[0] as unknown as [string, number, string[]])[2];
    // The new keys alone: `markAboutVisited` merges them into what the reader holds.
    expect(new Set(ids)).toEqual(new Set(keys));
    expect(ids.some((k) => k.startsWith("friends/") || k.startsWith("home/"))).toBe(false);
    expect(new Set(written)).toEqual(new Set(["kept", ...keys]));
    expect(redirect).not.toHaveBeenCalled();
  });

  it("decides the keys from the reader's own resolved switches", async () => {
    resolved.env = { NEVER_CUT_ENABLED: "true" };
    await recordAboutPageVisit("decks", rendered("decks", resolved.env));
    expect(requestSwitchEnv).toHaveBeenCalledWith("user_1");
    expect((markAboutVisited.mock.calls[0] as unknown as [string, number, string[]])[2]).toContain("decks/your-deck/lock");
    markAboutVisited.mockClear();
    // Rendered with it on, switched off for the reader before the visit: the key is not written.
    const withLock = rendered("decks", { NEVER_CUT_ENABLED: "true" });
    resolved.env = {};
    await recordAboutPageVisit("decks", withLock);
    expect((markAboutVisited.mock.calls[0] as unknown as [string, number, string[]])[2]).not.toContain("decks/your-deck/lock");
  });

  it("takes a first-run reader's first visit as their whole baseline: the floor and every page's keys", async () => {
    stored.seen = { version: 0, ids: [] };
    await recordAboutPageVisit("home", rendered("home", {}));
    const [, version, ids] = markAboutVisited.mock.calls[0] as unknown as [string, number, string[]];
    expect(version).toBe(ABOUT_VERSION);
    expect(ids).toEqual(expect.arrayContaining(seenKeysOf(visibleSections(envViewWith({})), "friends")));
  });

  // Review round 1: a switch turned on between the render (or a prefetch) and the visit names keys the reader never saw.
  it("writes only what the page rendered: a unit switched on after the render stays new (returning reader)", async () => {
    const claim = rendered("decks", {});
    resolved.env = { NEVER_CUT_ENABLED: "true" };
    await recordAboutPageVisit("decks", claim);
    const [, version, ids] = markAboutVisited.mock.calls[0] as unknown as [string, number, string[]];
    expect(version).toBe(9);
    expect(ids).not.toContain("decks/your-deck/lock");
    expect(unseenUnits(visibleSections(envViewWith(resolved.env)), { version, ids }).map((u) => u.key)).toContain("decks/your-deck/lock");
  });

  it("writes only what the page rendered: a first-run baseline does not take a unit switched on after the render", async () => {
    stored.seen = { version: 0, ids: [] };
    const claim = rendered("home", {});
    resolved.env = { NEVER_CUT_ENABLED: "true" };
    await recordAboutPageVisit("home", claim);
    const [, version, ids] = markAboutVisited.mock.calls[0] as unknown as [string, number, string[]];
    expect(ids).not.toContain("decks/your-deck/lock");
    expect(new Set(ids)).toEqual(new Set(everyAnnouncement(visibleSections(envViewWith({}))).flatMap((u) => u.ack)));
    expect(unseenUnits(visibleSections(envViewWith(resolved.env)), { version, ids }).map((u) => u.key)).toContain("decks/your-deck/lock");
  });

  it("writes nothing a client adds: a key of another page, an unknown key, or a claim that is not a list", async () => {
    await recordAboutPageVisit("decks", ["friends/friends/add", "made/up"]);
    await recordAboutPageVisit("decks", "decks/games/matchups");
    expect(markAboutVisited).not.toHaveBeenCalled();
  });

  it("writes nothing for a page that is not one of the six", async () => {
    for (const bad of ["nowhere", "__proto__", 3, null]) expect(await recordAboutPageVisit(bad, rendered("decks", {}))).toEqual([]);
    expect(markAboutVisited).not.toHaveBeenCalled();
  });
});

describe("recordAboutVisit (R6)", () => {
  it("records the current version and the switched entries the page showed", async () => {
    await recordAboutVisit([]);
    expect(requireUserId).toHaveBeenCalledOnce();
    // No shipped entry has a switch yet, so the ids are empty; the entry-level rule is
    // `visible.test.ts`'s, and the stored union is `read.test.ts`'s.
    expect(markAboutVisited).toHaveBeenCalledWith("user_1", ABOUT_VERSION, []);
  });

  it("records every switched entry the page showed that the reader's switches draw, and only those", async () => {
    extraEntries.push({ id: "locked-cards", switch: "NEVER_CUT_ENABLED" });
    try {
      await recordAboutVisit(["locked-cards", "made-up"]);
      expect(markAboutVisited).toHaveBeenCalledWith("user_1", ABOUT_VERSION, ["locked-cards"]);
    } finally {
      extraEntries.length = 0;
    }
  });

  // The appendix is seen by its id too, while its switch is on (plan 2026-09-28, PR C).
  it("records the appendix's id while HOW_IT_WORKS_ENABLED is on, and not while it is off", async () => {
    process.env.HOW_IT_WORKS_ENABLED = "true";
    try {
      await recordAboutVisit(["how-it-works"]);
      expect(markAboutVisited).toHaveBeenCalledWith("user_1", ABOUT_VERSION, ["how-it-works"]);
    } finally {
      delete process.env.HOW_IT_WORKS_ENABLED;
    }
    markAboutVisited.mockClear();
    await recordAboutVisit(["how-it-works"]);
    expect(markAboutVisited).toHaveBeenCalledWith("user_1", ABOUT_VERSION, []);
  });

  it("never redirects, so the index stays where the reader is reading it", async () => {
    await recordAboutVisit([]);
    expect(redirect).not.toHaveBeenCalled();
  });
});
