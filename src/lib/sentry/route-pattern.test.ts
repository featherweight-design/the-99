import { readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ROUTE_PATTERNS, routePattern } from "./route-pattern";

/** Every page and route handler under src/app, as Next routes it: route groups dropped. */
function appRoutes(): string[] {
  const files = readdirSync("src/app", { recursive: true, encoding: "utf8" })
    .filter((f) => /(^|\/)(page|route)\.tsx?$/.test(f));
  return [...new Set(files.map((f) => {
    const dir = f.replace(/(^|\/)(page|route)\.tsx?$/, "").split("/").filter((s) => s && !/^\(.*\)$/.test(s)).join("/");
    return `/${dir}`;
  }))].sort();
}

describe("routePattern", () => {
  it("knows every route the app has, and no other (add a page, add its route here)", () => {
    expect([...ROUTE_PATTERNS].sort()).toEqual(appRoutes());
  });

  it("turns a path into its route pattern, a static segment before a dynamic one", () => {
    expect(routePattern("/decks/3f2a1b4c-0d5e-4f60-8a7b-9c0d1e2f3a4b")).toBe("/decks/[id]");
    expect(routePattern("/decks/precons")).toBe("/decks/precons");
    expect(routePattern("/decks/precons/TramplesaurusRex_FDC")).toBe("/decks/precons/[fileName]");
    expect(routePattern("/friend/SECRETTOKEN?x=1")).toBe("/friend/[token]");
    expect(routePattern("/join/abc#frag")).toBe("/join/[token]");
    expect(routePattern("/")).toBe("/");
    expect(routePattern("/decks/")).toBe("/decks");
  });

  it("passes Next's own route pattern whole, and never a path no route has", () => {
    expect(routePattern("/decks/[id]")).toBe("/decks/[id]");
    expect(routePattern("/Sol Ring/deck")).toBe("[unknown]");
    expect(routePattern("/decks/a/b/c/d")).toBe("[unknown]");
    expect(routePattern("/%E0%A4%A")).toBe("[unknown]");
  });
});
