import { personText } from "../person-name";
import type { ThirdPartyName } from "../person-name";

/** Request history (`/friends/requests`, #2984, R1d). The strings are the handoff's; /copy-review owns any later edit. */
export const historyCopy = {
  back: "‹ Friends",
  title: "Request history",
  line: "Every spare you’ve asked for or offered, and every one asked of you or offered to you. Newest first.",
  /** You have it R2: the tabs split by who started it, so an offer you made sits with your asks (`From you`). */
  tabs: { asked: "From you", ofYou: "To you" },
  kind: { open: "Requested", yes: "Accepted", no: "Declined", expired: "No answer", withdrawn: "Withdrawn" },
  ofYouOpen: "Waiting on you",
  mine: {
    open: (friendName: ThirdPartyName, cardName: string) => personText`You asked ${friendName} for ${cardName}`,
    yes: (friendName: ThirdPartyName, cardName: string) => personText`${friendName} can spare ${cardName}`,
    no: (friendName: ThirdPartyName, cardName: string) => personText`${friendName} is keeping ${cardName}`,
    expired: (friendName: ThirdPartyName, cardName: string) => personText`${friendName} didn’t answer about ${cardName}`,
    withdrawn: (friendName: ThirdPartyName, cardName: string) => personText`You withdrew your request to ${friendName} for ${cardName}`,
  },
  theirs: (friendName: ThirdPartyName, cardName: string, copyCount: number) => (copyCount > 1 ? personText`${friendName} asked you for ${copyCount} ${cardName}` : personText`${friendName} asked you for ${cardName}`),
  asked: (deck: string | null, date: string) => (deck ? `For ${deck} · asked ${date}` : `Asked ${date}`),
  openMine: (deck: string | null, daysLeft: number) => `${deck ? `For ${deck} · ` : ""}still open, ${daysLeft} ${daysLeft === 1 ? "day" : "days"} left`,
  openTheirs: (daysLeft: number) => `${daysLeft} ${daysLeft === 1 ? "day" : "days"} left. Answer it under Waiting on you.`,
  /** You have it R2: an OFFER's row. The kicker words are the ask's but for open (`Offered`); the title and the line say it is an offer. */
  offer: {
    open: "Offered",
    mine: {
      open: (friendName: ThirdPartyName, cardName: string, copyCount: number) => (copyCount > 1 ? personText`You offered ${copyCount} ${cardName} to ${friendName}` : personText`You offered ${cardName} to ${friendName}`),
      yes: (friendName: ThirdPartyName, cardName: string) => personText`${friendName} said yes to ${cardName}`, // = spareCopy.request.offer.answered.yes
      no: (friendName: ThirdPartyName, cardName: string) => personText`${friendName} passed on ${cardName}`, // = spareCopy.request.offer.answered.no
      expired: (friendName: ThirdPartyName, cardName: string) => personText`${friendName} didn’t answer about ${cardName}`, // = historyCopy.mine.expired
      withdrawn: (friendName: ThirdPartyName, cardName: string) => personText`You withdrew your offer of ${cardName} to ${friendName}`,
    },
    openMine: (friendName: ThirdPartyName, days: number) => personText`${days} ${days === 1 ? "day" : "days"} left. Withdraw it from ${friendName}’s Wishlist tab.`,
    offered: (date: string) => `Offered ${date}`,
    theirs: (friendName: ThirdPartyName, cardName: string, copyCount: number) => (copyCount > 1 ? personText`${friendName} offered you ${copyCount} ${cardName}` : personText`${friendName} offered you ${cardName}`),
  },
  theirsYes: "You said yes. The handover is between you.",
  theirsNo: "You said no.",
  theirsExpired: "It ran out after 14 days without an answer.",
  older: "Show older requests",
  olderFailed: "Couldn’t load older requests. Try again.",
  exFriends: "Requests and offers with people you’re no longer friends with don’t show here. Add them back and they return.",
  emptyAsked: { title: "Nothing from you yet", body: "Ask a friend from a card’s spares in Shopping or on their Spares tab, or offer one from their Wishlist tab." },
  emptyOfYou: { title: "Nothing to you yet", body: "When a friend asks for one of your spares, or offers you one, it waits on you on Friends." },
  /** The Friends page's one Requests box (R1d): its tabs, the foot link and a tab's empty state. DRAFT for /copy-review. */
  box: {
    label: "Requests",
    waiting: "Waiting on you",
    mine: "Your requests",
    history: "Request history ›",
    waitingEmpty: { title: "Nothing waiting on you", body: "Friend requests, and friends asking for your spares, land here." },
    mineEmpty: { title: "Nothing open right now", body: "Ask a friend for a spare from Shopping or their Spares tab." },
  },
} as const;
