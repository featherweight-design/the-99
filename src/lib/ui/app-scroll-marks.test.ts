// Every scroll the app makes by hand must be marked as the app's, or quick return reads it as the reader scrolling
// and brings the phone header back over what the scroll just showed (card search plan PR B; Copilot found the
// unmarked ones one review round at a time, so the class is checked here instead).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SCROLL = /\bscrollIntoView\??\.?\(|\bwindow\.scroll(?:To|By)\(/;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.(ts|tsx)$/.test(name) && !/\.test\./.test(name) ? [path] : [];
  });
}

/** Each hand-made scroll in `src` without `noteAppScroll()` in the three lines above it. */
function unmarkedScrolls(root: string): string[] {
  const found: string[] = [];
  for (const path of files(root)) {
    // `reveal.ts` is the marker itself: its writes are counted by `appScrolling()` for the reveal's whole run.
    if (path.endsWith(join("lib", "ui", "reveal.ts"))) continue;
    const lines = readFileSync(path, "utf8").split("\n");
    lines.forEach((line, i) => {
      const code = line.replace(/\/\/.*$/, "");
      if (/^\s*\*/.test(line) || !SCROLL.test(code)) return;
      if (!lines.slice(Math.max(0, i - 3), i).some((l) => l.includes("noteAppScroll()"))) found.push(`${path}:${i + 1}`);
    });
  }
  return found;
}

describe("hand-made scrolls", () => {
  it("are all marked as the app's", () => {
    expect(unmarkedScrolls(join(process.cwd(), "src"))).toEqual([]);
  });
});
