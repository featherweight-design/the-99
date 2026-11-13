// Friend links R1 (`design/design_handoff_the99_friends_link/`, copy strings file), after /copy-review on 2026-11-12:
// the reusable link, its QR and code, friend requests, Reset and the landing. A name is a ThirdPartyName, drawn through
// `personText` parts by `<PersonText>`, never joined into a string. Reused as shipped from `socialCopy`: dialog.title,
// qrCaption, copy, copied, share, shareText; landing.openTitle, alreadyTitle, endedTitle, selfTitle, signIn, toFriends.
import { personText, type ThirdPartyName } from "../person-name/brand";

type Name = string | ThirdPartyName;

/** Characters read out one by one, for a screen reader: `K 7 Q 4 X M`. */
const spaced = (code: string) => code.split("").join(" ");

export const friendLinkCopy = {
  sheet: {
    sub: "Show the QR code at the table, or send the link or code. Anyone who uses it sends you a friend request.",
    qrAria: "QR code for your friend link",
    linkAria: "Friend link",
    codeKicker: "Your code",
    codeHint: "Type it in Add a friend",
    codeAria: (code: string) => `Your code, ${spaced(code)}`,
    meta: "Works for anyone, as often as you like, until you reset it.",
    invitesLeft: (n: number) => `Someone new joins with one of your invites · ${n} left`,
    invitesNone: "Out of invites. Players already on The 99 can still add you, but someone new can’t join yet.",
    email: "Invite someone new by email",
    emailSub: (n: number) => (n > 0 ? `Uses an invite when they join · ${n} left` : "Out of invites"),
    loadFailed: "We couldn’t load your link. Try again.",
    retry: "Try again",
  },
  reset: {
    open: "Reset link and code",
    title: "Reset your link and code?",
    body: "The old link, QR code and code stop working for anyone you’ve sent them to. Your friends stay, and so do requests already waiting.",
    confirm: "Reset link and code",
    busy: "Resetting…",
    keep: "Keep them",
    done: "New link and code. The old ones no longer work.",
    failed: "We couldn’t reset your link. Try again.",
    limited: "That’s a lot of resets for one day. Try again tomorrow.",
  },
  code: {
    title: "Have a friend’s code?",
    body: "Type it here to send them a friend request.",
    aria: "Friend’s code",
    send: "Send request",
    sending: "Sending…",
    sent: (name: Name) => personText`Request sent to ${name}`,
    sentDetail: (name: Name) => personText`${name} sees it on Friends. You’re friends once they accept.`,
    accepted: (name: Name) => personText`You and ${name} are friends`,
    acceptedDetail: (name: Name) => personText`${name} had already asked you, so this answered it.`,
    already: (name: Name) => personText`You and ${name} are already friends`,
    alreadyDetail: "Nothing to send.",
    wrong: "No player has that code. Check it with them: a code stops working once it’s reset.",
    own: "That’s your own code. Type a friend’s.",
    limited: "Too many tries for now. Try again later.",
    failed: "We couldn’t send that. Try again.",
    another: "Enter another code",
  },
  friends: {
    /** F5: the empty card's body names the link and the code (after /copy-review: the empty-state cap kept the trust line). */
    emptyBody: "Send your friend link or code, or show its QR code at the table. Nobody can find you by name.",
  },
  // A request in Waiting on you (F1 to F4), drawn on the spare request's row.
  request: {
    kind: "Friend request",
    viaLink: "Opened your friend link.",
    viaCode: "Entered your code.",
    nothingShared: "Nothing is shared until you accept.",
    accept: "Accept",
    decline: "Decline",
    acceptedKind: "Friends",
    acceptedDetail: (name: Name) => personText`${name} is in your friends now, and you’re in theirs.`,
    declinedKind: "Declined",
    declinedTitle: (name: Name) => personText`Declined ${name}’s request`,
    declinedDetail: (name: Name) => personText`${name} isn’t told.`,
    putBack: "Put back",
    newcomerBand: (name: Name) => personText`Your friend request went to ${name}.`,
    failed: "We couldn’t answer that. Try again.",
    putBackFailed: "We couldn’t put that back.",
  },
} as const;
