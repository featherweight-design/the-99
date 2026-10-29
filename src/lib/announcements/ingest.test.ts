import { describe, expect, it } from "vitest";
import {
  DECKLIST_FLOOR, feedKindOf, isGone, overdue, planFetches, runAnnouncementsIngest, USER_AGENT,
  type AnnouncementRecord, type CatalogCard, type DecklistRecord, type IngestAlert, type IngestStore, type KnownPost,
} from "./ingest";
import { SITEMAP_URL } from "./sitemap";
import { fixture, postUrl } from "./__fixtures__/load";
import { parseDecklists } from "./decklists";
import { parsePost } from "./post";

const SLUGS = ["star-trek-commander-decklists", "secret-lair-set-phasers-to-superdrop", "star-trek-product-delays-in-select-regions"];
const sitemap = (entries: [string, string][]) =>
  `<urlset>${entries.map(([slug, lastmod]) => `<url><loc>${postUrl(slug)}</loc><lastmod>${lastmod}</lastmod></url>`).join("")}<url><loc>https://magic.wizards.com/en/news/announcements</loc><lastmod>x</lastmod></url></urlset>`;
const LASTMODS: [string, string][] = SLUGS.map((s, i) => [s, `2026-10-2${i}T00:00:00.000Z`]);

function trekDecks() {
  const r = parsePost(fixture("star-trek-commander-decklists.html"), "u");
  if (!r.ok) throw new Error("fixture");
  return parseDecklists(r.post.bodyHtml).decks;
}

/** The Federation Fleet list as the catalog: every card but one, Picard and Janeway as the legends they are. */
function starTrekCatalog(): CatalogCard[] {
  const names = new Set(trekDecks().flatMap((d) => d.cards.map((c) => c.name)));
  names.delete("Spot, Felis catus");
  return [...names].map((name, i) => ({
    oracleId: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
    name,
    typeLine: ["Jean-Luc Picard, Luminary", "Captain Janeway, Endgame"].includes(name) ? "Legendary Creature — Human Officer" : "Creature",
    oracleText: "",
  }));
}

function memoryStore(catalog: CatalogCard[] = starTrekCatalog()) {
  const rows = new Map<string, { post: AnnouncementRecord; decklists: DecklistRecord[]; firstSeenAt: string }>();
  let catalogReads = 0;
  let clock = "2026-10-29T12:00:00.000Z";
  const store: IngestStore = {
    async readKnown(): Promise<KnownPost[]> {
      return [...rows.values()].map(({ post, firstSeenAt }) => ({ ...post, firstSeenAt }));
    },
    async readCatalog() {
      catalogReads++;
      return catalog;
    },
    async save(post, decklists) {
      const before = rows.get(post.contentfulId);
      rows.set(post.contentfulId, {
        post: before ? { ...post, baseline: before.post.baseline } : post,
        decklists,
        firstSeenAt: before?.firstSeenAt ?? clock,
      });
    },
  };
  return { store, rows, catalogReads: () => catalogReads, setClock: (t: string) => (clock = t) };
}

function web(map: Record<string, { status: number; text: string }>) {
  const calls: { url: string; ua: string }[] = [];
  return {
    calls,
    fetchText: async (url: string, init: { headers: Record<string, string> }) => {
      calls.push({ url, ua: init.headers["user-agent"] });
      return map[url] ?? { status: 404, text: "" };
    },
  };
}

const pages = (lastmods: [string, string][] = LASTMODS) => ({
  [SITEMAP_URL]: { status: 200, text: sitemap(lastmods) },
  ...Object.fromEntries(SLUGS.map((s) => [postUrl(s), { status: 200, text: fixture(`${s}.html`) }])),
});

async function run(opts: { store: IngestStore; site: ReturnType<typeof web>; now?: string; budgetMs?: number; tick?: number }) {
  const alerts: IngestAlert[] = [];
  const sleeps: number[] = [];
  let t = Date.parse(opts.now ?? "2026-10-29T12:00:00.000Z");
  const report = await runAnnouncementsIngest({
    fetchText: opts.site.fetchText,
    store: opts.store,
    alert: (a) => alerts.push(a),
    now: () => new Date((t += opts.tick ?? 0)),
    sleep: async (ms) => void sleeps.push(ms),
    delayMs: 1500,
    budgetMs: opts.budgetMs,
  });
  return { report, alerts, sleeps };
}

