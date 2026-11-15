import { describe, expect, it } from "vitest";
import { reduceUrls, scrubSpan, scrubSpanName } from "./span-scrub";

const span = (name: string, attributes: Record<string, unknown> = {}) => ({ name, span_id: "a", trace_id: "b", is_segment: true, attributes });

describe("scrubSpan", () => {
  it("reduces the transaction name to its route pattern, no query and no id", () => {
    expect(scrubSpanName("GET /decks/3f2a1b4c-0d5e-4f60-8a7b-9c0d1e2f3a4b?sort=name")).toBe("GET /decks/[id]");
    expect(scrubSpanName("/friend/SECRETTOKEN")).toBe("/friend/[token]");
    expect(scrubSpanName("render route (app) /decks/[id]")).toBe("render route (app) /decks/[id]");
    expect(scrubSpanName("GET https://api.clerk.com/v1/users/user_2NNEqL2nrIRdJ194?x=1")).toBe("GET https://api.clerk.com/v1/users/[id]");
  });

  it("drops the user, headers, query strings, cookies and the client address", () => {
    const out = scrubSpan(span("GET /collection", {
      "user.id": "user_2NNEqL2nrIRdJ194", "user.email": "a@b.co", "user.ip_address": "1.2.3.4",
      "http.request.header.referer": ["https://the-99.dev/decks?q=Sol"], "http.request.header.cookie": "x",
      "url.query": "?q=Sol+Ring", "http.query": "q=Sol", "client.address": "1.2.3.4", "user_agent.original": "Mozilla",
      "http.response.status_code": 200, "sentry.op": "http.server",
    }));
    expect(out.attributes).toEqual({ "http.response.status_code": 200, "sentry.op": "http.server" });
  });

  it("reduces every URL attribute to its pattern and the segment name with it", () => {
    const out = scrubSpan(span("GET /decks/abc", {
      "url.full": "https://the-99.dev/decks/3f2a1b4c-0d5e-4f60-8a7b-9c0d1e2f3a4b?name=Kitchen#x",
      "http.url": "https://the-99.dev/join/TOKEN123?ref=me",
      "sentry.segment.name": "/friends/pub_abc/decks/xyz",
    }));
    expect(out.attributes).toEqual({
      "url.full": "https://the-99.dev/decks/[id]",
      "http.url": "https://the-99.dev/join/[token]",
      "sentry.segment.name": "/friends/[publicId]/decks/[deckId]",
    });
    expect(JSON.stringify(out)).not.toMatch(/Kitchen|TOKEN123|ref=me/);
  });

  it("drops any attribute holding an email or a Clerk id, and cuts SQL literals on a db span", () => {
    const out = scrubSpan(span("select * from decks where name = 'Kitchen'", { "sentry.op": "db", note: "for someone@example.com", owner: "user_2NNEqL2nrIRdJ194", "db.query.text": "select * from decks where name = 'Kitchen table'" }));
    expect(out.name).toBe("select * from decks where name = '?'");
    expect(out.attributes).toEqual({ "sentry.op": "db", "db.query.text": "select * from decks where name = '?'" });
    expect(reduceUrls("mail sent to someone@example.com")).toBe("mail sent to [redacted]");
  });

  it("cuts a web vital's target to its bare tag name: no aria-label, title, alt, id or class", () => {
    const out = scrubSpan(span("/decks/[id]", {
      "sentry.op": "ui.interaction.click",
      "browser.web_vital.inp.target": 'body > div.shell > button#swap.pill[aria-label="Swap in: My Deck"]',
      "browser.web_vital.lcp.element": 'body > main > img[alt="Atraxa, Kitchen table"]',
      "browser.web_vital.cls.source.1": 'div[title="Hugh\'s pod"]',
      "browser.web_vital.inp.value": 120,
    }));
    expect(out.attributes).toEqual({
      "sentry.op": "ui.interaction.click",
      "browser.web_vital.inp.target": "button",
      "browser.web_vital.lcp.element": "img",
      "browser.web_vital.cls.source.1": "div",
      "browser.web_vital.inp.value": 120,
    });
    expect(JSON.stringify(out)).not.toMatch(/My Deck|Atraxa|Hugh|swap|shell/);
    expect(scrubSpan(span("x", { "browser.web_vital.inp.target": 'span[aria-label="a > Kitchen table"]' })).attributes).toEqual({ "browser.web_vital.inp.target": "span" });
  });

  it("drops an unknown string attribute, and a span name that is neither a path nor one of Next's", () => {
    const out = scrubSpan(span('body > button[aria-label="Swap in: My Deck"]', { "sentry.op": "ui.interaction.click", "some.new.attribute": "Kitchen table" }));
    expect(out.name).toBe("ui.interaction.click");
    expect(out.attributes).toEqual({ "sentry.op": "ui.interaction.click" });
    expect(scrubSpanName("Kitchen table brew")).toBe("span");
    expect(scrubSpanName("https://cards.scryfall.io/large/front/a/b/3f2a.jpg?1", "resource.img")).toBe("https://cards.scryfall.io/large/front/a/b/[id]");
  });
});
