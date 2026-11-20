import { personText } from "../person-name";
import type { ThirdPartyName } from "../person-name";

/** Request history (`/friends/requests`, #2984, R1d). The strings are the handoff's; /copy-review owns any later edit. */
export const historyCopy = {
  back: "‹ Friends",
  title: "Request history",
  line: "Every spare you’ve asked for, and every one asked of you. Newest first.",
  tabs: { asked: "You asked", ofYou: "Asked of you" },
  kind: { open: "Requested", yes: "Accepted", no: "Declined", expired: "No answer", withdrawn: "Withdrawn" },
  ofYouOpen: "Waiting on you",
  mine: {
    open: (f: ThirdPartyName, c: string) => personText`You asked ${f} for ${c}`,
    yes: (f: ThirdPartyName, c: string) => personText`${f} can spare ${c}`,
    no: (f: ThirdPartyName, c: string) => personText`${f} is keeping ${c}`,
    expired: (f: ThirdPartyName, c: string) => personText`${f} didn’t answer about ${c}`,
    withdrawn: (f: ThirdPartyName, c: string) => personText`You withdrew your request to ${f} for ${c}`,
  },
  theirs: (f: ThirdPartyName, c: string, n: number) => (n > 1 ? personText`${f} asked you for ${n} ${c}` : personText`${f} asked you for ${c}`),
  asked: (deck: string | null, on: string) => (deck ? `For ${deck} · asked ${on}` : `Asked ${on}`),
  openMine: (deck: string | null, days: number) => `${deck ? `For ${deck} · ` : ""}still open, ${days} ${days === 1 ? "day" : "days"} left`,
  openTheirs: (days: number) => `${days} ${days === 1 ? "day" : "days"} left. Answer it under Waiting on you.`,
  theirsYes: "You said yes. The handover is between you.",
  theirsNo: "You said no.",
  theirsExpired: "It ran out after 14 days without an answer.",
  older: "Show older requests",
  olderFailed: "Couldn’t load older requests. Try again.",
  exFriends: "Requests with people you’re no longer friends with don’t show here. Add them back and they return.",
  emptyAsked: { title: "You haven’t asked for a spare yet", body: "Ask a friend from a card’s spares in Shopping or on their Spares tab." },
  emptyOfYou: { title: "Nobody has asked you for a spare yet", body: "When a friend asks for one of your spares, it waits on you on Friends." },
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
