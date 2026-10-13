/**
 * Opponents in the game log (social scope §4, Feature C; Hugh's ruling Q15): the shape check `logGame`
 * runs on what a client sent, the catalog check on the commanders it named, the write, and the read the
 * history row and the matchup panel draw from. A friend's facts are resolved and snapshotted in
 * `src/lib/social/games.ts`, the one place a friend's rows are read; everything here is the owner's own.
 *
 * Every read draws the SNAPSHOT (the friend's name and the deck's name and commanders as they were when the
 * game was logged), never a friend's live rows, so this read has no cross-user cache dependency. The live
 * friend id only groups one person's seats and is never returned: a seat carries an opaque `friend.key`.
 *
 * The label is player-typed free text and reaches no model prompt: `game-opponents.test.ts` fails a module
 * outside the few allowed that names the table, which is what keeps a prompt builder from reading it.
 */
import { and, asc, eq, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../../db";
import { cards, deckGameOpponents, deckGames } from "../../db/schema";
import { isCommanderCandidate } from "../recs/score";
import { resolveFriendSeatsIn, type FriendSeatAsk, type FriendSeatFacts } from "../social/games";
import { cleanName, isUuid } from "../social/rules";
import { canPair, partnerAbility } from "./partner";

export const OPPONENT_LABEL_MAX = 30;

/** One opponent as a client sends it. Every field is a claim, shape-checked by `parseOpponents`. */
export type OpponentInput = {
  /** A friend's `publicId`. */
  friend?: string;
  /** One of that friend's decks; its name and commanders are snapshot, so none may be sent beside it. */
  deck?: string;
  /** A commander from the catalog, for anyone not seated with a friend's deck. */
  commander?: string;
  partner?: string;
  /** Who sat there, in the player's words ("Sam"). Not for a friend, whose name is snapshot. */
  label?: string;
  /** This opponent won a game the player lost (Q15). */
  won?: boolean;
};

export type ParsedOpponent =
  | { kind: "friendDeck"; friend: string; deck: string; won: boolean }
  | { kind: "friend"; friend: string; commander: string | null; partner: string | null; won: boolean }
  | { kind: "other"; commander: string | null; partner: string | null; label: string | null; won: boolean };

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const absent = (v: unknown) => v === undefined || v === null;

/**
 * The opponents of one game, or null to refuse the whole log. Pure. Seats are the array's order, so a
 * game holds at most `podSize - 1` of them; a seat left out is simply unrecorded. A friend sits at most
 * once, a friend's deck carries no commander or label of its own (they are snapshot from the deck), and
 * `won` is only for a LOSS, on one opponent at most.
 */
export function parseOpponents(raw: unknown, game: { podSize: number; result: string }): ParsedOpponent[] | null {
  if (absent(raw)) return [];
  if (!Array.isArray(raw) || raw.length > game.podSize - 1) return null;
  const out: ParsedOpponent[] = [];
  const friends = new Set<string>();
  for (const item of raw) {
    if (!isObject(item)) return null;
    const { friend, deck, commander, partner, label, won } = item;
    if (!absent(won) && typeof won !== "boolean") return null;
    const winner = won === true;
    if (winner && game.result !== "loss") return null;
    if (!absent(commander) && !isUuid(commander)) return null;
    if (!absent(partner) && (!isUuid(partner) || absent(commander) || partner === commander)) return null;
    let name: string | null = null;
    if (!absent(label)) {
      if (typeof label !== "string") return null;
      if (label.trim() !== "") {
        name = cleanName(label, OPPONENT_LABEL_MAX);
        if (name === null) return null;
      }
    }
    const c = absent(commander) ? null : (commander as string);
    const p = absent(partner) ? null : (partner as string);
    if (!absent(friend)) {
      if (!isUuid(friend) || friends.has(friend) || name !== null) return null;
      friends.add(friend);
      if (!absent(deck)) {
        if (!isUuid(deck) || c !== null) return null;
        out.push({ kind: "friendDeck", friend, deck, won: winner });
      } else {
        out.push({ kind: "friend", friend, commander: c, partner: p, won: winner });
      }
      continue;
    }
    if (!absent(deck)) return null;
    if (c === null && name === null) return null;
    out.push({ kind: "other", commander: c, partner: p, label: name, won: winner });
  }
  if (out.filter((o) => o.won).length > 1) return null;
  return out;
}

/** The commanders a parse named, each pair once. */
function namedCommanders(parsed: readonly ParsedOpponent[]): { commander: string; partner: string | null }[] {
  return parsed.flatMap((o) => (o.kind !== "friendDeck" && o.commander !== null ? [{ commander: o.commander, partner: o.partner }] : []));
}

/**
 * Every commander a client named can lead a deck, and every pair can pair: the rule `createDeck` holds a
 * deck's own commanders to. Catalog data, read outside the game's transaction.
 */
export async function opponentCommandersValid(parsed: readonly ParsedOpponent[]): Promise<boolean> {
  const named = namedCommanders(parsed);
  if (named.length === 0) return true;
  const ids = [...new Set(named.flatMap((n) => (n.partner === null ? [n.commander] : [n.commander, n.partner])))];
  const rows = await db
    .select({
      oracleId: cards.oracleId, name: cards.name, typeLine: cards.typeLine, oracleText: cards.oracleText,
      manaCost: cards.manaCost, layout: cards.layout, commanderLegal: cards.commanderLegal,
    })
    .from(cards)
    .where(inArray(cards.oracleId, ids));
  const byId = new Map(rows.map((r) => [r.oracleId, r]));
  const leads = (id: string) => {
    const card = byId.get(id);
    return card !== undefined && card.commanderLegal && isCommanderCandidate(card) ? card : null;
  };
  return named.every(({ commander, partner }) => {
    const a = leads(commander);
    if (a === null) return false;
    if (partner === null) return true;
    const b = leads(partner);
    return b !== null && canPair(
      { name: a.name, ability: partnerAbility(a.oracleText, a.typeLine) },
      { name: b.name, ability: partnerAbility(b.oracleText, b.typeLine) },
    );
  });
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * The rows one game stores, seat 1 upward. `friends` holds the resolved facts for the friend seats, in
 * the order they appear in `parsed`. Pure.
 */
export function opponentRows(gameId: string, parsed: readonly ParsedOpponent[], friends: readonly FriendSeatFacts[]) {
  let f = 0;
  return parsed.map((o, i) => {
    const base = {
      gameId, seat: i + 1, won: o.won,
      friendUserId: null as string | null, friendDeckId: null as string | null,
      friendNameThen: null as string | null, deckNameThen: null as string | null,
      commanderOracleId: null as string | null, partnerOracleId: null as string | null, label: null as string | null,
    };
    if (o.kind === "other") return { ...base, commanderOracleId: o.commander, partnerOracleId: o.partner, label: o.label };
    const facts = friends[f++];
    if (o.kind === "friendDeck") return { ...base, ...facts };
    return { ...base, ...facts, commanderOracleId: o.commander, partnerOracleId: o.partner };
  });
}

/** Thrown inside the game's transaction, to roll it back, when a friend seat no longer resolves. */
export class SeatRefused extends Error {
  constructor() {
    super("a friend seat no longer resolves");
  }
}

/**
 * Write one game's seats inside the game's own transaction. Each friend seat is resolved there, by the
 * viewer's friendship as it stands now (`resolveFriendSeatsIn`, which holds it until commit); one that
 * does not resolve throws `SeatRefused`, and the whole log rolls back.
 */
export async function writeOpponentsIn(tx: Tx, viewerId: string, gameId: string, parsed: readonly ParsedOpponent[]): Promise<void> {
  if (parsed.length === 0) return;
  const asks = parsed.flatMap((o): FriendSeatAsk[] =>
    o.kind === "friendDeck" ? [{ friend: o.friend, deck: o.deck }] : o.kind === "friend" ? [{ friend: o.friend, deck: null }] : []);
  const friends = await resolveFriendSeatsIn(tx, viewerId, asks);
  if (friends === null) throw new SeatRefused();
  await tx.insert(deckGameOpponents).values(opponentRows(gameId, parsed, friends));
}

export type OpponentCommander = { oracleId: string; name: string };

/** One seat as every surface draws it: the snapshot, never a friend's live rows. */
export type GameOpponent = {
  seat: number;
  /** A friend, by the name they had then. `key` groups one person's seats within this read; it is not an id.
   *  A seat whose friend's account has gone keys alone, so it groups with no other seat. */
  friend: { key: string; name: string } | null;
  /** The friend's deck, by the name it had then. */
  deckName: string | null;
  commander: OpponentCommander | null;
  partner: OpponentCommander | null;
  /** The commanders' color identity, in WUBRG order. Empty for colorless, or for no commander. */
  colorIdentity: string[];
  label: string | null;
  won: boolean;
};

const partnerCard = alias(cards, "partner_card");

/** Every seat of the owner's games on one deck. Apart so a test can render its SQL. */
export function gameOpponentsQuery(deckId: string, userId: string, q: Pick<typeof db, "select"> = db) {
  return q
    .select({
      gameId: deckGameOpponents.gameId,
      seat: deckGameOpponents.seat,
      friendUserId: deckGameOpponents.friendUserId,
      friendNameThen: deckGameOpponents.friendNameThen,
      deckNameThen: deckGameOpponents.deckNameThen,
      label: deckGameOpponents.label,
      won: deckGameOpponents.won,
      commanderOracleId: deckGameOpponents.commanderOracleId,
      commanderName: cards.name,
      commanderIdentity: cards.colorIdentity,
      partnerOracleId: deckGameOpponents.partnerOracleId,
      partnerName: partnerCard.name,
      partnerIdentity: partnerCard.colorIdentity,
    })
    .from(deckGameOpponents)
    .innerJoin(deckGames, eq(deckGames.id, deckGameOpponents.gameId))
    .leftJoin(cards, eq(cards.oracleId, deckGameOpponents.commanderOracleId))
    .leftJoin(partnerCard, eq(partnerCard.oracleId, deckGameOpponents.partnerOracleId))
    .where(and(eq(deckGames.deckId, deckId), eq(deckGames.userId, userId)))
    .orderBy(asc(deckGameOpponents.gameId), asc(deckGameOpponents.seat));
}

const WUBRG = ["W", "U", "B", "R", "G"];

/** Pure: the rows a read returned, as seats per game. Friend keys are handed out in row order. */
export function assembleOpponents(rows: Awaited<ReturnType<typeof gameOpponentsQuery>>): Map<string, GameOpponent[]> {
  const keys = new Map<string, string>();
  const out = new Map<string, GameOpponent[]>();
  for (const r of rows) {
    let friend: GameOpponent["friend"] = null;
    if (r.friendNameThen !== null) {
      // A friend whose account has gone (the purge unlinks it) groups with nobody: a display name is not
      // unique, so grouping by it would fold two people into one cell. The seat keeps its own key.
      let key = `gone:${r.gameId}:${r.seat}`;
      if (r.friendUserId !== null) {
        if (!keys.has(r.friendUserId)) keys.set(r.friendUserId, `f${keys.size + 1}`);
        key = keys.get(r.friendUserId)!;
      }
      friend = { key, name: r.friendNameThen };
    }
    const identity = new Set([...(r.commanderIdentity ?? []), ...(r.partnerIdentity ?? [])]);
    const seat: GameOpponent = {
      seat: r.seat,
      friend,
      deckName: r.deckNameThen,
      commander: r.commanderOracleId !== null && r.commanderName !== null ? { oracleId: r.commanderOracleId, name: r.commanderName } : null,
      partner: r.partnerOracleId !== null && r.partnerName !== null ? { oracleId: r.partnerOracleId, name: r.partnerName } : null,
      colorIdentity: WUBRG.filter((c) => identity.has(c)),
      label: r.label,
      won: r.won,
    };
    const list = out.get(r.gameId);
    if (list) list.push(seat);
    else out.set(r.gameId, [seat]);
  }
  return out;
}

/** The opponents of every game on a deck the owner holds, by game id. A game with none is absent. */
export async function listGameOpponents(deckId: string, userId: string): Promise<Map<string, GameOpponent[]>> {
  if (!isUuid(deckId)) return new Map();
  return assembleOpponents(await gameOpponentsQuery(deckId, userId));
}
