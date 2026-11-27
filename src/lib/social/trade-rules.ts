/**
 * Friend trades' rules, pure (plan `2026-11-27-friend-trades.md`, brief D1 to D7, handoff `STATES.md`). Nothing here reads
 * the database: `trades.ts` reads a trade's row and the spares its cards still need, and these decide what each side
 * sees and may do.
 *
 * Rounds alternate: the proposer sends the odd rounds, the recipient the even ones, so the current offer's author follows
 * from `round` (`trades_offered_by_check`). Expiry is derived, as for spare requests: an `open` trade whose first offer
 * is `TRADE_DAYS` old reads as expired everywhere, and no job sweeps. An accepted trade never expires: it waits on both
 * marks, or a Rescind.
 */

/** The whole trade's clock, from the first offer (D6). A counter never resets it. */
export const TRADE_DAYS = 14;
/** At most this many cards on each side of one offer: a bound on what one press can write and push. */
export const TRADE_SIDE_MAX = 30;
/** At most this many rounds in one trade: past it, the only answers are Yes and No. */
export const TRADE_ROUND_MAX = 20;

const DAY_MS = 86_400_000;

export const TRADE_STATUSES = ["open", "accepted", "traded", "declined", "withdrawn", "rescinded", "expired"] as const;
export type TradeStatus = (typeof TRADE_STATUSES)[number];

/** A trade's row, as the rules need it. */
export type TradeFacts = {
  status: TradeStatus;
  proposerUserId: string;
  recipientUserId: string;
  round: number;
  createdAt: Date;
  endedByUserId: string | null;
  proposerMarkedAt: Date | null;
  recipientMarkedAt: Date | null;
};

export type TradeRole = "proposer" | "recipient";

/** The oldest `created_at` an `open` trade may have and still be answered: every answering statement carries it. */
export const tradeOpenFloor = (now: Date): Date => new Date(now.getTime() - TRADE_DAYS * DAY_MS);

export const tradeExpiresAt = (createdAt: Date): Date => new Date(createdAt.getTime() + TRADE_DAYS * DAY_MS);

/** Whole days left to answer, rounded up, never below 0 (the days left beside Yes and No). */
export function tradeDaysLeft(createdAt: Date, now: Date): number {
  return Math.max(0, Math.ceil((tradeExpiresAt(createdAt).getTime() - now.getTime()) / DAY_MS));
}

/** The status as read: an `open` trade past its 14 days is `expired`, whatever the row says. */
export function tradeStatus(t: Pick<TradeFacts, "status" | "createdAt">, now: Date): TradeStatus {
  return t.status === "open" && t.createdAt.getTime() <= tradeOpenFloor(now).getTime() ? "expired" : t.status;
}

export function roleOf(t: Pick<TradeFacts, "proposerUserId" | "recipientUserId">, viewerId: string): TradeRole | null {
  if (viewerId === t.proposerUserId) return "proposer";
  if (viewerId === t.recipientUserId) return "recipient";
  return null;
}

/** Who sent round `round`: the proposer the odd rounds, the recipient the even ones. */
export const authorRole = (round: number): TradeRole => (round % 2 === 1 ? "proposer" : "recipient");

export function authorOf(t: Pick<TradeFacts, "proposerUserId" | "recipientUserId" | "round">): string {
  return authorRole(t.round) === "proposer" ? t.proposerUserId : t.recipientUserId;
}

/** The other person's id, for a party to the trade. */
export function otherOf(t: Pick<TradeFacts, "proposerUserId" | "recipientUserId">, viewerId: string): string {
  return viewerId === t.proposerUserId ? t.recipientUserId : t.proposerUserId;
}

function marks(t: TradeFacts, viewerId: string): { mine: boolean; theirs: boolean } {
  const proposer = viewerId === t.proposerUserId;
  return {
    mine: (proposer ? t.proposerMarkedAt : t.recipientMarkedAt) !== null,
    theirs: (proposer ? t.recipientMarkedAt : t.proposerMarkedAt) !== null,
  };
}

/**
 * The trade sheet's state for a party (`STATES.md`, the sheet table), or `ended` for a trade with nothing left to open.
 * The sheet's own states (draft, askBack, counterDraft, sent) are the reader's presses, never stored, so they are not
 * here. `gone` is whether a card in the current offer is no longer spare (Needs a look), read for an open trade only.
 */
export type SheetState = "theirs" | "theirCounter" | "yours" | "look" | "lookYours" | "accepted" | "themMarked" | "youMarked" | "traded" | "ended";

export function sheetState(t: TradeFacts, viewerId: string, now: Date, gone: boolean): SheetState {
  const status = tradeStatus(t, now);
  if (status === "open") {
    const mine = authorOf(t) === viewerId;
    if (gone) return mine ? "lookYours" : "look";
    if (mine) return "yours";
    return t.round > 1 ? "theirCounter" : "theirs";
  }
  if (status === "accepted") {
    const m = marks(t, viewerId);
    if (m.mine) return "youMarked";
    return m.theirs ? "themMarked" : "accepted";
  }
  if (status === "traded") return "traded";
  return "ended";
}

/** A Trades row's state (`STATES.md`, the Trades rows table). */
export type RowState =
  | "offer" | "offered" | "countered" | "look" | "accepted" | "themMarked" | "youMarked" | "traded"
  | "declined" | "withdrawn" | "rescinded" | "expired";

export type TradeRow = {
  state: RowState;
  /** Something for the reader to do now: an answer, a look, or a mark. Sorted first. */
  waitsOnYou: boolean;
  /** Who made the move the row reports, for the `…You` title variants (`acceptedYou`, `declinedYou`). */
  byYou: boolean;
};

