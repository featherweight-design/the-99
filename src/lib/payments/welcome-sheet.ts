import { showcaseCopy, welcomeFreeCopy } from "../copy/discovery";
import { refreshCopy } from "../copy/refresh";
import type { ShowcaseGroup, WrittenRow } from "../discovery/showcase";
import type { TourCredits } from "../discovery/tour-steps";
import { landingSpotFor, type ToolId } from "../discovery/tools";
import { EXPIRY_WARNING_MS } from "../model/credit-line";
import type { WelcomeLotKind, WelcomeState } from "./welcome-state";

/**
 * What the welcome surfaces draw (welcome credits R2, PR 2), pure and client-safe: the lot's figures as a client can
 * carry them, and the `Where credits work` sheet's rows. The server decides both (`stripFacts`, `welcomeSheetFor` in `welcome-read.ts`) and hands them to
 * the strip, the sheet and the /credits Welcome cell, so one rule says what each row is and where its Try it goes.
 */

const DAY_MS = 86_400_000;

/** Whole days left before `at`, counted up, never under 1: `expire in 3 days` for anything within the third day. */
export function daysUntil(at: Date, now: Date): number {
  return Math.max(1, Math.ceil((at.getTime() - now.getTime()) / DAY_MS));
}

/** Within the 3 days the credit line warns at (`EXPIRY_WARNING_MS`), and not yet past. */
export function expiringAt(at: Date, now: Date): boolean {
  const ahead = at.getTime() - now.getTime();
  return ahead > 0 && ahead <= EXPIRY_WARNING_MS;
}

/** The lot as the client draws it: no `Date` crosses to the client, and the day count is the server's. */
export type WelcomeFacts = {
  lot: WelcomeLotKind;
  units: number;
  left: number;
  expiresAtMs: number;
  days: number;
  teaser: boolean;
  /** The reader's own daily free allowance (`dailyLimitFor`), which the lines name as spent first and coming back. */
  free: number;
};

/** The strip's facts, or null when the strip is not drawn: no lot, an expired one, or a strip the reader closed. */
export function stripFacts(state: WelcomeState, now: Date, free: number): WelcomeFacts | null {
  if (state.kind === "none" || state.kind === "dismissed") return null;
  return lotFacts(state, now, free);
}

/** The lot's facts whether or not the strip was closed (the /credits cell's sheet), or null with no live lot. */
export function lotFacts(state: WelcomeState, now: Date, free: number): WelcomeFacts | null {
  if (state.kind === "none") return null;
  return { lot: state.lot, units: state.units, left: state.left, expiresAtMs: state.expiresAt.getTime(), days: daysUntil(state.expiresAt, now), teaser: state.teaser, free };
}

/** One of the rows, drawn as name, where and cost; `tryHref` is the shipped resolver's landing, or null. */
export type SheetRow = { id: WrittenRow["id"] | (typeof welcomeFreeCopy.rows)[number]["id"]; name: string; where: string; short: string; cost: string; tryHref: string | null };

/**
 * The sheet's list, by the reader's deck state (README R2, "Try it"):
 *   locked  no collection yet: nothing can run, so no Try it, and the shipped lock line once, over every row.
 *   noDeck  cards, no deck: Help me choose and Upgrade this precon (a precon is its own deck) lead with their Try it, then the shipped reason line once, over the rest.
 *   decks   About's order, with Try it wherever the shipped resolver gives a landing.
 */
export type WelcomeSheet = {
  shape: "locked" | "noDeck" | "decks";
  lead: SheetRow[];
  line: { kind: "lock" | "reason"; text: string } | null;
  rows: SheetRow[];
  /** The tools that cost no credit, drawn under the spenders after `freeLine`. Never in the first-run tour's list. */
  freeLine: string;
  free: SheetRow[];
};

