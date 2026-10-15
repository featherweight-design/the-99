// Social R1 (friends and pods): copy. Taken from the handoff's `social-r1 · copy strings.ts` (R2), after
// /copy-review. PR B brought the menu row, the title and the signed-out card; PR C1 the head (the name line and
// its field), the modals' Close and the commander picker. The friends list, the open links and the Add a friend
// dialog arrive with PR C2, the request card with PR D (`landing`) and the pods with PR E (`pods`).

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
      hint: "Up to 30 characters. Friends see this and your commander.",
      save: "Save",
      cancel: "Cancel",
      failed: "We couldn’t save your name. Try again.", // toast, role alert
    },
    // The modals' bare ✕ (aria-label "Close").
    close: "Close",
  },

  // R2: the signature commander, set in the head of /friends only.
  commander: {
    choose: "Choose your commander", // the line's press and the empty tile's aria-label
    changeAria: (commander: string) => `Your commander: ${commander}. Change`,
    title: "Your commander",
    sub: "Friends see its art beside your name. Any commander, owned or not.",
    search: "Search commanders",
    fromDecks: "From your decks",
    savedNote: "Saved as soon as you pick one.",
    anyNote: "Any commander in the catalog, owned or not.",
    clear: "Use initials instead",
    noResults: (q: string) => `No commander matches “${q}”.`,
    // Not drawn by the boards (E15): a search that failed, in the list's place, role alert. Typing asks again.
    searchFailed: "We couldn’t search commanders. Try again.",
    /** Spoken beside a colorless commander's pips, which carry color alone. */
    colorless: "Colorless",
    failed: "We couldn’t save your commander. Try again.", // toast, role alert
  },

  // The request card at /friend/[token] (PR D).
  landing: {
    kicker: "Friend request", // also the card back's word, drawn uppercase by CSS
    // The signed-out kicker at desktop, in the accent: the landing's own mark (R1 decision 8).
    brand: "The Ninety-Nine",
    signedOutTitle: "Someone sent you a friend request",
    signedOutBody: "Sign in to turn the card over and see who it’s from.",
    signIn: "Sign in",
    signedOutFine: "No account? The 99 is invite-only. Ask whoever sent this.",
    openTitle: (name: string) => `${name} wants to be friends`,
    // The card's text box (rules text), not a paragraph beside it.
    openRules: (name: string) => `When you accept, you and ${name} become friends. Each of you sees the other’s name and commander, and nothing else until one of you shares more.`,
    typeRequest: "Friend request",
    typeOwn: "Your friend link",
    typeFriend: (since: string) => `Friend · since ${since}`,
    ownRules: "This is what a friend sees when they open your link: your name, your commander, and an Accept.",
    friendRules: (name: string) => `You and ${name} are friends. Each of you sees the other’s name and commander.`,
    credit: (commander: string) => `Art · ${commander}`, // drawn uppercase by CSS
    noCommander: "No commander chosen",
    mark: "The 99", // the card's footer, right; drawn uppercase by CSS
    cardAria: (name: string, commander: string | null, type: string) => `${name}${commander ? `, ${commander}` : ""}. ${type}`,
    accept: "Accept",
    decline: "Decline",
    openFine: (name: string) => `${name} isn’t told if you decline.`,
    expiredTitle: "This friend link has expired",
    expiredBody: "Friend links last 7 days. Ask for a new one.",
    // Redeemed, declined, revoked and not found: one card, no name.
    endedTitle: "This friend link no longer works",
    endedBody: "A friend link works once, and only until it expires or is taken back. Ask for a new one.",
    selfTitle: "This is your own friend link",
    // C2: accepting spends a link, opening it does not.
    selfBody: "Send it to the friend you want to add. It works once, for the first person who accepts it.",
    copyLink: "Copy link",
    copied: "✓ Copied",
    copyFailed: "We couldn’t copy the link. Copy it from the address bar.", // toast, no retry
    alreadyTitle: (name: string) => `You and ${name} are already friends`,
    alreadyBody: "Nothing to accept. This link is used up now.", // opening it spent it (SpendFriendLink)
    declinedTitle: "Request declined",
    declinedBody: (name: string) => `${name} isn’t told. The link no longer works.`,
    toFriends: "Go to Friends",
    toHome: "Go to Home",
    acceptFailed: "We couldn’t accept that friend request. Try again.", // toast, Try again
    declineFailed: "We couldn’t decline that friend request. Try again.", // toast, Try again
    retry: "Try again",
  },
  // Pods on /friends (PR E1: the table; E2 adds the header menu). Taken from the handoff's `pods.*`.
  pods: {
    head: (n: number) => `Pods · ${n}`,
    newPod: "New pod",
    emptyTitle: "No pods yet",
    emptyBody: "A pod is a group of friends you play with. You choose which pods can see your spare cards.",
    nameLabel: "Pod name",
    nameHint: "Up to 40 characters. You add friends to it next.",
    create: "Create",
    cancel: "Cancel",
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
    // Add friends (dialog at desktop, sheet at phone).
    addTitle: (pod: string) => `Add to ${pod}`,
    addSub: "Only your friends can be added. They aren’t told.",
    addConfirm: (n: number) => (n === 0 ? "Add friends" : `Add ${friends(n)}`), // held at 0
    addAllIn: "Every friend is already in this pod.",
    addNoFriends: "No friends to add yet. Add one first.",
    failed: "We couldn’t change that pod. Try again.", // toast, role alert
  },
} as const;
