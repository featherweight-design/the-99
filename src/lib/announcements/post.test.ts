import { describe, expect, it } from "vitest";
import { parsePost, toUtcIso } from "./post";
import { decodeJsString, readNuxtPayload } from "./nuxt";
import { fixture, postUrl } from "./__fixtures__/load";

const parse = (slug: string) => parsePost(fixture(`${slug}.html`), postUrl(slug));

describe("parsePost on real pages", () => {
  it("reads the Star Trek Commander decklists post", () => {
    const r = parse("star-trek-commander-decklists");
    if (!r.ok) throw new Error(JSON.stringify(r));
    const { bodyHtml, ...rest } = r.post;
    expect(rest).toEqual({
      contentfulId: "6AMDy9tWTDw5CheGr12ZpF",
      title: "Magic: The Gathering® | Star Trek™ Commander Decklists",
      excerpt: "Bring the voyages and stories of Star Trek to your Commander games with four ready-to-play decks featuring the Federation, Klingons, Borg, and more!",
      publishedDate: "2026-10-28T17:01:00.000Z",
      heroImageUrl: "https://images.ctfassets.net/s5n2t79q9icq/2uyq7erHnivS3hGLh5OP2B/1977f75d1bf5507c5003a561bf7c539a/TRK_Worf__Defiant_Commander_1920x1080.webp",
      category: "announcements",
      slug: "star-trek-commander-decklists",
      url: postUrl("star-trek-commander-decklists"),
    });
    // the body is decoded HTML, deck lists and all
    expect(bodyHtml).toContain('<deck-list product="63lQuzq4Svzs6us8v27lqT" deck-title="Federation Fleet">');
  });

  it("resolves fields the payload names by parameter (category is `category:o` in the page)", () => {
    const r = parse("star-trek-product-delays-in-select-regions");
    if (!r.ok) throw new Error(JSON.stringify(r));
    expect(r.post.category).toBe("announcements");
    expect(r.post.title).toBe("Magic: The Gathering® | Star Trek™ Product Delays in Select Regions");
    expect(r.post.contentfulId).toBe("6dZrjdI37YVqKX2qzO0fbg");
  });

  it.each([
    ["secret-lair-set-phasers-to-superdrop", "5RqOLH8YdyaXh57b91tXw2", "2026-10-27T16:00:00.000Z", "Secret Lair: Set Phasers to Superdrop"],
    ["secret-lair-commander-deck-odds-and-ends-decklist", "4KTk7wRPqYJtJIIm32KeIW", "2026-09-27T15:00:00.000Z", "Secret Lair Commander Deck: Odds and Ends Decklist"],
    ["foundations-commander-decklists", "6EAd4fpZDmNhLnhjWzxIpB", "2026-09-18T21:00:00.000Z", "Foundations Commander Decklists"],
    // seconds in the timestamp, and a winter offset
    ["heads-i-win-tails-you-lose-commander-decklist-2021-11-18", "eglYGOnR3US2KwYRPDJUt", "2021-11-19T00:00:00.000Z", "Heads I Win, Tails You Lose Commander Decklist"],
    // a positive offset
    ["star-trek-welcome-decks", "dcerqeEvXvVviv4ZO4h7y", "2026-08-05T15:00:00.000Z", "Magic: The Gathering® | Star Trek™ Welcome Decks"],
  ])("%s", (slug, id, date, title) => {
    const r = parse(slug);
    if (!r.ok) throw new Error(JSON.stringify(r));
    expect([r.post.contentfulId, r.post.publishedDate, r.post.title]).toEqual([id, date, title]);
    expect(r.post.heroImageUrl).toMatch(/^https:\/\/images\.ctfassets\.net\//);
  });
});

describe("parsePost failures are typed, never thrown", () => {
  const page = fixture("star-trek-product-delays-in-select-regions.html");

  it("a page with no Nuxt payload", () => {
    expect(parsePost("<html><body>Not found</body></html>", "u")).toEqual({ ok: false, reason: "no-payload" });
  });

  it("a payload with no article entry", () => {
    expect(parsePost(page.replace('"ArticleFetcher:0"', '"SomethingElse:0"'), "u")).toEqual({ ok: false, reason: "no-article" });
  });

  it("a truncated page", () => {
    expect(parsePost(page.slice(0, Math.floor(page.length * 0.6)), "u")).toEqual({ ok: false, reason: "no-payload" });
  });

  it("names each missing field", () => {
    const stripped = page
      .replace('id:"6dZrjdI37YVqKX2qzO0fbg"', 'id:""')
      .replace(/publishedDateTime:"[^"]*"/, 'publishedDateTime:"2026-10-16 08:00:00"')
      .replace("article:{body:", "article:{bodyMoved:");
    expect(parsePost(stripped, "u")).toEqual({ ok: false, reason: "missing-fields", missing: ["contentfulId", "publishedDate", "bodyHtml"] });
  });

  it("a missing image or excerpt is null, not a failure", () => {
    const r = parsePost(page.replace("metaImage:{url:", "metaImage:{href:").replace("excerpt:", "excerptGone:"), "u");
    if (!r.ok) throw new Error(JSON.stringify(r));
    expect([r.post.heroImageUrl, r.post.excerpt]).toEqual([null, null]);
  });
});

describe("toUtcIso", () => {
  it.each([
    ["2026-10-28T10:01-07:00", "2026-10-28T17:01:00.000Z"],
    ["2021-11-18T16:00:00-08:00", "2021-11-19T00:00:00.000Z"],
    ["2026-08-05T17:00+02:00", "2026-08-05T15:00:00.000Z"],
    ["2026-01-01T00:00:00Z", "2026-01-01T00:00:00.000Z"],
    // no zone: would be read in the server's own zone, so refused
    ["2026-10-16 08:00:00", null],
    ["2026-10-16T08:00:00", null],
    ["soon", null],
  ])("%s → %s", (raw, iso) => expect(toUtcIso(raw)).toBe(iso));
});

describe("the Nuxt reader", () => {
  it("decodes JS string escapes", () => {
    expect(decodeJsString('"a\\u002Fb \\u003Cp\\u003E \\"q\\" \\n \\x41 \\u{1F600}"')).toBe('a/b <p> "q" \n A \u{1F600}');
  });

  it("binds each parameter to its argument, void 0 and booleans included", () => {
    const p = readNuxtPayload('<script>window.__NUXT__=(function(a,b,c,d){return {x:a}}(void 0,"en",false,1.5));</script>');
    expect(Object.fromEntries(p!.bindings)).toEqual({
      a: { kind: "null" },
      b: { kind: "string", value: "en" },
      c: { kind: "boolean", value: false },
      d: { kind: "number", value: 1.5 },
    });
  });
});
