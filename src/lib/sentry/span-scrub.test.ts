import { describe, expect, it } from "vitest";
import { reduceUrls, scrubSpan, scrubSpanName } from "./span-scrub";

const span = (name: string, attributes: Record<string, unknown> = {}) => ({ name, span_id: "a", trace_id: "b", is_segment: true, attributes });

describe("scrubSpan", () => {
  it("reduces the transaction name to its route pattern, no query and no id", () => {
    expect(scrubSpanName("GET /decks/3f2a1b4c-0d5e-4f60-8a7b-9c0d1e2f3a4b?sort=name")).toBe("GET /decks/[id]");
    expect(scrubSpanName("/friend/SECRETTOKEN")).toBe("/friend/[token]");
    expect(scrubSpanName("render route (app) /decks/[id]")).toBe("render route (app) /decks/[id]");
    expect(scrubSpanName("GET https://api.clerk.com/v1/users/user_2NNEqL2nrIRdJ194?x=1")).toBe("GET https://api.clerk.com/[path]");
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
    // A child span: a segment's own `sentry.segment.name` is replaced by its scrubbed name (below).
    const out = scrubSpan({ ...span("GET /decks/abc", {
      "url.full": "https://the-99.dev/decks/3f2a1b4c-0d5e-4f60-8a7b-9c0d1e2f3a4b?name=Kitchen#x",
      "http.url": "https://the-99.dev/join/TOKEN123?ref=me",
      "sentry.segment.name": "/friends/pub_abc/decks/xyz",
    }), is_segment: false });
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
    expect(scrubSpanName("https://cards.scryfall.io/large/front/a/b/3f2a.jpg?1", "resource.img")).toBe("https://cards.scryfall.io/[path]");
  });

  it("keeps only the scheme and host of another site's URL: its path holds card and commander slugs", () => {
    expect(scrubSpanName("GET https://json.edhrec.com/pages/commanders/atraxa-praetors-voice.json")).toBe("GET https://json.edhrec.com/[path]");
    const out = scrubSpan(span("GET https://edhrec.com/commanders/atraxa-praetors-voice", { "url.full": "https://edhrec.com/commanders/atraxa-praetors-voice" }));
    expect(out.attributes).toEqual({ "url.full": "https://edhrec.com/[path]" });
    expect(JSON.stringify(out)).not.toMatch(/atraxa/);
    // The app's own host still reduces to its route pattern, and a path it has no route for says only that.
    expect(scrubSpanName("GET https://the-99.dev/commander/atraxa-praetors-voice")).toBe("GET https://the-99.dev/commander/[slug]");
    expect(scrubSpanName("GET /no-such-place/atraxa-praetors-voice")).toBe("GET /[unknown]");
  });

  it("keeps one of Next's span names only with a reduced path after it, else the bare name", () => {
    expect(scrubSpanName("render route (app) /decks/3f2a")).toBe("render route (app) /decks/[id]");
    expect(scrubSpanName("render route (app) Kitchen table")).toBe("render route (app)");
    expect(scrubSpanName("start response")).toBe("start response");
  });
});

