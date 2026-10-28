import { tuningHubCopy } from "../copy/tuning-hub";
import type { BuilderView } from "../decks/builder-view";
import { isMomentId, type MomentId } from "../moments/registry";
import type { SwitchName } from "../switches/registry";
import type { TargetId } from "./targets";

/**
 * The tool registry (discovery R2, plan `2026-10-16-discovery-r2-r3.md`, decision 3): README-r2's C2 showcase, its 14
 * tools in group order. A tool's `id` is its moment's id where it has one, and the `?tool=` a Try it writes is this id.
 *
 * - `switch`: the switch the tool lives behind, or null for one with none (Top off). Off for a reader, the tool is
 *   absent: no card, and a `?tool=` naming it lands nowhere.
 * - `entry`: the About entry its `How it works ›` opens (`src/lib/copy/about-entries.ts`).
 * - `label`: the label on the About pages its `Show me ›` lights (`labelKey`, `src/lib/about/pages-visible.ts`), or null
 *   for a tool no section places yet (Precons and Mana balance, until Design places them: About visual plan, PR 9).
 * - `target`: the control a landing haloes. A credit tool's is its Tuning hub tile, never its run press.
 * - `lands`: a deck's tab (and, within Your deck, the Shopping filter), or a route for a tool with a page of its own.
 * - `credit`: the cost chip the app ALREADY draws for it, verbatim (ruling 5, R2 gap 4), or null where it draws none.
 * - `needsDeck`: the tool answers about the reader's decks, so Try it needs one. A tool that lands on a deck needs
 *   one that fits (`fits.ts`); a tool with a page of its own (Find a deck, Stats for your decks) needs only one deck.
 *
 * Client-safe: copy and type imports only.
 */
export type ToolGroup = "start" | "tune" | "buy" | "own" | "play";

/** Where Try it opens: a deck's tab, or a route. `view: "shopping"` is Your deck's Shopping filter. */
export type ToolLands = { kind: "deck"; tab: BuilderView; view?: "shopping" } | { kind: "route"; href: string };

export type Tool = {
  id: string;
  group: ToolGroup;
  switch: SwitchName | null;
  entry: string;
  label: string | null;
  target: TargetId;
  lands: ToolLands;
  credit: string | null;
  needsDeck: boolean;
};

const hub = tuningHubCopy.tools;

export const TOOLS = [
  // Start a deck
  { id: "help-me-choose", group: "start", switch: "HELP_ME_CHOOSE_ENABLED", entry: "help-me-choose", label: "commanders/for-you/places", target: "help-me-choose", lands: { kind: "route", href: "/decks/new/choose" }, credit: null, needsDeck: false },
  { id: "precons", group: "start", switch: "PRECONS_ENABLED", entry: "precons", label: null, target: "precons", lands: { kind: "route", href: "/decks/precons" }, credit: null, needsDeck: false },
  // Tune it
  { id: "top-off", group: "tune", switch: null, entry: "auto-fill", label: "decks/your-deck/mix", target: "top-off", lands: { kind: "deck", tab: "deck" }, credit: null, needsDeck: true },
  { id: "proposed-cuts", group: "tune", switch: "PROPOSED_CUTS_ENABLED", entry: "proposed-cuts", label: "decks/analysis/cuts", target: "proposed-cuts", lands: { kind: "deck", tab: "analysis" }, credit: hub.cuts.cost, needsDeck: true },
  { id: "suggested-changes", group: "tune", switch: "TUNING_ENABLED", entry: "suggested-changes", label: "decks/analysis/suggested", target: "suggested-changes", lands: { kind: "deck", tab: "analysis" }, credit: hub.suggested.cost, needsDeck: true },
  { id: "mana-balance", group: "tune", switch: "MANA_BALANCE_ENABLED", entry: "mana-balance", label: null, target: "mana-balance", lands: { kind: "deck", tab: "analysis" }, credit: hub.mana.cost, needsDeck: true },
  // Buy smarter
  { id: "stand-ins", group: "buy", switch: "SWAP_TOOLS_ENABLED", entry: "stand-ins", label: "shopping/deck-shopping/standins", target: "stand-ins", lands: { kind: "deck", tab: "deck", view: "shopping" }, credit: null, needsDeck: true },
  { id: "friend-spares", group: "buy", switch: "SOCIAL_FRIENDS_ENABLED", entry: "friend-spares", label: "shopping/deck-shopping/spare", target: "friend-spares", lands: { kind: "deck", tab: "deck", view: "shopping" }, credit: null, needsDeck: true },
  // Use what you own
  { id: "find-a-deck", group: "own", switch: "SWAP_TOOLS_ENABLED", entry: "fits-your-decks", label: "collection/cards/taken", target: "find-a-deck", lands: { kind: "route", href: "/collection?avail=free" }, credit: null, needsDeck: true },
  { id: "wishlist", group: "own", switch: "SOCIAL_WISHLIST_ENABLED", entry: "wishlist", label: "collection/cards/tabs", target: "wishlist", lands: { kind: "route", href: "/collection/wishlist" }, credit: null, needsDeck: false },
  { id: "collection-sync", group: "own", switch: "COLLECTION_SYNC_ENABLED", entry: "upload-choice", label: "collection/upload/drop", target: "collection-sync", lands: { kind: "route", href: "/collection/replace" }, credit: null, needsDeck: false },
  // Play
  { id: "matchups", group: "play", switch: "SOCIAL_GAMES_ENABLED", entry: "opponents", label: "decks/games/matchups", target: "matchups", lands: { kind: "deck", tab: "games" }, credit: null, needsDeck: true },
  { id: "lineup", group: "play", switch: "LINEUP_ENABLED", entry: "decks-stats", label: "decks/your-decks/decks-stats", target: "lineup", lands: { kind: "route", href: "/decks?view=stats" }, credit: null, needsDeck: true },
  { id: "friends", group: "play", switch: "SOCIAL_FRIENDS_ENABLED", entry: "friends", label: "friends/friends/add", target: "friends", lands: { kind: "route", href: "/friends" }, credit: null, needsDeck: false },
] as const satisfies readonly Tool[];

