// Social R1 (friends and pods): copy. Taken from the handoff's `social-r1 · copy strings.ts` (R2), after
// /copy-review. PR B brought the menu row, the title and the signed-out card; PR C1 the head (the name line and
// its field), the modals' Close and the commander picker. The friends list, the open links and the Add a friend
// dialog arrive with PR C2, the request card with PR D (`landing`) and the pods with PR E (`pods`).

const members = (x: number) => (x === 1 ? "Just you" : `${x} members`);
const friends = (x: number) => (x === 1 ? "1 friend" : `${x} friends`);

const days = (x: number) => (x === 1 ? "1 day" : `${x} days`);

export const socialCopy = {
  // Friends on Home (Social R3 addendum, handoff `addendum-friends-home`; /copy-review 2026-10-16). Shipped strings are
  // reused rather than repeated: page.invite, page.invitePending, page.accepted(name), invites.left(ms), invites.show,
  // invites.tooMany, friends.openAria(name).
  home: {
    /** The mono label, drawn uppercase by CSS. */
    head: "Friends",
    /** After `head`, in its own tracking: how many friends. */
    headCount: (n: number) => `· ${n}`,
    all: "All friends", // the › is drawn
    you: "You", // under your own face, in the no-friends state only
    invite: "Add the people you play with.",
    /** G5: the line's second sentence names Opponents only while SOCIAL_GAMES_ENABLED is on. */
    inviteMore: (games: boolean) =>
      games ? "Seat them when you log a game, and see their spares when you shop." : "See their spares when you shop.",
    more: (n: number) => `+${n}`, // the overflow slot, aria-hidden
    moreSub: "more",
    links: (n: number) => (n === 1 ? "Friend link open" : `${n} friend links open`),
    seeAll: "See them", // the › is drawn; to /friends
  },
  // The first-run checklist's Friends row (Discovery R3·3; addendum-friends-home §3; /copy-review 2026-10-17): last,
  // under step 3, never numbered. Shipped strings reused: home.links(1), invites.left(ms), invites.show, page.accepted.
  checklist: {
    title: "Add your friends",
    body: "Any time, cards or not. A friend joins from a link you send.",
    /** C2: the row's press is Show. `left` is `invites.left(ms)`, lower-cased here because it sits mid-sentence. */
    rowAria: (left: string) => `Add your friends. Friend link open, ${left.charAt(0).toLowerCase()}${left.slice(1)}. Show the link`,
    doneTitle: "Friends",
    /** C3 at more than one friend; at one it is `page.accepted(name)`. */
    doneMany: (n: number) => `You have ${friends(n)}.`,
    doneAria: (line: string) => `Friends. ${line} Open Friends`,
  },
  // The account menu row (popover and sheet), second, under About. Absent with the switch off.
  menu: { friends: "Friends" },

  page: {
    title: "Friends",
    // The head's name line. `name` is the viewer's own display name.
    nameLine: (name: string) => ({ before: "Friends see you as ", name, action: "Change" }),
    // The privacy line (menu and Home PR 7, G4): what a friend's Decks tab shows of yours. Undrawn; words through /copy-review.
    decksSeen: "Friends see your deck names, commanders and statuses, never the lists.",
    // With friend decks on (`FRIEND_DECKS_ENABLED`), the line follows the reader's own two Settings rules, and
    // `settings` is drawn as a link to /settings. Passed /copy-review.
    decksSeenBy: {
      finished: "Friends can see your decks and their lists, except drafts and decks you’re building.",
      all: "Friends can see all your decks and their lists.",
      none: "Friends can’t see your decks.",
      change: "Change this in",
      settings: "Settings",
    },
    nameField: {
      label: "Your name, as friends see it",
      hint: "Up to 30 characters. Friends see this and your commander.",
      // With the signature card on (handoff 20, call 1): the face is named a signature card, not a commander.
      hintSignature: "Up to 30 characters. Friends see this and your signature card.",
      save: "Save",
      cancel: "Cancel",
      failed: "We couldn’t save your name. Try again.", // toast, role alert
    },
    invite: "Add a friend",
    invitePending: "Making a link…",
    // Held at MAX_OPEN_INVITES; the line under the held button, joined to it by aria-describedby.
    held: "10 friend links open, the most at once. Revoke one, or wait for one to be used.",
    // Receipt strip after Accept, role status, bare ✕ (aria-label "Close").
    accepted: (name: string) => `You and ${name} are friends.`,
    close: "Close",
  },

  friends: {
    head: (n: number) => `Friends · ${n}`,
    emptyTitle: "No friends yet",
    emptyBody: "Friends are added by friend link only: send one, or show its QR code at the table. Nobody can find you by name.",
    since: (date: string) => `since ${date}`, // "since today", "since Oct 2"
    today: "today",
    yesterday: "yesterday",
    menuAria: (name: string) => `${name} actions`,
    remove: "Remove friend",
    removeHeading: (name: string) => `Remove ${name}?`,
    // THE SENTENCE: unfriend removes each from the pods the other owns, and is silent.
    removeBody: (name: string) => `${name} leaves the pods you own, and you leave ${name}’s. ${name} isn’t told.`,
    removeConfirm: "Remove friend",
    removeFailed: "We couldn’t remove that friend. Try again.", // toast, role alert
    // The row's link to the friend's page (R2 P1), spoken; the › itself is drawn.
    openAria: (name: string) => `${name}’s page`,
  },

  // A friend's page, `/friends/[publicId]` (Social R2 P2, P3; handoff `social-r2 · copy strings.ts` friend block).
  friendPage: {
    back: "‹ Friends",
    since: (since: string) => `Friend ${since}`, // `since` is friends.since's "since Oct 2"
    head: (name: string) => `${name}’s wishlist`,
    viewOnly: "view only",
    emptyTitle: (name: string) => `${name}’s wishlist is empty`,
    emptyBody: (name: string) => `When ${name} adds a card, it shows here with how many they want until they have them.`,
    // The strip under a friend's head (menu and Home, PR 7). Placeholder words, for /copy-review.
    tabsAria: "Friend sections",
    tabs: { spares: "Spares", wishlist: "Wishlist", decks: "Decks" },
    spares: {
      /** The line under the strip: where the share reaches the viewer, and the order. */
      /** `wishlist`: the reader's wishlist is on, so their cards come first and are marked. */
      line: (pods: readonly string[], wishlist: boolean) =>
        `Shared with ${pods.join(", ")}.${wishlist ? " Cards on your wishlist first." : ""}`,
      count: (n: number) => (n === 1 ? "1 spare" : `${n} spares`),
      onWishlist: "on your wishlist",
      /** Appended to the line with spare requests on (signature card call 8): a tile press opens the card's modal, with Ask. */
      pressToAsk: " Press one to ask for it.",
      /** A landing on a spare the friend no longer offers (call 9): the shared toast, and no modal. */
      gone: (name: string, card: string) => `${name} no longer has a spare ${card}.`,
      emptyTitle: (name: string) => `${name} has no spares to show`,
      emptyBody: (name: string) => `When ${name} has a copy no deck of theirs is asking for, it shows here.`,
      noneTitle: (name: string) => `${name} isn’t sharing spares with you`,
      noneBody: (name: string) => `Spares show here when ${name} shares them with a pod you’re both in.`,
    },
    decks: {
      line: (name: string) => `View only. ${name}’s committed decks and drafts, newest first.`,
      figure: (built: number, bodySize: number, toBuy: number) =>
        toBuy > 0 ? `${built} / ${bodySize} · ${toBuy} ${toBuy === 1 ? "card" : "cards"}` : `${built} / ${bodySize}`,
      emptyTitle: (name: string) => `${name} has no decks yet`,
      emptyBody: (name: string) => `A deck ${name} builds shows here, as a name, a commander and a status.`,
      // Friend decks (handoff call 6, States): every tile opens the deck, and the tile shows a count, never a status.
      // Passed /copy-review: the head names the friend and the strip names the tab, so the line says only the order and the press.
      lineOpen: "Newest first. Open one to see its list.",
      emptyBodyOpen: (name: string) => `A deck ${name} shares shows here, with its whole list.`,
      /** The tile's press, named with what the tile shows, in its order. */
      tileAria: (deck: string, commander: string | null, colour: string, cards: string) =>
        [deck, commander, colour, cards].filter(Boolean).join(", "),
    },
  },

  // Hidden from friends (friend decks handoff, README 4 and 4b): the deck ⋯ menu's row, the header's mark, the /decks
  // tile's glyph and its key. Passed /copy-review.
  hideDeck: {
    row: "Hidden from friends",
    /** Under a row the owner's Settings rules already tick; the `›` is drawn apart, hidden from a screen reader. */
    locked: "Set in Settings",
    lockedAria: "Hidden from friends, set in Settings. Open Settings",
    failed: "We couldn’t change that. Your deck is unchanged.", // toast, role alert
    mark: "Hidden from friends",
    /** The /decks key's word, and what the tile's name says after its status. */
    key: "hidden from friends",
  },

  // A friend's deck, opened read-only (friend decks handoff, board 1 and States). The own band, the shared-deck lines,
  // the group notes and the basics line are the precon page's own words (`preconsCopy`). Passed /copy-review.
  friendDeck: {
    back: (name: string) => `‹ ${name}’s decks`,
    eyebrow: (name: string) => `${name}’s deck · read-only`,
    cards: (count: number) => (count === 1 ? "1 card" : `${count.toLocaleString("en-US")} cards`),
    listNote: "By type, A–Z within each group · press a card for its details, hover for its art",
    listNoteCard: "By type, A–Z within each group · press a card for its details",
    keyLead: "Your collection",
    keyOwned: "you own it",
    keyNotOwned: "you don’t",
    keyAria: "What the dots mean",
    emptyTitle: (name: string) => `${name} hasn’t added cards yet`,
    // The Commander group sits directly above, so the body does not name the commander again (copy-review).
    emptyBody: (name: string) => `The list shows here as ${name} builds it.`,
  },

  // `/friends`' Waiting on you (menu and Home PR 7, board `Friends` 2a to 2c). Placeholder words, for /copy-review.
  waiting: {
    /** The mono section head, drawn uppercase by CSS; `n` is every row the section shows. */
    head: (n: number) => `Waiting on you · ${n}`,
    kind: { "spare-request": "Spare request", "trade-match": "Trade match" },
    /** For a screen reader, beside the unseen diamond. */
    unseen: "new",
    tradeTitle: (friend: string, card: string) => `${friend} has a spare ${card}`,
    tradeDetail: (friend: string, pods: readonly string[]) => `It’s on your wishlist. ${friend} shares spares with ${pods.join(", ")}.`,
    /** The link to the friend's Spares tab; the board's trailing `›` is drawn apart, hidden from a screen reader. */
    seeSpares: (friend: string) => `See ${friend}’s spares`,
    /** With spare requests on, the link opens that card's spares sheet with Ask (signature card call 9). */
    askFriend: (friend: string) => `Ask ${friend}`,
  },

  invites: {
    head: (n: number) => `Open friend links · ${n}`,
    row: "Friend link",
    made: (when: string) => `made ${when}`, // "made today, 9:41 PM", "made Oct 9"
    // Time left, from expiresAt: whole days down to 1, then under a day (--warning). Rounded, so a link made a
    // moment ago reads `7 days left`, as the boards draw it, rather than six and a fraction floored to 6.
    left: (msLeft: number) => {
      if (msLeft < 86_400_000) return "Under a day left";
      return `${days(Math.round(msLeft / 86_400_000))} left`;
    },
    show: "Show",
    revoke: "Revoke",
    showAria: (made: string) => `Show the link made ${made}`,
    revokeAria: (made: string) => `Revoke the link made ${made}`,
    tooMany: "You have 10 friend links open. Revoke one to make another.", // toast, no retry
    createFailed: "We couldn’t make a friend link. Try again.", // toast, Try again
    revokeFailed: "We couldn’t revoke that link. Try again.", // toast, role alert; the row comes back
    retry: "Try again",
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

  // The signature card (avatar handoff 20, `SIGNATURE_CARD_ENABLED`): the face as any card in any printing. Drawn in
  // place of `commander` while the switch is on; `commander` is what ships with it off.
  signature: {
    choose: "Choose your signature card", // the head's press, the empty tile's aria-label, and the ask's
    changeAria: (card: string) => `Your signature card: ${card}. Change`,
    title: "Your signature card",
    sub: "Friends see its art beside your name. Any card, any printing, owned or not.",
    search: "Search cards",
    anyNote: "Any card in the catalog, owned or not.",
    noResults: (q: string) => `No card matches “${q}”.`,
    // Not drawn (as E15): a search that failed, in the list's place, role alert. Typing asks again.
    searchFailed: "We couldn’t search cards. Try again.",
    /** A result with more than one printing: its trailing `N printings ›`, the chevron drawn apart. */
    printings: (n: number) => `${n} printings`,
    /** The same row, spoken: it opens a screen rather than saving. */
    printingsAria: (card: string, n: number) => `${card}, ${n} printings. Choose one`,
    /** A row or tile whose save is in flight. */
    saving: "Saving",
    back: "Back",
    printingsSub: (n: number) => `${n} printings. Press one to use its art.`,
    previewNote: "Friends see this, cropped to its art.",
    previewSaving: "Saving…",
    previewNow: "What friends see now.",
    usualArt: "Usual art",
    /** The preview's printing line: "Eternal Masters · EMA". */
    previewLine: (set: string, code: string) => `${set} · ${code}`,
    setSearch: "Search sets, codes or numbers",
    setNoResults: (q: string) => `No printing matches “${q}”.`,
    /** A printing tile's name, spoken: set, code and collector number, so two printings of one set differ. */
    tileName: (set: string, code: string, number: string) => (number ? `${set} ${code} #${number}` : `${set} ${code}`),
    /** A tile, spoken: its name, and whether it is the face now. */
    tileAria: (name: string, current: boolean) => (current ? `${name}, your signature card now` : name),
    /** P8: a pick that can no longer be drawn (its printing lost its art), on that card's printing screen only. */
    gone: "The printing you picked can’t be shown now, so friends see the usual art. Pick another any time.",
    // Not drawn: a card's printings that could not be read, in the grid's place, role alert. ‹ goes back.
    printingsFailed: "We couldn’t load its printings. Go back and try again.",
    failed: "We couldn’t save your signature card. Try again.", // toast, role alert
    // Asked once (calls 4, 5): Home's first-run row and its strip. The row's title and the strip's link are `choose`.
    rowSub: "Any card, any printing. Friends see its art beside your name.",
    skip: "Skip",
    skipAria: "Skip choosing a signature card",
    /** The row once picked: the title is `title`, the line names the card. */
    doneLine: (card: string) => `${card}. Change it any time on Friends.`,
    doneAria: (card: string) => `Your signature card: ${card}. Change it any time on Friends`,
    stripLead: "Friends see your initials.",
    stripRegion: "Your signature card",
    stripDismiss: "Don’t ask again",
  },

  dialog: {
    title: "Add a friend",
    // C2 (copy review): opening a link does not spend it; accepting does.
    sub: "Show this at the table, or send the link. The first person to accept it becomes your friend.",
    qrAria: "QR code for the friend link",
    qrCaption: "Scan with a phone camera",
    linkAria: "Friend link",
    copy: "Copy link",
    copied: "✓ Copied",
    share: "Share link", // phone, only where navigator.share exists
    shareText: "Add me as a friend on The 99",
    meta: (expires: string) => `Works once · expires ${expires}`, // "Thu, Oct 22"; under a day: "Fri, Oct 16, 9:12 PM"
    soon: "under a day left",
    close: "Close",
  },

  // The request card at /friend/[token] (PR D).
  landing: {
    kicker: "Friend request", // also the card back's word, drawn uppercase by CSS
    // The signed-out kicker at desktop, in the accent: the landing's own mark (R1 decision 8).
    brand: "The Ninety-Nine",
    signedOutTitle: "Someone sent you a friend request",
    signedOutBody: "Sign in to turn the card over and see who it’s from.",
    signIn: "Sign in",
    signedOutFine: "No account? The 99 is invite-only. Ask whoever sent this to invite you.",
    openTitle: (name: string) => `${name} wants to be friends`,
    // The card's text box (rules text), not a paragraph beside it.
    openRules: (name: string) => `When you accept, you and ${name} become friends. Each of you sees the other’s name and commander, and nothing else until one of you shares more.`,
    typeRequest: "Friend request",
    typeOwn: "Your friend link",
    typeFriend: (since: string) => `Friend · since ${since}`,
    ownRules: "This is what a friend sees when they open your link: your name, your commander, and an Accept.",
    friendRules: (name: string) => `You and ${name} are friends. Each of you sees the other’s name and commander.`,
    // With the signature card on (handoff 20, call 1), the three rules and the empty credit name the face as it is.
    openRulesSignature: (name: string) => `When you accept, you and ${name} become friends. Each of you sees the other’s name and signature card, and nothing else until one of you shares more.`,
    ownRulesSignature: "This is what a friend sees when they open your link: your name, your signature card, and an Accept.",
    friendRulesSignature: (name: string) => `You and ${name} are friends. Each of you sees the other’s name and signature card.`,
    noSignature: "No signature card chosen",
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
    // Ticked past the batch cap (ADD_MEMBERS_MAX): the button holds and this says why.
    addMax: (max: number) => `You can add up to ${max} at a time.`,
    failed: "We couldn’t change that pod. Try again.", // toast, role alert
    // The header's `…` menu (E2). Rename is the owner's alone; everyone can leave.
    save: "Save",
    menuAria: (pod: string) => `${pod} actions`,
    rename: "Rename",
    leave: "Leave pod",
    del: "Delete pod",
    leaveHeading: (pod: string) => `Leave “${pod}”?`,
    leaveOwnerBody: (next: string) => `It passes to ${next}, its longest-standing member. Nobody is told.`,
    leaveMemberBody: (owner: string) => `Only ${owner} can add you back. Nobody is told.`,
    // The owner adds only their own friends, so a member who is not theirs (after a hand-on) needs that first (C1).
    leaveMemberStrangerBody: (owner: string) => `Only ${owner} can add you back, once you’re friends. Nobody is told.`,
    leaveLastBody: "You’re its last member, so leaving deletes it.",
    leaveConfirm: "Leave pod",
    leaveLastConfirm: "Leave and delete",
    delHeading: (pod: string) => `Delete “${pod}”?`,
    delBody: "No friendship changes, and nobody is told.",
    delConfirm: "Delete pod",
  },
} as const;

const spares = (x: number) => (x === 1 ? "1 spare" : `${x} spares`);

/**
 * Friends' spares in the stand-ins modal (Social R2 PR 8a; handoff `social-r2 · copy strings.ts` `spareCopy`,
 * frames S3 and O1 to O3). The modal's title is `modalTitleBoth` with spares and stand-ins, `modalTitleSpares`
 * with spares alone, and the shipped `Cheaper stand-ins` otherwise.
 */
export const spareCopy = {
  modalTitleBoth: "Before you buy",
  modalTitleSpares: "Friends with a spare",
  close: "Close",
  /** The section's head: the title's words and how many friends have one. */
  section: (n: number) => `Friends with a spare · ${n}`,
  /** Beside the head: nothing here can be taken or asked for in the app (Q3). */
  viewOnly: "view only",
  /** The pods a friend's share reaches the reader through, listed as `shares with A and B`. */
  via: (pods: readonly string[]) => `shares with ${new Intl.ListFormat("en-US", { type: "conjunction" }).format(pods)}`,
  count: (n: number) => spares(n),
  foot: "A spare is a copy none of their decks uses, drafts included. Reach out to offer a trade or bargain your prized family goat, and it’s yours!",
  /** The Shopping key's item, beside the press's spare glyph, at both widths (S2). */
  key: "friend has a spare",
  /** The other-ways press holding the spare glyph alone, on any row the deck is buying; it opens that card's modal. */
  markerAria: (card: string) => `Friends with a spare of ${card}`,
  /** The row's one press when it holds both ⇄ and a friend's spare (#1875). */
  pressBothAria: (card: string, limit: string) => `Cheaper stand-ins and friends with a spare of ${card}, over your ${limit} limit`,
  /** The spares-only modal's Replacing box: no deck line, since it can open where no one deck is meant (the cart). */
  replacing: "replacing",
  /**
   * Spare requests in the same modal and on the same row (plan `2026-10-22-spare-requests.md` PR 3b; handoff
   * `design_handoff_the99_spare_requests`, `Shopping` and `Asker-States`, calls 4 and 6). Placeholders for
   * `/copy-review`. Marks and statuses say Requested, Accepted, Declined; never Rejected.
   */
  request: {
    ask: "Ask",
    askInstead: "Ask instead",
    askAgain: "Ask again",
    requested: "Requested",
    accepted: "Accepted",
    declined: "Declined",
    /** The friend row's one sub line: the spare count, then the pods (or the ask's days, or its expiry). */
    count: (n: number) => spares(n),
    pods: (pods: readonly string[]) => pods.join(", "),
    daysLeft: (n: number) => (n === 1 ? "1 day left" : `${n} days left`),
    noAnswer: (days: number) => `no answer in ${days} days`,
    askAria: (friend: string, card: string) => `Ask ${friend} for ${card}`,
    askInsteadAria: (friend: string, card: string) => `Ask ${friend} for ${card} instead`,
    askAgainAria: (friend: string, card: string) => `Ask ${friend} for ${card} again`,
    /** The ⓘ beside the section head: the old foot line, cut to one tooltip (call 6). */
    tipLabel: "What a spare is",
    tip: "Copies none of their decks use. Ask, and they answer yes or no. The trade (or the goat) is between you.",
    /** The one state sentence under the rows, for the state the rows are in. */
    oneAtATime: (from: string) => `One request at a time. Ask instead moves it from ${from}.`,
    whenYours: "When it’s yours, press buy on the row.",
    /** `whenYours` where the row has no buy press (`SHOPPING_MARK_BOUGHT_ENABLED` off): the collection takes it by hand. */
    whenYoursNoBuy: "When it’s yours, add it to your collection.",
    nobodyElse: "Nobody else you know has a spare.",
    /** The shared toast on a failed Ask, Ask instead, Ask again, Yes, No or ✕ (G5); the row is left as it was. */
    failed: "We couldn’t send that. Try again.",
    /** The Shopping key's items, after `friend has a spare`, each only while a row draws it (call 4). */
    keyRequested: "requested",
    keyAccepted: "accepted",
    /** The row press's name, with the glyph's mark. */
    markAria: (base: string, mark: "requested" | "accepted") => `${base}, ${mark}`,
    /**
     * The holder's side (PR 3d; board `Friend-Side`, call 8): the ask as a Waiting on you row and Home's lead story,
     * with Yes and No and the days left, and the receipt the row turns into for the visit. The title is the feed's
     * own (`feedCopy.home.title.spareRequest`).
     */
    /** "You have 2 spare. Peter wants 1 for Dragons of Tarkir."; the deck clause only when the ask names one. */
    incomingDetail: (spare: number, friend: string, copies: number, deck: string | null) =>
      `You have ${spare} spare. ${friend} wants ${copies}${deck ? ` for ${deck}` : ""}.`,
    yes: "Yes",
    no: "No",
    yesAria: (friend: string, card: string) => `Yes, spare ${card} for ${friend}`,
    noAria: (friend: string, card: string) => `No, don’t spare ${card} for ${friend}`,
    /** The receipt's kicker, drawn uppercase by CSS. */
    receiptKind: { yes: "Spare request · accepted", no: "Spare request · declined" },
    sparing: (card: string, friend: string) => `You’re sparing ${card} for ${friend}`,
    sparingDetail: (friend: string, card: string) =>
      `${friend}’s been told. Hand ${card} over when you meet; your collection stays as it is until you change it.`,
    keeping: (card: string) => `You’re keeping ${card}`,
    keepingDetail: (friend: string) => `${friend}’s been told.`,
    /**
     * The asker's side (PR 3d; board `Asker-States`, call 7): Your requests on `/friends`, in the feed's rows. The
     * kicker names the state (uppercase by CSS); No longer spare and No longer needed are copy only on the board.
     */
    mine: {
      head: (n: number) => `Your requests · ${n}`,
      order: "newest first",
      kind: {
        open: "Requested",
        yes: "Accepted",
        no: "Declined",
        expired: "No answer",
        unavailable: "No longer spare",
        unneeded: "No longer needed",
      },
      asked: (friend: string, card: string) => `You asked ${friend} for ${card}`,
      /** "For Thopter Works · 12 days left"; the days alone with no deck. */
      openDetail: (deck: string | null, days: string) => (deck ? `For ${deck} · ${days}` : days),
      canSpare: (friend: string, card: string) => `${friend} can spare ${card}`,
      acceptedDetail: "The handover is between you. Once it’s yours, press buy on it in Shopping.",
      /** `acceptedDetail` with no buy press (`SHOPPING_MARK_BOUGHT_ENABLED` off): the collection takes it by hand. */
      acceptedDetailNoBuy: "The handover is between you. Once it’s yours, add it to your collection.",
      keeping: (friend: string, card: string) => `${friend} is keeping ${card}`,
      nobodyElse: "Nobody else you know has a spare of it.",
      /** After a No, when other friends offer the card: the first by spares, and how many more. */
      othersHave: (first: string, more: number) =>
        more === 0 ? `${first} has a spare too.` : `${first} and ${more} more have a spare too.`,
      noAnswer: (friend: string, card: string) => `${friend} didn’t answer about ${card}`,
      noAnswerDetail: (days: number, deck: string | null) => `Requested ${days} days ago${deck ? `, for ${deck}` : ""}.`,
      noLongerSpare: (friend: string, card: string) => `${friend} no longer has a spare ${card}`,
      noLongerSpareDetail: "Your request is still open. ✕ withdraws it.",
      noLongerNeededDetail: "It’s off your buy lists now. ✕ withdraws the request.",
      withdrawAria: (friend: string, card: string) => `Withdraw your request to ${friend} for ${card}`,
      clearAria: (friend: string, card: string) => `Clear your request to ${friend} for ${card}`,
    },
  },
} as const;
