import { describe, expect, it } from "vitest";
import { makeLogBudget, originOf, parseReports } from "./csp-report";

const legacy = (over: Record<string, unknown> = {}) => ({
  "csp-report": {
    "document-uri": "https://staging.the-99.dev/decks/0f0f0f0f-0f0f-4f0f-8f0f-0f0f0f0f0f0f?tab=cards",
    "effective-directive": "img-src",
    "blocked-uri": "https://evil.example/path/x.png?token=secret",
    ...over,
  },
});

describe("originOf", () => {
  it("keeps scheme and host and drops path, query and credentials", () => {
    expect(originOf("https://user:pw@cdn.example.com/a/b?q=1#f")).toBe("https://cdn.example.com");
  });
  it("passes CSP keywords and reduces other schemes to the scheme", () => {
    expect(originOf("inline")).toBe("inline");
    expect(originOf("eval")).toBe("eval");
    expect(originOf("data:image/png;base64,AAAA")).toBe("data");
  });
  it("refuses a custom scheme too long to be one, so a report cannot fill a log line", () => {
    expect(originOf(`${"a".repeat(2000)}://x`)).toBeNull();
    expect(originOf("chrome-extension://abc/x.js")).toBe("chrome-extension");
  });
  it("refuses a non-string, an empty string and an oversized one", () => {
    for (const v of [null, 5, "", "x".repeat(3000)]) expect(originOf(v)).toBeNull();
  });
});

describe("parseReports", () => {
  it("reads the legacy shape and strips the query and the id from the page", () => {
    expect(parseReports(legacy())).toEqual([{ directive: "img-src", blocked: "https://evil.example", page: "/decks/:id" }]);
  });
  it("reads the Reporting API's array", () => {
    const body = { effectiveDirective: "script-src", blockedURL: "inline", documentURL: "https://x.test/about" };
    expect(parseReports([{ type: "csp-violation", body }])).toEqual([{ directive: "script-src", blocked: "inline", page: "/about" }]);
  });
  it("drops a report whose directive is not a plain name", () => {
    expect(parseReports(legacy({ "effective-directive": "img-src\nINJECTED line" }))).toEqual([]);
    expect(parseReports(legacy({ "effective-directive": "<script>" }))).toEqual([]);
  });
  it("drops a report with no usable blocked origin or page", () => {
    expect(parseReports(legacy({ "blocked-uri": "" }))).toEqual([]);
    expect(parseReports(legacy({ "document-uri": "not a url" }))).toEqual([]);
  });
  it("ignores non-objects and caps a batch at ten", () => {
    expect(parseReports(["x", 1, null])).toEqual([]);
    expect(parseReports(Array.from({ length: 30 }, () => legacy()))).toHaveLength(10);
  });
});

describe("makeLogBudget", () => {
  it("allows its limit per minute and starts over in the next minute", () => {
    let t = 0;
    const may = makeLogBudget(2, () => t);
    expect([may(), may(), may()]).toEqual([true, true, false]);
    t = 61_000;
    expect(may()).toBe(true);
  });
});
