import { describe, expect, it } from "vitest";

import { pathOf, pendingRouteFor } from "./pending-routes";

describe("pendingRouteFor: the screen each route shows while it loads", () => {
  it("maps each route to the screen its retired loading.tsx drew", () => {
    const key = (href: string) => {
      const r = pendingRouteFor(href);
      return r.kind === "overlay" ? r.key : `kept:${r.screen}`;
    };
    expect(key("/")).toBe("home");
    expect(key("/about")).toBe("about");
    expect(key("/collection")).toBe("collection");
    expect(key("/collection/replace")).toBe("collection");
    expect(key("/collection/replace/summary/abc")).toBe("collection");
    expect(key("/collection/proxies")).toBe("proxies");
    expect(key("/collection/sets")).toBe("sets");
    expect(key("/collection/sets/mh3")).toBe("setGrid");
    expect(key("/commanders")).toBe("commanders");
    expect(key("/commanders/atraxa")).toBe("commanders");
    expect(key("/discover")).toBe("discover");
    expect(key("/decks")).toBe("decks");
    expect(key("/decks/import")).toBe("decks");
    expect(key("/decks/new")).toBe("deckNew");
  });

  it("names the four kept routes as kept, with their own screen", () => {
    const id = "6ad8011d-3471-4369-9d68-b264cc027487";
    expect(pendingRouteFor(`/decks/${id}`)).toEqual({ kind: "kept", screen: "decks" });
    expect(pendingRouteFor(`/decks/${id}/changes`)).toEqual({ kind: "kept", screen: "decks" });
    expect(pendingRouteFor(`/decks/${id}/import`)).toEqual({ kind: "kept", screen: "deckUpdate" });
    expect(pendingRouteFor("/decks/new/choose?t=elves")).toEqual({ kind: "kept", screen: "choose" });
  });

  it("reads the path alone, without its query, hash or trailing slash", () => {
    expect(pathOf("/commanders?a=free#top")).toBe("/commanders");
    expect(pathOf("/decks/")).toBe("/decks");
    expect(pathOf("?v=rows")).toBe("/");
    expect(pendingRouteFor("/discover?s=new")).toEqual({ kind: "overlay", key: "discover" });
  });
});
