/**
 * A feed view as a push item (`message.ts`): the same facts Home draws, in the shape a notification is built from.
 * Pure. Null when the view lacks what its notification needs (a card the catalog no longer holds, a missing price pair, a
 * friend who is gone, a precon with no count of its cards, or a Wizards post with no press): that push is dropped, never
 * sent half-worded. A new set
 * with no card count yet (none of its printings has art) still goes, without the figure. Home draws such a row with its title alone; a notification has no line to leave out.
 */
import type { FeedView } from "../feed/home";
import { reveal } from "../person-name/reveal";
import type { PushItem } from "./message";

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
      return { ...base, kind: "price-drop", oracleId: card.oracleId, card: card.name, wasCents: view.drop.fromCents, nowCents: view.drop.toCents, image: card.image };
    case "trade-match":
      if (!card || !view.friend) return null;
      return { ...base, kind: "trade-match", friend: reveal(view.friend.displayName), publicId: view.friend.publicId, oracleId: card.oracleId, card: card.name, image: card.image, askable: view.askable };
    case "spare-request":
      if (!card || !view.friend) return null;
      return { ...base, kind: "spare-request", friend: reveal(view.friend.displayName), card: card.name, image: card.image, ...(view.answer ? { answer: view.answer } : {}) };
    case "combo":
      if (!card || !view.combo || !view.opens) return null;
      return { ...base, kind: "combo", oracleId: view.opens, a: view.combo.pieces[0], b: view.combo.pieces[1], added: view.combo.added, image: card.image };
    case "secret-lair":
    case "commander-decklists":
    case "wizards-news":
      // The post's press is Home's (`outbound`: the out route, only for an https post on magic.wizards.com). No press, no
      // push: a notification that lands nowhere is never sent.
      if (!view.post || !view.outbound) return null;
      return { ...base, kind: view.kind, title: view.post.title, excerpt: view.post.summary, image: view.post.hero, href: view.outbound };
  }
}
