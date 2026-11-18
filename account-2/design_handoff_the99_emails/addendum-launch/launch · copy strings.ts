// Launch email R1 (account 2, 2026-11-18): every string, all DRAFT for /copy-review.
// Lives beside emailShellCopy in src/lib/copy/emails.ts once approved. Curly quotes here; straight() makes the text twin's.

export const launchEmailCopy = {
  subject: "The 99 is open",
  /** Alternatives drawn on Main (Q1): "You asked us to tell you: The 99 is open", "Your binder has a deck in it". */
  preheader: "Make your free account and see what your binder can build. 15 welcome credits are waiting.",
  handAlt: "Three of The 99’s card backs, the top one reading Now open",
  /** The top card back's word on the launch hand (InviteHand's back word; the invite's is INVITATION). */
  handWord: "NOW OPEN",
  kicker: "Now open",
  heading: "The 99 is open to everyone",
  lead: "You asked us to tell you the day it opened. Today’s the day. Make your free account and see what your cards can build.",
  textLead: "The 99 is open to everyone. You asked us to tell you the day it opened, and today’s the day.",
  stepsLabel: "Where to start:",
  steps: [
    "Bring your collection. Upload a CSV, paste a list or scan your cards.",
    "See every commander you can already build, ranked by how much of its deck you own.",
    "Try the writing tools on your own decks with 15 welcome credits.",
  ],
  button: "Sign up free",
  textLinkLabel: "Sign up free:",
  buttonFine: "Free to join. No card details.",
  /** rawLinkLabel is the shipped inviteEmailCopy.rawLinkLabel. */
  fine: "You don’t need an invite or a flyer code. Anyone can join now.",
  reason: {
    landing: "You’re getting this because this address was left on The 99’s launch list at the-99.dev.",
    flyer: "You’re getting this because this address was left on The 99’s launch list from a flyer.",
  },
  /** {link} is the word Unsubscribe, linked to the address's /unsubscribe?t= URL. */
  unsubscribe: { before: "This is the only email the launch list sends. ", link: "Unsubscribe", after: " and we’ll delete this address now." },
  textUnsubscribe: "This is the only email the launch list sends. Unsubscribe and we’ll delete this address now:",
} as const;

export const unsubscribePageCopy = {
  eyebrow: "Launch list",
  done: { documentTitle: "Unsubscribed · The 99", title: "You’re off the list.", sub: "We’ve deleted this address from the launch list, so The 99 won’t email it again." },
  broken: { documentTitle: "Link incomplete · The 99", title: "This link is incomplete.", sub: "Open it again from the email, or paste the whole link into your browser." },
  button: "Visit The 99",
} as const;
