import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { dynamic, GET } from "./route";

describe("GET /api/live", () => {
  it("answers 200 {status: ok} and is never cached", async () => {
    const res = GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
    expect(dynamic).toBe("force-dynamic");
  });

  // The whole point of the route: no import, direct or transitive, may reach the database or the health check. The
  // file imports nothing, so its graph is empty; a future import fails here and must be argued for.
  it("imports nothing, so no path reaches the database", () => {
    const source = readFileSync(join(__dirname, "route.ts"), "utf8");
    expect(source).not.toMatch(/^\s*import\s/m);
    expect(source).not.toMatch(/\brequire\(/);
    expect(source).not.toMatch(/\bimport\(/);
    expect(source).not.toMatch(/\bfrom\s+["']/); // `export * from` and `export { x } from` pull a module in too
  });
});
