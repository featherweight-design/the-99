// social-r1 · copy strings.ts. R1. PLACEHOLDERS: /copy-review sets the words.
// Target: a new src/lib/copy/social.ts, plus one row in the account menu (shellCopy.accountMenu).
// Reuse: the delete pane's Keep label is folderCopy.del.cancel ("Keep it"), shared by every delete pane.
// Names are display names (1 to 30 code points); pods are 1 to 40. No string here reaches a model.

const days = (x: number) => (x === 1 ? "1 day" : `${x} days`);
const members = (x: number) => (x === 1 ? "Just you" : `${x} members`);
const friends = (x: number) => (x === 1 ? "1 friend" : `${x} friends`);

export const socialCopy = {
  // The account menu row (popover and sheet), second, under About. Absent with the switch off.
  menu: { friends: "Friends" },

  page: {
    title: "Friends",
    // The head's name line. `name` is the viewer's own display name.
    nameLine: (name: string) => ({ before: "Friends see you as ", name, action: "Change" }),
    nameField: {
      label: "Your name, as friends see it",
      hint: "Up to 30 characters. Friends see only this.",
      save: "Save",
      cancel: "Cancel",
      failed: "We couldn’t save your name. Try again.", // toast, role alert
    },
    invite: "Invite a friend",
    invitePending: "Making a link…",
    // Held at MAX_OPEN_INVITES; the line under the held button, joined to it by aria-describedby.
    held: "10 links open, the most at once. Revoke one, or wait for one to be used.",
    // Receipt strip after Accept, role status, bare ✕ (aria-label "Close").
    accepted: (name: string) => `You and ${name} are friends.`,
    close: "Close",
  },

  friends: {
    head: (n: number) => `Friends · ${n}`,
    emptyTitle: "No friends yet",
    emptyBody: "Friends are added by invite only: send a link, or show its QR code at the table. Nobody can find you by name.",
    since: (date: string) => `since ${date}`, // "since today", "since Oct 2"
    menuAria: (name: string) => `${name} actions`,
    remove: "Remove friend",
    removeHeading: (name: string) => `Remove ${name}?`,
    // THE SENTENCE: unfriend removes each from the pods the other owns, and is silent.
    removeBody: (name: string) => `${name} leaves the pods you own, and you leave ${name}’s. ${name} isn’t told.`,
    removeConfirm: "Remove friend",
    removeFailed: "We couldn’t remove that friend. Try again.", // toast, role alert
  },

  pods: {
    head: (n: number) => `Pods · ${n}`,
    newPod: "New pod",
    emptyTitle: "No pods yet",
    emptyBody: "A pod is a group of friends you play with. You choose which pods can see your spare cards.",
    nameLabel: "Pod name",
    nameHint: "Up to 40 characters. You add friends to it next.",
    create: "Create",
    cancel: "Cancel",
    save: "Save",
    // The card's meta line.
    metaOwn: (n: number) => `${members(n)} · yours`,
    metaOther: (n: number, owner: string) => `${members(n)} · ${owner} owns it`,
    solo: "Just you so far. Add friends to play with.",
    you: "You",
    ownerTag: "owner",
    notFriendTag: "not a friend",
    removeMemberAria: (name: string, pod: string) => `Remove ${name} from ${pod}`,
    addFriends: "+ Add friends",
    share: "Share my spares with this pod",
    menuAria: (pod: string) => `${pod} actions`,
    rename: "Rename",
    leave: "Leave pod",
    del: "Delete pod",
    // Add friends (dialog at desktop, sheet at phone).
    addTitle: (pod: string) => `Add to ${pod}`,
    addSub: "Only your friends can be added. They aren’t told.",
    addConfirm: (n: number) => (n === 0 ? "Add friends" : `Add ${friends(n)}`), // held at 0
    addAllIn: "Every friend is already in this pod.",
    addNoFriends: "No friends to add yet. Invite one first.",
    // Confirms, in the shared delete pane.
    leaveHeading: (pod: string) => `Leave “${pod}”?`,
    leaveOwnerBody: (next: string) => `It passes to ${next}, its longest-standing member. Nobody is told.`,
    leaveMemberBody: (owner: string) => `Only ${owner} can add you back. Nobody is told.`,
    leaveLastBody: "You’re its last member, so leaving deletes it.",
    leaveConfirm: "Leave pod",
    leaveLastConfirm: "Leave and delete",
    delHeading: (pod: string) => `Delete “${pod}”?`,
    delBody: "No friendship changes, and nobody is told.",
    delConfirm: "Delete pod",
    failed: "We couldn’t change that pod. Try again.", // toast, role alert
  },

  invites: {
    head: (n: number) => `Open links · ${n}`,
    row: "Invite link",
    made: (when: string) => `made ${when}`, // "made today, 9:41 PM", "made Oct 9"
    // Time left, from expiresAt: whole days down to 1, then under a day (--warning).
    left: (msLeft: number) => {
      const d = Math.floor(msLeft / 86_400_000);
      return d >= 1 ? `${days(d)} left` : "Under a day left";
    },
    show: "Show",
    revoke: "Revoke",
    showAria: (made: string) => `Show the link made ${made}`,
    revokeAria: (made: string) => `Revoke the link made ${made}`,
    tooMany: "You have 10 links open. Revoke one to make another.", // toast, no retry
    createFailed: "We couldn’t make a link. Try again.", // toast, Try again
    retry: "Try again",
  },

  dialog: {
    title: "Invite a friend",
    sub: "Show this at the table, or send the link. Whoever opens it first can accept.",
    qrAria: "QR code for the invite link",
    qrCaption: "Scan with a phone camera",
    linkAria: "Invite link",
    copy: "Copy link",
    copied: "✓ Copied",
    share: "Share link", // phone, only where navigator.share exists
    shareText: "Add me as a friend on The 99",
    meta: (expires: string) => `Works once · expires ${expires}`, // "Thu, Oct 22"; under a day: "Fri, Oct 16, 9:12 PM"
    soon: "under a day left",
    nameLine: (name: string) => ({ before: "They’ll see you as ", name, action: "Change" }),
    close: "Close",
  },

  landing: {
    kicker: "Friend invite",
    signedOutTitle: "Someone sent you a friend invite",
    signedOutBody: "Sign in to see who it’s from and answer it.",
    signIn: "Sign in",
    signedOutFine: "No account? The 99 is invite-only. Ask whoever sent this.",
    openTitle: (name: string) => `${name} wants to be friends`,
    openBody: "Friends see each other’s display name and nothing else, until one of you shares more.",
    openName: (inviter: string, you: string) => ({ before: `${inviter} will see you as `, name: you, action: "Change" }),
    accept: "Accept",
    decline: "Decline",
    openFine: (name: string) => `${name} isn’t told if you decline.`,
    expiredTitle: "This invite has expired",
    expiredBody: "Invite links last 7 days. Ask for a new one.",
    // Redeemed, declined, revoked and not found: one card, no name.
    endedTitle: "This invite link no longer works",
    endedBody: "A link works once, and only until it expires or is taken back. Ask for a new one.",
    selfTitle: "This is your own invite link",
    selfBody: "Send it to the friend you want to add. It works once, for the first person who opens it.",
    alreadyTitle: (name: string) => `You and ${name} are already friends`,
    alreadyBody: "Nothing to accept. This link is used up now.", // opening it spent it (redeemInvite)
    declinedTitle: "Invite declined",
    declinedBody: (name: string) => `${name} isn’t told. The link no longer works.`,
    toFriends: "Go to Friends",
    toHome: "Go to Home",
    acceptFailed: "We couldn’t accept that invite. Try again.", // toast, Try again
    declineFailed: "We couldn’t decline that invite. Try again.",
  },
} as const;
