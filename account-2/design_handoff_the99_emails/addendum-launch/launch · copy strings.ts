// Launch email R2 (account 2, 2026-11-18): every string, all DRAFT for /copy-review.
// Lives beside emailShellCopy in src/lib/copy/emails.ts once approved. Curly quotes here; straight() makes the text twin's.

export const launchEmailCopy = {
  subject: "The 99 is open",
  /** Alternatives drawn on Main (Q1): "You asked us to tell you: The 99 is open", "Your binder has a deck in it". */
  preheader: "Make a free account and see what your cards can build. You start with 15 credits.",
  fanAlt: "A fan of commander cards around The 99’s card back, which reads Now open",
  /** The 99 card back's word at the centre of the fan. */
  fanWord: "NOW OPEN",
  kicker: "Now open",
  /** The landing's hero title, shipped. */
  heading: "Your next commander is already in your binder",
  lead: "The 99 is open to everyone, starting today.",
  textLead: "Your next commander is already in your binder. The 99 is open to everyone today.",
  /** The landing's loop title, shipped. */
  section: "From your binder to a finished deck",
  features: [
    { title: "See what you can build", body: "Every commander you own, ranked by how much of its deck you already have.", alt: "Jace and Y’shtola, ranked with fit scores of 84 and 79 out of 100" },
    { title: "Change a deck by describing it", body: "Say what you want from the deck. It suggests cards to add and cut, starting with ones you own, and says why for each.", alt: "For “More interaction”: add Chaos Warp and Abrade, cut Smokebraider" },
    { title: "Read why a commander works", body: "Every commander page explains how its deck plays, and every precon has an Overview. Both are free.", alt: "Tam, the Possibility, with why this commander is worth building" },
    { title: "Try the writing tools free", body: "Your welcome credits are enough to try every writing tool three times before you pay anything.",
      /** The text twin has no image, so it says what the picture shows. */
      textBody: "You start with 15 welcome credits, enough to try every writing tool three times before you pay anything, and get 1 free credit every day.", alt: "15 welcome credits when you join, plus 1 free credit every day" },
  ],
  /** Drawn twice: under the lead, and after the features with buttonFine. One action, one word, one link. */
  button: "Sign up free",
  textLinkLabel: "Sign up free:",
  buttonFine: "Free to join. No card details.",
  /** rawLinkLabel is the shipped inviteEmailCopy.rawLinkLabel. */
  reason: {
    landing: "You’re getting this because this address was left on The 99’s launch list at the-99.dev.",
    flyer: "You’re getting this because this address was left on The 99’s launch list from a flyer.",
  },
  /** {link} is the word Unsubscribe, linked to the address's /unsubscribe?t= URL. */
  unsubscribe: { before: "This is the only email the launch list sends. ", link: "Unsubscribe", after: " and we’ll delete this address now." },
  textUnsubscribe: "This is the only email the launch list sends. Unsubscribe and we’ll delete this address now:",
} as const;

/** Every email's footer line (emailShellCopy.flavor), replacing “Search your library for a commander.” (Hugh, 2026-11-18). */
export const tagline = "99 problems, but your commander ain’t one.";

export const unsubscribePageCopy = {
  eyebrow: "Launch list",
  done: { documentTitle: "Unsubscribed · The 99", title: "You’re off the list.", sub: "We’ve deleted this address from the launch list, so The 99 won’t email it again." },
  broken: { documentTitle: "Link incomplete · The 99", title: "This link is incomplete.", sub: "Open it again from the email, or paste the whole link into your browser." },
  button: "Visit The 99",
} as const;
