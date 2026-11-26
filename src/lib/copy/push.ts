// Push notifications (W5; handoff design_handoff_the99_push, README "Every kind"). Placeholders for `/copy-review`.
// A notification's title and body are the feed item's words (`feedCopy.home`), reworded only where the handoff draws
// it: a price drop spells was and now, a combo names its kind, a spare request says where to answer. Money arrives
// formatted (`formatCents`); this module formats nothing but counts.
import { feedCopy } from "./feed";
import { spareCopy } from "./social";
import type { AnnouncementFeedKind } from "../feed/kinds";

const t = feedCopy.home.title;

/** How a game ended as a notification words it: `winner` is `You` for the reader, or a player's name. */
export type LogResult = { kind: "you" | "won"; winner: string } | { kind: "draw" } | { kind: "unknown" };

export const pushCopy = {
  /** One item of a kind, as the notification reads. */
  one: {
    // A set whose printings have no art yet has no card count on Home: the push still goes, without the figure.
    newSet: { title: t.newSet, body: (cards: number | null) => (cards === null ? "See the set." : `${feedCopy.home.line.newSet(cards)} See the set.`) },
    newPrecon: { title: t.newPrecon, body: feedCopy.home.line.newPrecon },
    priceDrop: { title: t.priceDrop, body: (was: string, now: string, printing?: string | null) => `Was ${was}, now ${now} ${printing ? `at ${printing}` : "at the cheapest printing"}.` },
    tradeMatch: {
      title: t.tradeMatch,
      body: feedCopy.home.line.tradeMatch,
      /** With spare requests on, a tap opens that card's spares sheet with Ask, so the body says so. */
      bodyAsk: (friend: string) => `${feedCopy.home.line.tradeMatch} Ask ${friend} for it.`,
    },
    spareRequest: { title: t.spareRequest, body: feedCopy.home.line.spareRequest },
    /** A friend's offer of a spare the reader wants (You have it): who offers, what, and where to answer. */
    spareOffer: { title: (friend: string, card: string) => `${friend} is offering you ${card}`, body: "Answer in Friends." },
    /** The wanter's answer to the reader's offer. */
    spareOfferAnswer: {
      yes: { title: (friend: string, card: string) => `${friend} said yes to ${card}`, body: "The handover is between you." },
      no: { title: (friend: string, card: string) => `${friend} passed on ${card}`, body: "Nothing else changes." },
    },
    /** A friend's answer to the reader's own spare request: Your requests' title, and where it is listed. */
    spareAnswer: {
      yes: { title: spareCopy.request.mine.canSpare, body: "The handover is between you." },
      no: { title: spareCopy.request.mine.keeping, body: "Your requests are in Friends." },
    },
    combo: { title: "You can make a combo", body: (firstCardName: string, secondCardName: string, added: string) => `${firstCardName} + ${secondCardName}. ${feedCopy.home.line.combo(added)}` },
    // Copy-reviewed (seat push). The board's words (Rule 0 revisions, Notice board, item 6), kept verbatim: the toast's sentence
    // is the title; the body is the deck the seat holds, or the nudge to pick one. Host and pod are the readers' own words.
    // The push title has no trailing period, as the board's lock-screen and banner drawings show (the in-app toast keeps its own).
    // A title of 40 characters or fewer is the shipped one. Longer, the title is `{host} seated you` and the pod moves to the body
    // (copy-reviewed bodies below); a host alone past 40 is cut with an ellipsis, the only cut. payloadFor (send.ts) still clips titles at 120.
    seat: {
      title: (host: string, pod: string) => `${host} seated you at ${pod}\u2019s table`,
      /** The title when the full one runs past `titleMax`: the pod and deck move to `splitBody`. */
      splitTitle: (host: string) => `${host} seated you`,
      titleMax: 40,
      body: (deck: string | null) => (deck === null ? "Pick your deck at the table." : `You\u2019re seated with ${deck}.`),
      splitBody: (pod: string, deck: string | null) => (deck === null ? `At ${pod}\u2019s table. Pick your deck there.` : `At ${pod}\u2019s table, with ${deck}.`),
    },
    // Copy-reviewed (log reminder, push). The board's words (log reminder handoff, N1), kept verbatim, with `unknown` (a winner the
    // card does not draw) filled from the nearest drawn pattern. `winner` is `You`, a player's name, or null for a draw.
    // A title of 40 characters or fewer is the shipped one; longer, the title is `{winner} won. Log your game` and the pod moves to the body.
    // A winner alone past 40 is cut with an ellipsis, the only cut.
    log: {
      titleMax: 40,
      title: (result: LogResult, pod: string) => (result.kind === "draw" ? `A draw at ${pod}\u2019s table` : result.kind === "unknown" ? `Your game at ${pod}\u2019s table` : `${result.winner} won at ${pod}\u2019s table`),
      splitTitle: (result: LogResult, winner: string) => (result.kind === "draw" ? "A draw. Log your game" : result.kind === "unknown" ? "Log your game" : `${winner} won. Log your game`),
      body: (deck: string) => `Log your game: ${deck} and every seat are filled in.`,
      splitBody: (pod: string, deck: string) => `From ${pod}\u2019s table. ${deck} and every seat are filled in.`,
      many: {
        title: (gameCount: number, pod: string) => `${gameCount} games at ${pod}\u2019s table`,
        splitTitle: (gameCount: number) => `${gameCount} games to log`,
        /** Two games whose winners are both drawn: `You won, then Sam did.` Otherwise, and for three or more, no names. */
        body: (first: LogResult, second: LogResult | null) => (second && first.kind !== "draw" && first.kind !== "unknown" && second.kind !== "draw" && second.kind !== "unknown"
          ? `${first.winner} won, then ${second.kind === "you" ? "you" : second.winner} did. Log both: every seat is filled in.`
          : second ? "Log both: every seat is filled in." : "Log them: every seat is filled in."),
        splitBody: (pod: string, both: boolean) => `At ${pod}\u2019s table. ${both ? "Log both" : "Log them"}: every seat is filled in.`,
      },
    },
    /** A Wizards post (Announcements UI 3b): its own title, and its summary, or where a tap goes when it has none. */
    post: { title: (title: string) => title, body: (excerpt: string | null) => excerpt ?? "Read it on Wizards." },
    // A Secret Lair drop's sale-time push (drop alerts, handoff call 3), DRAFT for `/copy-review`: the title leads with the hour. The
    // times arrive as phrases (`sale-words.ts`): `at 11 a.m.`, `Tue at 12 a.m.` (a time on another day than the push), or in the
    // store's zone with its label, `at 8 a.m. PT`.
    sale: {
      queueTitle: (queueOpensAt: string) => `Pre-queue opens ${queueOpensAt}`,
      saleTitle: (saleStartsAt: string) => `On sale ${saleStartsAt}`,
      /** A push that lands after the sale began (a late tick): no hour to name. */
      liveTitle: "On sale now",
      queueBody: (post: string, sale: string) => `${post}. On sale ${sale} on the US store.`,
      saleBody: (post: string) => `${post}, on the US store.`,
    },
  },
  /** Several of one kind from one job, or what waited the night, as one notification. */
  many: {
    newSet: { title: (setCount: number) => `${setCount} new sets are out`, body: (setNames: string) => `${setNames}.` },
    newPrecon: { title: (preconCount: number) => `${preconCount} new precons are out`, body: (preconNames: string) => `${preconNames}.` },
    priceDrop: { title: (cardCount: number) => `${cardCount} cards on your wishlist got cheaper`, body: (cardNames: string) => `${cardNames}.` },
    tradeMatchOne: { title: (friend: string, spareCount: number) => `${friend} has ${spareCount} spares you want`, body: feedCopy.home.line.tradeMatch },
    tradeMatchMany: { title: (spareCount: number) => `${spareCount} spares you want`, body: (friendNames: string) => `From ${friendNames}.` },
    combo: { title: (comboCount: number) => `You can make ${comboCount} new combos`, body: "From the cards you just added." },
    /** Several Wizards posts of one kind: the kind by its kicker, then the posts' titles. */
    post: { title: (kind: AnnouncementFeedKind, postCount: number) => `${feedCopy.home.kicker[kind]}: ${postCount} new posts`, body: (postTitles: string) => `${postTitles}.` },
  },
  /** `Jace, Dina and 1 more`: the first two names, then the rest by count. No full stop; a body adds its own. */
  names: (names: readonly string[]): string => {
    if (names.length <= 2) return names.join(" and ");
    return `${names[0]}, ${names[1]} and ${names.length - 2} more`;
  },
} as const;