export type ToolId = (typeof TOOLS)[number]["id"];

export { TOOL_PARAM } from "./tool-param";

const BY_ID = new Map<string, Tool>(TOOLS.map((t) => [t.id, t]));

export function isToolId(v: unknown): v is ToolId {
  return typeof v === "string" && BY_ID.has(v);
}

/** A landing the page can act on: the tool, its target, and the moment it spends (null for a tool with none). */
export type ToolLanding = { tool: ToolId; target: TargetId; moment: MomentId | null; lands: ToolLands };

/**
 * Whether `?tool=<value>` names a tool this reader can land on: one the registry knows whose switch is on for them
 * (`isOn` decides it from the reader's resolved env, never the bare process env). Anything else, a repeated parameter
 * included, is null: a stale id is stripped and lands nowhere.
 */
export function toolLanding(value: unknown, isOn: (name: SwitchName) => boolean): ToolLanding | null {
  if (typeof value !== "string") return null;
  const tool = BY_ID.get(value);
  if (tool === undefined || (tool.switch !== null && !isOn(tool.switch))) return null;
  return { tool: tool.id as ToolId, target: tool.target, moment: isMomentId(tool.id) ? tool.id : null, lands: tool.lands };
}

/**
 * The deck page's reading of `?tool=`: a landing only for a tool that opens on a deck, and only on a tab this
 * deployment draws (Analysis is behind its own switch, `analysisEnabled`).
 */
export function deckToolLanding(
  value: unknown,
  isOn: (name: SwitchName) => boolean,
  analysisEnabled: boolean,
): (ToolLanding & { lands: Extract<ToolLands, { kind: "deck" }> }) | null {
  const landing = toolLanding(value, isOn);
  if (landing === null || landing.lands.kind !== "deck") return null;
  if (landing.lands.tab === "analysis" && !analysisEnabled) return null;
  return landing as ToolLanding & { lands: Extract<ToolLands, { kind: "deck" }> };
}

/**
 * A tool page's reading of `?tool=` (R2·3): a landing only when the address names THIS page's own tool and its switch
 * is on for the reader. Any other id, a deck tool's included, is null, and the page strips it with no halo.
 */
export function pageToolLanding(
  value: unknown,
  isOn: (name: SwitchName) => boolean,
  page: ToolId,
): (ToolLanding & { lands: Extract<ToolLands, { kind: "route" }> }) | null {
  const landing = toolLanding(value, isOn);
  if (landing === null || landing.tool !== page || landing.lands.kind !== "route") return null;
  return landing as ToolLanding & { lands: Extract<ToolLands, { kind: "route" }> };
}