describe("runAnnouncementsIngest", () => {
  it("a first run reads every post politely, saves each as baseline, and maps the lists onto the catalog", async () => {
    const mem = memoryStore();
    const site = web(pages());
    const { report, alerts, sleeps } = await run({ store: mem.store, site });

    expect(report).toEqual({ posts: 3, due: 3, saved: 3, failed: 0, deferred: 0, alerts: 0 });
    expect(alerts).toEqual([]); // Star Trek is short a list, but only a day old
    expect(site.calls.map((c) => c.url)).toEqual([SITEMAP_URL, ...[...SLUGS].reverse().map(postUrl)]); // newest lastmod first
    expect(new Set(site.calls.map((c) => c.ua))).toEqual(new Set([USER_AGENT]));
    expect(sleeps).toEqual([1500, 1500]); // between page fetches, never before the first
    expect(mem.catalogReads()).toBe(1); // only one post has lists

    const posts = [...mem.rows.values()].map((r) => r.post);
    expect(posts.every((p) => p.baseline)).toBe(true);
    expect(Object.fromEntries(posts.map((p) => [p.url.split("/").pop(), [p.kind, p.parseStatus, p.promisedDecks]]))).toEqual({
      "star-trek-commander-decklists": ["commander-decklists", "incomplete", 4],
      "secret-lair-set-phasers-to-superdrop": ["secret-lair", "ok", null],
      "star-trek-product-delays-in-select-regions": ["wizards-news", "ok", null],
    });

    const trek = mem.rows.get("6AMDy9tWTDw5CheGr12ZpF")!;
    expect(trek.post.lastmod).toBe("2026-10-20T00:00:00.000Z");
    const [fleet] = trek.decklists;
    expect(fleet).toMatchObject({
      position: 0, title: "Federation Fleet", cardCount: 100,
      commanderName: "Jean-Luc Picard, Luminary", partnerName: "Captain Janeway, Endgame", partnerRole: "alternate",
      unmatched: ["Spot, Felis catus"],
    });
    expect(fleet.commanderCardId).not.toBeNull();
    expect(fleet.partnerCardId).not.toBeNull();
    // the unmatched line is kept, with no id, not dropped
    expect(fleet.cards).toHaveLength(trekDecks()[0].cards.length);
    expect(fleet.cards.find((c) => c.name === "Spot, Felis catus")).toEqual({ name: "Spot, Felis catus", count: 1, cardId: null });
    expect(trek.decklists.map((d) => d.position)).toEqual([0, 1, 2]);
  });

  it("never reads the catalog when no fetched post carries a list", async () => {
    const mem = memoryStore();
    await run({ store: mem.store, site: web(pages(LASTMODS.slice(1))) });
    expect(mem.rows.size).toBe(2);
    expect(mem.catalogReads()).toBe(0);
  });

  it("a second run with nothing edited fetches only the sitemap", async () => {
    const mem = memoryStore();
    await run({ store: mem.store, site: web(pages()) });
    const site = web(pages());
    const { report } = await run({ store: mem.store, site });
    expect(site.calls.map((c) => c.url)).toEqual([SITEMAP_URL]);
    expect(report).toMatchObject({ due: 0, saved: 0 });
  });

  it("an edited post (lastmod moved) is read again; a post published after the first run is not baseline", async () => {
    const mem = memoryStore();
    await run({ store: mem.store, site: web(pages()) });
    const edited: [string, string][] = LASTMODS.map(([s, m]) => [s, s === SLUGS[0] ? "2026-10-30T00:00:00.000Z" : m]);
    const site = web(pages(edited));
    const { report } = await run({ store: mem.store, site, now: "2026-10-30T12:00:00.000Z" });
    expect(site.calls.map((c) => c.url)).toEqual([SITEMAP_URL, postUrl(SLUGS[0])]);
    expect(report.saved).toBe(1);
    expect(mem.rows.get("6AMDy9tWTDw5CheGr12ZpF")!.post.lastmod).toBe("2026-10-30T00:00:00.000Z");

    // the same pages, but the first run happened before every one was published
    const fresh = memoryStore();
    fresh.setClock("2026-10-01T00:00:00.000Z");
    await fresh.store.save({ ...mem.rows.get("6dZrjdI37YVqKX2qzO0fbg")!.post, url: "https://magic.wizards.com/en/news/announcements/older", contentfulId: "older" }, []);
    await run({ store: fresh.store, site: web(pages()) });
    expect(fresh.rows.get("5RqOLH8YdyaXh57b91tXw2")!.post.baseline).toBe(false); // published 2026-10-27, after 2026-10-01
  });

  it("a page that fails to fetch is not stored, alerts (but not when it is gone or redirected), and is tried again next run", async () => {
    const mem = memoryStore();
    const failing = { ...pages(), [postUrl(SLUGS[1])]: { status: 503, text: "" }, [postUrl(SLUGS[2])]: { status: 302, text: "" } };
    const { report, alerts } = await run({ store: mem.store, site: web(failing) });
    expect(report).toMatchObject({ saved: 1, failed: 2 });
    expect(alerts).toEqual([{ kind: "fetch-failed", url: postUrl(SLUGS[1]), status: 503 }]);
    const site = web(pages());
    await run({ store: mem.store, site });
    expect(site.calls.map((c) => c.url)).toEqual([SITEMAP_URL, postUrl(SLUGS[2]), postUrl(SLUGS[1])]);
  });

  it("a page that does not parse alerts with its reason and stores nothing", async () => {
    const mem = memoryStore();
    const broken = { ...pages(), [postUrl(SLUGS[2])]: { status: 200, text: "<html>maintenance</html>" } };
    const { alerts } = await run({ store: mem.store, site: web(broken) });
    expect(alerts).toEqual([{ kind: "parse-failed", url: postUrl(SLUGS[2]), reason: "no-payload" }]);
    expect(mem.rows.has("6dZrjdI37YVqKX2qzO0fbg")).toBe(false);
  });

  it("an unreadable or empty sitemap alerts and reads nothing else", async () => {
    for (const map of [{ [SITEMAP_URL]: { status: 500, text: "" } }, { [SITEMAP_URL]: { status: 200, text: "<urlset></urlset>" } }]) {
      const mem = memoryStore();
      const site = web(map);
      const { alerts, report } = await run({ store: mem.store, site });
      expect(alerts).toEqual([{ kind: "sitemap-unreadable", status: map[SITEMAP_URL].status }]);
      expect(report.posts).toBe(0);
      expect(site.calls).toHaveLength(1);
    }
  });

  it("stops starting fetches when the budget is spent, and leaves the rest for the next run", async () => {
    const mem = memoryStore();
    const { report } = await run({ store: mem.store, site: web(pages()), budgetMs: 100_000, tick: 30_000 });
    expect(report.deferred).toBeGreaterThan(0);
    expect(report.saved + report.deferred).toBe(3);
  });

  it("alerts on a Commander decklists post still short of its promise three days after it was published", async () => {
    const mem = memoryStore();
    expect((await run({ store: mem.store, site: web(pages()), now: "2026-10-30T12:00:00.000Z" })).alerts).toEqual([]);
    const late = await run({ store: mem.store, site: web(pages()), now: "2026-11-01T00:00:00.000Z" }); // published 2026-10-28T17:01Z
    expect(late.alerts).toEqual([{ kind: "decklists-missing", url: postUrl(SLUGS[0]), title: "Magic: The Gathering® | Star Trek™ Commander Decklists", status: "incomplete" }]);
  });
});

