import type { JoinMode } from "./filter";
import { parseColors } from "../color-param";
import { normalizeSetCodes } from "../sets/printed-in";

export type Lane = "owned" | "discover";
// `added` is deliberately absent. The handoff's owned order reads Fit · Name ·
// Recently added, but nothing can implement the third: `collection_items` has
// no timestamp, and an upload deletes and re-inserts every holding, so there is
// no acquisition date to sort on. An option that quietly falls back to Fit is
// the same class of defect this redesign exists to remove.
export type OwnedOrder = "fit" | "name";
// `bestfit` and `new` are the two rankings the server produces; the other three
// arrange a list the client already holds. They are one control rather than an
// order plus a scope because a separate scope could not be obeyed — the client
// re-sorted by `order` after every server ranking, so the scope it asked for
// never reached the screen.
export type DiscoverOrder = "bestfit" | "new" | "popularity" | "name" | "recent";
export type LaneOrder = OwnedOrder | DiscoverOrder;
export type Avail = "all" | "free";

export type LaneParams = {
  q: string;
  colors: string[];
  match: JoinMode;
  avail: Avail;
  order: LaneOrder;
  /** `Printed in`: set codes, lower-cased and sorted. Any printing counts (decision 9). */
  printedIn: string[];
};

const WUBRG = ["w", "u", "b", "r", "g"] as const;

const ORDERS: Record<Lane, readonly LaneOrder[]> = {
  owned: ["fit", "name"],
  discover: ["bestfit", "new", "popularity", "name", "recent"],
};

/**
 * The ranking `loadDiscovery` is asked for under a given order. Only `new` wants
 * the novelty ranking; every other order is arranged out of the fit ranking,
 * which is what makes three of the five free — those rows are already in memory.
 */
export function discoverSort(order: LaneOrder): "fit" | "new" {
  return order === "new" ? "new" : "fit";
}

export function defaultParams(lane: Lane): LaneParams {
  return {
    q: "",
    colors: [],
    match: "contains",
    avail: "all",
    order: ORDERS[lane][0],
    printedIn: [],
  };
}

// The shipped build wrote `join`, `avail` and `sort`. Reading them keeps a
// shared link's state; nothing writes them back, so the URL self-heals.
const LEGACY: Record<string, string> = { m: "join", a: "avail", o: "sort" };

function read(sp: URLSearchParams, key: keyof typeof LEGACY): string | null {
  return sp.get(key) ?? sp.get(LEGACY[key]);
}

/**
 * `saved` is the mode the reader last chose on the owned lane, stored per account (Hugh,
 * 2026-09-27: open in the mode they last picked). The URL always wins over it — `a=free` and
 * `a=all` are both explicit — and it answers only when the URL says nothing.
 */
export function parseLaneParams(
  sp: URLSearchParams,
  lane: Lane,
  saved: Avail = "all",
): LaneParams {
  const base = defaultParams(lane);
  // `parseColors` is the app-wide reader for `?c=`, and going through it is what
  // keeps a link portable: it takes the collection browser's letter run (`c=bg`)
  // as readily as this lane's comma form, and drops anything that is neither.
  // Re-ordered to WUBRG here so the chip, the URL and the pips agree whichever
  // order the letters arrived in.
  const raw = parseColors(sp.get("c"));
  const colors = WUBRG.filter((c) => raw.includes(c.toUpperCase()));
  // `?s=new` was the scope control's novelty ranking for the one build that
  // shipped it. It now names an order, so it is read as `o=new` and never
  // written back. `sort=new` needs no case of its own: `read` already falls back
  // to it, and it meant the same ranking under the same name.
  const orderRaw = read(sp, "o") ?? (sp.get("s") === "new" ? "new" : null);
  const order = ORDERS[lane].find((o) => o === orderRaw) ?? base.order;
  return {
    q: sp.get("q") ?? "",
    colors,
    match: read(sp, "m") === "exact" ? "exactly" : "contains",
    avail: lane === "owned" ? readAvail(read(sp, "a")) ?? saved : "all",
    order,
    // Unknown codes are kept rather than validated: a set that stops existing matches nothing,
    // and the empty state names the control to drop.
    printedIn: normalizeSetCodes((sp.get("p") ?? "").split(",")),
  };
}

function readAvail(raw: string | null): Avail | null {
  return raw === "free" || raw === "all" ? raw : null;
}

/**
 * `a` is written only where the mode differs from `saved`, the one the page opens in without
 * it, so a URL carries `a=all` only for a reader whose saved mode is `free`.
 */
export function serializeLaneParams(p: LaneParams, lane: Lane, saved: Avail = "all"): string {
  const sp = new URLSearchParams();
  if (p.q) sp.set("q", p.q);
  if (p.colors.length > 0) sp.set("c", p.colors.join(","));
  if (p.match === "exactly") sp.set("m", "exact");
  if (lane === "owned" && p.avail !== saved) sp.set("a", p.avail);
  if (p.order !== ORDERS[lane][0]) sp.set("o", p.order);
  if (p.printedIn.length > 0) sp.set("p", normalizeSetCodes(p.printedIn).join(","));
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

// Every key either lane reads, new and legacy. A URL may carry parameters that
// belong to neither lane — a campaign tag, something another surface left — and
// a write rebuilt from `LaneParams` alone would drop them. This is the list a
// write is allowed to clear; everything else on the live URL is copied across.
const LANE_KEYS = ["q", "c", "m", "join", "a", "avail", "o", "sort", "s", "p"];

/**
 * The query string to write for `p`, keeping every parameter the lane does not
 * own exactly as the live URL had it. Foreign keys lead, in the order they were
 * already in; the lane's own keys follow in `serializeLaneParams` order.
 */
export function laneQuery(
  live: URLSearchParams,
  p: LaneParams,
  lane: Lane,
  saved: Avail = "all",
): string {
  const kept = new URLSearchParams(live);
  for (const key of LANE_KEYS) kept.delete(key);
  for (const [key, value] of new URLSearchParams(
    serializeLaneParams(p, lane, saved).slice(1),
  )) {
    kept.set(key, value);
  }
  const qs = kept.toString();
  return qs ? `?${qs}` : "";
}

// The badge, the chip row and Clear's enabled state all read this. Search and
// order are excluded by call 4: search sits outside the sheet, and order always
// has a value.
export function activeControlCount(p: LaneParams, lane: Lane): number {
  let n = 0;
  if (p.colors.length > 0) n += 1;
  if (p.colors.length > 0 && p.match === "exactly") n += 1;
  if (lane === "owned" && p.avail === "free") n += 1;
  if (p.printedIn.length > 0) n += 1;
  return n;
}
