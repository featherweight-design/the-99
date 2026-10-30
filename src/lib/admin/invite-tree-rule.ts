import { adminCopy } from "../copy/admin";
import { holdsInvite } from "../invites/rules";
import type { Account } from "./accounts";
import { maskEmail, unlistedAccount } from "./mask";
import { initials, matchesAccount } from "./account-page-rule";
import { countFor, fmtDay, type Edge, type FlyerEdge, type FlyerNodeRow, type OpenRow, type ReservationRow } from "./invites-rule";
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

type AccountNode = { kind: "account"; id: string; name: string; initials: string | null; owner: boolean; joined: string | null; left: number; invited: number; children: TreeNode[] };
type DeletedNode = { kind: "deleted"; key: string; joined: string | null; children: TreeNode[] };
type WaitingNode = { kind: "waiting"; id: string; how: string; email: string; returns: string };
/** A flyer code that took sign-ups, under the account that made it; its sign-ups are its children (no friend link to anyone). */
type FlyerNode = { kind: "flyer"; key: string; code: string; store: string; taken: number; capacity: number; children: TreeNode[] };
export type TreeNode = AccountNode | DeletedNode | WaitingNode | FlyerNode;

export type TreeRow =
  | (Omit<AccountNode, "children"> & { cells: RailCell[] })
  | (Omit<DeletedNode, "children"> & { cells: RailCell[] })
  | (Omit<FlyerNode, "children"> & { cells: RailCell[] })
  | (WaitingNode & { cells: RailCell[] });

export type InviteTree = { roots: TreeNode[]; accounts: number; invited: number; waiting: number };

export function buildInviteTree(input: {
  /** Clerk's accounts, in the list's order (the owner first, then A to Z). */
  accounts: readonly Account[];
  ownerId: string | null;
  balances: ReadonlyMap<string, number>;
  open: readonly ReservationRow[];
  /** Claims holding on flyer codes: each holds one of its code creator's invites, so `left` nets them; never drawn as rows. */
  flyer?: readonly OpenRow[];
  /** The codes that took a sign-up and the accounts they made (spent claims): drawn as a node under the code's maker. */
  flyerCodes?: readonly FlyerNodeRow[];
  flyerEdges?: readonly FlyerEdge[];
  edges: readonly Edge[];
  now: Date;
}): InviteTree {
  const byId = new Map(input.accounts.map((a) => [a.id, a]));
  // An id Clerk did not list (Clerk down, or not yet listed) is still drawn, by its id: one an edge names, one
  // holding a stock, or one with a reservation open, so a sender's waiting invites and their Revoke never vanish.
  const order = [...input.accounts.map((a) => a.id)];
  const flyerCodes = input.flyerCodes ?? [];
  const flyerEdges = input.flyerEdges ?? [];
  const extra = [
    ...input.edges.flatMap((e) => [e.inviter, e.invitee]),
    ...input.balances.keys(),
    ...input.open.map((r) => r.userId),
    ...flyerCodes.map((c) => c.createdBy),
    ...flyerEdges.map((e) => e.invitee),
  ];
  for (const id of extra) if (id !== null && !byId.has(id) && !order.includes(id)) order.push(id);
  const rank = new Map(order.map((id, i) => [id, i]));

  const openOf = new Map<string, ReservationRow[]>();
  for (const r of input.open) openOf.set(r.userId, [...(openOf.get(r.userId) ?? []), r]);
  const flyerOf = new Map<string, OpenRow[]>();
  for (const r of input.flyer ?? []) flyerOf.set(r.userId, [...(flyerOf.get(r.userId) ?? []), r]);
  const madeBy = new Map<string | null, Edge[]>();
  for (const e of input.edges) madeBy.set(e.inviter, [...(madeBy.get(e.inviter) ?? []), e]);
  const byJoin = (a: Edge, b: Edge) => a.joinedAt.getTime() - b.joinedAt.getTime() || (rank.get(a.invitee ?? "") ?? 0) - (rank.get(b.invitee ?? "") ?? 0);
  const joinedOf = new Map([
    ...input.edges.filter((e) => e.invitee !== null).map((e): [string, Date] => [e.invitee!, e.joinedAt]),
    ...flyerEdges.map((e): [string, Date] => [e.invitee, e.joinedAt]),
  ]);
  const signUpsOf = new Map<string, FlyerEdge[]>();
  for (const e of flyerEdges) signUpsOf.set(e.codeId, [...(signUpsOf.get(e.codeId) ?? []), e]);
  const flyerNodesOf = (creator: string): FlyerNode[] =>
    flyerCodes
      .filter((c) => c.createdBy === creator && signUpsOf.has(c.id))
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id))
      .map((c) => {
        const ups = [...signUpsOf.get(c.id)!].sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime() || (rank.get(a.invitee) ?? 0) - (rank.get(b.invitee) ?? 0));
        return { kind: "flyer", key: `flyer-${c.id}`, code: c.code, store: c.label, taken: ups.length, capacity: c.capacity, children: ups.map((e) => account(e.invitee)) };
      });

  let waitingTotal = 0;
  const seen = new Set<string>();
  const childrenOf = (inviter: string | null): TreeNode[] => [...(madeBy.get(inviter) ?? [])].sort(byJoin).map(nodeFor);
  const nodeFor = (e: Edge): TreeNode => (e.invitee === null ? { kind: "deleted", key: `deleted-${e.inviter}-${e.joinedAt.getTime()}`, joined: fmtDay(e.joinedAt), children: [] } : account(e.invitee));

  function account(id: string): AccountNode {
    seen.add(id);
    const a = byId.get(id) ?? unlistedAccount(id);
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
      // The owner and an account with no name are marked with the diamond, not lettered (D4).
      initials: id === input.ownerId ? null : initials(a),
      owner: id === input.ownerId,
      joined: joined ? fmtDay(joined) : null,
      left: countFor(input.balances.get(id), [...open, ...(flyerOf.get(id) ?? [])], input.now).left,
      invited: (madeBy.get(id) ?? []).length,
      children: [
        ...flyerNodesOf(id),
        ...childrenOf(id),
        ...waiting.map((r): WaitingNode => ({
          kind: "waiting",
          id: r.id,
          how: r.kind === "email" ? adminCopy.invites.byEmail : adminCopy.invites.inPerson,
          // Masked always: the recipient has no account to Show or log against (D9).
          email: r.email ? maskEmail(r.email) : "",
          returns: fmtDay(r.holdsUntil!),
        })),
      ],
    };
  }

  const edgeInvitees = new Set(input.edges.flatMap((e) => (e.invitee === null ? [] : [e.invitee])));
  // Flyer sign-ups keep an account off the roots (they hang under their code) but are not friend invites, so they stay out of the header total.
  const invitees = new Set([...edgeInvitees, ...flyerEdges.map((e) => e.invitee)]);
  const roots: TreeNode[] = order.filter((id) => !invitees.has(id)).map(account);
  const orphans = childrenOf(null);
  if (orphans.length > 0) roots.push({ kind: "deleted", key: "deleted-root", joined: null, children: orphans });
  // A cycle cannot form (each account joins once, after its inviter), but an id never reached stays visible.
  for (const id of order) if (!seen.has(id)) roots.push(account(id));

  return { roots, accounts: seen.size, invited: edgeInvitees.size, waiting: waitingTotal };
}

