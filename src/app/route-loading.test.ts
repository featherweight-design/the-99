import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { shellCopy } from "../lib/copy/shell";

const APP = join(__dirname);

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

function segmentsWithPages(dir: string, prefix = ""): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (!statSync(path).isDirectory()) continue;
    const segment = prefix ? `${prefix}/${entry}` : entry;
    const files = readdirSync(path);
    if (files.includes("page.tsx")) found.push(segment);
    found.push(...segmentsWithPages(path, segment));
  }
  return found;
}

describe("route loading boundaries", () => {
  it("gives every fetching segment its own loading.tsx", () => {
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
