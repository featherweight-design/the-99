// Invites R1 (invite-only launch) · copy strings · account 1, 2026-10-16.
// Brief: docs/superpowers/design-briefs/2026-10-16-invite-only-launch.md.
//
// LOCKED by the brief (not for /copy-review): "Invitation sent", "N invites left", "Out of invites".
// Everything else here is NEW and owed to /copy-review before it ships.
// Existing keys this round CHANGES are marked CHANGED, with the shipped string beside them.
// Board references are to this handoff's boards (Add-*, Email-*, QR-*, Newcomer, Friends-Count,
// Invite-Only, Friend-Link, Admin-*).

const invites = (n: number) => (n === 1 ? "1 invite left" : `${n} invites left`); // LOCKED shape

export const inviteCopy = {
  // The count, wherever an invite can be sent (Add-* chooser card 2, path 2's sub, /friends under Add a friend).
  count: {
    left: invites, // LOCKED
    out: "Out of invites", // LOCKED
    waiting: (n: number) => ` · ${n} waiting`, // appended: "2 invites left · 1 waiting"
    heldByQr: " · 1 held by an open QR", // /friends, while a QR the sender closed is still live
    heldByThisQr: " · 1 held by this QR", // the QR's own screen
  },

  // Add a friend: the chooser (Add-Phone A1 to A3, Add-Desktop D1, D2). The dialog's title stays socialCopy.dialog.title.
  chooser: {
    sub: "Already playing, or new to The 99? You choose; nobody is looked up.",
    onTitle: "They’re on The 99",
    onBody: "Send a friend link, or show its QR code. Uses no invite.",
    onPending: "Making a link…", // reuses socialCopy.page.invitePending
    newTitle: "Invite someone new",
    newBody: "For someone without an account. An invite is used only when they join.",
    back: "Back", // aria-label of the ‹ in a path's header
  },

  // Path 2, both ways on one screen (Add-* A5 / D4, Email-*, QR-*).
  path: {
    title: "Invite someone new",
    tableKicker: "At the table",
    tableBody: "They scan it and type their own email on their phone. It works once, for 15 minutes.",
    showQr: "Show an invite QR",
    or: "or",
    emailKicker: "By email",
    emailLabel: "Their email",
    emailPlaceholder: "name@example.com",
    send: "Send invitation",
    sending: "Sending…",
    emailHint: "The 99 emails them an invitation. If they join within 7 days, you’re friends.",
    notAnEmail: "Enter an email address, like name@example.com.", // field error, role alert; shape only
    sent: "Invitation sent", // LOCKED. The one answer, whatever happened.
    sentBody: "If they join within 7 days, you’re friends. Until then it holds one of your invites.",
    again: "Invite someone else",
    lastOne: "That was your last invite.",
    sendFailed: "We couldn’t send that invitation. Try again.", // toast, Try again; transport failures ONLY
    retry: "Try again",
  },

  // The invite QR, the sender's side (QR-Phone Q1 to Q5, QR-Desktop).
  qr: {
    aria: "Invite QR code",
    caption: "Scan with a phone camera", // desktop only, as the friend link's
    left: "left", // after the mm:ss timer: "14:52 left"
    meta: "Works once · holds 1 invite until it’s used or runs out",
    done: "Done",
    expiredChip: "EXPIRED", // drawn uppercase; spoken "Expired"
    expiredBody: "This QR ran out before anyone used it. Its invite is back.",
    makeNew: "Make a new QR",
    claimedBody: "They’re finishing on their phone. If they join, you’re friends.", // under "Invitation sent"
    createFailed: "We couldn’t make an invite QR. Try again.", // toast, Try again (not drawn: the shared ToastFrame)
  },

  // The newcomer's page, public (Newcomer N1 to N12). `name` is the sender's display name.
  join: {
    cardType: "Invitation", // the card's type line; the back's word, drawn uppercase
    cardRules: (name: string) => `Join The 99 as ${name}’s friend. Your decks and your collection stay yours.`,
    title: (name: string) => `${name} invited you to The 99`,
    body: "Type your own email. We’ll send it a code to check it’s yours, then you’ll make your account.",
    emailLabel: "Your email",
    sendCode: "Send code",
    sendingCode: "Sending code…",
    fine: (name: string) => `${name} won’t see your email. This invite works once, and only for the next 15 minutes.`,
    codeTitle: "Check your email",
    codeBody: (email: string) => `We sent a 6-digit code to ${email}. It works for 10 minutes.`,
    codeAria: "6-digit code",
    confirm: "Confirm",
    resend: "Send a new code",
    resendIn: (mmss: string) => `Send a new code in ${mmss}`,
    otherEmail: "Use a different email",
    codeWrong: "That code isn’t right. Check the email and try again.",
    codeExpired: "That code has expired. Send a new one.",
    okTitle: "That’s your email",
    okBody: (name: string) => `Now make your account. You’ll join as ${name}’s friend.`,
    toSignUp: "Continue to sign-up",
    // Option A (recommended, For Hugh A): after the right code only.
    haveAccountTitle: "You already have an account",
    haveAccountBody: (email: string, name: string) => `${email} is already on The 99. Sign in, then ask ${name} for a friend link.`,
    signIn: "Sign in",
    // Option B would reuse path.sent and "Check {email}." instead.
    expiredTitle: "This invite QR has run out",
    expiredBody: "An invite QR lasts 15 minutes. Ask whoever showed it to make a new one.",
    endedTitle: "This invite QR no longer works",
    endedBody: "Each invite QR works once. Ask whoever showed it to make a new one.",
    haveOne: "Already on The 99?", // + signIn link
  },

  // Landing on /friends after sign-up: the shipped receipt, socialCopy.page.accepted(name). No new string.

  // The invite-only page (Invite-Only I1, I2).
  inviteOnly: {
    kicker: "The Ninety-Nine", // reuses socialCopy.landing.brand
    backWord: "BY INVITATION",
    title: "The 99 is invite-only",
    body: "You join when someone already playing invites you. Ask a friend who plays: they’ll find Invite someone new under Add a friend.",
    signIn: "Sign in",
    fine: "Have an invitation email? Open its link to make your account.",
    // Option W only (not recommended):
    waitlistLabel: "No one to ask? Join the waitlist",
    waitlistField: "Your email",
    waitlistJoin: "Join",
    waitlistFine: "If an invitation comes free, it arrives at this address.",
    waitlistDone: "You’re on the list. If an invitation comes free, it arrives at that address.", // one answer
  },

  // /admin (Admin-Desktop M1 to M4, Admin-Phone). Owed to /copy-review with the admin's other new lines.
  admin: {
    tab: "Invites",
    title: "Invites",
    sub: "Who invited whom. Founders are the accounts from before launch; a waiting invite can be revoked here.",
    colInvites: "Invites",
    colInvitedBy: "Invited by",
    founder: "founder",
    tile: "Invites",
    tileSub: (waiting: number, spent: number) => `${waiting} waiting · ${spent} spent`,
    section: "Invites",
    field: "Invites left",
    fieldHelp: (name: string) => `How many ${name} holds now. Only a new account spends one, and nothing but this field refills it.`,
    pendingSet: (name: string, from: number, to: number) => `Saving sets ${name}’s invites from ${from} to ${to}. The one waiting stays waiting.`,
    invitedBy: "Invited by",
    invited: "Invited",
    waiting: (how: "by email" | "in person", email: string) => `Waiting · ${how} · ${email}`,
    sentReturns: (sent: string, returns: string) => `sent ${sent} · returns ${returns}`,
    revoke: "Revoke",
    open: "Open ›",
    groupSection: "Top up invites",
    groupField: "Top up each member to",
    groupHelp: "Raises every member holding fewer to this many. Nobody is lowered, and the group keeps no count: a member who joins later gets nothing until the next top-up.",
    groupPending: (raised: number, of: number, n: number, who: string, held: string) =>
      `Topping up raises ${raised} of ${of} members to ${n} invites left: ${who}. ${held} already holds ${n}.`,
    topUp: "Top up",
    treeRoot: "Founders · accounts from before launch",
    nodeMeta: (left: number, invited: number) => `${left} left · invited ${invited}`,
    history: {
      set: (who: string, name: string, from: number, to: number) => `${who} set ${name}’s invites: ${from} → ${to}`,
      topUp: (who: string, group: string, n: number, raised: number) => `${who} topped up ${group} to ${n}: ${raised} raised`,
      joined: (name: string, inviter: string, from: number, to: number) => `${name} joined on ${inviter}’s invite: ${from} → ${to}`,
      sent: (name: string) => `${name} sent an invitation: 1 waiting`,
    },
  },
} as const;

// CHANGED · socialCopy.landing.signedOutFine (Friend-Link)
//   was: "No account? The 99 is invite-only. Ask whoever sent this."
//   now: "No account? The 99 is invite-only. Ask whoever sent this to invite you."
export const signedOutFine = "No account? The 99 is invite-only. Ask whoever sent this to invite you.";
