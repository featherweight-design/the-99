import { adminCopy } from "../copy/admin";
import { maskEmail, maskInitials } from "./mask";
import { inviteCopy } from "../copy/invites";
import { HOLD_MS, holdsInvite, inviteCount, parseInvitesLeft, type HoldingRow, type InviteKind } from "../invites/rules";
import type { Account } from "./accounts";
import { accountNames } from "./names";
import type { Tile } from "./account-page-rule";
import { fmtWhen, type HistoryItem } from "./switch-page-rule";

/**
 * Invites in the admin as arithmetic (plan `2026-10-16-invites.md`, PR 6; handoff Admin M1 to M3). Pure: the reads
 * are `invites.ts`, the writes `lib/invites/admin.ts`. Every figure comes through `inviteCount`, so "left" and
 * "waiting" mean here what they mean on the sender's own count line.
 */
const copy = adminCopy.invites;

/** A day in UTC, as the admin's dates read (`Oct 18`). */
export const fmtDay = (d: Date) => new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", timeZone: "UTC" }).format(d);

/** A reservation that may still hold, with its sender. */
export type OpenRow = HoldingRow & { userId: string };
/** One invite that made an account. Either side is null once that account was deleted. */
export type Edge = { inviter: string | null; invitee: string | null; kind: InviteKind; joinedAt: Date };

/** What an account's invites read as, from its stock (`held`, 0 when it has no row) and its open rows. */
export function countFor(held: number | undefined, open: readonly HoldingRow[], now: Date) {
  return inviteCount(held ?? 0, open, now);
}

/** Who brought an account in: no edge names it as the invitee (a founder), a deleted inviter, or an account. */
export type InvitedBy = { kind: "founder" } | { kind: "deleted"; joinedAt: Date } | { kind: "account"; id: string; name: string; joinedAt: Date };

export function invitedBy(userId: string, edges: readonly Edge[], name: (id: string) => string): InvitedBy {
  const edge = edges.find((e) => e.invitee === userId);
  if (!edge) return { kind: "founder" };
  return edge.inviter === null ? { kind: "deleted", joinedAt: edge.joinedAt } : { kind: "account", id: edge.inviter, name: name(edge.inviter), joinedAt: edge.joinedAt };
}

/** The name an Invited by cell or line draws. */
export function invitedByName(by: InvitedBy): string {
  return by.kind === "founder" ? copy.founder : by.kind === "deleted" ? copy.deleted : by.name;
}

export type RowInvites = { left: number; waiting: number; invitedBy: InvitedBy };

/** M1: every account's left, waiting and inviter, from one read of every balance, open row and edge. */
export function rowInvites(input: {
  ids: readonly string[];
  balances: ReadonlyMap<string, number>;
  open: readonly OpenRow[];
  edges: readonly Edge[];
  accounts: readonly Account[];
  now: Date;
}): Map<string, RowInvites> {
  const { userName } = accountNames(input.accounts, "");
  const openOf = new Map<string, OpenRow[]>();
  for (const r of input.open) openOf.set(r.userId, [...(openOf.get(r.userId) ?? []), r]);
  return new Map(
    input.ids.map((id) => {
      const c = countFor(input.balances.get(id), openOf.get(id) ?? [], input.now);
      return [id, { left: c.left, waiting: c.waiting, invitedBy: invitedBy(id, input.edges, userName) }];
    }),
  );
}

/** The phone row's invite pieces (Admin-Phone M1): `5 invites` or `2 · 1 waiting`, then `founder` or `by Hugh`. */
export function phoneInviteMeta(r: RowInvites): { figure: string; after: string; by: string } {
  return {
    figure: String(r.left),
    after: r.waiting > 0 ? inviteCopy.count.waiting(r.waiting) : copy.phoneInvites,
    by: r.invitedBy.kind === "founder" ? copy.founder : copy.phoneBy(invitedByName(r.invitedBy)),
  };
}

/** M2's fifth tile: what is left, then waiting and spent (the accounts this one's invites made). */
export function invitesTile(left: number, waiting: number, spent: number): Tile {
  return { key: "invites", label: copy.tile, figure: String(left), sub: copy.tileSub(waiting, spent) };
}

/** A reservation of the account's, as the section reads it. */
export type ReservationRow = OpenRow & { id: string; email: string | null };
export type WaitingLine = { id: string; how: string; email: string; sent: string; returns: string };
/** `face`: the avatar's letters, null for the diamond (the owner, or an account with no name; D4). A deleted account draws an empty face. */
export type InvitedLine = { id: string | null; name: string; face: string | null; joined: string };

/** An admin event the account's history reads. */
export type InviteEvent = { at: Date; actorId: string; kind: string; userId: string | null; oldValue: string | null; newValue: string | null };

export type AccountInvites = {
  left: number;
  waiting: number;
  spent: number;
  invitedBy: InvitedBy;
  /** The inviter's face, as `InvitedLine.face`. */
  invitedByFace: string | null;
  invited: InvitedLine[];
  waitingLines: WaitingLine[];
  history: HistoryItem[];
  historyCut: boolean;
};

