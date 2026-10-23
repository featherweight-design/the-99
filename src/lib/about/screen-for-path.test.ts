import { describe, expect, it } from "vitest";
import { ABOUT_SCREENS, type AboutScreen } from "../copy/about";
import { SCREEN_WHERE } from "../copy/discovery";
import { screenForPath } from "./screen-for-path";

// A path for every screen a path can reach: `account` is the menu on every screen and never one.
const PATHS: Record<Exclude<AboutScreen, "account">, [string, string?]> = {
  home: ["/"],
  collection: ["/collection"],
  "card-details": ["/collection", "?card=abc"],
  sets: ["/collection/sets"],
  proxies: ["/collection/proxies"],
  history: ["/collection/history"],
  wishlist: ["/collection/wishlist"],
  upload: ["/collection/replace"],
  commanders: ["/commanders"],
  discover: ["/discover"],
  "new-deck": ["/decks/new"],
  decks: ["/decks"],
  deck: ["/decks/0b6c2f4e-1111-4222-8333-444455556666"],
  friends: ["/friends"],
  credits: ["/credits"],
  settings: ["/settings"],
};

describe("screenForPath: a Rule 0 table", () => {
  it("is Friends' screen, where the table's pod and its entries live", () => {
    expect(screenForPath("/friends/table/7a0e0000-0000-4000-8000-000000000001")).toBe("friends");
    // Anything deeper under a table still has no screen.
    expect(screenForPath("/friends/table/7a0e0000-0000-4000-8000-000000000001/x")).toBeNull();
  });
});

describe("screenForPath: a friend's pages", () => {
  it("is Friends' screen, where `friend-decks` lives: the page, its tabs and a friend's deck", () => {
    for (const p of ["/friends/p1", "/friends/p1/wishlist", "/friends/p1/decks", "/friends/p1/decks/7a0e0000-0000-4000-8000-000000000001"]) {
      expect(screenForPath(p), p).toBe("friends");
    }
  });
});

describe("screenForPath", () => {
  it("resolves every screen but the account menu from its route", () => {
    for (const s of ABOUT_SCREENS) {
      if (s === "account") continue;
      const [path, search] = PATHS[s];
      expect(screenForPath(path, search), s).toBe(s);
    }
  });

  it("agrees with every route SCREEN_WHERE prints", () => {
    for (const s of ABOUT_SCREENS) {
      const where = SCREEN_WHERE[s];
      if (where.startsWith("/")) expect(screenForPath(where), s).toBe(s);
    }
  });

  it("never resolves the account menu", () => {
    for (const p of ["/account", "/user", "/about", "/admin", "/settings"]) expect(screenForPath(p)).not.toBe("account");
  });

  it("reads an open card on any Collection list as Card details", () => {
    for (const p of ["/collection", "/collection/sets", "/collection/proxies", "/collection/history", "/collection/wishlist"]) {
      expect(screenForPath(p, "?card=x&avail=free"), p).toBe("card-details");
      expect(screenForPath(p, new URLSearchParams({ card: "x" })), p).toBe("card-details");
    }
    // Not on the upload, and not on a deck.
    expect(screenForPath("/collection/replace", "?card=x")).toBe("upload");
    expect(screenForPath("/decks/abc", "?card=x")).toBe("deck");
  });

  it("keeps a page's own sub-pages on its screen", () => {
    expect(screenForPath("/collection/sets/mh3")).toBe("sets");
    expect(screenForPath("/collection/replace/summary/u1")).toBe("upload");
    expect(screenForPath("/commanders/atraxa")).toBe("commanders");
    expect(screenForPath("/decks/new/choose")).toBe("new-deck");
    expect(screenForPath("/decks/precons")).toBe("new-deck");
    expect(screenForPath("/decks/precons/some-file")).toBe("new-deck");
    expect(screenForPath("/decks/import")).toBe("new-deck");
    expect(screenForPath("/collection/")).toBe("collection");
  });

  it("answers null for a page no entry lives on (G21)", () => {
    for (const p of ["/decks/shopping", "/about", "/admin", "/decks/abc/changes", "/decks/abc/import", "/lab/scan", "/collection/elsewhere"]) {
      expect(screenForPath(p), p).toBeNull();
    }
  });
});
