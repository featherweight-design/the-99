import { readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ROUTE_PATTERNS, routePattern } from "./route-pattern";

/** The path Next serves a metadata file at, by its name. */
const METADATA: [RegExp, (dir: string) => string][] = [
  [/^robots\.ts$/, (d) => `${d}/robots.txt`],
  [/^manifest\.ts$/, (d) => `${d}/manifest.webmanifest`],
  [/^icon\.svg$/, (d) => `${d}/icon.svg`],
  [/^apple-icon\.png$/, (d) => `${d}/apple-icon.png`],
  [/^opengraph-image\.tsx$/, (d) => `${d}/opengraph-image`],
];

/** Every page, route handler and metadata route under src/app, as Next routes it: route groups dropped. */
function appRoutes(): string[] {
  const out = new Set<string>();
  for (const f of readdirSync("src/app", { recursive: true, encoding: "utf8" })) {
    const parts = f.split("/");
    const file = parts.pop()!;
    const dir = parts.filter((s) => !/^\(.*\)$/.test(s)).join("/");
    const at = dir ? `/${dir}` : "";
    if (/^(page|route)\.tsx?$/.test(file)) out.add(at || "/");
    for (const [re, path] of METADATA) if (re.test(file)) out.add(path(at));
  }
  return [...out].sort();
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
    // A route handler is routed at its folder, as a page is.
    expect(routePattern("/api/health")).toBe("/api/health");
    expect(routePattern("/out/wizards/42")).toBe("/out/wizards/[id]");
    expect(routePattern("/card/sol-ring-0123456789ab/opengraph-image")).toBe("/card/[slug]/opengraph-image");
  });

  it("passes Next's own route pattern whole, and never a path no route has", () => {
    expect(routePattern("/decks/[id]")).toBe("/decks/[id]");
    expect(routePattern("/Sol Ring/deck")).toBe("[unknown]");
    expect(routePattern("/decks/a/b/c/d")).toBe("[unknown]");
    expect(routePattern("/%E0%A4%A")).toBe("[unknown]");
  });
});