export function rowState(t: TradeFacts, viewerId: string, now: Date, gone: boolean): TradeRow {
  const status = tradeStatus(t, now);
  const author = authorOf(t);
  switch (status) {
    case "open": {
      const mine = author === viewerId;
      // A gone card is the reader's to look at either way: Counter or No when it is theirs to answer, revise or
      // Withdraw when it is their own offer (`lookYours`).
      if (gone) return { state: "look", waitsOnYou: true, byYou: mine };
      if (mine) return { state: "offered", waitsOnYou: false, byYou: true };
      return { state: t.round > 1 ? "countered" : "offer", waitsOnYou: true, byYou: false };
    }
    case "accepted": {
      // The answerer accepted the current offer: the person who did not author it.
      const byYou = author !== viewerId;
      const m = marks(t, viewerId);
      if (m.mine) return { state: "youMarked", waitsOnYou: false, byYou: true };
      if (m.theirs) return { state: "themMarked", waitsOnYou: true, byYou: false };
      return { state: "accepted", waitsOnYou: true, byYou };
    }
    case "traded":
      return { state: "traded", waitsOnYou: false, byYou: false };
    case "declined":
      return { state: "declined", waitsOnYou: false, byYou: t.endedByUserId === viewerId };
    case "withdrawn":
      return { state: "withdrawn", waitsOnYou: false, byYou: t.endedByUserId === viewerId };
    case "rescinded":
      return { state: "rescinded", waitsOnYou: false, byYou: t.endedByUserId === viewerId };
    case "expired":
      // Nobody pressed: the reader's "move" is the answer they did not give, when the offer was the friend's.
      return { state: "expired", waitsOnYou: false, byYou: author !== viewerId };
  }
}

/** Waiting on you first, in this order; the rest after, newest first (`STATES.md`, Trades rows). */
const WAITING_ORDER: readonly RowState[] = ["offer", "countered", "look", "accepted", "themMarked"];

export function compareRows(a: { row: TradeRow; at: Date }, b: { row: TradeRow; at: Date }): number {
  const rank = (r: TradeRow) => (r.waitsOnYou ? WAITING_ORDER.indexOf(r.state) : WAITING_ORDER.length);
  return rank(a.row) - rank(b.row) || b.at.getTime() - a.at.getTime();
}

/**
 * The cap (handoff Q10): one unanswered offer per friend. An offer of the reader's is unanswered while its trade is
 * `open`, unexpired, and the current round is theirs, so a counter the reader sent holds their slot with that friend as
 * a first offer does. Accepted trades never count. The cap holds back only a NEW trade: a counter is never held by it.
 * `trades.ts` reads `open` against the pair under the pair's advisory lock, inside the proposing transaction.
 */
export function offerHeld(open: readonly Pick<TradeFacts, "status" | "createdAt" | "proposerUserId" | "recipientUserId" | "round">[], viewerId: string, now: Date): boolean {
  return open.some((t) => tradeStatus(t, now) === "open" && authorOf(t) === viewerId);
}

export type TradeAction = "counter" | "revise" | "accept" | "decline" | "withdraw" | "rescind" | "mark" | "clear";

/**
 * May the viewer take `action` on the trade now? Each write's conditional statement says the same in SQL; this is the
 * one statement of it the sheet's presses and the tests read.
 */
export function canAct(t: TradeFacts, viewerId: string, action: TradeAction, now: Date, gone = false): boolean {
  const role = roleOf(t, viewerId);
  if (role === null) return false;
  const status = tradeStatus(t, now);
  const mine = authorOf(t) === viewerId;
  switch (action) {
    case "counter":
      return status === "open" && !mine && t.round < TRADE_ROUND_MAX;
    case "revise":
      return status === "open" && mine && gone;
    case "accept":
      return status === "open" && !mine && !gone;
    case "decline":
      return status === "open" && !mine;
    case "withdraw":
      return status === "open" && mine;
    case "rescind":
      return status === "accepted";
    case "mark":
      return status === "accepted" && !marks(t, viewerId).mine;
    case "clear":
      return status !== "open" && status !== "accepted";
  }
}

/** One side of an offer: the oracle ids of the cards on it. */
export type TradeSides = { theirs: readonly string[]; yours: readonly string[] };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * An offer's sides as a press sends them, mended or refused before any read: each side a set of distinct oracle ids
 * (a repeat collapses, one copy each, D3), both sides at least one card (D2), neither past `TRADE_SIDE_MAX`. Returns
 * null for anything else, a malformed id included.
 */
export function cleanSides(v: unknown): { theirs: string[]; yours: string[] } | null {
  if (typeof v !== "object" || v === null) return null;
  const side = (x: unknown): string[] | null => {
    if (!Array.isArray(x) || x.length === 0 || x.length > TRADE_SIDE_MAX * 2) return null;
    if (!x.every((id) => typeof id === "string" && UUID.test(id))) return null;
    const ids = [...new Set((x as string[]).map((id) => id.toLowerCase()))];
    return ids.length <= TRADE_SIDE_MAX ? ids : null;
  };
  const theirs = side((v as { theirs?: unknown }).theirs);
  const yours = side((v as { yours?: unknown }).yours);
  return theirs && yours ? { theirs, yours } : null;
}

/** A round set against the one it replaces: what a counter added and took out (the counter marks, S8 and T5). */
export function roundDiff(current: readonly string[], previous: readonly string[]): { added: string[]; removed: string[] } {
  const now = new Set(current);
  const before = new Set(previous);
  return { added: current.filter((id) => !before.has(id)), removed: previous.filter((id) => !now.has(id)) };
}
