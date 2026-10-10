import { describe, expect, it } from "vitest";
import { ABOUT_VERSION, aboutEntries } from "../copy/about";
import {
  ABOUT_COOKIE,
  cookieIsCurrent,
  cookieValue,
  gateApplies,
  gateDecision,
  gateHandles,
  isDocumentLoad,
  safeNext,
  SHEET_COOKIE,
  sheetCookieIsCurrent,
  sheetDecision,
} from "./gate";

describe("safeNext", () => {
  it("keeps a same-origin path and its query", () => {
    expect(safeNext("/decks?sort=name")).toBe("/decks?sort=name");
  });

  it("leaves the destination's own escapes alone", () => {
    // Both callers hand over a decoded value, so decoding again here would eat
    // the escapes that belong to the query: this destination is ONE parameter
    // whose value contains an ampersand, and a second decode makes it two.
    expect(safeNext("/commanders?q=a%26b")).toBe("/commanders?q=a%26b");
    expect(safeNext("/collection?q=%23foil")).toBe("/collection?q=%23foil");
  });

  it("falls back home rather than leaving the origin", () => {
    expect(safeNext("https://evil.example/decks")).toBe("/");
    expect(safeNext("javascript:alert(1)")).toBe("/");
  });

  it("refuses an authority even when it would resolve to a real local route", () => {
    // The case the first version of this test got wrong. `//evil.example` has
    // an EMPTY path, so it resolved to "/" and matched the fallback by
    // coincidence — which made the guard against it look dead when mutated.
    // With a path attached, the resolved answer is a route the reader never
    // asked for, chosen by whoever wrote the link.
    expect(safeNext("//evil.example/decks")).toBe("/");
    expect(safeNext("//evil.example/decks?a=1")).toBe("/");
    expect(safeNext("/\\evil.example/collection")).toBe("/");
    expect(safeNext("//evil.example")).toBe("/");
  });

  it("falls back home on nothing, and on a value that cannot be decoded", () => {
    expect(safeNext(null)).toBe("/");
    expect(safeNext(undefined)).toBe("/");
    expect(safeNext("")).toBe("/");
    // Not a path, so it never reaches the resolver.
    expect(safeNext("%")).toBe("/");
  });
});

describe("the cookie", () => {
  it("is bound to the reader as well as the version", () => {
    expect(cookieIsCurrent(cookieValue("user_a"), "user_a")).toBe(true);
    // A second account on the same browser must not inherit the first's
    // acknowledgement, or they never see the page at all.
    expect(cookieIsCurrent(cookieValue("user_a"), "user_b")).toBe(false);
  });

  it("goes stale when the version moves", () => {
    expect(cookieIsCurrent(`user_a.${ABOUT_VERSION - 1}`, "user_a")).toBe(false);
    expect(cookieIsCurrent(undefined, "user_a")).toBe(false);
  });
});

describe("gateApplies", () => {
  it("exempts the page itself, or the redirect loops", () => {
    expect(gateApplies("/about")).toBe(false);
  });

  it("exempts what is not a reader's page, bare roots included", () => {
    expect(gateApplies("/api/health")).toBe(false);
    expect(gateApplies("/_next/static/chunk.js")).toBe(false);
    // The proxy's matcher includes `/(api|trpc)(.*)`, which matches these with
    // no trailing slash; a prefix test alone lets them through to the gate.
    expect(gateApplies("/api")).toBe(false);
    expect(gateApplies("/trpc")).toBe(false);
    // And a route that merely starts with those letters is still a page.
    expect(gateApplies("/apiary")).toBe(true);
  });

  it("applies to the routes a reader is actually sent away from", () => {
    expect(gateApplies("/")).toBe(true);
    expect(gateApplies("/decks")).toBe(true);
    expect(gateApplies("/decks/abc/changes")).toBe(true);
  });
});