// The shapes Sentry 11.6.0 streams for this app (`@sentry/nextjs` `serverSpanHooks.js`, `enhanceHandleRequestRootSpan.js`, and
// Next's `base-server.js`): the root `BaseServer.handleRequest` span is named by the bare method at its start, renamed to
// `METHOD route` (or `RSC METHOD route`) once Next knows the route, and carries `sentry.op: http.server`.
describe("route names survive the scrub", () => {
  const ID = "3f2a1b4c-0d5e-4f60-8a7b-9c0d1e2f3a4b";
  const root = (name: string, extra: Record<string, unknown> = {}): { name: string; span_id: string; trace_id: string; is_segment: boolean; attributes: Record<string, unknown> } => ({
    name,
    span_id: "a",
    trace_id: "b",
    is_segment: true,
    attributes: {
      "sentry.op": "http.server",
      "sentry.origin": "auto",
      "sentry.source": "url",
      "sentry.segment.name.source": "url",
      "sentry.segment.name": name,
      "next.span_type": "BaseServer.handleRequest",
      "http.request.method": "GET",
      "http.method": "GET",
      "http.target": `/decks/${ID}?sort=name`,
      "url.path": `/decks/${ID}`,
      "url.full": `https://the-99.dev/decks/${ID}?sort=name`,
      "http.route": "/decks/[id]",
      "next.route": "/decks/[id]",
      ...extra,
    },
  });

  it("names a server root METHOD plus its route pattern, keeps its op, and calls the name a route", () => {
    for (const name of [`GET /decks/${ID}`, "GET /decks/[id]", "GET"]) {
      const out = scrubSpan(root(name));
      expect(out.name).toBe("GET /decks/[id]");
      expect(out.attributes).toMatchObject({
        "sentry.op": "http.server",
        "sentry.source": "route",
        "sentry.segment.name.source": "route",
        "sentry.segment.name": "GET /decks/[id]",
        "http.route": "/decks/[id]",
        "next.route": "/decks/[id]",
      });
      expect(JSON.stringify(out)).not.toContain(ID);
      expect(JSON.stringify(out)).not.toContain("sort=");
    }
  });

  it("keeps an RSC request's name, and a page's route file as its pattern", () => {
    expect(scrubSpan(root("RSC GET /decks/[id]")).name).toBe("RSC GET /decks/[id]");
    expect(scrubSpan(root("GET /about/page", { "http.route": "/about/page", "next.route": "/about/page" })).name).toBe("GET /about");
  });

  it("carries the description as the pattern too", () => {
    const out = scrubSpan(root(`GET /decks/${ID}`, { "sentry.description": `GET /decks/${ID}` }));
    expect(out.attributes?.["sentry.description"]).toBe("GET /decks/[id]");
  });

  it("names a browser page load and navigation by the route pattern, op kept, source route", () => {
    for (const op of ["pageload", "navigation"]) {
      const out = scrubSpan({ name: `/decks/${ID}`, span_id: "a", trace_id: "b", is_segment: true, attributes: { "sentry.op": op, "sentry.source": "url", "sentry.origin": "auto.pageload.nextjs.app_router_instrumentation" } });
      expect(out.name).toBe("/decks/[id]");
      expect(out.attributes).toMatchObject({ "sentry.op": op, "sentry.source": "route" });
      expect(JSON.stringify(out)).not.toContain(ID);
    }
  });

  it("names the proxy's root by Next's fixed middleware name", () => {
    const out = scrubSpan({ name: "middleware GET", span_id: "a", trace_id: "b", is_segment: true, attributes: { "sentry.op": "middleware", "sentry.source": "route" } });
    expect(out.name).toBe("middleware GET");
    expect(out.attributes).toMatchObject({ "sentry.op": "middleware", "sentry.source": "route" });
  });

  it("names an outgoing request by its method and host when the SDK named it by the method alone", () => {
    const out = scrubSpan({ name: "GET", span_id: "a", trace_id: "b", is_segment: false, attributes: { "sentry.op": "http.client", "http.request.method": "GET", "url.full": "https://api.clerk.com/v1/users/user_2NNEqL2nrIRdJ194" } });
    expect(out.name).toBe("GET https://api.clerk.com/[path]");
    expect(JSON.stringify(out)).not.toMatch(/user_2N/);
  });

  it("keeps a child's segment name by the same rule as a root's name", () => {
    const child = (segment: string) => scrubSpan({ name: "Middleware.execute", span_id: "a", trace_id: "b", is_segment: false, attributes: { "sentry.segment.name": segment } });
    expect(child("middleware GET").attributes).toEqual({ "sentry.segment.name": "middleware GET" });
    expect(child("/decks/abc123").attributes).toEqual({ "sentry.segment.name": "/decks/[id]" });
    expect(child("GET /decks/abc123").attributes).toEqual({ "sentry.segment.name": "GET /decks/[id]" });
    expect(child("Kitchen table").attributes).toEqual({});
  });
});
