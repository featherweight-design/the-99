// The signed-out landing page, first half (public landing PR 4a): the hero, the launch panel, the theme switch, the numbers
// strip, the close and the footer's credit line. Transcribed from `design_handoff_the99_public_landing` (R4, approved) with
// READINESS-audit's Copy table applied: the hero line is the TIGHTEN, the footer's Design line is shortened to the two sources
// the shipped Fan Content passages do not already credit. Strings marked shipped are reused verbatim from their module's
// wording. US English, no em dashes. The open-sign-up wording is not here: it ships with the PR that opens sign-up.

export const landingCopy = {
  topBar: {
    /** Shipped (the public pages' signed-out block). */
    signIn: "Sign in",
    homeLabel: "The 99, home",
    wordmark: "The Ninety-Nine",
    wordmarkPhone: "The 99",
  },
  hero: {
    /** Shipped: the tagline. */
    kicker: "99 problems, but your commander ain’t one.",
    /** Headline A, chosen. */
    title: "Your next commander is already in your binder.",
    /** READINESS-audit: the tricolon tightened. */
    line: "The 99 shows every commander your cards can build, then builds the deck from them. You buy only what’s missing.",
  },
  /** The hero phone is drawn with a made-up collection; the fit figures belong to the example, not to anyone. */
  phone: {
    label: "An example of the Commanders page, drawn with a made-up collection",
    /** Fit per commander, by Scryfall name. The example's own figures. */
    fits: { "Jace, Multiverse Architect": 84, "Y'shtola, Night's Blessed": 79, "Tam, the Possibility": 72 } as Readonly<Record<string, number>>,
  },
  launch: {
    regionLabel: "Launch list",
    title: "Get in when it opens",
    /** Ships as written: invite-only until launch, and the list is told the day it opens. */
    body: "The 99 is invite-only until launch. Leave your email and we’ll tell you the day it opens to everyone.",
    /** Shipped (the sign-up page), minus "email". */
    fine: "Have an invitation? Open its link.",
    /** Shipped (`joinCopy`). */
    emailLabel: "Your email",
    emailPlaceholder: "name@example.com",
    /** Shipped (`flyerJoinCopy.listPress`). */
    press: "Tell me at launch",
    sending: "Sending…",
    /** Shipped (`flyerJoinCopy.listedTitle`). */
    sentTitle: "You’re on the list",
    /** Shipped (`flyerJoinCopy.listedBody`): the address in the middle is drawn emphasized. */
    sentBody: (email: string) => ["We’ll email ", { em: email }, " the day The 99 opens to everyone."] as const,
    /** Shipped (`joinCopy.notAnEmail`). */
    notAnEmail: "Enter an email address, like name@example.com.",
    /** Shipped (`creditsPageCopy.throttled`). */
    throttled: "Too many tries. Wait a little, then try again.",
    /** The action threw: the address may or may not have been kept, and sending it again is safe. */
    failed: "That didn’t go through. Try again in a moment.",
  },
  theme: {
    label: "See it in",
  },
  numbers: {
    regionLabel: "The catalog today",
    commanders: "commanders",
    commandersWithProse: "with a written read",
    precons: "precons",
    combos: "combos tracked",
    cards: "cards",
  },
  close: {
    title: "Your cards already know what to build.",
  },
  footer: {
    /** READINESS-audit finding 12: Scryfall and Mana Pool are credited in the Fan Content passages that follow. */
    credit: "Commander data from EDHREC. Combos from Commander Spellbook.",
  },
} as const;
