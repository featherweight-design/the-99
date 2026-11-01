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

const { recordAboutPageVisit, recordAboutVisit } = await import("./actions");
const { ABOUT_VERSION } = await import("../../lib/copy/about");
const { afterVisit, answeredKeys, everyAnnouncement, seenKeysOf, unseenUnits, visibleSections } = await import("../../lib/about/pages-visible");
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
    const after = { version: 9, ids: ["kept", ...keys] };
    expect(new Set(written)).toEqual(new Set([...after.ids, ...answeredKeys(visibleSections(envViewWith({})), after)]));
    expect(redirect).not.toHaveBeenCalled();
  });

  it("decides the keys from the reader's own resolved switches", async () => {
    // Shopping's stand-ins label follows SWAP_TOOLS_ENABLED; the page's other units draw for every reader, so a visit
    // with the switch off still writes.
    resolved.env = { SWAP_TOOLS_ENABLED: "true" };
    await recordAboutPageVisit("shopping", rendered("shopping", resolved.env));
    expect(requestSwitchEnv).toHaveBeenCalledWith("user_1");
    expect((markAboutVisited.mock.calls[0] as unknown as [string, number, string[]])[2]).toContain("shopping/deck-shopping/standins");
    markAboutVisited.mockClear();
    // Rendered with it on, switched off for the reader before the visit: the key is not written.
    const withStandIns = rendered("shopping", { SWAP_TOOLS_ENABLED: "true" });
    resolved.env = {};
    await recordAboutPageVisit("shopping", withStandIns);
    expect((markAboutVisited.mock.calls[0] as unknown as [string, number, string[]])[2]).not.toContain("shopping/deck-shopping/standins");
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
    const claim = rendered("shopping", {});
    resolved.env = { SWAP_TOOLS_ENABLED: "true" };
    await recordAboutPageVisit("shopping", claim);
    const [, version, ids] = markAboutVisited.mock.calls[0] as unknown as [string, number, string[]];
    expect(version).toBe(9);
    expect(ids).not.toContain("shopping/deck-shopping/standins");
    expect(unseenUnits(visibleSections(envViewWith(resolved.env)), { version, ids }).map((u) => u.key)).toContain("shopping/deck-shopping/standins");
  });

  it("writes only what the page rendered: a first-run baseline does not take a unit switched on after the render", async () => {
    stored.seen = { version: 0, ids: [] };
    const claim = rendered("home", {});
    resolved.env = { SWAP_TOOLS_ENABLED: "true" };
    await recordAboutPageVisit("home", claim);
    const [, version, ids] = markAboutVisited.mock.calls[0] as unknown as [string, number, string[]];
    expect(ids).not.toContain("shopping/deck-shopping/standins");
    expect(new Set(ids)).toEqual(new Set(everyAnnouncement(visibleSections(envViewWith({}))).flatMap((u) => u.ack)));
    expect(unseenUnits(visibleSections(envViewWith(resolved.env)), { version, ids }).map((u) => u.key)).toContain("shopping/deck-shopping/standins");
  });

  // Review round 6: both paths answer from the state the reader is left at, so a floor or legacy id another tab wrote
  // after Home was cached is acknowledged, and a reader past their first run never gets an empty answer.
  it("answers a no-write visit with every key the stored state covers, not only the ids it holds", async () => {
    stored.seen = { version: ABOUT_VERSION, ids: [] };
    const answer = await recordAboutPageVisit("decks", []);
    expect(markAboutVisited).not.toHaveBeenCalled();
    const covered = answeredKeys(visibleSections(envViewWith({})), stored.seen);
    expect(covered.length).toBeGreaterThan(0);
    expect(answer).toEqual(expect.arrayContaining(covered));
  });

  it("answers a write with the keys the resulting state covers, legacy ids and floor included", async () => {
    stored.seen = { version: 14, ids: ["rule-zero"] };
    resolved.env = {};
    const claim = rendered("friends", resolved.env);
    const answer = await recordAboutPageVisit("friends", claim);
    expect(markAboutVisited).toHaveBeenCalled();
    const [, version, ids] = markAboutVisited.mock.calls[0] as unknown as [string, number, string[]];
    const after = { version: Math.max(14, version), ids: [...new Set([...stored.seen.ids, ...ids])] };
    expect(answer).toEqual(expect.arrayContaining([...after.ids, ...answeredKeys(visibleSections(envViewWith(resolved.env)), after)]));
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
  beforeEach(() => {
    stored.seen = { version: 9, ids: [] };
    resolved.env = {};
  });

  // Review round 4: the page acknowledges this answer, not its render's forecast.
  it("returns what the write confirmed: the ids written and the unit keys the state it leaves covers", async () => {
    stored.seen = { version: 14, ids: [] };
    const confirmed = await recordAboutVisit(["rule-zero"]);
    expect(markAboutVisited).toHaveBeenCalledWith("user_1", ABOUT_VERSION, ["rule-zero"]);
    expect(confirmed).toContain("rule-zero");
    expect(confirmed).toContain("friends/friends/rule0");
    expect(confirmed).toContain("home/home/in-use");
  });

  it("confirms no unit a switch flipped off between the render and the visit took out of the write", async () => {
    stored.seen = { version: 14, ids: [] };
    resolved.env = {};
    const confirmed = await recordAboutVisit(["stand-ins"]);
    expect(markAboutVisited).toHaveBeenCalledWith("user_1", ABOUT_VERSION, []);
    expect(confirmed).not.toContain("stand-ins");
    expect(confirmed).not.toContain("shopping/deck-shopping/standins");
  });

  it("records the current version and the switched entries the page showed", async () => {
    await recordAboutVisit([]);
    expect(requireUserId).toHaveBeenCalledOnce();
    // No shipped entry has a switch yet, so the ids are empty; the entry-level rule is
    // `visible.test.ts`'s, and the stored union is `read.test.ts`'s.
    expect(markAboutVisited).toHaveBeenCalledWith("user_1", ABOUT_VERSION, []);
  });

  it("records every switched entry the page showed that the reader's switches draw, and only those", async () => {
    // `all-decks-cart` rides a retired switch (always on), so every reader draws it; `stand-ins` needs swap tools, off here.
    await recordAboutVisit(["all-decks-cart", "stand-ins", "made-up"]);
    expect(markAboutVisited).toHaveBeenCalledWith("user_1", ABOUT_VERSION, ["all-decks-cart"]);
  });

  // The appendix is seen by its id too (plan 2026-09-28, PR C).
  it("records the appendix's id", async () => {
    await recordAboutVisit(["how-it-works"]);
    expect(markAboutVisited).toHaveBeenCalledWith("user_1", ABOUT_VERSION, ["how-it-works"]);
  });

  it("never redirects, so the index stays where the reader is reading it", async () => {
    await recordAboutVisit([]);
    expect(redirect).not.toHaveBeenCalled();
  });
});
