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
const { seenKeysOf, visibleSections } = await import("../../lib/about/pages-visible");

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
    const written = await recordAboutPageVisit("decks");
    const keys = seenKeysOf(visibleSections(envViewWith({})), "decks");
    expect(markAboutVisited).toHaveBeenCalledWith("user_1", 9, expect.any(Array));
    const ids = (markAboutVisited.mock.calls[0] as unknown as [string, number, string[]])[2];
    expect(new Set(ids)).toEqual(new Set(["kept", ...keys]));
    expect(ids.some((k) => k.startsWith("friends/") || k.startsWith("home/"))).toBe(false);
    expect(written).toEqual(ids);
    expect(redirect).not.toHaveBeenCalled();
  });

  it("decides the keys from the reader's own resolved switches", async () => {
    resolved.env = { NEVER_CUT_ENABLED: "true" };
    await recordAboutPageVisit("decks");
    expect(requestSwitchEnv).toHaveBeenCalledWith("user_1");
    expect((markAboutVisited.mock.calls[0] as unknown as [string, number, string[]])[2]).toContain("decks/your-deck/lock");
    markAboutVisited.mockClear();
    resolved.env = {};
    await recordAboutPageVisit("decks");
    expect((markAboutVisited.mock.calls[0] as unknown as [string, number, string[]])[2]).not.toContain("decks/your-deck/lock");
  });

  it("takes a first-run reader's first visit as their whole baseline: the floor and every page's keys", async () => {
    stored.seen = { version: 0, ids: [] };
    await recordAboutPageVisit("home");
    const [, version, ids] = markAboutVisited.mock.calls[0] as unknown as [string, number, string[]];
    expect(version).toBe(ABOUT_VERSION);
    expect(ids).toEqual(expect.arrayContaining(seenKeysOf(visibleSections(envViewWith({})), "friends")));
  });

  it("writes nothing for a page that is not one of the six", async () => {
    for (const bad of ["nowhere", "__proto__", 3, null]) expect(await recordAboutPageVisit(bad)).toEqual([]);
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
