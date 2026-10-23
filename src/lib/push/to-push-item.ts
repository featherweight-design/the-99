/**
 * A feed view as a push item (`message.ts`): the same facts Home draws, in the shape a notification is built from.
 * Pure. Null when the view lacks what its notification needs (a card the catalog no longer holds, a missing price pair, a
 * friend who is gone): that push is dropped, never sent half-worded. Only the STORED kinds; the catalog kinds come in 3c.
 */
import type { FeedView } from "../feed/home";
import type { PushItem } from "./message";

export function toPushItem(view: FeedView, batch: string): PushItem | null {
  const base = { key: view.key, batch };
  const card = view.card;
  switch (view.kind) {
    case "price-drop":
      if (!card || !view.drop) return null;
      return { ...base, kind: "price-drop", oracleId: card.oracleId, card: card.name, wasCents: view.drop.fromCents, nowCents: view.drop.toCents, image: card.image };
    case "trade-match":
      if (!card || !view.friend) return null;
      return { ...base, kind: "trade-match", friend: view.friend.displayName, publicId: view.friend.publicId, card: card.name, image: card.image };
    case "spare-request":
      if (!card || !view.friend) return null;
      return { ...base, kind: "spare-request", friend: view.friend.displayName, card: card.name, image: card.image };
    case "combo":
      if (!card || !view.combo || !view.opens) return null;
      return { ...base, kind: "combo", oracleId: view.opens, a: view.combo.pieces[0], b: view.combo.pieces[1], added: view.combo.added, image: card.image };
    default:
      return null;
  }
}
