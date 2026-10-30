import { Fragment } from "react";
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
  listFails: false,
  allSeen: false,
  marked: [] as string[][],
  cookies: {} as Record<string, string>,
  listOpts: [] as unknown[],
  early: undefined as Record<string, unknown> | undefined,
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => (name in h.cookies ? { value: h.cookies[name] } : undefined) }),
}));
vi.mock("next/server", () => ({ after: (fn: () => Promise<void>) => { h.afters.push(fn); } }));
vi.mock("../../../../lib/auth", () => ({ requireUserId: async () => "u1" }));
vi.mock("../../../../lib/switches/request", () => ({ requestSwitchEnv: async () => h.env }));
vi.mock("../../../../lib/cache/page-cache", () => ({
  cachePageForUser: async (_u: string, _p: string, key: string[], load: (env: unknown) => Promise<{ value: unknown; store: boolean }>, env: unknown) => {
    h.keys.push(key);
    const r = await load(env);
    h.stored.push(r.store);
    return r.value;
  },
}));
vi.mock("../../../../lib/precons/list-read", () => ({
  loadPreconList: async (_u: string, opts?: unknown) => {
    h.listOpts.push(opts);
    if (h.listFails) throw new Error("list down");
    return {
    rows: [{ fileName: "TRC_A", name: "A", setCode: "TRC", releaseDate: "2026-11-13", twinName: null, commanders: [], identity: [], owned: 0, of: 1, unmapped: 0, built: [] }],
    listed: 1, hasCollection: true, newest: "2026-11-13",
    ...((opts as { boxes?: boolean } | undefined)?.boxes ? { added: { TRC_A: "2026-06-30T12:00:00.000Z" } } : {}),
    };
  },
}));
const recent = new Date(Date.now() - 2 * 86_400_000);
vi.mock("../../../../lib/precons/announced-read", () => ({
  loadUpcomingPayload: async () => {
    if (h.upcomingFails) throw new Error("boom");
    return {
      sets: [
        { code: "mdc", name: "Darkhold Destiny Commander", releasesOn: "2099-04-09", released: false, cardCount: 1, parentName: null, arrivedAt: recent, seen: h.allSeen },
      ],
      commanders: {},
      // A set whose lists have landed has left the group (E1); its lists line is still the banner's to clear.
      arrivals: [{ fileName: "TRC_A", name: "A", setCode: "trc", setName: "Star Trek Commander", releasesOn: "2026-11-13", arrivedAt: recent, listsSeen: h.allSeen }],
      ...(h.early ? { early: h.early } : {}),
    };
  },
}));
vi.mock("../../../../lib/precons/upcoming", async (orig) => ({
  ...(await orig<typeof import("../../../../lib/precons/upcoming")>()),
  markUpcomingSeen: async (_u: string, keys: string[]) => { h.marked.push(keys); },
}));

import PreconsPage from "./page";
import { PreconsDown } from "../../../../components/decks/precons/precons-down";
import { PreconListView } from "../../../../components/decks/precons/precon-list-view";
import { PreconPickView } from "../../../../components/decks/precons/precon-pick-view";
import { ToolLandingMount } from "../../../../components/discovery/tool-landing-mount";

// The list draws the landing's mount beside its view (discovery R2·3): the view is the fragment's last child.
const visit = async (query: Record<string, string> = {}) => {
  const el = (await PreconsPage({ searchParams: Promise.resolve(query) })) as ReactElement<Record<string, unknown>>;
  if (el.type !== Fragment) return el;
  const children = el.props.children as ReactElement<Record<string, unknown>>[];
  return children[children.length - 1];
};
const DAY = new Date().toISOString().slice(0, 10);
const runAfters = async () => { for (const fn of h.afters.splice(0)) await fn(); };