describe("gateHandles", () => {
  const h = (init: Record<string, string>) => new Headers(init);

  it("gates a hard navigation", () => {
    expect(gateHandles("GET", h({ accept: "text/html,application/xhtml+xml" }))).toBe(true);
  });

  it("gates a client transition, which is how the reader actually moves", () => {
    // Every <Link> press in the shell carries RSC: 1. Skipping those was the
    // first version of this rule, and it meant a reader who landed on the
    // public "/" and clicked Decks never met the gate at all.
    expect(gateHandles("GET", h({ RSC: "1" }))).toBe(true);
  });

  it("never gates a prefetch", () => {
    // The gated response writes the cookie, so gating a prefetch would mark the
    // page shown because a pointer passed over a link.
    expect(gateHandles("GET", h({ RSC: "1", "Next-Router-Prefetch": "1" }))).toBe(false);
    expect(gateHandles("GET", h({ RSC: "1", purpose: "prefetch" }))).toBe(false);
  });

  it("never gates a write, or a request for something that is not a page", () => {
    expect(gateHandles("POST", h({ accept: "text/html" }))).toBe(false);
    expect(gateHandles("GET", h({ accept: "application/json" }))).toBe(false);
  });
});

describe("gateDecision", () => {
  const base = { userId: "user_1", pathname: "/decks", search: "", version: 2 };

  it("passes a current reader, and still writes the cookie", () => {
    // The cookie is what makes the next navigation free. A pass that skipped it
    // would read the database on every click for the rest of the session.
    expect(gateDecision({ ...base, seen: 2 })).toEqual({
      kind: "pass",
      cookie: cookieValue("user_1", 2),
    });
  });

  it("redirects a reader who is behind, carrying where they were going", () => {
    const d = gateDecision({ ...base, seen: 1 });
    expect(d).toEqual({
      kind: "redirect",
      to: "/about?next=%2Fdecks",
      cookie: cookieValue("user_1", 2),
    });
  });

  it("encodes the destination whole, query included", () => {
    // Encoded as one value: an unencoded `&` inside the destination would read
    // as the end of the `next` parameter, and the reader would come back to a
    // truncated URL.
    const d = gateDecision({ ...base, pathname: "/decks", search: "?a=1&b=2", seen: 0 });
    expect(d).toEqual({
      kind: "redirect",
      to: `/about?next=${encodeURIComponent("/decks?a=1&b=2")}`,
      cookie: cookieValue("user_1", 2),
    });
    // And the round trip is lossless.
    const back = new URL(`https://x.invalid${(d as { to: string }).to}`);
    expect(safeNext(back.searchParams.get("next"))).toBe("/decks?a=1&b=2");
  });

  it("treats a reader ahead of the version as current", () => {
    // An older deployment serving an older ABOUT_VERSION must not re-show the
    // page to someone who has already acknowledged a newer one.
    expect(gateDecision({ ...base, seen: 5 }).kind).toBe("pass");
  });
});

describe("the appendix's line on the sheet (plan 2026-09-28, PR C)", () => {
  const all = aboutEntries.filter((e) => !e.switch);
  const seen = (version: number, ids: string[] = []) => ({ version, ids });
  const V = ABOUT_VERSION;
  // The newest unswitched entry's version: 12 added only switched entries, so a reader one behind
  // the CURRENT version has nothing to be told about while a reader one behind this one does.
  const W = Math.max(...all.map((e) => e.since));

  it("rides a sheet already drawing, after its entries", () => {
    const d = sheetDecision({ userId: "u", seen: seen(W - 1), visible: all, version: V, appendix: true });
    expect(d.show && d.header.split(",").at(-1)).toBe("how-it-works");
  });

  it("never summons a sheet on its own", () => {
    expect(sheetDecision({ userId: "u", seen: seen(V), visible: all, version: V, appendix: true }).show).toBe(false);
  });

  // With HOW_IT_WORKS_ENABLED off the proxy's decision is today's, byte for byte, in every state:
  // the header and cookie a reader gets do not move until the switch does.
  it("decides exactly as it did before the appendix, with the switch off", () => {
    const states = [seen(0), seen(V - 1), seen(V), seen(V - 1, ["how-it-works"]), seen(3, ["x"])];
    for (const s of states) {
      const off = sheetDecision({ userId: "u", seen: s, visible: all, version: V, appendix: false });
      expect(off).toEqual(sheetDecision({ userId: "u", seen: s, visible: all, version: V }));
      const unseen = all.filter((e) => e.since > s.version);
      const today =
        s.version === 0 && s.ids.length === 0
          ? { show: true, header: "0", cookie: `u.${V}` }
          : unseen.length === 0
            ? { show: false, cookie: `u.${V}` }
            : { show: true, header: unseen.map((e) => e.id).join(","), cookie: `u.${V}` };
      expect(off).toEqual(today);
    }
  });

  it("stays off a first-run sheet, a reader who has seen it, and a deployment with the switch off", () => {
    expect(sheetDecision({ userId: "u", seen: seen(0), visible: all, version: V, appendix: true })).toMatchObject({ header: "0" });
    const seenIt = sheetDecision({ userId: "u", seen: seen(V - 1, ["how-it-works"]), visible: all, version: V, appendix: true });
    expect(seenIt.show && seenIt.header).not.toContain("how-it-works");
    const off = sheetDecision({ userId: "u", seen: seen(V - 1), visible: all, version: V });
    expect(off.show && off.header).not.toContain("how-it-works");
  });
});

