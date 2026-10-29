import { CARD_TYPE_GROUP_ORDER, type CardTypeGroup } from "../../decks/grouping";
import { ROLE_ORDER, type MixRole } from "../../decks/mix";
import type { LineItem, V2Ask } from "../state";
import type { ShortReason, ValidationReport } from "../validate";
import { reachesAim, type BracketAim } from "./bracket-aim";
import { askFor } from "./count";

/**
 * Suggested changes v2's results (plan 2026-10-27, UI PR 6; the handoff's Results, Short-Run, Wait and Apply boards), the
 * parts that are arithmetic. Pure and client-safe: how many a side may pick, the bar's tally and its state, the bracket
 * outcome of the picked set, the grouping and its heads, and what a short run says about itself.
 */

/** From N = 4 a side groups (README item 3); 5 a side or fewer stays flat. */
export const GROUP_FROM_N = 4;
export const groupsAt = (n: number) => n >= GROUP_FROM_N;

/** The size the tool keeps a deck at. */
export const AT_SIZE = 99;

/** A line still open for a set: not applied, not settled, and still makeable. */
export const isOpen = (l: LineItem) => l.verdict === "pending" && l.applies;

/**
 * How many of each side the next set can take: N, or fewer when a list came back short (every count follows the shorter
 * list, README item 6), counted over the lines still open. While the run is still being made, N alone: neither list is
 * known yet, and a pick made early is never undone for the player.
 */
export function pickCap(n: number, lines: readonly LineItem[], finished: boolean): number {
  if (!finished) return n;
  const open = lines.filter(isOpen);
  return Math.min(n, open.filter((l) => l.side === "add").length, open.filter((l) => l.side === "cut").length);
}

export type Tally = { adds: number; cuts: number; total: number; equal: boolean };

export function tally(picked: readonly LineItem[]): Tally {
  const adds = picked.filter((l) => l.side === "add").length;
  const cuts = picked.length - adds;
  return { adds, cuts, total: AT_SIZE + adds - cuts, equal: adds === cuts };
}

/**
 * The picked set's bracket outcome, by the lines' own figures (each line's `bracketAfter` is the deck's permits with it
 * alone, `bracket-shift.ts`). Keep, or no aim: the run left out any line that moves the bracket, so the set keeps it. Up:
 * reached when a picked addition brings the target within reach (`reachesAim`, the shipped flag's rule). Down: reached
 * when a picked line takes the deck's lowest permitted bracket to the target or under it.
 */
export type BracketOutcome =
  | { kind: "stays"; bracket: number }
  | { kind: "reached"; from: number; to: number }
  | { kind: "missed"; from: number; aim: BracketAim };

export function bracketOutcome(permits: readonly number[], aim: V2Ask["bracket"], picked: readonly LineItem[]): BracketOutcome | null {
  if (permits.length === 0) return null;
  const from = Math.min(...permits);
  if (!aim || aim.choice === "keep") return { kind: "stays", bracket: from };
  const reached = aim.choice === "up"
    ? picked.some((l) => reachesAim(aim, l.side, l.bracketAfter))
    : picked.some((l) => l.bracketAfter !== null && l.bracketAfter.length > 0 && Math.min(...l.bracketAfter) <= aim.target);
  return reached ? { kind: "reached", from, to: aim.target } : { kind: "missed", from, aim };
}

export type Grouping = "type" | "role";

export type LineGroup = {
  key: string;
  lines: LineItem[];
  /** By type: the deck's count of the group; by role: what the deck has of the role. Null with no figure (a role-less group). */
  have: number | null;
  /** By role: the role's target; null by type and for a role-less group. */
  target: number | null;
  /** Where this side's picks in the group take the figure: added for additions, taken away for cuts. Null with no pick
   *  in the group, or no figure to move. */
  withPicks: number | null;
};

/**
 * One side's lines under the deck page's grouping (README item 3): By type in the deck page's order with the deck's own
 * count, By role in the shelf order with what the deck has of each. Lines keep the run's order inside a group. A line
 * with no shelf role (or a v2 line read before its type was) falls in the last group.
 */
