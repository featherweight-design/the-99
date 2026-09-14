import { readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { shellCopy } from "../lib/copy/shell";

// import.meta.url, not __dirname: Vitest runs tests as ESM.
const APP = dirname(fileURLToPath(import.meta.url));

// A segment reached by a link, that fetches before it can paint, owns a
// `loading.tsx`. Without one Next walks up to the nearest ancestor boundary and
// shows that segment's words — which is how `/discover`, added by the two-lane
// split, greeted a lane of commanders you do not own with "counting what you've
// got". The rule is asserted rather than remembered, so the next lane is caught
// when it is added and not when someone notices the wrong sentence.
const NO_BOUNDARY_NEEDED = new Set([
  // Awaits auth and renders a client form. Unlinked, and the /decks boundary
  // above it says the true thing in the meantime.
  "decks/import",
]);

// Includes the directory it is handed, so the root segment — `src/app/page.tsx`,
// the home route — is covered like any other and cannot lose its boundary
// silently. `""` is that segment; `join(APP, "")` is `APP`.
function segmentsWithPages(dir: string, segment = ""): string[] {
  const entries = readdirSync(dir);
  const found = entries.includes("page.tsx") ? [segment] : [];
  for (const entry of entries) {
    const path = join(dir, entry);
    if (!statSync(path).isDirectory()) continue;
    found.push(...segmentsWithPages(path, segment ? `${segment}/${entry}` : entry));
  }
  return found;
}

describe("route loading boundaries", () => {
  it("gives every segment that owns a page.tsx its own loading.tsx", () => {
    const missing = segmentsWithPages(APP).filter(
      (segment) =>
        !NO_BOUNDARY_NEEDED.has(segment) &&
        !readdirSync(join(APP, segment)).includes("loading.tsx"),
    );
    expect(missing).toEqual([]);
  });

  it("gives discover its own words rather than the home boundary's", () => {
    expect(readdirSync(join(APP, "discover"))).toContain("loading.tsx");
    expect(shellCopy.loading.discover).not.toEqual(shellCopy.loading.home);
  });
});
