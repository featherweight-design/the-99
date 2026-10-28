// Links into the retired Reference and Tools tabs, sent to the page that now holds their content (About visual build,
// plan `2026-10-27-about-visual.md`, PR 6a; Review Focus 3). Pure.
//
// `/about?tab=reference#<entry>` goes to `/about/<area>#<section>` through the label or rule whose `legacy` list holds
// `<entry>` (a rule's section is the section listing it), first in page order. `#new`, an entry no unit holds and the
// bare Reference go to the `/about` index, and so does `/about?tab=tools`. Anything else is returned unchanged.
//
// EVERY link the app builds into the Reference goes through here: no file under `src/` but this one (and the Reference
// tab's own files, until it retires) spells `tab=reference` (`legacy-href.test.ts`).

import { ABOUT_RULES, ABOUT_SECTIONS, type AboutSection } from "../copy/about-pages";

const INDEX = "/about";

/** The section holding a legacy entry id: a label's own, or the first section listing a rule that holds it. */
export function legacySection(entry: string): AboutSection | null {
  for (const s of ABOUT_SECTIONS) {
    if (s.labels.some((l) => l.legacy.includes(entry))) return s;
    if (s.rules.some((id) => ABOUT_RULES[id].legacy.includes(entry))) return s;
  }
  return null;
}

export function legacyHref(href: string): string {
  const hashAt = href.indexOf("#");
  const beforeHash = hashAt === -1 ? href : href.slice(0, hashAt);
  const hash = hashAt === -1 ? "" : href.slice(hashAt + 1);
  const queryAt = beforeHash.indexOf("?");
  const path = queryAt === -1 ? beforeHash : beforeHash.slice(0, queryAt);
  if (path !== INDEX || queryAt === -1) return href;
  const tab = new URLSearchParams(beforeHash.slice(queryAt + 1)).get("tab");
  if (tab === "tools") return INDEX;
  if (tab !== "reference") return href;
  // Entry ids are plain slugs, so the fragment is read as written: an encoded one names no entry.
  const section = hash ? legacySection(hash) : null;
  return section ? `/about/${section.area}#${section.id}` : INDEX;
}