/** The tree cut to the accounts a search names, with the line to each from its root kept. An empty query keeps all. */
export function filterTree(roots: readonly TreeNode[], query: string): TreeNode[] {
  if (!query.trim()) return [...roots];
  const keep = (n: TreeNode): TreeNode | null => {
    if (n.kind === "waiting") return null;
    const children = n.children.map(keep).filter((c): c is TreeNode => c !== null);
    // The node's own masked name: the tree carries nothing else to search (D14).
    const hit = n.kind === "account" && matchesAccount(n, query);
    // A match keeps everything under it, so its waiting invites stay in view.
    if (hit) return n;
    return children.length > 0 ? { ...n, children } : null;
  };
  return roots.map(keep).filter((n): n is TreeNode => n !== null);
}

/**
 * The rail cells of a node's child `i` of `count`, from the node's own cells: each of the node's levels carries on as a
 * line where that ancestor had a later sibling (`tv`, `v`) and stops where it was the last (`t`, `blank`), then the
 * child's own tee, or an elbow for the last child.
 */
export function childRails(parent: readonly RailCell[], i: number, count: number): RailCell[] {
  return [...parent.map((c): RailCell => (c === "tv" || c === "v" ? "v" : "blank")), i === count - 1 ? "t" : "tv"];
}

/** The tree as flat rows, each with its rail cells, in the order the page draws them. */
export function flattenTree(roots: readonly TreeNode[]): TreeRow[] {
  const rows: TreeRow[] = [];
  const walk = (n: TreeNode, rails: RailCell[]) => {
    if (n.kind === "waiting") rows.push({ ...n, cells: rails });
    else {
      const { children, ...rest } = n;
      rows.push({ ...rest, cells: rails } as TreeRow);
      children.forEach((c, i) => walk(c, childRails(rails, i, children.length)));
    }
  };
  roots.forEach((r) => walk(r, []));
  return rows;
}

/** How many levels below the roots the deepest node sits: what the page's minimum width is sized from. */
export function treeDepth(roots: readonly TreeNode[]): number {
  const depth = (n: TreeNode): number => (n.kind === "waiting" || n.children.length === 0 ? 0 : 1 + Math.max(...n.children.map(depth)));
  return roots.length === 0 ? 0 : Math.max(...roots.map(depth));
}

/** A node's meta: `N left · invited K`, the owner first on the phone. */
export const nodeMeta = (left: number, invited: number) => copy.nodeMeta(left, invited);
