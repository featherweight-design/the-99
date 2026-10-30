/**
 * A friend's decks, for the friend page's Decks tab (menu and Home plan, PR 7; handoff G4), and one friend's deck,
 * read-only, for its own page (friend decks handoff, G1). On the tab a friend sees the name, the commander, the status
 * and the count of each deck: no card, no note, no folder, no bracket, no play date. With `SOCIAL_FRIENDS_ENABLED` on
 * for the OWNER the tab carries each deck's id, for the press to its page, and both reads keep only the decks the
 * owner lets friends see (`friendCanSeeDeck`, `deck-visibility.ts`); off, the tab is exactly as it shipped.
 *
 * The grant is the viewer's own friendship row, read in `resolveFriend`'s statement: a public id that is not
 * the viewer's current friend resolves to nothing, whoever it names, and nothing is read for it. The decks are
 * then read under the FRIEND's resolved switches (as `loadFriendSpares` reads a claim model), by the same
 * `listDecksWithStats` the friend's own `/decks` draws its pills from, so the status a friend sees on their
 * own tile is the status the viewer sees here. It derives from the friend's collection, which a count of
 * spares already shows more of (product call 1 of the plan).
 *
 * The figure beside `To buy` is the copies the friend's Shopping would buy for that deck (`loadDeckBuyRows`, the
 * roll-up their own deck tile draws), never `toBuyCount`: that one counts basics and knows nothing of seniority.
 *
 * The reads after the grant run on their own snapshots, so the grant is read AGAIN after them: a friendship
 * removed while they ran returns nothing rather than what was read past its end.
 */
import { loadDeckBuyRows } from "../decks/availability-query";
import { deckBodySize } from "../decks/deck-size";
import { deckIdentity } from "../decks/format";
import type { StatusPill } from "../decks/status";
import { resolveSwitchEnv } from "../switches/snapshot";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../../db";
import { collectionItems, decks, printings } from "../../db/schema";
import { getDeckDetail, listDecksWithStats, type DeckListItem } from "../decks/read";
import { cardTypeGroup, type DeckDetailCard } from "../decks/grouping";
import { named } from "../person-name/mint";
import type { ThirdPartyName } from "../person-name";
import { resolveFriend } from "./access";
import { friendCanSeeDeck, loadFriendDeckPrefs, unfinishedPill } from "./deck-visibility";
import { socialFriendsEnabled } from "./flag";
import { isUuid } from "./rules";
import { readReaderDecks } from "../precons/list-read";
import { isBasicType } from "../decks/basic-type";
import { sharedWith } from "../precons/shared";

/** What both kinds of friend tile draw. */
type FriendDeckBase = {
  /** The owner's deck name: another reader's text. */
  name: ThirdPartyName;
  commanderName: string;
  /** The second commander of a pair, or null. */
  partnerName: string | null;
  colorIdentity: string[];
  /** The commander's art for the tile's wash, or null. */
  artCropUri: string | null;
  /** Cards matched to the catalog. */
  built: number;
  /** 99, or 98 for a pair: the count the figure reads against. */
  bodySize: number;
};

/**
 * The read-only /decks tile, with `SOCIAL_FRIENDS_ENABLED` on for BOTH the viewer and the owner: the deck's id for the press
 * to its page, and nothing of the owner's status or money (README call 3): neither is sent. `listDecksWithStats` still
 * reads the owner's Shopping inside its status work (`canFlip`), which the filter needs; only the tab's own per-deck
 * to-buy read is skipped.
 */
export type OpenFriendDeck = FriendDeckBase & { id: string; status: null; toBuy: null };

/** The tile as it shipped, with the switch off for either: no press, the status and the to-buy figure. */
export type ShippedFriendDeck = FriendDeckBase & {
  id: null;
  status: StatusPill;
  /** Copies the friend's Shopping would buy for this deck; the tile names it beside `To buy` only. */
  toBuy: number;
};

/** Every tile of one read is the same kind: the two switches decide it once, for the whole tab. */
export type FriendDeck = OpenFriendDeck | ShippedFriendDeck;

