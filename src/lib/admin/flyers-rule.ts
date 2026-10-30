import { flyerAdminCopy } from "../copy/admin";
import { flyerHoldRow } from "../flyer/rules";
import type { HoldingRow } from "../invites/rules";
import { countFor, fmtDay } from "./invites-rule";

/**
 * The Flyer codes section as arithmetic (flyer trial PR 4a; boards Admin-Desktop and Admin-Phone A1/P1). Pure: the
 * read is `flyers.ts`. A code is `revoked` once ended, `full` at its capacity of sign-ups (a spent claim takes a place;
 * a hold is not counted here), and `live` otherwise: the meta line's "live" is every code not revoked, as drawn.
 */
const copy = flyerAdminCopy;

/** One code as the read returns it: `taken` is its spent claims, `listed` the launch-list addresses it brought. */
export type FlyerCodeRead = {
  id: string;
  code: string;
  label: string;
  groupName: string | null;
  capacity: number;
  createdAt: Date;
  revokedAt: Date | null;
  taken: number;
  listed: number;
};

export type FlyersRead = {
  codes: readonly FlyerCodeRead[];
  /** Every launch-list address, including those whose code is gone. */
  listed: number;
  /** The viewer's stock, and what holds one of his invites now: reservations, and claims holding on his codes. */
  held: number | undefined;
  open: readonly HoldingRow[];
  holds: readonly Date[];
};

export type FlyerState = "live" | "full" | "revoked";
export type FlyerRowView = {
  id: string;
  code: string;
  store: string;
  group: string | null;
  state: FlyerState;
  taken: number;
  /** `12` and `of 50`, or `of 50 · full`: the figure and its small tail. */
  figure: string;
  of: string;
  /** The bar's fill, 0 to 100. */
  percent: number;
  /** The Made column: the day the code was made. */
  made: string;
  /** A revoked row's note in place of its actions. */
  revoked: string | null;
};
export type FlyersView = {
  meta: string;
  rows: FlyerRowView[];
  launch: { title: string; meta: string };
};

export const flyerState = (c: Pick<FlyerCodeRead, "capacity" | "taken" | "revokedAt">): FlyerState =>
  c.revokedAt !== null ? "revoked" : c.taken >= c.capacity ? "full" : "live";

export function flyersView(read: FlyersRead, now: Date): FlyersView {
  const rows = [...read.codes]
    // Revoked rows stay, below the others; each group is newest first (a new code lands on top, A2).
    .sort((a, b) => Number(a.revokedAt !== null) - Number(b.revokedAt !== null) || b.createdAt.getTime() - a.createdAt.getTime())
    .map((c): FlyerRowView => {
      const state = flyerState(c);
      return {
        id: c.id,
        code: c.code,
        store: c.label,
        group: c.groupName,
        state,
        taken: c.taken,
        figure: String(c.taken),
        of: copy.used(c.taken, c.capacity).replace(/^\d+ /, "") + (state === "full" ? ` · ${copy.full}` : ""),
        percent: Math.min(100, Math.round((c.taken / c.capacity) * 100)),
        made: fmtDay(c.createdAt),
        revoked: c.revokedAt === null ? null : copy.revokedOn(fmtDay(c.revokedAt)),
      };
    });
  const live = read.codes.filter((c) => c.revokedAt === null).length;
  const { left } = countFor(read.held, [...read.open, ...read.holds.map(flyerHoldRow)], now);
  const perCode = read.codes
    .filter((c) => c.listed > 0)
    .sort((a, b) => b.listed - a.listed || a.label.localeCompare(b.label))
    .map((c) => `${c.label} ${c.listed}`);
  return {
    meta: copy.meta(live, left, read.listed),
    rows,
    launch: { title: copy.launchList(read.listed), meta: [copy.launchListMeta, ...perCode].join(" · ") },
  };
}