export function groupLines(
  lines: readonly LineItem[],
  by: Grouping,
  figures: { typeCounts: Partial<Record<CardTypeGroup, number>>; roles: readonly { role: string; have: number; target: number }[] },
  isPicked: (l: LineItem) => boolean,
): LineGroup[] {
  const order: string[] = by === "type" ? [...CARD_TYPE_GROUP_ORDER] : [...ROLE_ORDER, "other"];
  const keyOf = (l: LineItem): string => (by === "type" ? l.typeGroup ?? "Other" : (l.role as MixRole | null | undefined) ?? "other");
  const out: LineGroup[] = [];
  for (const key of order) {
    const rows = lines.filter((l) => keyOf(l) === key);
    if (rows.length === 0) continue;
    const role = by === "role" ? figures.roles.find((r) => r.role === key) : undefined;
    const have = by === "type" ? figures.typeCounts[key as CardTypeGroup] ?? 0 : role ? role.have : null;
    const moved = rows.filter(isPicked).reduce((n, l) => n + (l.side === "add" ? 1 : -1), 0);
    out.push({
      key,
      lines: rows,
      have,
      target: role ? role.target : null,
      withPicks: have !== null && rows.some(isPicked) ? have + moved : null,
    });
  }
  return out;
}

/** What a finished run says about a list that came back under N (Short-Run), or with no cuts at all (plan P4). */
export type ShortFacts =
  | { kind: "noCuts" }
  | { kind: "bound"; side: "add" | "cut"; found: number; reason: ShortReason; dropped: number }
  | { kind: "refunded"; side: "add" | "cut"; found: number };

export function shortFacts(n: number, lines: readonly LineItem[], report: ValidationReport | null): ShortFacts | null {
  const v2 = report?.v2;
  const adds = lines.filter((l) => l.side === "add").length;
  const cuts = lines.length - adds;
  if (v2?.cutsFailed || (adds > 0 && cuts === 0)) return { kind: "noCuts" };
  const side: "add" | "cut" | null = adds < n ? "add" : cuts < Math.min(n, adds) ? "cut" : null;
  if (side === null) return null;
  const found = side === "add" ? adds : cuts;
  const reason = v2?.shortReason?.[side] ?? null;
  if (reason === null || v2?.charge?.outcome === "refunded" || report?.refunded) return { kind: "refunded", side, found };
  const dropped = (report?.drops ?? []).filter((d) => d.rule === reason && (d.side === undefined || d.side === side)).length;
  return { kind: "bound", side, found, reason, dropped };
}

/**
 * The wait's last word on a run that ended with a list under what it asked for but not under N (Wait E: "Cuts came up 3
 * short of 15"): the side, by how many, and why (the restriction with the most drops on that side, else none).
 */
export function shortOfAsk(n: number, lines: readonly LineItem[], report: ValidationReport | null):
  { side: "add" | "cut"; short: number; asked: number; reason: ShortReason | null } | null {
  const adds = lines.filter((l) => l.side === "add").length;
  const cuts = lines.length - adds;
  const v2 = report?.v2;
  const askAdd = askFor(v2?.target?.add ?? n);
  const askCut = askFor(v2?.target?.cut ?? Math.min(n, adds));
  const side = cuts < askCut ? "cut" : adds < askAdd ? "add" : null;
  if (side === null || (side === "cut" && cuts === 0)) return null;
  const asked = side === "add" ? askAdd : askCut;
  const drops = (report?.drops ?? []).filter((d) => d.side === side);
  const order: ShortReason[] = ["overCap", "offSet", "notOwned", "bracketAim"];
  let reason: ShortReason | null = null;
  let most = 0;
  for (const r of order) {
    const k = drops.filter((d) => d.rule === r).length;
    if (k > most) { reason = r; most = k; }
  }
  return { side, short: asked - (side === "add" ? adds : cuts), asked, reason };
}
