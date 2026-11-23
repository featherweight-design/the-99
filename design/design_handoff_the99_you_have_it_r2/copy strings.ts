// You have it R2: every NEW or CHANGED string (placeholders for /copy-review). Shipped strings reused are named.
// Where each lands in src is in scratch-gen/proposal.diff.

// src/lib/copy/request-history.ts (historyCopy)
export const historyR2 = {
  line: "Every spare you’ve asked for or offered, and every one asked of you or offered to you. Newest first.", // was: Every spare you’ve asked for, and every one asked of you. Newest first.
  tabs: { asked: "From you", ofYou: "To you" }, // was: You asked · Asked of you
  offer: {
    open: "Offered", // kicker; the other kickers are historyCopy.kind
    mine: {
      open: (f: string, c: string, n: number) => (n > 1 ? `You offered ${n} ${c} to ${f}` : `You offered ${c} to ${f}`),
      yes: (f: string, c: string) => `${f} said yes to ${c}`, // = spareCopy.request.offer.answered.yes
      no: (f: string, c: string) => `${f} passed on ${c}`, // = spareCopy.request.offer.answered.no
      expired: (f: string, c: string) => `${f} didn’t answer about ${c}`, // = historyCopy.mine.expired
      withdrawn: (f: string, c: string) => `You withdrew your offer of ${c} to ${f}`,
    },
    openMine: (f: string, days: number) => `${days} ${days === 1 ? "day" : "days"} left. Withdraw it from ${f}’s Wishlist tab.`,
    offered: (on: string) => `Offered ${on}`,
    theirs: (f: string, c: string, n: number) => (n > 1 ? `${f} offered you ${n} ${c}` : `${f} offered you ${c}`),
    // To you's lines reuse historyCopy.openTheirs, theirsYes, theirsNo, theirsExpired.
  },
  exFriends: "Requests and offers with people you’re no longer friends with don’t show here. Add them back and they return.",
  emptyAsked: { title: "Nothing from you yet", body: "Ask a friend from a card’s spares in Shopping or on their Spares tab, or offer one from their Wishlist tab." },
  emptyOfYou: { title: "Nothing to you yet", body: "When a friend asks for one of your spares, or offers you one, it waits on you on Friends." },
};

// src/lib/copy/feed.ts (feedCopy.home)
export const feedR2 = {
  pressOfferAnswer: "Your offer", // drawn with › ; was no press
  offerAnswerKicker: "Your offer", // was answerKicker, "Your request"
};

// src/components/home/offer-answer-sheet.tsx
export const offerSheetCopy = {
  title: "Your offer",
  close: "Close",
  yesDetail: "Hand it over when you meet; your collection stays as it is until you change it.",
  noDetail: "Nothing else changes.", // = spareCopy.request.offer.answered.noLine
  meta: (on: string, copies: number) => `Offered ${on} · ${copies === 1 ? "1 copy" : `${copies} copies`}`,
  all: "Request history ›", // = historyCopy.box.history
};

// src/lib/copy/social.ts (haveItCopy)
export const haveUnderR2 = {
  keyUnder: "under your threshold",
  aria: (card: string, min: number) => `You have a spare ${card}, under your threshold of ${min}`,
  sub: (min: number) => `under your threshold of ${min}`,
  foot: (min: number) => `You offer a card only when you have ${min} or more spare copies.`,
  settings: "Change it in Settings ›",
  more: (n: number) => (n === 1 ? "1 more is under your threshold." : `${n} more are under your threshold.`),
  title: (n: number) => (n === 1 ? "You have 1 spare under your threshold" : `You have ${n} spares under your threshold`),
  body: (names: string, min: number) => `${names}. You offer a card from ${min} spare copies; change it in Settings › Spares.`,
};

// src/lib/copy/settings.ts (settingsCopy.spares)
export const settingsR2 = {
  alsoOffer: "This also decides which cards you can offer from a friend’s wishlist.",
};
