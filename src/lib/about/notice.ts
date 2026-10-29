// About's line on Home's banner (About visual build, plan `2026-10-27-about-visual.md`, PR 6b; handoff
// `design/design_handoff_the99_about_visual/`, call 7 and the Ways-In board's Banner frames). The one-time sheet and the
// gate's redirect retired with this PR: the banner is the only place a launch is announced.
//
// ONE RULE, the pages' own (`unseenUnits`): a first-run reader (`isFirstRun`) is pointed at the `/about` index, a
// reader behind is named each label or rule they have not been told about, and a current reader is told nothing. Each
// launch line names its page ("New on Decks:"), says the unit's own words, carries a crop of its label's region from
// the capture at the reader's width (call 0), and its Show me lands on the label lit and marked New (PR 5).
//
// Pure. The seen state rides in Home's cached payload (`user_prefs` carries the stamp trigger, so a write retires it);
// the reader's switches and theme are applied per request, outside it.

import { ABOUT_VERSION } from "../copy/about";
import { ABOUT_AREAS, ABOUT_PAGE_STRINGS, ABOUT_RULES, ABOUT_SECTIONS, type AboutArea, type AboutLabel, type AboutRuleId } from "../copy/about-pages";
import { LIT_PARAM } from "../discovery/page-tools";
import type { AboutLaunch, AboutLine, BannerCrop } from "./banner-line";
import { pageShotFor, type PageWidth } from "./page-shots";
import { everyAnnouncement, unseenUnits, type UnseenUnit, type VisibleSection } from "./pages-visible";
import { isFirstRun, type SeenState } from "./visible";

export type { AboutLaunch, AboutLine, BannerCrop } from "./banner-line";

const baseKey = (key: string) => key.split("@")[0];

function rawUnit(key: string): AboutLabel | (typeof ABOUT_RULES)[AboutRuleId] | null {
  if (key.startsWith("rule/")) return ABOUT_RULES[key.slice("rule/".length) as AboutRuleId] ?? null;
  const [area, section, id] = key.split("/");
  return ABOUT_SECTIONS.find((s) => s.area === area && s.id === section)?.labels.find((l) => l.id === id) ?? null;
}

/** The words a launch says: a whole unit as drawn, or for a switched sentence told on its own, that sentence alone. */
function launchText(u: UnseenUnit, visible: readonly VisibleSection[]): string {
  const key = baseKey(u.key);
  const drawn = visible.flatMap((s) => [...s.labels, ...s.rules]).find((x) => x.key === key);
  if (!drawn) return "";
  const sw = u.key.slice(key.length + 1);
  if (sw) {
    const sentences = Object.entries(rawUnit(key)?.sentences ?? {}).flatMap(([text, on]) =>
      on && (Array.isArray(on) ? on : [on]).includes(sw as never) ? [text.trim()] : [],
    );
    if (sentences.length > 0) return sentences.join(" ");
  }
  return `${drawn.lead ?? ""}${drawn.text}`.trim();
}

/** The label's region on the first of its section's captures at `width` that measured it, in the reader's theme. */
function cropAt(u: UnseenUnit, visible: readonly VisibleSection[], theme: string, width: PageWidth): BannerCrop | null {
  const key = baseKey(u.key);
  const section = visible.find((s) => s.area === u.area && s.id === u.section);
  const label = section?.labels.find((l) => l.key === key);
  if (!section || !label) return null;
  const region = (rawUnit(key) as AboutLabel | null)?.region ?? key;
  for (const capture of section.captures[width]) {
    const shot = pageShotFor(theme, width, capture);
    if (shot && Object.hasOwn(shot.regions, region)) return { src: shot.src, w: shot.w, h: shot.h, box: shot.regions[region] };
  }
  return null;
}

/** Show me's address for any announced unit: its page, the unit lit, scrolled to its section (`showMeHref`'s shape). */
export function launchHref(u: Pick<UnseenUnit, "key" | "area" | "section">): string {
  return `/about/${u.area}?${new URLSearchParams({ [LIT_PARAM]: baseKey(u.key) }).toString()}#${u.section}`;
}

const pageName = (area: AboutArea) => ABOUT_AREAS.find((a) => a.id === area)?.name ?? area;

/**
 * About's line on Home, or null. `visible` is `visibleSections` of the reader's resolved switches (env and
 * `flag_overrides`, `requestSwitchEnv`), so a unit switched off for the reader never reaches the banner (Review Focus 2).
 */
export function aboutLine(seen: SeenState, visible: readonly VisibleSection[], theme: string): AboutLine | null {
  if (isFirstRun(seen)) return { kind: "firstRun", ids: everyAnnouncement(visible).map((u) => u.key) };
  const unseen = unseenUnits(visible, seen);
  if (unseen.length === 0) return null;
  const launches = unseen.map((u): AboutLaunch => ({
    key: u.key,
    lead: ABOUT_PAGE_STRINGS.bannerLead(pageName(u.area)),
    text: launchText(u, visible),
    href: launchHref(u),
    phone: cropAt(u, visible, theme, "phone"),
    desktop: cropAt(u, visible, theme, "desktop"),
  }));
  return { kind: "launches", launches, ids: launches.map((l) => l.key) };
}

/** No line names more keys than the pages hold; a longer claim is not one a page drew. */
const MAX_CLAIMED = 200;

/**
 * What the banner's ✕ writes for About (✕ counts as seen), re-decided on the server: `claimed` is what the page drew,
 * sent back by the browser and so not trusted. The reader's announcements are read again, and only the claimed ones
 * still announced are written, each by its `UnseenUnit.ack` (a unit's key and its drawn sentences' keys), so a client
 * can drop a key but never add one, and a unit switched on after the page rendered is not marked seen unread.
 *
 * The floor rises to `ABOUT_VERSION` when every announcement now standing was claimed. When one was not (a deploy added
 * it after the render, or the client dropped it), it rises only to just under the oldest unclaimed one's `since`, never
 * past the reader's own, so that one stays new. A first-run reader's ✕ writes the baseline a first visit writes
 * (`afterVisit`) for what they claimed. Null when there is nothing to write.
 */
export function aboutDismissal(
  claimed: unknown,
  seen: SeenState,
  visible: readonly VisibleSection[],
  version: number = ABOUT_VERSION,
): SeenState | null {
  if (!Array.isArray(claimed)) return null;
  const named = new Set(claimed.slice(0, MAX_CLAIMED).filter((k): k is string => typeof k === "string"));
  const current = isFirstRun(seen) ? everyAnnouncement(visible) : unseenUnits(visible, seen);
  const valid = current.filter((u) => named.has(u.key));
  if (valid.length === 0) return null;
  const since = new Map(visible.flatMap((s) => [...s.labels, ...s.rules]).map((u) => [u.key, u.since]));
  const unclaimed = current.filter((u) => !named.has(u.key));
  const floor = unclaimed.length === 0
    ? version
    : Math.max(seen.version, Math.min(...unclaimed.map((u) => since.get(baseKey(u.key)) ?? 0)) - 1);
  const ids = [...new Set(valid.flatMap((u) => u.ack))];
  if (floor <= seen.version && ids.every((id) => seen.ids.includes(id))) return null;
  return { version: Math.max(floor, seen.version), ids };
}
