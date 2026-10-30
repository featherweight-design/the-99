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
import { claimedKeys, claimWrite, everyAnnouncement, unseenUnits, type UnseenUnit, type VisibleSection } from "./pages-visible";
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
  if (isFirstRun(seen)) {
    const every = everyAnnouncement(visible);
    return { kind: "firstRun", ids: every.map((u) => u.key), ack: every.flatMap((u) => u.ack) };
  }
  const unseen = unseenUnits(visible, seen);
  if (unseen.length === 0) return null;
  const launches = unseen.map((u): AboutLaunch => ({
    key: u.key,
    ack: [...u.ack],
    lead: ABOUT_PAGE_STRINGS.bannerLead(pageName(u.area)),
    text: launchText(u, visible),
    href: launchHref(u),
    phone: cropAt(u, visible, theme, "phone"),
    desktop: cropAt(u, visible, theme, "desktop"),
  }));
  return { kind: "launches", launches, ids: launches.map((l) => l.key), theme };
}

/**
 * What the banner's ✕ writes for About (✕ counts as seen), re-decided on the server: `claimed` is the ack keys the page
 * RENDERED (each launch's `ack`, or a first-run line's whole baseline), sent back by the browser and so not trusted.
 * The reader's announcements are read again, and the two are INTERSECTED (`claimWrite`): only the claimed ones still
 * announced are written, and of each only the ack keys that were rendered, so a client can drop a key but never add
 * one, and neither a unit nor a sentence switched on after the page rendered is marked seen unread (a base unit drawn
 * before `SOCIAL_WISHLIST_ENABLED` turned on does not take its friend's-page sentence's key with it).
 *
 * The floor rises to `ABOUT_VERSION` when every announcement now standing was claimed whole, else only to just under
 * the oldest one not claimed whole (`claimWrite`). A first-run reader's ✕ writes the baseline a first visit writes
 * (`afterVisit`) for what they claimed. Null when there is nothing to write.
 */
export function aboutDismissal(
  claimed: unknown,
  seen: SeenState,
  visible: readonly VisibleSection[],
  version: number = ABOUT_VERSION,
): SeenState | null {
  const named = claimedKeys(claimed);
  if (!named) return null;
  const current = isFirstRun(seen) ? everyAnnouncement(visible) : unseenUnits(visible, seen);
  return claimWrite(named, current, seen, visible, version);
}
