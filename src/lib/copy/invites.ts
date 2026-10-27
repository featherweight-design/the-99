// src/lib/copy/invites.ts: the sender's side of invites (plan `2026-10-16-invites.md`, PR 4): the count line, Add a
// friend's chooser, path 2 (the invite QR and the email form) and the invite QR's own screen. Taken from the handoff's
// `design/design_handoff_the99_invites/invites · copy strings.ts`. Three strings are LOCKED by the brief and not for
// review ("N invites left", "Out of invites", "Invitation sent"); every other string is new and owed to /copy-review.
// The newcomer's page (PR 5) and /admin (PR 6) add their strings with the PRs that draw them.

const left = (n: number) => (n === 1 ? "1 invite left" : `${n} invites left`);

export const inviteCopy = {
  // The count, wherever an invite can be sent: chooser card 2, path 2's sub, the QR screen and /friends' head.
  count: {
    /** LOCKED. */
    left,
    /** LOCKED. */
    out: "Out of invites",
    /** Appended after the count: "2 invites left · 1 waiting". (new, for /copy-review) */
    waiting: (n: number) => ` · ${n} waiting`,
    /** /friends and card 2, while a QR the sender closed is still live. (new, for /copy-review) */
    heldByQr: " · 1 held by an open QR",
    /** The QR's own screen, and path 2 while its QR is live. (new, for /copy-review) */
    heldByThisQr: " · 1 held by this QR",
  },

  // Add a friend: the chooser (A1 to A3, D1, D2). The dialog's title stays `socialCopy.dialog.title`.
  chooser: {
    /** (new, for /copy-review) */
    sub: "Already playing, or new to The 99? You choose; nobody is looked up.",
    /** (new, for /copy-review) */
    onTitle: "They’re on The 99",
    /** (new, for /copy-review) */
    onBody: "Send a friend link, or show its QR code. It works once and uses no invite.",
    /** Card 1's title while its link is being made: the head press's shipped words. */
    onPending: "Making a link…",
    /** (new, for /copy-review) */
    newTitle: "Invite someone new",
    /** (new, for /copy-review) */
    newBody: "For someone without an account. An invite is used only when they join.",
    /** The ‹ in a path's header, as its aria-label. (new, for /copy-review) */
    back: "Back",
  },

  // Path 2, both ways on one screen (A5, D4, E1 to E6).
  path: {
    /** (new, for /copy-review) */
    title: "Invite someone new",
    /** (new, for /copy-review) */
    tableKicker: "At the table",
    /** (new, for /copy-review) */
    tableBody: "They scan it and type their own email on their phone. It works once, for 15 minutes.",
    /** (new, for /copy-review) */
    showQr: "Show an invite QR",
    /** (new, for /copy-review) */
    or: "or",
    /** (new, for /copy-review) */
    emailKicker: "By email",
    /** (new, for /copy-review) */
    emailLabel: "Their email",
    /** (new, for /copy-review) */
    emailPlaceholder: "name@example.com",
    /** (new, for /copy-review) */
    send: "Send invitation",
    /** (new, for /copy-review) */
    sending: "Sending…",
    /** (new, for /copy-review) */
    emailHint: "The 99 emails them an invitation. If they join within 7 days, you’re friends.",
    /** The field's error, role alert: the address's shape only (E1). (new, for /copy-review) */
    notAnEmail: "Enter an email address, like name@example.com.",
    /** LOCKED. The one answer, whatever happened. */
    sent: "Invitation sent",
    /** (new, for /copy-review) */
    sentBody: "If they join within 7 days, you’re friends. Until then it holds one of your invites.",
    /** (new, for /copy-review) */
    again: "Invite someone else",
    /** (new, for /copy-review) */
    lastOne: "That was your last invite.",
    /** Toast, with Try again: a failure before anything was sent (E6). (new, for /copy-review) */
    sendFailed: "We couldn’t send that invitation. Try again.",
    /** (new, for /copy-review) */
    retry: "Try again",
  },

  // The invite QR, the sender's side (Q1 to Q5).
  qr: {
    /** (new, for /copy-review) */
    aria: "Invite QR code",
    /** Desktop only. (new, for /copy-review) */
    caption: "Scan with a phone camera",
    /** After the m:ss timer: "14:52 left". (new, for /copy-review) */
    left: "left",
    /** (new, for /copy-review) */
    meta: "Works once · holds 1 invite until it’s used or runs out",
    /** (new, for /copy-review) */
    done: "Done",
    /** Drawn uppercase; spoken as `expiredAria`. (new, for /copy-review) */
    expiredChip: "EXPIRED",
    /** (new, for /copy-review) */
    expiredAria: "Expired",
    /** (new, for /copy-review) */
    expiredBody: "This QR ran out before anyone used it. Its invite is back.",
    /** (new, for /copy-review) */
    makeNew: "Make a new QR",
    /** Under "Invitation sent", once the newcomer claimed it. (new, for /copy-review) */
    claimedBody: "They’re finishing on their phone. If they join, you’re friends.",
    /** Toast, with Try again. (new, for /copy-review) */
    createFailed: "We couldn’t make an invite QR. Try again.",
    /** The word on the claimed screen's card back. (new, for /copy-review) */
    cardBack: "INVITATION",
  },
} as const;
