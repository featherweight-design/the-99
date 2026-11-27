// Friend trades R1 (brief 2026-11-27-friend-trades.md, D1 to D7): every new string. DRAFT, for `/copy-review`.
// Vocabulary follows spare requests: Requested, Accepted, Declined (never Rejected); "spare" is a copy none of the
// holder's decks use. Totals are a figure each side, never a comparison: no string here says fair, even, short, over,
// better, worse or a difference between the sides.
import { personText, type ThirdPartyName } from "../person-name";

type Name = string | ThirdPartyName;

/** "Ghalta", "Ghalta and Sai", "Ghalta, Sai and 2 more". */
export function cardList(names: readonly string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return names.length === 3 ? `${names[0]}, ${names[1]} and ${names[2]}` : `${names[0]}, ${names[1]} and ${names.length - 2} more`;
}

const days = (n: number) => (n === 1 ? "1 day left" : `${n} days left`);

export const tradeCopy = {
  /** The friend strip's fourth tab. */
  tab: "Trade",
  /** The box's side labels (mono, uppercase by CSS) and the counts under the figure. */
  side: { them: (f: Name) => personText`From ${f}`, you: "From you" },
  cards: (n: number) => (n === 1 ? "1 card" : `${n} cards`),
  total: "Total",
  noneYet: "Nothing yet",
  pickTheirs: (f: Name) => personText`Pick from ${f}’s spares below.`,
  pickYours: "Pick from your spares below.",
  /** A counter's figure, under the new one: the side's total in the offer it replaces. */
  was: (figure: string) => `was ${figure}`,
  /** Under a card in a counter: new to this side, or taken out of it. */
  added: "Added",
  removed: "Taken out",
  /** Under a card that stopped being spare (needs a look). */
  gone: "No longer spare",
  /** Under the card the reader already said yes to (Ask back). */
  agreed: "Already a yes",
  daysLeft: days,
  /** The box's bands, by state. */
  band: {
    draft: (f: Name) => personText`Propose a trade to ${f}`,
    askBack: (f: Name) => personText`Ask ${f} back`,
    theirs: (f: Name) => personText`${f}’s offer`,
    yours: "Your offer",
    counterDraft: "Your counter",
    theirCounter: (f: Name) => personText`${f}’s counter`,
    accepted: "Accepted",
    traded: "Traded",
    look: "Needs a look",
  },
  /** The band's end: the trade's days, the whole trade's (D6), never reset by a counter. */
  replaces: (f: Name, day: string) => personText`Replaces ${f}’s offer of ${day}`,
  replacesYours: (day: string) => `Replaces your offer of ${day}`,
  /** The foot's presses and lines. */
  send: "Send offer",
  sendCounter: "Send counter",
  sendAskBack: "Send",
  counter: "Counter",
  withdraw: "Withdraw",
  callOff: "Call it off",
  cancelCounter: "Keep their offer",
  markTraded: "Mark traded",
  clear: "Clear",
  newTrade: "Propose a new trade",
  answerBy: (f: Name, n: number) => personText`${f} has ${n} days to answer.`,
  askBackFoot: (f: Name, card: string) => personText`${f} has 14 days to answer. Your yes on ${card} stands either way.`,
  counterFoot: (f: Name) => personText`Your counter replaces ${f}’s offer. The days left stay as they are.`,
  /** Send waits on a card on each side; the line says why, in place of a dead press (Hugh 2026-11-17). */
  needsBoth: (f: Name) => personText`Pick a card from ${f} and one of yours to send.`,
  waiting: (f: Name) => personText`Waiting on ${f}.`,
  acceptedFoot: "Hand them over when you meet, then mark it traded.",
  themMarked: (f: Name) => personText`${f} marked it traded. Mark it once you have yours.`,
  youMarked: (f: Name) => personText`You marked it traded. Waiting on ${f}.`,
  tradedFoot: (day: string) => `Traded ${day}. Your collection stays as it is until you change it.`,
  lookLine: (card: string, f: Name) => personText`${card} is no longer spare for ${f}, so this can’t be accepted as it is.`,
  lookLineYours: (card: string) => `${card} is no longer spare for you. Counter without it, or withdraw.`,
  /** The picker's band: the switch's two tabs. */
  pick: { theirs: (f: Name) => personText`${f}’s spares`, yours: "Your spares" },
  /** A picker tile's toggle: one press in, the same press out (aria-pressed). */
  addPress: "Add",
  inPress: "In the trade",
  addAria: (card: string) => `Add ${card} to the trade`,
  inAria: (card: string) => `${card} is in the trade. Select to take it out`,
  /** Empty states (open question 6). */
  empty: {
    yoursTitle: "You have no spares to offer",
    yoursBody: "A spare is a copy none of your decks use, past your threshold in Settings › Spares.",
    yoursAction: (f: Name) => personText`Ask ${f} for a spare instead`,
    theirsTitle: (f: Name) => personText`${f} has no spares right now`,
    theirsBody: (f: Name) => personText`Their spares show here once ${f}’s decks leave copies free.`,
    listTitle: "No trades yet",
    listBody: "Propose one from a friend’s Trade tab, or ask back after you say yes to a spare request.",
  },
  /** Ask back, on the holder's Yes receipt (open question 7). */
  askBack: "Ask back",
  askBackAria: (f: Name) => personText`Ask ${f} for a spare in return`,
  /** The Requests box's third tab. */
  listTab: "Trades",
  /** One trade as a Trades row: kicker (uppercase by CSS), title, line, press. */
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
    nothingElse: "Nothing else changes.",
    expired: (f: Name) => personText`${f} didn’t answer your trade`,
    expiredLine: (n: number) => `Offered ${n} days ago.`,
    look: (card: string) => `${card} is no longer spare`,
    lookLine: (f: Name, n: number) => personText`${f}’s trade can’t go ahead as it is · ${days(n)}`,
    waitingLine: (f: Name, n: number) => personText`Waiting on ${f} · ${days(n)}`,
    open: "Open ›",
    answer: "Answer ›",
    seeCounter: "See the counter ›",
    look2: "Take a look ›",
  },
  /** The feed kind (D7): its Settings row, kicker, and one title and line per push kind. Push copy is the same words. */
  feed: {
    kind: "trade",
    settings: { name: "Trades", line: "A friend offers, counters, accepts or declines a trade with you." },
    kicker: "Trade",
    tease: "a friend offers you a trade",
    quietName: "trades",
    offer: (f: Name) => personText`${f} offers a trade`,
    offerLine: (theirs: string, yours: string) => `${theirs} for your ${yours}.`,
    counter: (f: Name) => personText`${f} countered your trade`,
    counterLine: (theirs: string, yours: string) => `Now ${theirs} for your ${yours}.`,
    accept: (f: Name) => personText`${f} accepted your trade`,
    acceptLine: "Hand them over, then mark it traded.",
    decline: (f: Name) => personText`${f} declined your trade`,
    declineLine: "Nothing else changes.",
    press: "See the trade",
    pressCounter: "See the counter",
  },
} as const;
