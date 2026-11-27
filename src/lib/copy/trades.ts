// Friend trades copy (plan `2026-11-27-friend-trades.md`; handoff `design_handoff_the99_friend_trades`, STATES.md "Feed and
// Settings (D7)"). PR 2 carries the `feed` block alone; the sheet, the Spares tab and the rows add their words in later PRs.
// The words are Design's proposal, kept verbatim for `/copy-review`.
import { personText, type PersonParts, type ThirdPartyName } from "../person-name/brand";
import type { TradeEvent } from "../feed/kinds";

/**
 * A list of card names for a line: `A`, `A and B`, and past two `A, B and N more` (N the rest). Plain card names, never a
 * person's.
 */
export function cardList(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names[0]}, ${names[1]} and ${names.length - 2} more`;
}

// Push text names the friend as a plain string (`toPushItem` reveals it, the one server-side reveal), so a plain name
// yields a string; a branded one (Home's feed) yields parts.
function eventTitle(event: TradeEvent, friend: string): string;
function eventTitle(event: TradeEvent, friend: ThirdPartyName): PersonParts;
function eventTitle(event: TradeEvent, friend: string | ThirdPartyName): string | PersonParts;
function eventTitle(event: TradeEvent, friend: string | ThirdPartyName): string | PersonParts {
  const s = typeof friend === "string";
  switch (event) {
    case "offer":
      return s ? `${friend} offers a trade` : personText`${friend} offers a trade`;
    case "counter":
      return s ? `${friend} countered your trade` : personText`${friend} countered your trade`;
    case "accept":
      return s ? `${friend} accepted your trade` : personText`${friend} accepted your trade`;
    case "decline":
      return s ? `${friend} declined your trade` : personText`${friend} declined your trade`;
  }
}

export const tradeCopy = {
  feed: {
    /** Settings' News row. */
    settings: { name: "Trades", line: "A friend offers, counters, accepts or declines a trade with you." },
    kicker: "Trade",
    /** The offer line's and Settings' mid-sentence forms. */
    tease: "a friend offers you a trade",
    quietName: "trades",
    /** The title per event; the friend is a name on Home (parts) and a plain string in a push. */
    title: eventTitle,
    offer: (friend: string | ThirdPartyName) => eventTitle("offer", friend),
    counter: (friend: string | ThirdPartyName) => eventTitle("counter", friend),
    accept: (friend: string | ThirdPartyName) => eventTitle("accept", friend),
    decline: (friend: string | ThirdPartyName) => eventTitle("decline", friend),
    /** The line under an offer: what the friend gives, for what the reader gives. Both are `cardList`s. */
    offerLine: (theirs: string, yours: string) => `${theirs} for your ${yours}.`,
    counterLine: (theirs: string, yours: string) => `Now ${theirs} for your ${yours}.`,
    acceptLine: "Hand them over, then mark it traded.",
    declineLine: "Nothing else changes.",
    press: "See the trade",
    pressCounter: "See the counter",
  },
};
