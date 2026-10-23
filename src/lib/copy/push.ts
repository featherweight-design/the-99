// Push notifications (W5; handoff design_handoff_the99_push, README "Every kind"). Placeholders for `/copy-review`.
// A notification's title and body are the feed item's words (`feedCopy.home`), reworded only where the handoff draws
// it: a price drop spells was and now, a combo names its kind, a spare request says where to answer. Money arrives
// formatted (`formatCents`); this module formats nothing but counts.
import { feedCopy } from "./feed";

const t = feedCopy.home.title;

export const pushCopy = {
  /** One item of a kind, as the notification reads. */
  one: {
    // A set whose printings have no art yet has no card count on Home: the push still goes, without the figure.
    newSet: { title: t.newSet, body: (cards: number | null) => (cards === null ? "See the set." : `${feedCopy.home.line.newSet(cards)} See the set.`) },
    newPrecon: { title: t.newPrecon, body: feedCopy.home.line.newPrecon },
    priceDrop: { title: t.priceDrop, body: (was: string, now: string) => `Was ${was}, now ${now} at the cheapest printing.` },
    tradeMatch: { title: t.tradeMatch, body: feedCopy.home.line.tradeMatch },
    spareRequest: { title: t.spareRequest, body: feedCopy.home.line.spareRequest },
    combo: { title: "You can make a combo", body: (a: string, b: string, added: string) => `${a} + ${b}. ${feedCopy.home.line.combo(added)}` },
  },
  /** Several of one kind from one job, or what waited the night, as one notification. */
  many: {
    newSet: { title: (n: number) => `${n} new sets are out`, body: (names: string) => `${names}.` },
    newPrecon: { title: (n: number) => `${n} new precons are out`, body: (names: string) => `${names}.` },
    priceDrop: { title: (n: number) => `${n} cards on your wishlist got cheaper`, body: (names: string) => `${names}.` },
    tradeMatchOne: { title: (friend: string, n: number) => `${friend} has ${n} spares you want`, body: feedCopy.home.line.tradeMatch },
    tradeMatchMany: { title: (n: number) => `${n} spares you want`, body: (friends: string) => `From ${friends}.` },
    combo: { title: (n: number) => `You can make ${n} new combos`, body: "From the cards you just added." },
  },
  /** `Jace, Dina and 1 more`: the first two names, then the rest by count. No full stop; a body adds its own. */
  names: (names: readonly string[]): string => {
    if (names.length <= 2) return names.join(" and ");
    return `${names[0]}, ${names[1]} and ${names.length - 2} more`;
  },
} as const;
