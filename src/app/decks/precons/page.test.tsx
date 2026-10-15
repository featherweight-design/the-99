import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";

// The page's wiring for upcoming precons (plan PR 2, E5): what it caches, what it hands the view, and the visit's
// seen write, which acknowledges every arrival from the UNFILTERED reads whatever the URL filters or orders.
const h = vi.hoisted(() => ({
  env: {} as Record<string, string>,
  afters: [] as Array<() => Promise<void>>,
  keys: [] as string[][],
  stored: [] as boolean[],
  upcomingFails: false,
  marked: [] as string[][],
  cookies: {} as Record<string, string>,
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => (name in h.cookies ? { value: h.cookies[name] } : undefined) }),
}));
vi.mock("next/server", () => ({ after: (fn: () => Promise<void>) => { h.afters.push(fn); } }));
vi.mock("../../../lib/auth", () => ({ requireUserId: async () => "u1" }));
vi.mock("../../../lib/switches/request", () => ({ requestSwitchEnv: async () => h.env }));
vi.mock("../../../lib/cache/page-cache", () => ({
  cachePageForUser: async (_u: string, _p: string, key: string[], load: (env: unknown) => Promise<{ value: unknown; store: boolean }>, env: unknown) => {
    h.keys.push(key);
    const r = await load(env);
    h.stored.push(r.store);
    return r.value;
  },
}));
vi.mock("../../../lib/precons/list-read", () => ({
  loadPreconList: async () => ({
    rows: [{ fileName: "TRC_A", name: "A", setCode: "TRC", releaseDate: "2026-11-13", twinName: null, commanders: [], identity: [], owned: 0, of: 1, unmapped: 0, built: [] }],
    listed: 1, hasCollection: true, newest: "2026-11-13",
  }),
}));
const recent = new Date(Date.now() - 2 * 86_400_000);
vi.mock("../../../lib/precons/announced-read", () => ({
  loadUpcomingPayload: async () => {
    if (h.upcomingFails) throw new Error("boom");
    return {
      sets: [
        { code: "mdc", name: "Darkhold Destiny Commander", releasesOn: "2099-04-09", released: false, cardCount: 1, parentName: null, arrivedAt: recent, seen: false },
      ],
      commanders: {},
      // A set whose lists have landed has left the group (E1); its lists line is still the banner's to clear.
      arrivals: [{ fileName: "TRC_A", name: "A", setCode: "trc", setName: "Star Trek Commander", releasesOn: "2026-11-13", arrivedAt: recent, listsSeen: false }],
    };
  },
}));
vi.mock("../../../lib/precons/upcoming", async (orig) => ({
  ...(await orig<typeof import("../../../lib/precons/upcoming")>()),
  markUpcomingSeen: async (_u: string, keys: string[]) => { h.marked.push(keys); },
}));

import PreconsPage from "./page";

const visit = async (query: Record<string, string> = {}) =>
  (await PreconsPage({ searchParams: Promise.resolve(query) })) as ReactElement<Record<string, unknown>>;
const runAfters = async () => { for (const fn of h.afters.splice(0)) await fn(); };

describe("/decks/precons, upcoming precons", () => {
  beforeEach(() => {
    h.env = { PRECONS_ENABLED: "true", UPCOMING_PRECONS_ENABLED: "true" };
    h.afters = []; h.keys = []; h.stored = []; h.marked = []; h.upcomingFails = false; h.cookies = {};
  });

  it("caches the payload on the UTC day and hands the view the group and the new tiles", async () => {
    const el = await visit();
    expect(h.keys[0]).toEqual([new Date().toISOString().slice(0, 10)]);
    expect(h.stored[0]).toBe(true);
    const announced = el.props.announced as { sets: unknown[]; newCodes: string[]; opensByItself: boolean };
    expect(announced.sets).toHaveLength(1);
    expect(announced.newCodes).toEqual(["mdc"]);
    expect(announced.opensByItself).toBe(true);
    expect(el.props.newFileNames).toEqual(["TRC_A"]);
  });

  it("hands the view the Announced head's stored press from its cookie, and only a press it knows", async () => {
    h.cookies = { precons_announced: "open" };
    expect((await visit()).props.storedAnnounced).toBe("open");
    h.cookies = { precons_announced: "sideways" };
    expect((await visit()).props.storedAnnounced).toBeNull();
  });

  it("writes every arrival seen on a visit, whatever the filters and the order", async () => {
    await visit({ q: "zzzz", colour: "W", sort: "owned" });
    await runAfters();
    expect(h.marked).toEqual([["trc", "lists:trc", "mdc"]]);
  });

  it("draws the list as shipped, stores nothing and writes nothing when the upcoming read fails (T9)", async () => {
    h.upcomingFails = true;
    const el = await visit();
    await runAfters();
    expect(el.props.announced).toBeNull();
    expect(h.stored[0]).toBe(false);
    expect(h.marked).toEqual([]);
  });

  it("reads, draws and writes nothing with the switch off, and keeps the shipped key", async () => {
    h.env = { PRECONS_ENABLED: "true" };
    const el = await visit();
    await runAfters();
    expect(h.keys[0]).toEqual([]);
    expect(el.props.announced).toBeNull();
    expect(el.props.newFileNames).toEqual([]);
    expect(h.marked).toEqual([]);
  });
});
