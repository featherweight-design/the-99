import { atPlace } from "../commanders/place-paths";
import { showcaseCopy, writtenForYouCopy, type ToolCopy } from "../copy/discovery";
import type { SwitchName } from "../switches/registry";
import type { DeckToolId, ToolFit } from "./fits";
import { TOOL_PARAM, TOOLS, type Tool, type ToolGroup, type ToolId } from "./tools";

/**
 * The Tools tab's model (discovery R2·5, README-r2 C2 and C3, STATES "A tool card"): which cards draw, in which group,
 * and in which of the five states. Pure, so the page decides every switch on the server and the cards render what it
 * hands them.
 */

export const GROUP_ORDER: readonly ToolGroup[] = ["start", "tune", "buy", "own", "play"];

/** Where the card goes, and what its footer says. */
export type CardState =
  /** One deck fits, or several: the whole card opens the first (most recently touched); `more` counts the rest. */
  | { kind: "deck"; href: string; deck: string; more: number }
  /** A tool with a page of its own: the whole card opens it, its footer naming where. */
  | { kind: "page"; href: string; label: string }
  /** Nothing fits: not a press. A line saying what the tool needs, and a door when another screen helps. */
  | { kind: "none"; line: string; door: { href: string; label: string } | null };

export type ToolCardModel = {
  id: ToolId;
  copy: ToolCopy;
  /** The shipped cost chip, verbatim, or null where the app draws none (ruling 5, R2 gap 4). */
  credit: string | null;
  /** The About entry `How it works ›` opens. */
  entry: string;
  state: CardState;
  /** Collection Sync with no earlier upload: the card says so and still offers the upload (G14). */
  note: string | null;
};

export type ShowcaseGroup = { group: ToolGroup; cards: ToolCardModel[] };

/** What a card needs to know about its reader (`loadCardInput`, `showcase-input.ts`). */
export type CardInput = {
  /** The reader's resolved switches. */
  isOn: (name: SwitchName) => boolean;
  /** `loadToolFits` for the deck tools whose switches are on. */
  fits: Partial<Record<DeckToolId, ToolFit>>;
  /** How many decks the reader has: a tool that reads decks says so when there are none. */
  deckCount: number;
  /** Whether the reader has a confirmed upload Sync can merge against. */
  hasSyncBase: boolean;
  /** the Commanders place (always on) for the reader: a tool that lands on a tab of the place lands on the tab. */
  place: boolean;
};

export type ShowcaseInput = CardInput & {
  /** The ids of the About entries this reader can see (`visibleEntries`). */
  visibleEntryIds: ReadonlySet<string>;
};

/** The Try it address: the tool's page, or a deck, with the one-time parameter its landing reads. */
export function tryHref(path: string, tool: ToolId): string {
  const [base, query] = path.split("?");
  const params = new URLSearchParams(query);
  params.set(TOOL_PARAM, tool);
  return `${base}?${params.toString()}`;
}

function stateOf(tool: Tool, copy: ToolCopy, input: CardInput): CardState {
  const id = tool.id as ToolId;
  if (tool.lands.kind === "route") {
    if (tool.needsDeck && input.deckCount === 0) return { kind: "none", line: showcaseCopy.needsADeck, door: null };
    return { kind: "page", href: tryHref(atPlace(tool.lands.href, input.place), id), label: copy.press ?? copy.name };
  }
  if (input.deckCount === 0) return { kind: "none", line: showcaseCopy.needsADeck, door: null };
  const decks = input.fits[id as DeckToolId]?.decks ?? [];
  const [first, ...rest] = decks;
  if (first) return { kind: "deck", href: tryHref(`/decks/${first.id}`, id), deck: first.name, more: rest.length };
  const door = copy.door ? { href: "/friends", label: copy.door } : null;
  return { kind: "none", line: copy.none ?? showcaseCopy.needsADeck, door };
}

/**
 * The cards, by group, in registry order. A tool draws only when its own switch is on AND its About entry is visible
 * (R2 gap 8), so `How it works ›` never opens an entry the reader cannot see. A group left empty is not drawn.
 */
export function showcaseGroups(input: ShowcaseInput): ShowcaseGroup[] {
  const tools: readonly Tool[] = TOOLS;
  return GROUP_ORDER.map((group) => ({
    group,
    cards: tools
      .filter((t) => t.group === group)
      .filter((t) => (t.switch === null || input.isOn(t.switch)) && input.visibleEntryIds.has(t.entry))
      .map((t) => toolCardOf(t, input)),
  })).filter((g) => g.cards.length > 0);
}

/** One tool's card for this reader: its copy, cost chip, where its press goes and its note. Its switch is the caller's. */
export function toolCardOf(t: Tool, input: CardInput): ToolCardModel {
  const copy: ToolCopy = showcaseCopy.tools[t.id as ToolId];
  return {
    id: t.id as ToolId,
    copy,
    credit: t.credit,
    entry: t.entry,
    state: stateOf(t, copy, input),
    note: t.id === "collection-sync" && !input.hasSyncBase ? showcaseCopy.syncNoBase : null,
  };
}

export type WrittenRow = (typeof writtenForYouCopy.rows)[number];

/**
 * Written for you (R2b): the credits entry's spenders, each drawn only while its line survives in the RESOLVED caption,
 * so every row follows the switch `captionLineSwitches` gives that line (decision 3). Null when no row survives, or
 * the credits entry is not visible.
 */
export function writtenForYou(resolvedCreditsCaption: string | null): { rows: WrittenRow[]; free: string } | null {
  if (resolvedCreditsCaption === null) return null;
  const lines = new Set(resolvedCreditsCaption.split("\n"));
  const rows = writtenForYouCopy.rows.filter((r) => lines.has(r.line));
  if (rows.length === 0) return null;
  const free = lines.has(writtenForYouCopy.historyLine) ? writtenForYouCopy.free : writtenForYouCopy.freeBracket;
  return { rows, free };
}