describe("the sheet (R6)", () => {
  // The page with every feature switch off: an entry tied to one is not drawn.
  const all = aboutEntries.filter((e) => !e.switch);
  const seen = (version: number, ids: string[] = []) => ({ version, ids });
  const V = ABOUT_VERSION;
  const W = Math.max(...all.map((e) => e.since));

  it("shows the sheet to a reader who is behind, naming what they have not seen", () => {
    const d = sheetDecision({ userId: "u", seen: seen(W - 1), visible: all, version: V });
    const want = all.filter((e) => e.since > W - 1).map((e) => e.id).join(",");
    expect(d).toEqual({ show: true, header: want, cookie: `u.${V}` });
  });

  it("shows the first-run variant to a brand-new account", () => {
    expect(sheetDecision({ userId: "u", seen: seen(0), visible: all, version: V })).toEqual({
      show: true,
      header: "0",
      cookie: `u.${V}`,
    });
  });

  it("does not show it to a current reader, but still marks the browser", () => {
    expect(sheetDecision({ userId: "u", seen: seen(V), visible: all, version: V })).toEqual({ show: false, cookie: `u.${V}` });
    expect(sheetDecision({ userId: "u", seen: seen(V + 3), visible: all, version: V })).toEqual({ show: false, cookie: `u.${V}` });
  });

  it("uses a new cookie, never the gate's (E1)", () => {
    expect(SHEET_COOKIE).toBe("about_sheet");
    expect(SHEET_COOKIE).not.toBe(ABOUT_COOKIE);
  });

  it("binds the cookie to the reader and the version", () => {
    expect(sheetCookieIsCurrent(`u.${V}`, "u", all, V)).toBe(true);
    expect(sheetCookieIsCurrent(`u.${V}`, "other", all, V)).toBe(false);
    expect(sheetCookieIsCurrent(`u.${V - 1}`, "u", all, V)).toBe(false);
    expect(sheetCookieIsCurrent(undefined, "u", all, V)).toBe(false);
  });

  it("acts on document loads only, never a client transition or a prefetch", () => {
    const h = (o: Record<string, string>) => new Headers(o);
    expect(isDocumentLoad("GET", h({ accept: "text/html" }))).toBe(true);
    expect(isDocumentLoad("GET", h({ accept: "text/html", RSC: "1" }))).toBe(false);
    expect(isDocumentLoad("GET", h({ RSC: "1" }))).toBe(false);
    expect(isDocumentLoad("GET", h({ accept: "text/html", "Next-Router-Prefetch": "1" }))).toBe(false);
    expect(isDocumentLoad("GET", h({ accept: "text/html", purpose: "prefetch" }))).toBe(false);
    expect(isDocumentLoad("POST", h({ accept: "text/html" }))).toBe(false);
    expect(isDocumentLoad("GET", h({ accept: "application/json" }))).toBe(false);
  });
});
