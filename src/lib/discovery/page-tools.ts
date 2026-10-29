import { showMeLabel, unseenUnits, type VisibleSection } from "../about/pages-visible";
import type { Shot } from "../about/shots";
import type { SeenState } from "../about/visible";
import type { AboutArea } from "../copy/about-pages";
import { toolCardOf, type CardInput, type ToolCardModel } from "./showcase";
import { TOOLS, type Tool } from "./tools";

/**
 * Try it on the About pages (About visual build, plan `2026-10-27-about-visual.md`, PR 5; handoff call 6): which tool
 * cards each section draws, and where each card's Show me lands. Pure: the page decides every switch on the server.
 *
 * A tool is on a page only while its own switch is on for the reader AND one of its `labels` is drawn to them
 * (`showMeLabel`, over `visibleSections(env)`): a label switched off takes its tool card with it (call 8, Review Focus
 * 2). The card sits in the section of that label, after the section's rules.
 */

/** A tool card on an About page: the shipped card's model, the label its Show me lights, and that landing's address. */
export type PageToolCard = ToolCardModel & { label: string; showMe: string };

/** The one-time parameter Show me writes. Here, not in the client landing module: a server page importing a constant
 * from a "use client" module gets a client reference, never the string. */
export const LIT_PARAM = "lit";

/** Where the reader pressed the ?, carried to the About page so its back bar can return there (About visual PR 6a). */
export const FROM_PARAM = "from";

/**
 * Show me's address: the label's page, lit, scrolled to its section. `labelKey` is `<area>/<section>/<label>`
 * (`labelKey`, `pages-visible.ts`).
 */
export function showMeHref(labelKey: string): string {
  const [area, section] = labelKey.split("/");
  return `/about/${area}?${new URLSearchParams({ [LIT_PARAM]: labelKey }).toString()}#${section}`;
}

/** The section a label key belongs to, as `<area>/<section>`. */
export const sectionOf = (labelKey: string) => labelKey.split("/").slice(0, 2).join("/");

/**
 * Each drawn section's tool cards, keyed `<area>/<section>`: first the tools the section lists, in its order (the
 * handoff's placement), then any tool that falls back to one of its labels, in registry order. A section with no card
 * is absent.
 */
/** Where each tool on the About pages sits: the section of the first of its labels drawn for the reader, while its
 * switch is on. Needs no reader data, so a page can ask only about the tools it will draw. */
function placeTools(visible: readonly VisibleSection[], isOn: CardInput["isOn"]): Map<string, { tool: Tool; label: string }[]> {
  const placed = new Map<string, { tool: Tool; label: string }[]>();
  const tools: readonly Tool[] = TOOLS;
  for (const t of tools) {
    if (t.switch !== null && !isOn(t.switch)) continue;
    const label = showMeLabel(t.labels, visible);
    if (label === null) continue;
    const key = sectionOf(label);
    placed.set(key, [...(placed.get(key) ?? []), { tool: t, label }]);
  }
  return placed;
}

/** The ids of the tools `area`'s page draws, for `loadCardInput` to read fits for those alone. */
export function toolIdsIn(visible: readonly VisibleSection[], isOn: CardInput["isOn"], area: AboutArea): string[] {
  return [...placeTools(visible, isOn)]
    .filter(([key]) => key.split("/")[0] === area)
    .flatMap(([, here]) => here.map((p) => p.tool.id));
}

/** Each section's tool cards, keyed `<area>/<section>`; with `area`, that area's sections only. */
export function pageTools(visible: readonly VisibleSection[], input: CardInput, area?: AboutArea): Map<string, PageToolCard[]> {
  const placed = placeTools(visible, input.isOn);
  const out = new Map<string, PageToolCard[]>();
  for (const s of visible) {
    if (area !== undefined && s.area !== area) continue;
    const key = `${s.area}/${s.id}`;
    const here = placed.get(key);
    if (!here) continue;
    const rank = (id: string) => {
      const i = s.tools.indexOf(id);
      return i === -1 ? s.tools.length : i;
    };
    const ordered = [...here].sort((a, b) => rank(a.tool.id) - rank(b.tool.id));
    out.set(
      key,
      ordered.map(({ tool, label }) => ({ ...toolCardOf(tool, input), label, showMe: showMeHref(label) })),
    );
  }
  return out;
}

/** A tool card as an About page draws it: the model, and its picture at each width (call 0). */
export type PageCard = { card: PageToolCard; phone: Shot | null; desktop: Shot | null };

/** A landing (`?lit=`, from Show me or the ?), as the page lands it. */
export type Landing = {
  /** The unit lit: a label or rule key this page draws. */
  key: string;
  /** The section it is in, the element the landing brings into view. */
  section: string;
  /** The reader has not been told about it: marked New, with its card (call 7). */
  isNew: boolean;
  /** The card of the tool whose Show me lights this label, or null for a label no tool aims at. */
  card: PageCard | null;
};

/** Every label and rule `area`'s page draws for the reader, keyed by its key, with its section and whether it is New
 * to them. The server's half of a landing: the page decides this once, and the client lands each `?lit=` the live
 * address carries on it. */
export type Landable = Readonly<Record<string, { isNew: boolean; section: string }>>;

/**
 * The units `area`'s page can land on: the labels and rules it draws for the reader, so a unit switched off for them
 * lands nowhere (Review Focus 2). A label is New when the reader has not been told about it or about a switched
 * sentence of it, by the banner's own rule (`unseenUnits`: nothing is new to a first-run reader). A rule is never marked New: only the ? lands on one, and the
 * ? draws the halo alone (Addendum A1).
 */
export function landableIn(area: AboutArea, visible: readonly VisibleSection[], seen: SeenState): Landable {
  // A launch names a label (`decks/x/y`) or one sentence of it (`shopping/deck-shopping/spare@SPARE_REQUESTS_ENABLED`),
  // and Show me lands on the label for both, so a label is New while it or any of its sentences is unseen; the lit key
  // stays the base key.
  const unseen = new Set(unseenUnits(visible, seen).map((u) => u.key.split("@")[0]));
  const out: Record<string, { isNew: boolean; section: string }> = {};
  for (const s of visible) {
    if (s.area !== area) continue;
    for (const l of s.labels) out[l.key] = { isNew: unseen.has(l.key), section: s.id };
    // A rule listed by two sections lands on the first.
    for (const r of s.rules) if (!Object.hasOwn(out, r.key)) out[r.key] = { isNew: false, section: s.id };
  }
  return out;
}

/**
 * The landing `lit` asks for: a label the page can land on (`landableIn`), else null (another page's label, one
 * switched off, a repeated parameter, anything else). Carries the card of the tool whose Show me lights it.
 */
export function landingFor(lit: unknown, landable: Landable, cards: readonly PageCard[]): Landing | null {
  if (typeof lit !== "string" || !Object.hasOwn(landable, lit)) return null;
  const { isNew, section } = landable[lit];
  return { key: lit, section, isNew, card: cards.find((c) => c.card.label === lit) ?? null };
}
