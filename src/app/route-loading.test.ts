import { readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { pendingRouteFor } from "../lib/shell/pending-routes";

// import.meta.url, not __dirname: Vitest runs tests as ESM.
const APP = dirname(fileURLToPath(import.meta.url));

// Navigation pending (the navigation-pending handoff and its escalation addendum). A press marks
// itself at 120ms and escalates to the route's loading screen at 400ms, drawn by the shell; a
// direct load streams the same screen from the shell's Suspense fallback. So a route segment owns
// no `loading.tsx` of its own, because Next shows a boundary at press and would put the screen
// back on every navigation. These four keep theirs, and with it their screen at press: each is a
// deck surface whose wait is long enough that the screen is the answer, not a fallback.
const KEPT = ["decks/[id]", "decks/[id]/changes", "decks/[id]/import", "decks/new/choose"];

// Every directory under the app, the root included as `""`.
function segments(dir: string, segment = ""): { segment: string; hasPage: boolean }[] {
  const entries = readdirSync(dir);
  const found = [{ segment, hasPage: entries.includes("page.tsx") }];
  for (const entry of entries) {
    const path = join(dir, entry);
    if (!statSync(path).isDirectory()) continue;
    found.push(...segments(path, segment ? `${segment}/${entry}` : entry));
  }
  return found;
}

// A segment path as an address: a dynamic part becomes a stand-in value.
function addressOf(segment: string): string {
  return "/" + segment.replace(/\[[^\]]+\]/g, "x");
}

describe("route loading boundaries", () => {
  it("keeps a loading.tsx on exactly the four kept routes, the root included in the rest", () => {
    const withBoundary = segments(APP)
      .filter(({ segment }) => readdirSync(join(APP, segment)).includes("loading.tsx"))
      .map(({ segment }) => segment)
      .sort();
    expect(withBoundary).toEqual([...KEPT].sort());
  });

  it("maps every kept route to a kept screen, and every other page to an overlay", () => {
    for (const { segment, hasPage } of segments(APP)) {
      if (!hasPage) continue;
      const route = pendingRouteFor(addressOf(segment));
      expect({ segment, kind: route.kind }).toEqual({
        segment,
        kind: KEPT.includes(segment) ? "kept" : "overlay",
      });
    }
  });

  it("gives discover its own words rather than the home boundary's", () => {
    expect(pendingRouteFor("/discover")).toEqual({ kind: "overlay", key: "discover" });
  });
});