/**
 * The friend's decks, newest first, or null when `publicId` is not the viewer's current friend. The OWNER's switch decides
 * which decks pass (their rules); the tiles are the open kind only while `viewerOpen` (the viewer's switch) is on as
 * well, since an id would be a press the viewer's own switch says not to draw, and a tile with no press under the
 * open tab's "Open one" would promise one that is not there (close-out).
 */
export async function loadFriendDecks(viewerId: string, publicId: unknown, viewerOpen = false): Promise<FriendDeck[] | null> {
  const friendId = await resolveFriend(viewerId, publicId);
  if (friendId === null) return null;
  const env = await resolveSwitchEnv(friendId);
  const open = viewerOpen && socialFriendsEnabled(env);
  const [rows, buys] = await Promise.all([
    visibleDecks(friendId, env),
    // The open tile draws no money, so the tab's own to-buy read is skipped (the shared stats read still runs its own).
    open ? Promise.resolve([]) : loadDeckBuyRows(friendId),
  ]);
  if ((await resolveFriend(viewerId, publicId)) !== friendId) return null;
  const toBuy = new Map<string, number>();
  for (const b of buys) toBuy.set(b.deckId, (toBuy.get(b.deckId) ?? 0) + b.quantity);
  return rows.map((d): FriendDeck => {
    const base: FriendDeckBase = {
      name: named(d.name),
      commanderName: d.commanderName,
      partnerName: d.partnerName,
      // The pair's whole identity, as the owner's tile and the deck page draw it.
      colorIdentity: deckIdentity(d.commanderColorIdentity, d.partnerColorIdentity),
      artCropUri: d.commanderArtCropUri,
      built: d.built,
      bodySize: deckBodySize(d.partnerName !== null),
    };
    return open
      ? { ...base, id: d.id, status: null, toBuy: null }
      : { ...base, id: null, status: d.statusPill, toBuy: toBuy.get(d.id) ?? 0 };
  });
}

/**
 * The owner's decks a friend may see, by the owner's own rules, read once for both friend reads. With the switch off for
 * the owner every deck passes, as the tab shipped: the Settings defaults hide drafts, so filtering before the owner can
 * see or change them would take decks off a friend's tab unannounced.
 */
async function visibleDecks(ownerId: string, env: NodeJS.ProcessEnv): Promise<DeckListItem[]> {
  if (!socialFriendsEnabled(env)) return listDecksWithStats(ownerId, "newest", { env, includeProxyStats: true });
  const [rows, prefs] = await Promise.all([
    listDecksWithStats(ownerId, "newest", { env, includeProxyStats: true }),
    loadFriendDeckPrefs(ownerId),
  ]);
  return rows.filter((d) => friendCanSeeDeck(d, prefs));
}

/**
 * A card of a friend's deck as the read-only page draws it: the catalog's facts and the OWNER's printing (for card
 * details), with `owned` the VIEWER's: whether the viewer's own collection holds any printing of it. Nothing of the
 * owner's money or plans: no price, no availability, no proxy, no lock, no auto tag, no combo partner.
 */
export type FriendDeckCard = Pick<
  DeckDetailCard,
  | "oracleId" | "name" | "typeLine" | "cardTypeGroup" | "role" | "cmc" | "quantity" | "manaCost" | "imageUri"
  | "printedName" | "printedSetCode" | "printedCollectorNumber" | "printedFoil" | "foil" | "layout" | "catalogLayout" | "commander"
> & {
  owned: boolean;
  /** The owner's printing's own Scryfall id and back face, so card details view exactly that printing. Null without one. */
  printedScryfallId?: string | null;
  printedBackImageUri?: string | null;
};

export type FriendDeckPage = {
  id: string;
  name: ThirdPartyName;
  /** The commander first, then the second of a pair, each with the viewer's `owned`. */
  commanders: FriendDeckCard[];
  /** The list, commanders excluded, in the owner's order. */
  cards: FriendDeckCard[];
  colorIdentity: string[];
  artCropUri: string | null;
  /** Cards matched to the catalog, and the body size they read against. */
  built: number;
  bodySize: number;
  /**
   * The VIEWER's own decks that share this one, most shared first, by the precon page's rule (`sharedWith`: the same
   * commanders and 40% of its cards, or 60% with any): what the own band names under the figure, as a precon's does.
   */
  shares: { deckId: string; deckName: string; shared: number; sameCommanders: boolean }[];
};

