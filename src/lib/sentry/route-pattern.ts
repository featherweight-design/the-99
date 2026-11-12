// The route tag on a Sentry event (FWD Sentry plan item 2): the app's route PATTERN, never the raw URL, so an id, a token or a
// player's text in a path never becomes a tag. Pure: the browser and the server both load it.
//
// `ROUTE_PATTERNS` is every page and route handler under `src/app`, route groups dropped. `route-pattern.test.ts` walks
// `src/app` and fails when this list and the app drift apart: add or remove the route here with the page.

export const ROUTE_PATTERNS: readonly string[] = [
  "/",
  "/about",
  "/about/[area]",
  "/admin",
  "/admin/accounts",
  "/admin/accounts/[clerkId]",
  "/admin/feedback",
  "/admin/flags",
  "/admin/flags/[name]",
  "/admin/groups",
  "/admin/groups/[id]",
  "/admin/groups/new",
  "/admin/invites",
  "/admin/invites/flyers/[code]",
  "/admin/models",
  "/admin/payments",
  "/announcements",
  "/api/card-detail/route.ts",
  "/api/card-scan/match/route.ts",
  "/api/card-scan/timing/route.ts",
  "/api/clerk-webhook/route.ts",
  "/api/collection-fields/route.ts",
  "/api/cron/account-sweep/route.ts",
  "/api/cron/announcements/route.ts",
  "/api/cron/invite-sweep/route.ts",
  "/api/cron/push-flush/route.ts",
  "/api/csp-report/route.ts",
  "/api/dev/model-stand-in/route.ts",
  "/api/discovery-fields/route.ts",
  "/api/friend-invites/route.ts",
  "/api/friend-spares/route.ts",
  "/api/health/route.ts",
  "/api/invite-qr/route.ts",
  "/api/live/route.ts",
  "/api/nav-stall/route.ts",
  "/api/rule-zero/tables/[id]/route.ts",
  "/api/scan-lab/cadence/route.ts",
  "/api/scan-lab/result/route.ts",
  "/api/spare-requests/route.ts",
  "/api/stripe-webhook/route.ts",
  "/card/[slug]",
  "/collection",
  "/collection/history",
  "/collection/proxies",
  "/collection/replace",
  "/collection/replace/summary/[uploadId]",
  "/collection/sets",
  "/collection/sets/[code]",
  "/collection/wishlist",
  "/commander/[slug]",
  "/commanders",
  "/commanders/[slug]",
  "/commanders/choose",
  "/commanders/discover",
  "/commanders/hidden",
  "/credits",
  "/decks",
  "/decks/[id]",
  "/decks/[id]/changes",
  "/decks/[id]/import",
  "/decks/import",
  "/decks/new",
  "/decks/new/choose",
  "/decks/precons",
  "/decks/precons/[fileName]",
  "/decks/precons/early/[id]/[position]",
  "/decks/shopping",
  "/discover",
  "/friend/[token]",
  "/friends",
  "/friends/[publicId]",
  "/friends/[publicId]/decks",
  "/friends/[publicId]/decks/[deckId]",
  "/friends/[publicId]/spares",
  "/friends/[publicId]/wishlist",
  "/friends/table/[id]",
  "/join/[token]",
  "/lab/scan",
  "/offline",
  "/out/wizards/[id]/route.ts",
  "/preview/landing",
  "/privacy",
  "/report",
  "/settings",
  "/sign-in",
  "/sign-in/tasks/[[...task]]",
  "/sign-up",
  "/sso-callback",
  "/terms",
];

const SPLIT = ROUTE_PATTERNS.map((p) => ({ pattern: p, parts: p === "/" ? [] : p.slice(1).split("/") }));

const dynamic = (part: string) => part.startsWith("[");
const catchAll = (part: string) => part.startsWith("[...") || part.startsWith("[[...");

/** Whether `parts` (a path's segments) fits a pattern's, and how specific the fit is: a static segment outranks a dynamic one. */
function fit(parts: readonly string[], pattern: readonly string[]): number[] | null {
  const score: number[] = [];
  for (let i = 0; i < pattern.length; i++) {
    const p = pattern[i];
    if (catchAll(p)) {
      if (p.startsWith("[...") && i >= parts.length) return null;
      score.push(0);
      return score;
    }
    if (i >= parts.length) return null;
    if (dynamic(p)) score.push(1);
    else if (p === parts[i]) score.push(2);
    else return null;
  }
  return parts.length === pattern.length ? score : null;
}

const better = (a: number[], b: number[]) => {
  for (let i = 0; i < Math.max(a.length, b.length); i++) if ((a[i] ?? -1) !== (b[i] ?? -1)) return (a[i] ?? -1) > (b[i] ?? -1);
  return false;
};

/**
 * The route pattern a path belongs to (`/decks/3f2a…` → `/decks/[id]`), a known pattern passed whole (Next's own
 * `router_path`), or `[unknown]` for a path no route has: a 404 path can hold anything a player typed.
 */
export function routePattern(path: string): string {
  const bare = path.split(/[?#]/, 1)[0].replace(/\/+$/, "") || "/";
  if (ROUTE_PATTERNS.includes(bare)) return bare;
  let parts: string[];
  try {
    parts = bare === "/" ? [] : bare.slice(1).split("/").map((s) => decodeURIComponent(s));
  } catch {
    return "[unknown]";
  }
  let best: { pattern: string; score: number[] } | null = null;
  for (const r of SPLIT) {
    const score = fit(parts, r.parts);
    if (score && (!best || better(score, best.score))) best = { pattern: r.pattern, score };
  }
  return best?.pattern ?? "[unknown]";
}
