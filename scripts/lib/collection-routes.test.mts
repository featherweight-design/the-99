import { describe, expect, it } from "vitest";
import { collectionRoutes } from "./collection-routes.mjs";

describe("collectionRoutes", () => {
  it("never lists a public page: a collection write must not expire the public card cache", () => {
    const paths = collectionRoutes().map((r: { path: string }) => r.path);
    expect(paths.some((p: string) => p.startsWith("/card") || p.startsWith("/commander/"))).toBe(false);
    // The walk is live: a page that does read the collection is still found.
    expect(paths).toContain("/collection");
  });
});
