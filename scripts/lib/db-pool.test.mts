import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import nextConfig from "../../next.config";
import { bundledPools } from "./db-pool.mjs";

const made: string[] = [];
async function tree(files: Record<string, string>) {
  const dir = await mkdtemp(join(tmpdir(), "db-pool-"));
  made.push(dir);
  for (const [path, text] of Object.entries(files)) {
    await mkdir(join(dir, path, ".."), { recursive: true });
    await writeFile(join(dir, path), text);
  }
  return dir;
}
afterEach(async () => {
  await Promise.all(made.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

describe("bundledPools", () => {
  it("names a chunk that carries the driver's Pool, however deep", async () => {
    const dir = await tree({ "chunks/ssr/a.js": "class NeonPool extends Pool {}", "chunks/b.js": "ok" });
    expect(await bundledPools(dir)).toEqual([join(dir, "chunks/ssr/a.js")]);
  });

  it("reads source maps as nothing: a map names the class without bundling it", async () => {
    const dir = await tree({ "chunks/a.js.map": '{"names":["NeonPool"]}', "chunks/a.js": "ok" });
    expect(await bundledPools(dir)).toEqual([]);
  });

  it("finds nothing in a tree with no Pool", async () => {
    expect(await bundledPools(await tree({ "chunks/a.js": "require('@neondatabase/serverless')" }))).toEqual([]);
  });
});

describe("next.config", () => {
  // Without this entry the server bundles its own copy of the driver, `instanceof Pool` is false inside
  // drizzle, and `db.transaction` stops being a transaction. `pnpm check:db-pool` proves it on the build.
  it("loads the Neon driver from node_modules, so drizzle-orm and the app share one copy", () => {
    expect(nextConfig.serverExternalPackages).toContain("@neondatabase/serverless");
  });
});
