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
export function pageTools(visible: readonly VisibleSection[], input: CardInput): Map<string, PageToolCard[]> {
  const placed = new Map<string, { tool: Tool; label: string }[]>();
  const tools: readonly Tool[] = TOOLS;
  for (const t of tools) {
    if (t.switch !== null && !input.isOn(t.switch)) continue;
    const label = showMeLabel(t.labels, visible);
    if (label === null) continue;
    const key = sectionOf(label);
    placed.set(key, [...(placed.get(key) ?? []), { tool: t, label }]);
  }
  const out = new Map<string, PageToolCard[]>();
  for (const s of visible) {
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

/** A Show me landing (`?lit=`), as the page decided it. */
export type Landing = {
  /** The label lit: a label key this page draws. */
  key: string;
  /** The reader has not been told about it: marked New, with its card (call 7). */
  isNew: boolean;
  /** The card of the tool whose Show me lights this label, or null for a label no tool aims at. */
  card: PageCard | null;
};

/**
 * The landing `lit` asks for on `area`'s page: a label that page draws, else null (another page's label, one switched
 * off, a repeated parameter, anything else). New when the reader has not been told about it, by the banner's own rule
 * (`unseenUnits`: nothing is new to a first-run reader).
 */
export function landingFor(
  lit: unknown, area: AboutArea, visible: readonly VisibleSection[], seen: SeenState, cards: readonly PageCard[],
): Landing | null {
  if (typeof lit !== "string") return null;
  if (!visible.some((s) => s.area === area && s.labels.some((l) => l.key === lit))) return null;
  const isNew = unseenUnits(visible, seen).some((u) => u.key === lit);
  return { key: lit, isNew, card: cards.find((c) => c.card.label === lit) ?? null };
}
