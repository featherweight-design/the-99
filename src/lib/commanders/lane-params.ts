import type { JoinMode } from "./filter";

export type Lane = "owned" | "discover";
export type OwnedOrder = "fit" | "name" | "added";
export type DiscoverOrder = "popularity" | "name" | "recent";
export type LaneOrder = OwnedOrder | DiscoverOrder;
export type Avail = "all" | "free";
export type Scope = "bestfit" | "new";

export type LaneParams = {
  q: string;
  colors: string[];
  match: JoinMode;
  avail: Avail;
  order: LaneOrder;
  scope: Scope;
};

const WUBRG = ["w", "u", "b", "r", "g"] as const;

const ORDERS: Record<Lane, readonly LaneOrder[]> = {
  owned: ["fit", "name", "added"],
  discover: ["popularity", "name", "recent"],
};

export function defaultParams(lane: Lane): LaneParams {
  return {
    q: "",
    colors: [],
    match: "contains",
    avail: "all",
    order: ORDERS[lane][0],
    scope: "bestfit",
  };
}

// The shipped build wrote `join`, `avail` and `sort`. Reading them keeps a
// shared link's state; nothing writes them back, so the URL self-heals.
const LEGACY: Record<string, string> = { m: "join", a: "avail", o: "sort" };

function read(sp: URLSearchParams, key: keyof typeof LEGACY): string | null {
  return sp.get(key) ?? sp.get(LEGACY[key]);
}

export function parseLaneParams(sp: URLSearchParams, lane: Lane): LaneParams {
  const base = defaultParams(lane);
  const raw = (sp.get("c") ?? "").toLowerCase().split(",");
  const colors = WUBRG.filter((c) => raw.includes(c));
  const order = ORDERS[lane].find((o) => o === read(sp, "o")) ?? base.order;
  // `sort=new` was discovery's novelty ranking, which is now the scope control.
  const scopeRaw = sp.get("s") ?? sp.get("sort");
  return {
    q: sp.get("q") ?? "",
    colors,
    match: read(sp, "m") === "exact" ? "exactly" : "contains",
    avail: lane === "owned" && read(sp, "a") === "free" ? "free" : "all",
    order,
    scope: lane === "discover" && scopeRaw === "new" ? "new" : "bestfit",
  };
}

export function serializeLaneParams(p: LaneParams, lane: Lane): string {
  const sp = new URLSearchParams();
  if (p.q) sp.set("q", p.q);
  if (p.colors.length > 0) sp.set("c", p.colors.join(","));
  if (p.match === "exactly") sp.set("m", "exact");
  if (lane === "owned" && p.avail === "free") sp.set("a", "free");
  if (p.order !== ORDERS[lane][0]) sp.set("o", p.order);
  if (lane === "discover" && p.scope === "new") sp.set("s", "new");
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

// Every key either lane reads, new and legacy. A URL may carry parameters that
// belong to neither lane — a campaign tag, something another surface left — and
// a write rebuilt from `LaneParams` alone would drop them. This is the list a
// write is allowed to clear; everything else on the live URL is copied across.
const LANE_KEYS = ["q", "c", "m", "join", "a", "avail", "o", "sort", "s"];

/**
 * The query string to write for `p`, keeping every parameter the lane does not
 * own exactly as the live URL had it. Foreign keys lead, in the order they were
 * already in; the lane's own keys follow in `serializeLaneParams` order.
 */
export function laneQuery(live: URLSearchParams, p: LaneParams, lane: Lane): string {
  const kept = new URLSearchParams(live);
  for (const key of LANE_KEYS) kept.delete(key);
  for (const [key, value] of new URLSearchParams(
    serializeLaneParams(p, lane).slice(1),
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
  if (lane === "discover" && p.scope === "new") n += 1;
  return n;
}
