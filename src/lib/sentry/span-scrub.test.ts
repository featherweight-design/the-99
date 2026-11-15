import { describe, expect, it } from "vitest";
import { scrubSpan, scrubSpanName } from "./span-scrub";

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

  it("drops any attribute holding an email or a Clerk id, and cuts SQL literals", () => {
    const out = scrubSpan(span("select 1", { note: "for someone@example.com", owner: "user_2NNEqL2nrIRdJ194", "db.query.text": "select * from decks where name = 'Kitchen table'" }));
    expect(out.attributes).toEqual({ "db.query.text": "select * from decks where name = '?'" });
    expect(scrubSpanName("mail sent to someone@example.com")).toBe("mail sent to [redacted]");
  });
});
