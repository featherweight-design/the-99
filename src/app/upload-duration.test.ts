// @vitest-environment node
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// `confirmUpload` (called from `ReplaceFlow`) warms the new collection in an `after()`: ~40 sequential fetch batches on a cold
// EDHREC cache. A page's `maxDuration` bounds the Server Actions invoked from it, so every page that hosts `ReplaceFlow` must
// carry the limit: the replace page, and Home through its first-run step (a newcomer's first upload).
const HERE = dirname(fileURLToPath(import.meta.url));
const read = (f: string) => readFileSync(join(HERE, f), "utf8");
const limit = (src: string) => Number(/export const maxDuration = (\d+);/.exec(src)?.[1] ?? 0);

describe("the pages an upload is confirmed from", () => {
  it("both set a maxDuration long enough for the warm-up", () => {
    expect(limit(read("collection/replace/page.tsx"))).toBe(300);
    expect(limit(read("page.tsx"))).toBe(300);
  });

  it("are the only importers of the upload flow, Home through its first-run step", () => {
    // Every non-test file under src that imports `replace-flow` (a directory walk, so a third host fails here).
    const root = join(HERE, "..");
    const importers: string[] = [];
    const walk = (dir: string) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, e.name);
        if (e.isDirectory()) walk(path);
        else if (/\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) && /from "[^"]*replace-flow"/.test(readFileSync(path, "utf8"))) importers.push(path.slice(root.length + 1));
      }
    };
    walk(root);
    expect(importers.sort()).toEqual(["app/collection/replace/page.tsx", "components/home/first-run-step-one.tsx"]);
    // The first-run step is Home's: its checklist is what Home renders.
    expect(read("../components/home/first-run.tsx")).toContain("first-run-step-one");
    expect(read("page.tsx")).toContain("FirstRunChecklist");
  });
});
