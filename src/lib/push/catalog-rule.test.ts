import { describe, expect, it } from "vitest";

import { catalogBatchKey, catalogKey, catalogPushKinds, parseCatalogKey } from "./catalog-rule";

const env = (over: Record<string, string> = {}) =>
  ({ PUSH_ENABLED: "true", HOME_FEED_ENABLED: "true", ...over }) as unknown as NodeJS.ProcessEnv;

describe("a catalog item's push key", () => {
  it("is the feed's own key: set:<code>, precon:<file name>", () => {
    expect(catalogKey("new-set", "dsk")).toBe("set:dsk");
    expect(catalogKey("new-precon", "Death Toll_DSC")).toBe("precon:Death Toll_DSC");
  });

  it("parses back to the code or file name, whatever the file name holds", () => {
    expect(parseCatalogKey("new-set", "set:dsk")).toBe("dsk");
    expect(parseCatalogKey("new-precon", "precon:Death Toll_DSC")).toBe("Death Toll_DSC");
    expect(parseCatalogKey("new-precon", "precon:a:b")).toBe("a:b");
    expect(parseCatalogKey("new-precon", catalogKey("new-precon", "x y"))).toBe("x y");
  });

  it("names nothing under the other kind's prefix, a stored item's key or an empty id", () => {
    expect(parseCatalogKey("new-set", "precon:dsk")).toBeNull();
    expect(parseCatalogKey("new-precon", "set:dsk")).toBeNull();
    expect(parseCatalogKey("new-set", "item:1234")).toBeNull();
    expect(parseCatalogKey("new-set", "set:")).toBeNull();
    expect(parseCatalogKey("new-set", "dsk")).toBeNull();
  });
});

describe("a catalog batch", () => {
  it("is shared by one UTC day's arrivals of a kind, so a refresh's precons are one push", () => {
    const a = catalogBatchKey("new-precon", new Date("2026-10-22T09:15:00Z"));
    expect(a).toBe("new-precon:2026-10-22");
    expect(catalogBatchKey("new-precon", new Date("2026-10-22T23:59:59Z"))).toBe(a);
  });

  it("is a new batch the next UTC day, and never shared across kinds", () => {
    expect(catalogBatchKey("new-precon", new Date("2026-10-23T00:00:00Z"))).not.toBe(catalogBatchKey("new-precon", new Date("2026-10-22T23:59:59Z")));
    expect(catalogBatchKey("new-set", new Date("2026-10-22T09:15:00Z"))).not.toBe(catalogBatchKey("new-precon", new Date("2026-10-22T09:15:00Z")));
  });
});

describe("the catalog kinds a reader's switches allow pushing", () => {
  it("both, with push and Home's news on", () => {
    expect(catalogPushKinds(env())).toEqual(["new-set", "new-precon"]);
  });

  it("none with push off, or Home's news off", () => {
    expect(catalogPushKinds(env({ PUSH_ENABLED: "false" }))).toEqual([]);
    expect(catalogPushKinds(env({ HOME_FEED_ENABLED: "false" }))).toEqual([]);
  });
});