describe("isGone", () => {
  it.each([[404, true], [410, true], [301, true], [302, true], [200, false], [500, false], [503, false], [null, false]])("%s → %s", (s, v) => {
    expect(isGone(s)).toBe(v);
  });
});

it("alerts on a section the parser skips only in a Commander decklists post", async () => {
  const withSideboard = (html: string) => html.replace("\\u003C\\u002Fmain-deck\\u003E", "\\u003C\\u002Fmain-deck\\u003E\\u003Cside-board\\u003ENegate\\u003C\\u002Fside-board\\u003E");
  const trek = fixture("star-trek-commander-decklists.html");
  const welcome = fixture("star-trek-welcome-decks.html");
  expect(withSideboard(trek)).not.toBe(trek);
  expect(withSideboard(welcome)).not.toBe(welcome);
  const map = {
    [SITEMAP_URL]: { status: 200, text: sitemap([[SLUGS[0], "1"], ["star-trek-welcome-decks", "1"]]) },
    [postUrl(SLUGS[0])]: { status: 200, text: withSideboard(trek) },
    [postUrl("star-trek-welcome-decks")]: { status: 200, text: withSideboard(welcome) },
  };
  const { alerts } = await run({ store: memoryStore().store, site: web(map) });
  expect(alerts).toEqual([{ kind: "unknown-sections", url: postUrl(SLUGS[0]), sections: ["side-board"] }]);
});

describe("planFetches", () => {
  const known = (url: string, lastmod: string | null) => ({ url, lastmod }) as KnownPost;
  it("is new posts and edited ones, newest first", () => {
    const entries = [
      { url: "a", lastmod: "2026-01-01" },
      { url: "b", lastmod: "2026-03-01" },
      { url: "c", lastmod: "2026-02-01" },
      { url: "d", lastmod: null },
    ];
    expect(planFetches(entries, [known("a", "2026-01-01"), known("c", "2025-12-01"), known("d", null)]).map((e) => e.url)).toEqual(["b", "c"]);
  });
});

describe("overdue", () => {
  const now = new Date("2026-11-01T00:00:00.000Z");
  const post = { kind: "commander-decklists" as const, parseStatus: "empty" as const, publishedAt: "2026-10-28T00:00:00.000Z" };
  it("only a Commander decklists post, not ok, after the floor, three days on", () => {
    expect(overdue(post, now)).toBe(true);
    expect(overdue({ ...post, publishedAt: "2026-10-29T00:00:01.000Z" }, now)).toBe(false);
    expect(overdue({ ...post, parseStatus: "ok" }, now)).toBe(false);
    expect(overdue({ ...post, kind: "secret-lair" }, now)).toBe(false);
    expect(overdue({ ...post, publishedAt: "2022-09-17T04:00:00.000Z" }, now)).toBe(false); // Warhammer, before the floor
    expect(overdue({ ...post, publishedAt: DECKLIST_FLOOR }, now)).toBe(true);
  });
});

describe("feedKindOf", () => {
  it("stores the classifier's Other as wizards-news, the rest as they are", () => {
    expect(feedKindOf("other")).toBe("wizards-news");
    expect(feedKindOf("secret-lair")).toBe("secret-lair");
    expect(feedKindOf("commander-decklists")).toBe("commander-decklists");
  });
});
