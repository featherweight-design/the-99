/**
 * What a push says and how several become one (handoff README "Every kind", G4). Pure: items in, messages out.
 *
 * An ITEM is what a writer queues for one event (the `push_outbox.payload`): the kind, the item's key, and the words'
 * ingredients as plain data, so the notification can be built later and apart from the feed. A MESSAGE is one
 * notification: title, body, the route a tap lands on, `tag` (the kind, so a newer one replaces an older of its kind ON THE
 * DEVICE; a spare request's own key, so two asks never replace each other),
 * the item keys it stands for, and the card image where there is one.
 *
 * Collapse: `live` sends one per (kind, batch), `release` (what waited the night) one per kind. A spare request is never
 * collapsed in either mode.
 */
import { formatCents } from "../decks/price";
import { pushCopy } from "../copy/push";
import type { FeedKind } from "../feed/kinds";

export type PushItem =
  | { kind: "new-set"; key: string; batch: string; name: string; cards: number | null; href: string }
  | { kind: "new-precon"; key: string; batch: string; name: string; owned: number; of: number; href: string }
  | { kind: "price-drop"; key: string; batch: string; oracleId: string; card: string; wasCents: number; nowCents: number; image: string | null }
  | { kind: "trade-match"; key: string; batch: string; friend: string; publicId: string; oracleId: string; card: string; image: string | null }
  | { kind: "spare-request"; key: string; batch: string; friend: string; card: string; image: string | null; answer?: "yes" | "no" }
  | { kind: "combo"; key: string; batch: string; oracleId: string; a: string; b: string; added: string; image: string | null };

export type PushMessage = {
  title: string;
  body: string;
  /** Where a tap lands. */
  route: string;
  /** The kind: a newer notification of it replaces an older one on the device. */
  tag: string;
  /** The feed items this stands for, in the order given. */
  keys: string[];
  /** Home opens this card's details on landing (price drop, combo); consumed by the landing PR. */
  openCard: string | null;
  /** `openCard` is opened for its combo. */
  openCombo: boolean;
  /** The card at card shape where the system draws an image; never an art crop. */
  image: string | null;
};

export type CollapseMode = "live" | "release";

/** Groups in first-seen order. Spare requests are each their own group. */
export function collapse(items: readonly PushItem[], mode: CollapseMode): PushItem[][] {
  const groups = new Map<string, PushItem[]>();
  for (const item of items) {
    const id = item.kind === "spare-request" ? `${item.kind}\u0000${item.key}` : mode === "release" ? item.kind : `${item.kind}\u0000${item.batch}`;
    const g = groups.get(id);
    if (g) g.push(item);
    else groups.set(id, [item]);
  }
  return [...groups.values()];
}

const home = (tag: string, keys: string[], title: string, body: string, extra: Partial<PushMessage> = {}): PushMessage => ({
  title, body, route: "/", tag, keys, openCard: null, openCombo: false, image: null, ...extra,
});

const distinct = <T,>(xs: readonly T[]): T[] => [...new Set(xs)];

/** One notification for a group of items of one kind. */
export function toMessage(group: readonly PushItem[]): PushMessage {
  const first = group[0];
  if (!first) throw new Error("toMessage: an empty group");
  const keys = group.map((i) => i.key);
  const n = group.length;
  const c = pushCopy;
  switch (first.kind) {
    case "new-set": {
      const sets = group as (typeof first)[];
      if (n === 1) return home("new-set", keys, c.one.newSet.title(first.name), c.one.newSet.body(first.cards), { route: first.href });
      return home("new-set", keys, c.many.newSet.title(n), c.many.newSet.body(c.names(sets.map((s) => s.name))), { route: "/collection/sets" });
    }
    case "new-precon": {
      const precons = group as (typeof first)[];
      if (n === 1) return home("new-precon", keys, c.one.newPrecon.title(first.name), c.one.newPrecon.body(first.owned, first.of), { route: first.href });
      return home("new-precon", keys, c.many.newPrecon.title(n), c.many.newPrecon.body(c.names(precons.map((p) => p.name))), { route: "/decks/precons" });
    }
    case "price-drop": {
      const drops = group as (typeof first)[];
      if (n === 1) {
        return home("price-drop", keys, c.one.priceDrop.title(first.card), c.one.priceDrop.body(formatCents(first.wasCents), formatCents(first.nowCents)), { openCard: first.oracleId, image: first.image });
      }
      return home("price-drop", keys, c.many.priceDrop.title(n), c.many.priceDrop.body(c.names(drops.map((d) => d.card))));
    }
    case "trade-match": {
      const matches = group as (typeof first)[];
      const friends = distinct(matches.map((m) => m.publicId));
      if (n === 1) return home("trade-match", keys, c.one.tradeMatch.title(first.friend, first.card), c.one.tradeMatch.body, { route: friendRoute(first.publicId, first.oracleId), image: first.image });
      if (friends.length === 1) return home("trade-match", keys, c.many.tradeMatchOne.title(first.friend, n), c.many.tradeMatchOne.body, { route: friendRoute(first.publicId), image: first.image });
      const names = distinct(matches.map((m) => m.friend));
      return home("trade-match", keys, c.many.tradeMatchMany.title(n), c.many.tradeMatchMany.body(c.names(names)), { route: "/friends" });
    }
    case "spare-request": {
      // Never collapsed: one group, one item. An answer to the reader's own ask reads as one, landing on Your requests.
      const words = first.answer ? c.one.spareAnswer[first.answer] : c.one.spareRequest;
      return home(`spare-request:${first.key}`, keys, words.title(first.friend, first.card), words.body, { route: "/friends", image: first.image });
    }
    case "combo": {
      if (n === 1) return home("combo", keys, c.one.combo.title, c.one.combo.body(first.a, first.b, first.added), { openCard: first.oracleId, openCombo: true, image: first.image });
      return home("combo", keys, c.many.combo.title(n), c.many.combo.body);
    }
  }
}

/** A friend's page, on the Spares tab (the route's default); with `spare`, that card's modal opens on landing (call 9). */
export const friendRoute = (publicId: string, spare?: string): string =>
  `/friends/${encodeURIComponent(publicId)}${spare ? `?spare=${encodeURIComponent(spare)}` : ""}`;

/** The messages for items due now, in the order their first item arrived. */
export function messagesFor(items: readonly PushItem[], mode: CollapseMode): PushMessage[] {
  return collapse(items, mode).map(toMessage);
}
