import { describe, expect, it } from "vitest";
import { runAnnouncementsIngest, USER_AGENT, type CollectingRecord, type CollectingStore, type IngestAlert, type IngestStore } from "./ingest";
import { SITEMAP_URL } from "./sitemap";
import { fixture } from "./__fixtures__/load";

const NAUCTIS = "https://magic.wizards.com/en/news/feature/collecting-nauctis-the-sunken-realm";
const OTHER = "https://magic.wizards.com/en/news/feature/collecting-final-fantasy";
const sitemap = `<urlset><url><loc>${NAUCTIS}</loc><lastmod>2026-11-13T00:00:00.000Z</lastmod></url><url><loc>${OTHER}</loc><lastmod>2026-06-01T00:00:00.000Z</lastmod></url><url><loc>https://magic.wizards.com/en/news/announcements/x-y</loc><lastmod>z</lastmod></url></urlset>`;

const emptyStore = (): IngestStore => ({
  readKnown: async () => [{ url: "https://magic.wizards.com/en/news/announcements/x-y", contentfulId: "c", title: "t", lastmod: "z", kind: "wizards-news", publishedAt: "2026-01-01T00:00:00.000Z", parseStatus: "ok", firstSeenAt: "2026-01-01T00:00:00.000Z" }],
  readCatalog: async () => [],
  save: async () => {},
  readUnmatched: async () => [],
  saveMatches: async () => {},
  stampCatalog: async () => {},
});

function collectingStore(upcoming: string[], known: { url: string; lastmod: string | null }[] = []) {
  const saved: CollectingRecord[] = [];
  const store: CollectingStore = {
    readUpcomingSetNames: async () => upcoming,
    readKnown: async () => known,
    save: async (p) => void saved.push(p),
  };
  return { store, saved };
}

async function run(collecting: CollectingStore | undefined, pages: Record<string, { status: number; text: string }>) {
  const calls: { url: string; ua: string }[] = [];
  const alerts: IngestAlert[] = [];
  const sleeps: number[] = [];
  await runAnnouncementsIngest({
    fetchText: async (url, init) => {
      calls.push({ url, ua: init.headers["user-agent"] });
      return pages[url] ?? { status: 404, text: "" };
    },
    store: emptyStore(),
    collecting,
    alert: (a) => alerts.push(a),
    now: () => new Date("2026-11-20T12:00:00.000Z"),
    sleep: async (ms) => void sleeps.push(ms),
    delayMs: 1500,
  });
  return { calls, alerts, sleeps };
}

describe("the collecting-post pass", () => {
  it("fetches only the post of an upcoming set and stores its deck names, with the ingest's User-Agent", async () => {
    const { store, saved } = collectingStore(["Nauctis: The Sunken Realm Commander", "Darkhold Destiny Commander"]);
    const { calls, alerts } = await run(store, {
      [SITEMAP_URL]: { status: 200, text: sitemap },
      [NAUCTIS]: { status: 200, text: fixture("collecting-nauctis-the-sunken-realm.html") },
    });
    expect(calls.map((c) => c.url)).toEqual([SITEMAP_URL, NAUCTIS]);
    expect(new Set(calls.map((c) => c.ua))).toEqual(new Set([USER_AGENT]));
    expect(alerts).toEqual([]);
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ url: NAUCTIS, slug: "collecting-nauctis-the-sunken-realm", lastmod: "2026-11-13T00:00:00.000Z", deckNames: ["Merfolk Regiment", "Terrors of the Abyss", "Blood in the Water", "Seal the Deal"] });
  });

  it("skips a post already read at the same lastmod, and fetches nothing when no set is upcoming", async () => {
    const same = collectingStore(["Nauctis: The Sunken Realm Commander"], [{ url: NAUCTIS, lastmod: "2026-11-13T00:00:00.000Z" }]);
    const a = await run(same.store, { [SITEMAP_URL]: { status: 200, text: sitemap } });
    expect(a.calls.map((c) => c.url)).toEqual([SITEMAP_URL]);
    const none = collectingStore([]);
    const b = await run(none.store, { [SITEMAP_URL]: { status: 200, text: sitemap } });
    expect(b.calls.map((c) => c.url)).toEqual([SITEMAP_URL]);
    expect(none.saved).toEqual([]);
  });

  it("alerts a post that fails to fetch and stores nothing for it", async () => {
    const { store, saved } = collectingStore(["Nauctis: The Sunken Realm Commander"]);
    const { alerts } = await run(store, { [SITEMAP_URL]: { status: 200, text: sitemap }, [NAUCTIS]: { status: 500, text: "" } });
    expect(alerts).toEqual([{ kind: "fetch-failed", url: NAUCTIS, status: 500 }]);
    expect(saved).toEqual([]);
  });

  it("is skipped entirely with no collecting store", async () => {
    const { calls } = await run(undefined, { [SITEMAP_URL]: { status: 200, text: sitemap } });
    expect(calls.map((c) => c.url)).toEqual([SITEMAP_URL]);
  });
});
