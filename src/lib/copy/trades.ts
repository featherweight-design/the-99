// Friend trades copy (plan `2026-11-27-friend-trades.md`; handoff `design_handoff_the99_friend_trades`, STATES.md). Every
// string STATES.md names, from Design's proposal (`scratch-gen/proposal.diff`), through `/copy-review` (PR 4). Keys the
// proposal carried that STATES.md no longer draws (the R2 and R4 heads the R4c call-out replaced) are left out; the PR
// that draws a board adds its words. Totals are a figure each side, never a comparison: no string here says fair, even,
// short, over, better or worse.
import { joinNames, personText, type PersonParts, type ThirdPartyName } from "../person-name/brand";
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

type Name = ThirdPartyName;

const days = (n: number) => (n === 1 ? "1 day left" : `${n} days left`);

export const tradeCopy = {
  /** The box's side labels (mono, uppercase by CSS) and the counts under the figure. */
  side: { them: (f: Name) => personText`From ${f}`, you: "From you" },
  cards: (n: number) => (n === 1 ? "1 card" : `${n} cards`),
  total: "Total",
  noneYet: "Nothing yet",
  pickTheirs: (f: Name) => personText`Add from ${f}’s spares below.`,
  pickYours: "Add from your spares below.",
  /** A counter's figure, under the new one: the side's total in the offer it replaces. */
  was: (figure: string) => `was ${figure}`,
  /** Under a card in a counter: new to this side, or taken out of it. */
  added: "Added",
  removed: "Taken out",
  /** Under a card that stopped being spare (Needs a look). */
  gone: "No longer available",
  /** Under the card the reader already said yes to (Make it a trade). */
  agreed: "Your yes",
  daysLeft: days,
  /** The sheet's band, by state (STATES.md, the sheet table). */
  band: {
    draft: (f: Name) => personText`Propose a trade to ${f}`,
    askBack: (f: Name) => personText`Make it a trade with ${f}`,
    theirs: (f: Name) => personText`${f}’s offer`,
    yours: "Your offer",
    counterDraft: "Your counter",
    theirCounter: (f: Name) => personText`${f}’s counter`,
    accepted: "Accepted",
    traded: "Traded",
    look: "Needs a look",
  },
  /** The band's end on a counter: the trade's days are the whole trade's (D6), never reset by a counter. */
  replaces: (f: Name, day: string) => personText`Replaces ${f}’s offer of ${day}`,
  replacesYours: (day: string) => `Replaces your offer of ${day}`,
  /** The foot's presses. */
  send: "Send offer",
  sendCounter: "Send counter",
  sendAskBack: "Send",
  counter: "Counter",
  withdraw: "Withdraw",
  rescind: "Rescind trade",
  keepTheirs: "Keep their offer",
  markTraded: "Mark traded",
  clear: "Clear",
  newTrade: "Propose a new trade",
  /** The foot's lines. */
  answerBy: (f: Name, n: number) => personText`${f} has ${n === 1 ? "1 day" : `${n} days`} to answer.`,
  askBackFoot: (f: Name, card: string) => personText`${f} has 14 days to answer. Your yes on ${card} stands either way.`,
  /** Make it a trade: why the yes card is on your side. */
  askBackWhy: (f: Name, card: string) => personText`${card} is the yes you already gave ${f}. It sits here so the two read as one trade. Pick what you’d like back.`,
  counterFoot: (f: Name) => personText`Your counter replaces ${f}’s offer. The days left stay as they are.`,
  /** Send waits on a card each side; the line says why, in place of a dead press (Hugh 2026-11-17). */
  needsBoth: (f: Name) => personText`Pick a card from ${f} and one of yours to send.`,
  waiting: (f: Name) => personText`Waiting on ${f}.`,
  acceptedFoot: "Hand them over when you meet, then mark it traded.",
  themMarked: (f: Name) => personText`${f} marked it traded. Mark it once you have yours.`,
  youMarked: (f: Name) => personText`You marked it traded. Waiting on ${f}.`,
  tradedFoot: (day: string) => `Traded ${day}. Your collection stays as it is until you change it.`,
  lookLine: (card: string, f: Name) => personText`${card} is no longer available from ${f}, so Yes waits until the trade changes.`,
  lookLineYours: (card: string) => `${card} is no longer available on your side. Counter without it, or withdraw.`,
  /** The picker. */
  pick: { theirs: (f: Name) => personText`${f}’s spares`, yours: "Your spares" },
  wantsListed: (f: Name, n: number) => personText`${n === 1 ? "One is" : `${n} are`} on ${f}’s wishlist, listed first.`,
  key: { wants: "wants it", offered: "already offered" },
  /** A picker tile's toggle: one press in, the same press out (aria-pressed). */
  addPress: "Add",
  inPress: "In the trade",
  addAria: (card: string) => `Add ${card} to the trade`,
  inAria: (card: string) => `${card} is in the trade. Select to take it out`,
  onTheirWishlist: (f: Name) => personText`${f} wants it`,
  /** Q9: a spare may sit in two live offers; the picker says so before you send. */
  alsoOffered: (fs: readonly Name[]) => personText`Offered to ${joinNames(fs, " and ")}`,
  offeredCount: (n: number) => `${n} friends`,
  offeredPop: { title: "Also in your offers to", line: (d: number) => `Waiting · ${d === 1 ? "1 day" : `${d} days`} left`, open: "Open ›" },
  /** The friend's Spares tab: the Trades box, held by the cap (Q10, one unanswered offer per friend). */
  liveTitle: (f: Name) => personText`Trades with ${f}`,
  openCount: (n: number) => (n === 1 ? "1 trade open" : `${n} trades open`),
  proposeAnother: "Propose another trade",
  capLine: "Resolve your open trade before proposing another.",
  capShort: "Offer waiting",
  /** The Spares tab's call-out and filter (R4c). */
  callout: {
    eyebrow: "Wanted",
    youWantTitle: (f: Name, n: number) => personText`${f} has ${n === 1 ? "1 card" : `${n} cards`} you want`,
    youWantBody: (cards: string) => `${cards}. Ask from its tile, or trade for it.`,
    theyWantTitle: (f: Name, n: number) => personText`${f} wants ${n === 1 ? "1 of your spares" : `${n} of your spares`}`,
    theyWantBody: (cards: string) => `${cards}. Offer them in a trade.`,
    noneTitle: "Trade spares for spares",
    noneBody: "Pick from both sides, then send it.",
    filterAria: "Show spares",
    filterAll: "All",
    filterWant: "You want",
    keyWish: "on your wishlist",
    keyDeck: "a deck needs it",
  },
  chipWishlist: "Wishlist",
  chipDeck: "A deck",
  /** The spares sheet over a deck or All shopping: Trade beside Ask, and the trade made in the sheet. */
  sheet: {
    press: "Trade",
    how: "Ask and they give it to you. Trade to offer one of your spares for it.",
    pressAria: (f: Name, card: string) => personText`Propose a trade with ${f} for ${card}`,
    open: "Trade open",
    openAria: (f: Name) => personText`Open your trade with ${f}`,
    title: (f: Name) => personText`Trade with ${f}`,
    back: "Friends’ spares",
    sentTitle: (f: Name) => personText`Offer sent to ${f}`,
    sentBody: (f: Name) => personText`${f} has 14 days to answer. It’s on ${f}’s Spares tab and in Friends › Trades.`,
    done: "Done",
    openTrade: "Open the trade ›",
  },
  /** Make it a trade, on the holder's Yes receipt. */
  askBack: "Make it a trade",
  askBackAria: (f: Name) => personText`Ask ${f} for a spare in return`,
  /** The Requests box's tab. */
  listTab: "Trades",
  /** One trade as a Trades row: kicker (uppercase by CSS), title, line, press (STATES.md, the rows table). */
  row: {
    kind: {
      offer: "Trade offer",
      offered: "Offered",
      countered: "Countered",
      accepted: "Accepted",
      themMarked: (f: Name) => personText`Traded by ${f}`,
      youMarked: "Traded by you",
      traded: "Traded",
      declined: "Declined",
      withdrawn: "Withdrawn",
      expired: "No answer",
      look: "Needs a look",
    },
    offer: (f: Name, theirs: string, yours: string) => personText`${f} offers ${theirs} for your ${yours}`,
    offered: (f: Name, theirs: string, yours: string) => personText`You offered ${yours} to ${f} for ${theirs}`,
    countered: (f: Name) => personText`${f} countered your trade`,
    counteredLine: (theirs: string, yours: string, n: number) => `Now ${theirs} for your ${yours} · ${days(n)}`,
    accepted: (f: Name) => personText`${f} accepted your trade`,
    acceptedYou: (f: Name) => personText`You accepted ${f}’s trade`,
    acceptedLine: "Hand them over, then mark it traded.",
    themMarked: (f: Name) => personText`${f} marked the trade done`,
    themMarkedLine: "Mark it too once yours are in hand.",
    youMarked: (f: Name) => personText`You marked the trade with ${f} done`,
    youMarkedLine: (f: Name) => personText`Waiting on ${f} to mark it too.`,
    traded: (f: Name) => personText`You and ${f} traded`,
    tradedLine: (theirs: string, yours: string, day: string) => `${theirs} for ${yours} · ${day}. Your collection stays as it is.`,
    declined: (f: Name) => personText`${f} declined your trade`,
    declinedYou: (f: Name) => personText`You declined ${f}’s trade`,
    withdrawn: (f: Name) => personText`${f} withdrew the trade`,
    withdrawnYou: (f: Name) => personText`You withdrew your trade with ${f}`,
    rescinded: (f: Name) => personText`${f} rescinded the trade`,
    rescindedYou: (f: Name) => personText`You rescinded the trade with ${f}`,
    nothingElse: "Nothing else changes.",
    expired: (f: Name) => personText`${f} didn’t answer your trade`,
    expiredYou: (f: Name) => personText`You didn’t answer ${f}’s trade`,
    expiredLine: (n: number) => `Offered ${n} days ago.`,
    look: (card: string) => `${card} is no longer available`,
    lookLine: (f: Name, n: number) => personText`${f}’s trade can’t go ahead as it is · ${days(n)}`,
    waitingLine: (f: Name, n: number) => personText`Waiting on ${f} · ${days(n)}`,
    open: "Open ›",
    answer: "Answer ›",
    seeCounter: "See the counter ›",
    takeLook: "Take a look ›",
    clearAria: "Clear this trade",
    /** The list's cap: five rows, then one line for the rest, naming the ones that wait on you. */
    moreWaiting: (waiting: number, rest: number) => (rest > waiting ? `${waiting} more waiting on you · ${rest} in all` : `${waiting} more waiting on you`),
    more: (n: number) => (n === 1 ? "1 more trade" : `${n} more trades`),
  },
  /** Empty states. */
  empty: {
    yoursTitle: "You have no spares to offer",
    yoursBody: "A spare is a copy none of your decks use, past your threshold in Settings › Spares.",
    yoursAction: (f: Name) => personText`Ask ${f} for a spare instead`,
    theirsTitle: (f: Name) => personText`${f} has no spares right now`,
    theirsBody: (f: Name) => personText`Their spares show here once ${f}’s decks leave copies free.`,
    listTitle: "No trades yet",
    listBody: "Add cards from a friend’s Spares tab, press Trade where a deck shows a friend’s spare, or make it a trade after you say yes to a spare request.",
  },
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