/**
 * M2: an account's invites, from its stock, its reservations still open, every edge naming it, its admin events,
 * and the reservations that ever held (`holdsUntil`, raw; a send line is dated `holds_until` less `HOLD_MS`, when the hold began). The
 * history merges three sources newest first and keeps `limit`; each source arrives cut at `limit + 1`, so the merge
 * still knows when the whole is cut.
 */
export function accountInvites(input: {
  userId: string;
  held: number | undefined;
  open: readonly ReservationRow[];
  edges: readonly Edge[];
  events: readonly InviteEvent[];
  holdsUntil: readonly Date[];
  accounts: readonly Account[];
  viewerId: string;
  ownerId: string | null;
  limit: number;
  now: Date;
}): AccountInvites {
  const { userName, actor } = accountNames(input.accounts, input.viewerId);
  const listed = new Map(input.accounts.map((a) => [a.id, a]));
  const face = (id: string): string | null => {
    const a = listed.get(id);
    return id === input.ownerId || !a ? null : maskInitials(a.name, a.named);
  };
  const name = userName(input.userId);
  const count = countFor(input.held, input.open, input.now);
  const made = input.edges.filter((e) => e.inviter === input.userId).sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime());
  const waiting = input.open
    .filter((r) => r.state !== "qr_open" && holdsInvite(r, input.now))
    .sort((a, b) => a.holdsUntil!.getTime() - b.holdsUntil!.getTime());

  const lines: { at: Date; what: string }[] = [
    ...input.events.flatMap((e) => {
      if (e.kind === "invites_set") return [{ at: e.at, what: copy.history.set(actor(e.actorId), name, e.oldValue ?? "0", e.newValue ?? "0") }];
      if (e.kind === "invite_revoked") return [{ at: e.at, what: copy.history.revoked(actor(e.actorId), name) }];
      return [];
    }),
    ...input.holdsUntil.map((until) => ({ at: new Date(until.getTime() - HOLD_MS), what: copy.history.sent(name) })),
    ...made.map((e) => ({ at: e.joinedAt, what: copy.history.joined(e.invitee === null ? copy.deleted : userName(e.invitee), name) })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());

  const by = invitedBy(input.userId, input.edges, userName);
  return {
    left: count.left,
    waiting: count.waiting,
    spent: made.length,
    invitedBy: by,
    invitedByFace: by.kind === "account" ? face(by.id) : null,
    invited: [...made].reverse().map((e) => ({
      id: e.invitee,
      name: e.invitee === null ? copy.deleted : userName(e.invitee),
      face: e.invitee === null ? null : face(e.invitee),
      joined: fmtDay(e.joinedAt),
    })),
    waitingLines: waiting.map((r) => ({
      id: r.id,
      how: r.kind === "email" ? copy.byEmail : copy.inPerson,
      // A waiting recipient has no account to Show or log against, so the address is masked always (D9).
      email: r.email ? maskEmail(r.email) : "",
      sent: fmtDay(new Date(r.holdsUntil!.getTime() - HOLD_MS)),
      returns: fmtDay(r.holdsUntil!),
    })),
    history: lines.slice(0, input.limit).map((l) => ({ when: fmtWhen(l.at), what: l.what, note: null })),
    historyCut: lines.length > input.limit,
  };
}

/** M2's draft: unchanged (or empty), not a whole number in range, or a new left to save. */
export type SetDraft = { kind: "same" } | { kind: "invalid" } | { kind: "pending"; to: number };

export function setDraft(draft: string, saved: number): SetDraft {
  if (draft.trim() === "") return { kind: "same" };
  const to = parseInvitesLeft(draft);
  if (to === null) return { kind: "invalid" };
  return to === saved ? { kind: "same" } : { kind: "pending", to };
}

/** A group member as the top-up reads them. */
export type TopUpMember = { id: string; name: string; left: number };
export type TopUpDraft = { kind: "empty" } | { kind: "invalid" } | { kind: "pending"; to: number; raised: TopUpMember[]; held: number; sentence: string };

/**
 * M3's draft: who a top-up to N raises (those with fewer than N left, A to Z, each with what they hold now) and
 * how many already hold N or more. Nobody is lowered, as `heldForTopUp` decides on the server.
 */
export function topUpDraft(draft: string, members: readonly TopUpMember[]): TopUpDraft {
  if (draft.trim() === "") return { kind: "empty" };
  const to = parseInvitesLeft(draft);
  if (to === null) return { kind: "invalid" };
  const raised = members.filter((m) => m.left < to).sort((a, b) => a.name.localeCompare(b.name, "en-US"));
  const held = members.length - raised.length;
  const who = raised.map((m) => `${m.name} (${m.left})`).join(", ");
  return { kind: "pending", to, raised, held, sentence: copy.groupPending(raised.length, members.length, to, who, held) };
}
