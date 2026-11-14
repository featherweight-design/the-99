// @vitest-environment node
import { readFileSync } from "node:fs";
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

  it("are the only pages that host the upload flow, Home through its first-run step", () => {
    // ReplaceFlow is imported by the replace page and by the first-run step only; the step is Home's.
    expect(read("collection/replace/page.tsx")).toContain("ReplaceFlow");
    expect(read("../components/home/first-run-step-one.tsx")).toContain("ReplaceFlow");
    expect(read("../components/home/first-run.tsx")).toContain("first-run-step-one");
    expect(read("page.tsx")).toContain("FirstRunChecklist");
  });
});