/**
 * One friend's deck, read-only (G1), or null: a public id that is not the viewer's current friend, a deck that is not
 * theirs, one their rules keep from friends (hidden, unfinished, or decks off), or the switch off for the owner. Every
 * null is the same 404, so on this page (and the tab) a hidden deck and a deleted one cannot be told apart.
 *
 * The visibility is decided by the SAME list the tab draws (`visibleDecks`), so a deck the tab shows opens and one it
 * does not, does not. The deck itself is the owner's own `getDeckDetail`, read as its owner, with no availability
 * (`Promise.resolve(null)` stands in for the shared read, so the owner's claim model is never run for a friend), and
 * cut down to `FriendDeckCard`. The grant is read again after every read, as the tab's read does.
 */
export async function loadFriendDeck(viewerId: string, publicId: unknown, deckId: unknown): Promise<FriendDeckPage | null> {
  if (!isUuid(deckId)) return null;
  const friendId = await resolveFriend(viewerId, publicId);
  if (friendId === null) return null;
  const env = await resolveSwitchEnv(friendId);
  if (!socialFriendsEnabled(env)) return null;
  const row = (await visibleDecks(friendId, env)).find((d) => d.id === deckId);
  if (!row) return null;
  const detail = await getDeckDetail(deckId, friendId, Promise.resolve(null), env);
  if (!detail) return null;
  const ids = [...new Set([detail.commander.oracleId, ...(detail.partner ? [detail.partner.oracleId] : []), ...detail.cards.map((c) => c.oracleId)])];
  const [ownedRows, viewerDecks, printed] = await Promise.all([
    db
      .selectDistinct({ oracleId: collectionItems.oracleId })
      .from(collectionItems)
      .where(and(eq(collectionItems.userId, viewerId), inArray(collectionItems.oracleId, ids))),
    readReaderDecks(viewerId),
    // Before the checks below, as every read is: the owner's rules and the grant are read again after all of them.
    printingFaces([detail.commander, ...(detail.partner ? [detail.partner] : []), ...detail.cards]),
  ]);
  // The owner's rules are read AGAIN after the list was, as the grant is: a deck hidden, or decks turned off, while the
  // reads ran returns nothing rather than what was read past that. The flag and the prefs are fresh, and the phase is
  // the snapshot's own: a committed deck whose snapshot is short of its body size is `Building` (`status.ts`), so a cut
  // made mid-read is judged as the cards returned are. A deck cannot leave the committed phase. The grant is read last.
  const snapshotPill = !unfinishedPill(row.statusPill) && detail.built < deckBodySize(detail.partner !== null) ? "Building" : row.statusPill;
  if (!(await stillVisible(friendId, deckId, snapshotPill))) return null;
  if ((await resolveFriend(viewerId, publicId)) !== friendId) return null;
  const commanderIds = [detail.commander.oracleId, ...(detail.partner ? [detail.partner.oracleId] : [])];
  const list = {
    cards: new Set([...commanderIds, ...detail.cards.filter((c) => !isBasicType(c.typeLine)).map((c) => c.oracleId)]),
    commanders: commanderIds,
  };
  const shares = viewerDecks
    .flatMap((d) => {
      const match = sharedWith(list, d);
      return match ? [{ deckId: d.id, deckName: d.name, shared: match.shared, sameCommanders: match.sameCommanders }] : [];
    })
    .sort((a, b) => b.shared - a.shared || a.deckName.localeCompare(b.deckName));
  const owned = new Set(ownedRows.map((r) => r.oracleId));
  const commanders = [detail.commander, ...(detail.partner ? [detail.partner] : [])].map((c) => ({
    oracleId: c.oracleId,
    name: c.name,
    typeLine: c.typeLine,
    cardTypeGroup: cardTypeGroup(c.typeLine),
    role: "other" as const,
    cmc: c.cmc ?? 0,
    quantity: 1,
    manaCost: c.manaCost,
    imageUri: c.imageUri,
    printedName: c.printedName ?? null,
    printedSetCode: c.printedSetCode ?? null,
    printedCollectorNumber: c.printedCollectorNumber ?? null,
    layout: c.layout ?? null,
    commander: true as const,
    owned: owned.has(c.oracleId),
    // The owner's film, as a body card carries it, so card details draw a foil commander foil.
    ...(c.foil ? { foil: c.foil } : {}),
    ...printed(c),
  }));
  return {
    id: detail.id,
    name: named(detail.name),
    commanders,
    cards: detail.cards.map((c) => ({ ...friendCard(c, owned), ...printed(c) })),
    colorIdentity: deckIdentity(detail.commander.colorIdentity, detail.partner?.colorIdentity ?? null),
    // The resolved printing's crop, as the commander's own image is: the tab's list reads the catalog's.
    artCropUri: detail.commander.artCropUri,
    built: detail.built,
    bodySize: deckBodySize(detail.partner !== null),
    shares,
  };
}

