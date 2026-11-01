// Push notifications (W5; handoff design_handoff_the99_push, README "Every kind"). Placeholders for `/copy-review`.
// A notification's title and body are the feed item's words (`feedCopy.home`), reworded only where the handoff draws
// it: a price drop spells was and now, a combo names its kind, a spare request says where to answer. Money arrives
// formatted (`formatCents`); this module formats nothing but counts.
import { feedCopy } from "./feed";
import { spareCopy } from "./social";
import type { AnnouncementFeedKind } from "../feed/kinds";

const t = feedCopy.home.title;

export const pushCopy = {
  /** One item of a kind, as the notification reads. */
  one: {
    // A set whose printings have no art yet has no card count on Home: the push still goes, without the figure.
    newSet: { title: t.newSet, body: (cards: number | null) => (cards === null ? "See the set." : `${feedCopy.home.line.newSet(cards)} See the set.`) },
    newPrecon: { title: t.newPrecon, body: feedCopy.home.line.newPrecon },
    priceDrop: { title: t.priceDrop, body: (was: string, now: string) => `Was ${was}, now ${now} at the cheapest printing.` },
    tradeMatch: {
      title: t.tradeMatch,
      body: feedCopy.home.line.tradeMatch,
      /** With spare requests on, a tap opens that card's spares sheet with Ask, so the body says so. */
      bodyAsk: (friend: string) => `${feedCopy.home.line.tradeMatch} Ask ${friend} for it.`,
    },
    spareRequest: { title: t.spareRequest, body: feedCopy.home.line.spareRequest },
    /** A friend's answer to the reader's own spare request: Your requests' title, and where it is listed. */
    spareAnswer: {
      yes: { title: spareCopy.request.mine.canSpare, body: "The handover is between you." },
      no: { title: spareCopy.request.mine.keeping, body: "Your requests are in Friends." },
    },
    combo: { title: "You can make a combo", body: (a: string, b: string, added: string) => `${a} + ${b}. ${feedCopy.home.line.combo(added)}` },
    // Copy-reviewed (seat push). The board's words (Rule 0 revisions, Notice board, item 6), kept verbatim: the toast's sentence
    // is the title; the body is the deck the seat holds, or the nudge to pick one. Host and pod are the readers' own words.
    // The push title has no trailing period, as the board's lock-screen and banner drawings show (the in-app toast keeps its own).
    // Fixed text is 23 of the title's 25; a long host or pod name runs past 40 and the push layer clips it at payloadFor.
    seat: {
      title: (host: string, pod: string) => `${host} seated you at ${pod}\u2019s table`,
      body: (deck: string | null) => (deck === null ? "Pick your deck at the table." : `You\u2019re seated with ${deck}.`),
    },
    /** A Wizards post (Announcements UI 3b): its own title, and its summary, or where a tap goes when it has none. */
    post: { title: (title: string) => title, body: (excerpt: string | null) => excerpt ?? "Read it on Wizards." },
  },
  /** Several of one kind from one job, or what waited the night, as one notification. */
  many: {
    newSet: { title: (n: number) => `${n} new sets are out`, body: (names: string) => `${names}.` },
    newPrecon: { title: (n: number) => `${n} new precons are out`, body: (names: string) => `${names}.` },
    priceDrop: { title: (n: number) => `${n} cards on your wishlist got cheaper`, body: (names: string) => `${names}.` },
    tradeMatchOne: { title: (friend: string, n: number) => `${friend} has ${n} spares you want`, body: feedCopy.home.line.tradeMatch },
    tradeMatchMany: { title: (n: number) => `${n} spares you want`, body: (friends: string) => `From ${friends}.` },
    combo: { title: (n: number) => `You can make ${n} new combos`, body: "From the cards you just added." },
    /** Several Wizards posts of one kind: the kind by its kicker, then the posts' titles. */
    post: { title: (kind: AnnouncementFeedKind, n: number) => `${feedCopy.home.kicker[kind]}: ${n} new posts`, body: (titles: string) => `${titles}.` },
  },
  /** `Jace, Dina and 1 more`: the first two names, then the rest by count. No full stop; a body adds its own. */
  names: (names: readonly string[]): string => {
    if (names.length <= 2) return names.join(" and ");
    return `${names[0]}, ${names[1]} and ${names.length - 2} more`;
  },
} as const;
