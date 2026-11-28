// /friends/[publicId]/spares: a friend's Spares tab, the last since Decks became the default (Hugh, 2026-10-30; menu and
// Home PR 7). View only. The friend's own threshold and keeps have already filtered it (`loadFriendSpareList`), so it
// agrees with the stand-ins modal and the feed. Each tab answers the friendship itself: a tab press reuses
// the mounted layout, which does not run again.
import { notFound } from "next/navigation";
import { requireUserId } from "../../../../../lib/auth";
import { loadFriend } from "../../../../../lib/social/access";
import { isUuid } from "../../../../../lib/social/rules";
import { catalogCardName, friendSpareList } from "../../../../../lib/social/friend-page-data";
import { loadPrices } from "../../../../../lib/decks/price-query";
import { requestFlags } from "../../../../../lib/flags/request";
import { readerStoreForPage } from "../../../../../lib/stores/preference";
import { loadDeckNeed } from "../../../../../lib/decks/deck-need";
import { parseSpareParams } from "../../../../../lib/social/spare-browse";
import { loadOfferedTo, loadOwnSparesFor, loadTrade, loadTradesWith, tradePricesOf } from "../../../../../lib/social/trade-reads";
import { resolveTradeBack } from "../../../../../lib/social/trade-back";
import { FriendSparesTab } from "../../../../../components/social/friend-spares-tab";

// Spare requests (signature card calls 8 and 9): a tile opens the card's modal with Ask, and `?spare={oracleId}` opens it
// on landing; a spare gone since draws a toast naming the card, its name read from the catalog.
export default async function FriendSparesPage({
  params,
  searchParams,
}: {
  params: Promise<{ publicId: string }>;
  /** Optional: the tab's tests call it with params alone. */
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const userId = await requireUserId();
  const { publicId } = await params;
  // The reader's store prices the modal's buy tag, as its link goes there.
  // Friend trades (no switch: Hugh's ruling): the trades with this friend and the reader's own spares as they see them.
  const now = new Date();
  const [friend, spares, store, withThem, yours] = await Promise.all([
    loadFriend(userId, publicId),
    friendSpareList(userId, publicId, true),
    requestFlags(userId).then((env) => readerStoreForPage(userId, env)),
    loadTradesWith(userId, publicId, now),
    loadOwnSparesFor(userId, publicId),
  ]);
  if (!friend) notFound();
  const query = (await searchParams) ?? {};
  const raw = query.spare;
  // The tab's search, filters and order ride the address, so a shared or reloaded link draws the same list.
  const view = parseSpareParams(new URLSearchParams(Object.entries(query).flatMap(([k, v]) => (typeof v === "string" ? [[k, v]] : []))));
  // Lowercased: the catalog's ids are, and both lookups below compare as strings.
  const spare = isUuid(raw) ? raw.toLowerCase() : null;
  // A card the friend still offers opens its modal; any other names the card for the toast (the catalog's name).
  const offered = spare !== null && (spares?.lines.some((l) => l.oracleId === spare) ?? false);
  // The modal's buy tag prices the card as Shopping does (`loadPrices`: one printing per card, cheapest live first).
  // A failed read degrades to the bare tag, never the page.
  // `deckNeed` (the decks of the reader's that still need each card) is one more read beside them; it fails soft to {}.
  // The trade sheet: `?trade=<id>` opens a trade with THIS friend on landing; the picker prices both sides and marks the
  // reader's spares already in another offer (Q9).
  // One price read serves both: the modal's tags (the friend's spares) and the trade sheet's (both sides' spares).
  const theirIds = spares?.lines.map((l) => l.oracleId) ?? [];
  const ownIds = yours.map((l) => l.oracleId);
  const tradeIds = [...new Set([...theirIds, ...ownIds])];
  const tradeId = isUuid(query.trade) ? query.trade.toLowerCase() : null;
  // `?from=` (Open the trade from a deck or All shopping, FromDeck D4): the head's way back, a closed set the server
  // checks; a deck not the reader's own draws `‹ Friends`.
  const [goneName, read, deckNeed, offeredTo, landing, back] = await Promise.all([
    spare !== null && !offered ? catalogCardName(spare) : null,
    loadPrices(tradeIds, [], [], store).catch(() => null),
    spares && spares.lines.length > 0 ? loadDeckNeed(userId) : {},
    loadOfferedTo(userId, ownIds, now),
    tradeId ? loadTrade(userId, tradeId, store, now, friend.publicId) : null,
    resolveTradeBack(userId, query.from).catch(() => null),
  ]);
  const theirSet = new Set(theirIds);
  const priced = read
    ? { prices: new Map([...read.prices].filter(([id]) => theirSet.has(id))), newestAsOf: read.newestAsOf }
    : { prices: new Map(), newestAsOf: null };
  const tradeCents = read ? tradePricesOf(read, tradeIds, store, now) : { store, cents: {}, dated: null };
  return (
    <FriendSparesTab
      back={back}
      deckNeed={deckNeed}
      initial={view}
      name={friend.displayName}
      spares={spares}
      asks={{
        friend: { publicId: friend.publicId, displayName: friend.displayName, commander: friend.commander },
        spare,
        goneName,
        prices: Object.fromEntries(priced.prices),
        newestAsOf: priced.newestAsOf,
        trades: {
          friend: { publicId: friend.publicId, displayName: friend.displayName, commander: friend.commander },
          rows: withThem.rows,
          held: withThem.held,
          yours,
          offered: offeredTo,
          prices: tradeCents,
          landing,
          now,
        },
      }}
    />
  );
}
