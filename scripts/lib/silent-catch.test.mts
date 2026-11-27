import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { catchSites, scanSilentCatches, silentCatchFindings } from "./silent-catch.mjs";

describe("catchSites", () => {
  it("flags a catch clause and a .catch call that neither report nor rethrow", () => {
    const s = catchSites('async function f() { try { await a(); } catch { setFailed(true); } b().catch(() => null); }');
    expect(s.map((x) => [x.kind, x.handled, x.marker])).toEqual([["catch", false, "none"], [".catch", false, "none"]]);
  });
  it("passes a site that reports or rethrows", () => {
    const s = catchSites('try { a(); } catch (e) { captureClientError("x.y", e); }\ntry { a(); } catch (e) { throw e; }\nb().catch((e) => captureClientError("x.z", e));');
    expect(s.every((x) => x.handled)).toBe(true);
  });
  it("does not let a trailing marker cover the catch on the next line", () => {
    const src = "try { a(); } catch { x(); } // silent-catch: expected: abort\ntry { a(); } catch { x(); }";
    expect(catchSites(src).map((x) => x.marker)).toEqual(["valid", "none"]);
  });
  it("counts only real calls and throws, not a comment or a throw in a nested function", () => {
    const src = "try { a(); } catch { /* captureClientError */ f(() => { throw 1; }); }";
    expect(catchSites(src)[0].handled).toBe(false);
  });
  it("reads a marker on the line above, on the line, or inside, and rejects a missing or unknown reason", () => {
    const src = [
      "// silent-catch: expected: refusal",
      "try { a(); } catch { x(); }",
      "try { a(); } catch { x(); } // silent-catch: expected: abort",
      "try { a(); } catch {",
      "  // silent-catch: expected: offline",
      "}",
      "// silent-catch:",
      "try { a(); } catch { x(); }",
      "try { a(); } catch { x(); } // silent-catch: expected: because",
    ].join("\n");
    expect(catchSites(src).map((x) => x.marker)).toEqual(["valid", "valid", "valid", "invalid", "invalid"]);
  });
});

async function tree(files: Record<string, string>) {
  const root = await mkdtemp(join(tmpdir(), "silent-catch-"));
  for (const [p, text] of Object.entries(files)) {
    await mkdir(join(root, p, ".."), { recursive: true });
    await writeFile(join(root, p), text);
  }
  return root;
}

describe("scan and ratchet", () => {
  it("scans only client files and skips tests", async () => {
    const root = await tree({
      "a.tsx": '"use client";\ntry { a(); } catch {}\n',
      "b.ts": "try { a(); } catch {}\n",
      "c.test.tsx": '"use client";\ntry { a(); } catch {}\n',
    });
    const scan = await scanSilentCatches(root);
    expect(scan.counts).toEqual({ [join(root, "a.tsx")]: 1 });
  });
  it("fails a new silent site, a grown count and a stale baseline, and passes an exact match", () => {
    const scan = { counts: { "a.tsx": 2, "n.tsx": 1 }, bad: [] };
    expect(silentCatchFindings(scan, { "a.tsx": 2, "n.tsx": 1 })).toEqual([]);
    expect(silentCatchFindings(scan, { "a.tsx": 1, "n.tsx": 1 }).map((f) => f.kind)).toEqual(["grew"]);
    expect(silentCatchFindings(scan, { "a.tsx": 2 }).map((f) => f.kind)).toEqual(["new"]);
    expect(silentCatchFindings(scan, { "a.tsx": 3, "n.tsx": 1 }).map((f) => f.kind)).toEqual(["stale"]);
    expect(silentCatchFindings({ counts: {}, bad: [{ path: "a.tsx", line: 4 }] }, {}).map((f) => f.kind)).toEqual(["marker"]);
  });
});
