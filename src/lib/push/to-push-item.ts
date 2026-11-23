/**
 * A feed view as a push item (`message.ts`): the same facts Home draws, in the shape a notification is built from.
 * Pure. Null when the view lacks what its notification needs (a card the catalog no longer holds, a missing price pair, a
 * friend who is gone, a precon with no count of its cards, or a Wizards post with no press): that push is dropped, never
 * sent half-worded. A new set
 * with no card count yet (none of its printings has art) still goes, without the figure. Home draws such a row with its title alone; a notification has no line to leave out.
 */
import type { FeedView } from "../feed/home";
import { LOG_PUSH_KIND, SEAT_PUSH_KIND } from "../feed/kinds";
import type { LogResult } from "../copy/push";
import { reveal } from "../person-name/reveal";
import type { SeatNotice } from "../social/rule-zero-notice";
import type { HomeLogGame } from "../social/rule-zero-log-home";
import type { PushItem } from "./message";

/** A seat notice as a push item: a notification is not a page, so this is a server-side reveal of the host and the pod (like the feed's friend). */
export function seatPushItem(notice: SeatNotice, key: string, batch: string): PushItem {
  return { kind: SEAT_PUSH_KIND, key, batch, tableId: notice.tableId, host: reveal(notice.host), pod: reveal(notice.podName), deck: notice.deckName };
}

/** A game to log as a push item: the pod and the winner are revealed server-side, as the seat notice's host is. */
export function logPushItem(game: HomeLogGame, key: string): PushItem {
  const result: LogResult = game.result.kind === "you" ? { kind: "you", winner: "You" } : game.result.kind === "won" ? { kind: "won", winner: reveal(game.result.name) } : { kind: game.result.kind };
  return { kind: LOG_PUSH_KIND, key, batch: game.tableId, tableId: game.tableId, gameMs: game.gameMs, deckId: game.deckId, deck: game.deckName, pod: reveal(game.podName), result };
}

export function toPushItem(view: FeedView, batch: string): PushItem | null {
  const base = { key: view.key, batch };
  const card = view.card;
  switch (view.kind) {
    case "new-set":
      // No card count yet (no printing has art): still a push, never dropped as gone, because it would never be retried.
      if (!view.name || !view.href) return null;
      return { ...base, kind: "new-set", name: view.name, cards: view.setSize ?? null, href: view.href };
    case "new-precon":
      if (!view.name || !view.href || !view.owned) return null;
      return { ...base, kind: "new-precon", name: view.name, owned: view.owned.owned, of: view.owned.of, href: view.href };
    case "price-drop":
      if (!card || !view.drop) return null;
      return { ...base, kind: "price-drop", oracleId: card.oracleId, card: card.name, wasCents: view.drop.fromCents, nowCents: view.drop.toCents, image: card.image, printing: view.drop.printing };
    case "trade-match":
      if (!card || !view.friend) return null;
      return { ...base, kind: "trade-match", friend: reveal(view.friend.displayName), publicId: view.friend.publicId, oracleId: card.oracleId, card: card.name, image: card.image, askable: view.askable };
    case "spare-request":
      if (!card || !view.friend) return null;
      return { ...base, kind: "spare-request", friend: reveal(view.friend.displayName), card: card.name, image: card.image, ...(view.answer ? { answer: view.answer } : {}), ...(view.offer ? { offer: true as const } : {}) };
    case "combo":
      if (!card || !view.combo || !view.opens) return null;
      return { ...base, kind: "combo", oracleId: view.opens, variantId: view.combo.variantId, a: view.combo.pieces[0], b: view.combo.pieces[1], added: view.combo.added, image: card.image };
    case "secret-lair":
    case "commander-decklists":
    case "wizards-news":
      // The post's press is Home's (`outbound`: the out route, only for an https post on magic.wizards.com). No press, no
      // push: a notification that lands nowhere is never sent.
      if (!view.post || !view.outbound) return null;
      return { ...base, kind: view.kind, title: view.post.title, excerpt: view.post.summary, image: view.post.hero, href: view.outbound };
  }
}