/** The friend-safe cut of one card. Spelled out field by field, never spread, so a field added to `DeckDetailCard` later
 *  (a price, a plan) cannot reach a friend by default. */
function friendCard(c: DeckDetailCard, owned: ReadonlySet<string>): FriendDeckCard {
  return {
    oracleId: c.oracleId,
    name: c.name,
    typeLine: c.typeLine,
    cardTypeGroup: c.cardTypeGroup,
    role: c.role,
    cmc: c.cmc,
    quantity: c.quantity,
    manaCost: c.manaCost,
    imageUri: c.imageUri,
    printedName: c.printedName,
    printedSetCode: c.printedSetCode,
    printedCollectorNumber: c.printedCollectorNumber,
    printedFoil: c.printedFoil,
    foil: c.foil,
    layout: c.layout,
    catalogLayout: c.catalogLayout,
    commander: c.commander,
    owned: owned.has(c.oracleId),
  };
}

/** The owner's own rules over one deck, read fresh: its flag and their prefs, with the status already read. */
async function stillVisible(ownerId: string, deckId: string, statusPill: DeckListItem["statusPill"]): Promise<boolean> {
  const [[deck], prefs] = await Promise.all([
    db.select({ hiddenFromFriends: decks.hiddenFromFriends }).from(decks).where(and(eq(decks.id, deckId), eq(decks.userId, ownerId))),
    loadFriendDeckPrefs(ownerId),
  ]);
  return deck !== undefined && friendCanSeeDeck({ hiddenFromFriends: deck.hiddenFromFriends, statusPill }, prefs);
}

type Printed = { oracleId: string; printedSetCode?: string | null; printedCollectorNumber?: string | null };

/**
 * The Scryfall id and back face of each card's owner's printing, from the catalog, in one read: the deck read names a
 * printing by set and number only, and card details need the exact printing to show its own back (a reversible card's
 * Turn) and to select it among siblings that share a number.
 */
async function printingFaces(cards: readonly Printed[]) {
  const named = cards.filter((c) => c.printedSetCode && c.printedCollectorNumber);
  const rows = named.length === 0 ? [] : await db
    .select({ oracleId: printings.oracleId, setCode: printings.setCode, collectorNumber: printings.collectorNumber, scryfallId: printings.scryfallId, backImageUri: printings.backImageUri })
    .from(printings)
    .where(and(inArray(printings.oracleId, named.map((c) => c.oracleId)), inArray(printings.setCode, [...new Set(named.map((c) => c.printedSetCode!.toLowerCase()))])));
  const key = (o: string, s: string, n: string) => `${o}|${s.toLowerCase()}|${n}`;
  // A set and number can name more than one printing (siblings that share a number): such a key names none here, so a
  // card's details fall back to their own default rather than pair the owner's art with a sibling's id and back.
  const byKey = new Map<string, (typeof rows)[number] | null>();
  for (const r of rows) {
    const k = key(r.oracleId, r.setCode, r.collectorNumber);
    byKey.set(k, byKey.has(k) ? null : r);
  }
  return (c: Printed) => {
    const r = c.printedSetCode && c.printedCollectorNumber ? byKey.get(key(c.oracleId, c.printedSetCode, c.printedCollectorNumber)) : undefined;
    return r ? { printedScryfallId: r.scryfallId, printedBackImageUri: r.backImageUri } : {};
  };
}
