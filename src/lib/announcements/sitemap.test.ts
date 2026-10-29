import { describe, expect, it } from "vitest";
import { announcementPosts, isAnnouncementPostUrl, parseSitemap } from "./sitemap";
import { fixture } from "./__fixtures__/load";

describe("parseSitemap", () => {
  it("reads every <url> of the real sitemap with its lastmod", () => {
    const entries = parseSitemap(fixture("sitemap.xml"));
    expect(entries).toHaveLength(26);
    expect(entries[0]).toEqual({ url: "https://magic.wizards.com/en/cosmic-echo-8241", lastmod: "2026-10-28T23:25:51.032Z" });
    expect(entries.every((e) => e.lastmod !== null)).toBe(true);
  });

  it("decodes XML entities and CDATA, keeps a missing lastmod as null, and drops an entry with no loc", () => {
    const xml = `<urlset><url><loc>https://magic.wizards.com/en/news/announcements/a?x=1&amp;y=2</loc></url>
      <url><lastmod>2026-01-01</lastmod></url>
      <url><loc><![CDATA[https://magic.wizards.com/en/news/announcements/b]]></loc><lastmod> 2026-02-02T00:00:00Z </lastmod></url></urlset>`;
    expect(parseSitemap(xml)).toEqual([
      { url: "https://magic.wizards.com/en/news/announcements/a?x=1&y=2", lastmod: null },
      { url: "https://magic.wizards.com/en/news/announcements/b", lastmod: "2026-02-02T00:00:00Z" },
    ]);
  });
});

describe("isAnnouncementPostUrl", () => {
  it.each([
    ["https://magic.wizards.com/en/news/announcements/star-trek-commander-decklists", true],
    ["https://magic.wizards.com/en/news/announcements/FNM_at_Home", true],
    ["https://magic.wizards.com/en/news/announcements/trailing-slash/", true],
    ["https://magic.wizards.com/en/news/announcements", false],
    ["https://magic.wizards.com/en/news/announcements/", false],
    ["https://magic.wizards.com/en/news/announcements/a/b", false],
    ["https://magic.wizards.com/en/news/feature/where-to-play-star-trek", false],
    ["https://magic.wizards.com/fr/news/announcements/star-trek-commander-decklists", false],
    ["http://magic.wizards.com/en/news/announcements/x", false],
    ["https://magic.wizards.com/en/news/announcements/x?utm=1", false],
  ])("%s → %s", (url, expected) => {
    expect(isAnnouncementPostUrl(url)).toBe(expected);
  });
});

describe("announcementPosts", () => {
  it("keeps only Announcements posts from the real sitemap: not the index, other categories or pages", () => {
    const posts = announcementPosts(fixture("sitemap.xml"));
    expect(posts.map((p) => p.url.split("/").pop())).toEqual([
      "star-trek-commander-decklists",
      "secret-lair-set-phasers-to-superdrop",
      "magic-presents-black-history-month-celebration",
      "proxies-policy-and-communication-2016-01-14",
      "where-to-find-star-trek-previews",
      "reality-fracture-secret-lair-bundle-delayed",
      "mystery-booster-commander-edition-update-bulletin",
      "secret-lair-countdown-kit-marvels-history-of-heroes",
      "banned-and-restricted-october-12-2026",
      "star-trek-product-delays-in-select-regions",
      "bring-two-new-secret-lair-drops-to-your-multiverse-with-reality-fracture",
      "FNM_at_Home",
    ]);
    expect(posts[0].lastmod).toBe("2026-10-28T19:26:33.153Z");
  });

  it("lists a URL once, trailing slash or not", () => {
    const xml = `<urlset><url><loc>https://magic.wizards.com/en/news/announcements/a/</loc><lastmod>1</lastmod></url><url><loc>https://magic.wizards.com/en/news/announcements/a</loc><lastmod>2</lastmod></url></urlset>`;
    expect(announcementPosts(xml)).toEqual([{ url: "https://magic.wizards.com/en/news/announcements/a", lastmod: "1" }]);
  });
});
