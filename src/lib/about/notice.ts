// About's line on Home's banner (About visual build, plan `2026-10-27-about-visual.md`, PR 6b; handoff
// `design/design_handoff_the99_about_visual/`, call 7 and the Ways-In board's Banner frames). The one-time sheet and the
// gate's redirect retired with this PR: the banner is the only place a launch is announced.
//
// ONE RULE, the pages' own (`unseenUnits`): a first-run reader (`isFirstRun`) is pointed at the `/about` index, a
// reader behind is named each label or rule they have not been told about, and a current reader is told nothing. Each
// launch line names its page ("New on Decks:"), says the unit's own words, is marked by the glyph of the page it opens, and its Show me lands on the label lit and marked New (PR 5).
//
// Pure. The seen state rides in Home's cached payload (`user_prefs` carries the stamp trigger, so a write retires it);
// the reader's switches are applied per request, outside it.

import { ABOUT_VERSION } from "../copy/about";
import { ABOUT_AREAS, ABOUT_PAGE_STRINGS, ABOUT_RULES, ABOUT_SECTIONS, type AboutArea, type AboutLabel, type AboutRuleId } from "../copy/about-pages";
import { LIT_PARAM } from "../discovery/page-tools";
import type { NavHref } from "../../components/shell/nav-icons";
import type { AboutLaunch, AboutLine } from "./banner-line";
import { claimedKeys, claimWrite, everyAnnouncement, unseenUnits, type UnseenUnit, type VisibleSection } from "./pages-visible";
import { isFirstRun, type SeenState } from "./visible";

export type { AboutLaunch, AboutLine } from "./banner-line";

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
    // Whole sentences only: a phrase gated on the same switch (the cart's `**, By friend**`) reads only inside its unit.
    const sentences = Object.entries(rawUnit(key)?.sentences ?? {}).flatMap(([text, on]) =>
      on && (Array.isArray(on) ? on : [on]).includes(sw as never) && /[.?!]$/.test(text.trim()) ? [text.trim()] : [],
    );
    if (sentences.length > 0) return sentences.join(" ");
  }
  // One sentence a line (Small items 8, item 1): a label's lead and the first sentence of its rest. A rule is already
  // one sentence and is told whole.
  const text = key.startsWith("rule/") ? drawn.text : firstSentence(drawn.text);
  return `${drawn.lead ?? ""}${text}`.trim();
}

/** The first sentence of `text`, or all of it when it has no sentence end. */
function firstSentence(text: string): string {
  return /^[\s\S]*?[.?!](?=\s|$)/.exec(text)?.[0] ?? text;
}

/** Show me's address for any announced unit: its page, the unit lit, scrolled to its section (`showMeHref`'s shape). */
export function launchHref(u: Pick<UnseenUnit, "key" | "area" | "section">): string {
  return `/about/${u.area}?${new URLSearchParams({ [LIT_PARAM]: baseKey(u.key) }).toString()}#${u.section}`;
}

const pageName = (area: AboutArea) => ABOUT_AREAS.find((a) => a.id === area)?.name ?? area;

/** The nav glyph of the page a launch opens; Shopping lives under Decks, so it wears Decks'. */
const AREA_ICON: Record<AboutArea, NavHref> = {
  home: "/",
  collection: "/collection",
  commanders: "/commanders",
  decks: "/decks",
  shopping: "/decks",
  friends: "/friends",
};

/**
 * About's line on Home, or null. `visible` is `visibleSections` of the reader's resolved switches (env and
 * `flag_overrides`, `requestSwitchEnv`), so a unit switched off for the reader never reaches the banner (Review Focus 2).
 */
export function aboutLine(seen: SeenState, visible: readonly VisibleSection[]): AboutLine | null {
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
    icon: u.key.startsWith("rule/") ? null : AREA_ICON[u.area],
  }));
  return { kind: "launches", launches, ids: launches.map((l) => l.key) };
}

/**
 * What the banner's ✕ writes for About (✕ counts as seen), re-decided on the server: `claimed` is the ack keys the page
 * RENDERED (each launch's `ack`, or a first-run line's whole baseline), sent back by the browser and so not trusted.
 * The reader's announcements are read again, and the two are INTERSECTED (`claimWrite`): only the claimed ones still
 * announced are written, and of each only the ack keys that were rendered, so a client can drop a key but never add
 * one, and neither a unit nor a sentence switched on after the page rendered is marked seen unread (a base unit drawn
 * before `HELP_ME_CHOOSE_ENABLED` turned on does not take its Commanders sentence's key with it).
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
