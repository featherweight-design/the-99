/**
 * Where a press or a push on a Wizards post goes (Announcements UI 3b): `/out/wizards/<contentful id>`, a signed-in route
 * of the app's own (`app/out/wizards/[id]/route.ts`) that looks the post up and redirects to it on magic.wizards.com.
 * Pure and client-safe.
 *
 * Why a route of the app's own, not the post's address: a notification's landing must stay on this origin (`public/sw.js`
 * turns anything else into Home), and the route checks the post's host again at the press, from the database, so a
 * payload or a cached page never carries the off-site address itself. Every path under `/out/` leaves the app, so the
 * worker opens a window for it rather than navigating the app's own (`OUT_PREFIX`).
 */
import { parseCatalogKey } from "./catalog-rule";
import type { AnnouncementFeedKind } from "../feed/kinds";

/** Every route that leaves the app by a redirect lives under this path. `public/sw.js` spells it too. */
export const OUT_PREFIX = "/out/";

/** The out route for a post's feed key (`post:<contentful id>`), or null when the key names no post. */
export function wizardsOutRoute(kind: AnnouncementFeedKind, key: string): string | null {
  const id = parseCatalogKey(kind, key);
  return id === null ? null : `${OUT_PREFIX}wizards/${encodeURIComponent(id)}`;
}