/** The tool each row's Try it opens. Overview and Which deck needs it most? have no landing of their own. */
const ROW_TOOL: Partial<Record<WrittenRow["id"], ToolId>> = {
  suggested: "suggested-changes",
  "look-deeper": "proposed-cuts",
  "help-me-choose": "help-me-choose",
};

/** The people-facing landing of a deck tool on the reader's most recently touched deck, from the shared landing table. */
function deckLanding(id: "overview" | "consider", deckId: string | null): string | null {
  const spot = landingSpotFor(id);
  return deckId && spot?.lands.kind === "deck" ? `/decks/${deckId}?tab=${spot.lands.tab}` : null;
}

/** Where Find a deck lands: the collection's Free cards, where each card carries the button. */
const FIND_A_DECK_HREF = "/collection?avail=free";

export function welcomeSheet(input: {
  /** `writtenForYou(suggestedV2, upgrade).rows`. */
  written: readonly WrittenRow[] | null;
  /** The reader's unique cards and decks. */
  cards: number;
  decks: number;
  /** `showcaseGroups` for this reader: its card states are the shipped Try-it resolver's answers. */
  groups: readonly ShowcaseGroup[];
  /** The reader's most recently touched deck, which Overview and Consider open on; null with none. */
  firstDeckId?: string | null;
}): WelcomeSheet | null {
  if (!input.written || input.written.length === 0) return null;
  const free = (live: boolean): SheetRow[] =>
    welcomeFreeCopy.rows.map((r) => ({
      ...r,
      tryHref: !live ? null : r.id === "consider" ? deckLanding("consider", input.firstDeckId ?? null) : FIND_A_DECK_HREF,
    }));
  const freeLine = welcomeFreeCopy.line;
  const states = new Map(input.groups.flatMap((g) => g.cards).map((c) => [c.id, c.state]));
  const row = (r: WrittenRow, live: boolean): SheetRow => {
    const tool = ROW_TOOL[r.id];
    const state = live && tool ? states.get(tool) : undefined;
    // Upgrade's landing is the precon list (G26): a run starts on one precon's page, picked there.
    const tryHref = !live
      ? null
      : r.id === "upgrade"
        ? "/decks/precons"
        : r.id === "overview"
          ? deckLanding("overview", input.firstDeckId ?? null)
          : r.id === "find-a-deck-read"
            ? FIND_A_DECK_HREF
            : state && (state.kind === "deck" || state.kind === "page")
              ? state.href
              : null;
    return { id: r.id, name: r.name, where: r.where, short: r.short, cost: r.cost, tryHref };
  };
  if (input.cards === 0) {
    return { shape: "locked", lead: [], line: { kind: "lock", text: refreshCopy.firstRun.step2Locked }, rows: input.written.map((r) => row(r, false)), freeLine, free: free(false) };
  }
  if (input.decks === 0) {
    // Upgrade this precon needs no deck of the reader's: a precon is the deck. It leads with Help me choose, over the line.
    const noDeckNeeded = (r: WrittenRow) => r.id === "help-me-choose" || r.id === "upgrade";
    const lead = input.written.filter(noDeckNeeded).map((r) => row(r, true));
    const rows = input.written.filter((r) => !noDeckNeeded(r)).map((r) => row(r, false));
    return { shape: "noDeck", lead, line: rows.length > 0 ? { kind: "reason", text: showcaseCopy.needsADeck } : null, rows, freeLine, free: free(false) };
  }
  return { shape: "decks", lead: [], line: null, rows: input.written.map((r) => row(r, true)), freeLine, free: free(true) };
}

/**
 * The rows the first-run tour's Credits stop lists, in the sheet's own order (`lead` first), or null when there is no
 * sheet: no `Where they work` is drawn then, so the tour has nothing to point at and runs without the stop.
 */
export function tourCreditsFor(sheet: WelcomeSheet | null): TourCredits | null {
  return sheet ? [...sheet.lead, ...sheet.rows].map(({ id, name, short, cost }) => ({ id, name, short, cost })) : null;
}
