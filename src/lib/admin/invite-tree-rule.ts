import { adminCopy } from "../copy/admin";
import { HOLD_MS, holdsInvite } from "../invites/rules";
import type { Account } from "./accounts";
import { initials, matchesAccount } from "./account-page-rule";
import { countFor, fmtDay, type Edge, type ReservationRow } from "./invites-rule";
import { accountName } from "./names";

/**
 * The Invites tab's tree as arithmetic (plan `2026-10-16-invites.md`, PR 6b; handoff Admin M4). Pure: the read is
 * `invites.ts`. Founders (no edge names them as the invitee) are the roots, the owner first and then A to Z; under each
 * account its invitees by join date, then its invites still waiting by when they return. A side deleted by the purge
 * keeps its edge with that id nulled (R10), and the tree draws it (G6, left to engineering): an invitee deleted is a
 * `deleted account` leaf under its inviter, and accounts whose inviter was deleted sit under one `deleted account`
 * root, after the founders.
 */
const copy = adminCopy.invites.tree;

/** One rail cell left of a row, per level: `v` an ancestor's line runs on, `blank` it ended, `tv` a tee, `t` an elbow. */
export type RailCell = "v" | "blank" | "tv" | "t";

type AccountNode = { kind: "account"; id: string; name: string; initials: string; owner: boolean; joined: string | null; left: number; invited: number; children: TreeNode[] };
type DeletedNode = { kind: "deleted"; key: string; joined: string | null; children: TreeNode[] };
type WaitingNode = { kind: "waiting"; id: string; how: string; email: string; returns: string };
export type TreeNode = AccountNode | DeletedNode | WaitingNode;

export type TreeRow =
  | (Omit<AccountNode, "children"> & { cells: RailCell[] })
  | (Omit<DeletedNode, "children"> & { cells: RailCell[] })
  | (WaitingNode & { cells: RailCell[] });

export type InviteTree = { roots: TreeNode[]; accounts: number; invited: number; waiting: number };

export function buildInviteTree(input: {
  /** Clerk's accounts, in the list's order (the owner first, then A to Z). */
  accounts: readonly Account[];
  ownerId: string | null;
  balances: ReadonlyMap<string, number>;
  open: readonly ReservationRow[];
  edges: readonly Edge[];
  now: Date;
}): InviteTree {
  const byId = new Map(input.accounts.map((a) => [a.id, a]));
  // An id an edge names that Clerk did not list (Clerk down, or not yet listed) is still drawn, by its id.
  const order = [...input.accounts.map((a) => a.id)];
  for (const e of input.edges) for (const id of [e.inviter, e.invitee]) if (id !== null && !byId.has(id) && !order.includes(id)) order.push(id);
  const rank = new Map(order.map((id, i) => [id, i]));

  const openOf = new Map<string, ReservationRow[]>();
  for (const r of input.open) openOf.set(r.userId, [...(openOf.get(r.userId) ?? []), r]);
  const madeBy = new Map<string | null, Edge[]>();
  for (const e of input.edges) madeBy.set(e.inviter, [...(madeBy.get(e.inviter) ?? []), e]);
  const byJoin = (a: Edge, b: Edge) => a.joinedAt.getTime() - b.joinedAt.getTime() || (rank.get(a.invitee ?? "") ?? 0) - (rank.get(b.invitee ?? "") ?? 0);
  const joinedOf = new Map(input.edges.filter((e) => e.invitee !== null).map((e) => [e.invitee!, e.joinedAt]));

  let waitingTotal = 0;
  const seen = new Set<string>();
  const childrenOf = (inviter: string | null): TreeNode[] => [...(madeBy.get(inviter) ?? [])].sort(byJoin).map(nodeFor);
  const nodeFor = (e: Edge): TreeNode => (e.invitee === null ? { kind: "deleted", key: `deleted-${e.inviter}-${e.joinedAt.getTime()}`, joined: fmtDay(e.joinedAt), children: [] } : account(e.invitee));

  function account(id: string): AccountNode {
    seen.add(id);
    const a = byId.get(id) ?? { id, name: null, email: null };
    const open = openOf.get(id) ?? [];
    const waiting = open
      .filter((r) => r.state !== "qr_open" && holdsInvite(r, input.now))
      .sort((x, y) => x.holdsUntil!.getTime() - y.holdsUntil!.getTime());
    waitingTotal += waiting.length;
    const joined = joinedOf.get(id);
    return {
      kind: "account",
      id,
      name: accountName(a),
      initials: initials(a),
      owner: id === input.ownerId,
      joined: joined ? fmtDay(joined) : null,
      left: countFor(input.balances.get(id), open, input.now).left,
      invited: (madeBy.get(id) ?? []).length,
      children: [
        ...childrenOf(id),
        ...waiting.map((r): WaitingNode => ({
          kind: "waiting",
          id: r.id,
          how: r.kind === "email" ? adminCopy.invites.byEmail : adminCopy.invites.inPerson,
          email: r.email ?? "",
          returns: fmtDay(r.holdsUntil!),
        })),
      ],
    };
  }

  const invitees = new Set(input.edges.flatMap((e) => (e.invitee === null ? [] : [e.invitee])));
  const roots: TreeNode[] = order.filter((id) => !invitees.has(id)).map(account);
  const orphans = childrenOf(null);
  if (orphans.length > 0) roots.push({ kind: "deleted", key: "deleted-root", joined: null, children: orphans });
  // A cycle cannot form (each account joins once, after its inviter), but an id never reached stays visible.
  for (const id of order) if (!seen.has(id)) roots.push(account(id));

  return { roots, accounts: seen.size, invited: invitees.size, waiting: waitingTotal };
}

/** The tree cut to the accounts a search names, with the line to each from its root kept. An empty query keeps all. */
export function filterTree(roots: readonly TreeNode[], query: string, accounts: ReadonlyMap<string, Account>): TreeNode[] {
  if (!query.trim()) return [...roots];
  const keep = (n: TreeNode): TreeNode | null => {
    if (n.kind === "waiting") return null;
    const children = n.children.map(keep).filter((c): c is TreeNode => c !== null);
    const hit = n.kind === "account" && matchesAccount(accounts.get(n.id) ?? { id: n.id, name: n.name, email: null }, query);
    // A match keeps everything under it, so its waiting invites stay in view.
    if (hit) return n;
    return children.length > 0 ? { ...n, children } : null;
  };
  return roots.map(keep).filter((n): n is TreeNode => n !== null);
}

/** The tree as the flat rows the page draws, each with its rail cells. */
export function flattenTree(roots: readonly TreeNode[]): TreeRow[] {
  const rows: TreeRow[] = [];
  const walk = (n: TreeNode, rails: RailCell[]) => {
    if (n.kind === "waiting") rows.push({ ...n, cells: rails });
    else {
      const { children, ...rest } = n;
      rows.push({ ...rest, cells: rails } as TreeRow);
      const above = rails.map((c): RailCell => (c === "tv" || c === "v" ? "v" : "blank"));
      children.forEach((c, i) => walk(c, [...above, i === children.length - 1 ? "t" : "tv"]));
    }
  };
  roots.forEach((r) => walk(r, []));
  return rows;
}

/** A node's meta: `N left · invited K`, the owner first on the phone. */
export const nodeMeta = (left: number, invited: number) => copy.nodeMeta(left, invited);

/** When a waiting leaf's invite was sent, for its accessible name (the row draws only the return). */
export const sentOf = (holdsUntil: Date) => fmtDay(new Date(holdsUntil.getTime() - HOLD_MS));