describe("/decks/precons, upcoming precons", () => {
  beforeEach(() => {
    h.env = {};
    h.afters = []; h.keys = []; h.stored = []; h.marked = []; h.upcomingFails = false; h.cookies = {}; h.listFails = false; h.allSeen = false; h.early = undefined;
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

  // G2: each set's early lists are acknowledged at the count the set has posted (its drawn tiles and the lists that
  // gave way to their release list), from the UNFILTERED payload, so a filter hiding a tile never lowers the count.
  const earlyTile = (n: number, colors: string[]) => ({
    href: `/decks/precons/early/x${n}`, name: `List ${n}`, commanders: [], identity: colors, identityKnown: true, owned: 0, of: 100,
  });
  const EARLY = {
    mdc: { lists: [earlyTile(0, ["W"]), earlyTile(1, ["U"])], promised: 5, releasedLists: 1 },
    // A set whose lists have all given way has no early lists to show, and writes no early key.
    trc: { lists: [], promised: 4, releasedLists: 4 },
  };

  it("writes each set's early lists seen at their posted count, and tells the view the same keys", async () => {
    h.early = EARLY;
    const el = await visit();
    await runAfters();
    expect(h.marked).toEqual([["trc", "lists:trc", "mdc", "early:mdc:3"]]);
    expect(el.props.acknowledgesArrivals).toEqual(h.marked[0]);
  });

  it("writes the early key at the unfiltered count whatever the filters and the order", async () => {
    h.early = EARLY;
    // A color filter no early tile matches, a search, and Most owned (which hides the group) all leave the key whole.
    const el = await visit({ q: "zzzz", colour: "B", sort: "owned" });
    await runAfters();
    expect(h.marked).toEqual([["trc", "lists:trc", "mdc", "early:mdc:3"]]);
    expect(el.props.acknowledgesArrivals).toEqual(h.marked[0]);
  });

  it("still writes a set's early key when its other arrivals are already seen", async () => {
    h.early = EARLY;
    h.allSeen = true;
    const el = await visit({ colour: "W" });
    await runAfters();
    expect(h.marked).toEqual([["early:mdc:3"]]);
    expect(el.props.acknowledgesArrivals).toEqual(["early:mdc:3"]);
  });

  it("draws the list as shipped, stores nothing and writes nothing when the upcoming read fails (T9)", async () => {
    h.upcomingFails = true;
    const el = await visit();
    await runAfters();
    expect(el.props.announced).toBeNull();
    expect(h.stored[0]).toBe(false);
    expect(h.marked).toEqual([]);
  });

  it("tells the view its visit acknowledges arrivals exactly when it writes seen keys", async () => {
    const wrote = await visit();
    await runAfters();
    expect(h.marked).toHaveLength(1);
    // The very keys the visit writes, so Home hides only what this visit covered.
    expect(wrote.props.acknowledgesArrivals).toEqual(h.marked[0]);
    expect((wrote.props.acknowledgesArrivals as string[]).length).toBeGreaterThan(0);

    h.marked = [];
    h.allSeen = true;
    const seen = await visit();
    await runAfters();
    expect(seen.props.acknowledgesArrivals).toEqual([]);
    expect(h.marked).toEqual([]);

  });

  it("draws PreconsDown and acknowledges nothing when the list cannot be read", async () => {
    h.listFails = true;
    const el = await visit();
    await runAfters();
    expect(el.type).toBe(PreconsDown);
    expect(el.props.acknowledgesArrivals).toBeUndefined();
    expect(h.marked).toEqual([]);
  });
});

describe("/decks/precons?pick=own (no-collection entry S2)", () => {
  beforeEach(() => { h.keys = []; h.listOpts = []; h.listFails = false; h.cookies = {}; h.afters = []; });

  it("draws the shipped list for any other pick", async () => {
    h.env = {};
    expect((await visit({ pick: "all" })).type).toBe(PreconListView);
    expect(h.keys).toEqual([[DAY]]);
  });

  it("reads the boxes' figures under a key of its own, and takes its way back from a closed set", async () => {
    h.env = {};
    const el = await visit({ pick: "own", from: "collection", q: "abz" });
    expect(el.type).toBe(PreconPickView);
    expect(h.keys).toEqual([["pick"]]);
    expect(h.listOpts).toEqual([{ boxes: true }]);
    expect(el.props.entry).toBe("collection");
    expect((el.props.initial as { q: string }).q).toBe("abz");
    expect((await visit({ pick: "own", from: "/elsewhere" })).props.entry).toBe("home");
  });

  it("hands the pick the collection's presence and each box's standing add (E2, S17)", async () => {
    h.env = {};
    const el = await visit({ pick: "own", from: "collection" });
    expect(el.props.hasCollection).toBe(true);
    expect(el.props.added).toEqual({ TRC_A: "2026-06-30T12:00:00.000Z" });
  });

  it("strips a `?tool=` on every branch that draws no list search: the pick and the list down", async () => {
    h.env = { HELP_ME_CHOOSE_ENABLED: "true" };
    const mountOf = async (query: Record<string, string>) => {
      const el = (await PreconsPage({ searchParams: Promise.resolve(query) })) as ReactElement<Record<string, unknown>>;
      expect(el.type).toBe(Fragment);
      const [mount] = el.props.children as ReactElement<Record<string, unknown>>[];
      expect(mount.type).toBe(ToolLandingMount);
      return mount.props;
    };
    expect(await mountOf({ pick: "own", tool: "precons" })).toMatchObject({ landing: null });
    h.listFails = true;
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await mountOf({ pick: "own", tool: "precons" })).toMatchObject({ landing: null });
    expect(await mountOf({ tool: "precons" })).toMatchObject({ landing: null });
  });

  it("draws the shipped down state when the pick cannot be read", async () => {
    h.env = {};
    h.listFails = true;
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await visit({ pick: "own" })).type).toBe(PreconsDown);
  });
});
