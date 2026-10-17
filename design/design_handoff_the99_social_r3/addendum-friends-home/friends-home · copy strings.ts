// friends-home · copy strings.ts. Social R3 addendum R1 (Friends on Home, and the checklist row).
// PLACEHOLDERS: /copy-review sets the words.
// Target: additions to src/lib/copy/social.ts (socialCopy.home, socialCopy.checklist). Strings already shipped are
// reused by reference and not repeated: page.invite ("Add a friend"), page.invitePending, page.accepted(name),
// invites.left(ms), invites.show, invites.tooMany, friends.openAria(name).

const friendsCount = (n: number) => (n === 1 ? "1 friend" : `${n} friends`);
const links = (n: number) => (n === 1 ? "Friend link open" : `${n} friend links open`);

export const friendsHomeCopy = {
  // ── Home: the Friends section (dashboard, right column at 1180+, after Ready to build at 390) ──
  home: {
    // Mono label, drawn uppercase by CSS. The count only with friends.
    head: "Friends",
    headCount: (n: number) => `Friends · ${n}`,
    all: "All friends", // the › is drawn
    you: "You", // under your own face, no-friends state only
    // The no-friends line. G5: the second sentence follows SOCIAL_GAMES_ENABLED and spares.
    invite: "Add the people you play with.",
    inviteMore: "Seat them when you log a game, and see their spares when you shop.",
    more: (n: number) => `+${n}`, // the overflow slot, aria-hidden
    moreSub: "more",
    // The open-link line: `${links(n)} · ${invites.left(ms)}`, then Show (one link) or seeAll (two or more).
    links,
    seeAll: "See them", // the › is drawn; to /friends
  },

  // ── The first-run checklist's Friends row (after step 3, unnumbered) ──
  checklist: {
    title: "Add your friends",
    body: "Any time, cards or not. A friend joins from a link you send.",
    // With a link open the body is `${home.links(1)} · ${invites.left(ms)}` and the trailing press reads invites.show.
    rowAria: (left: string) => `Add your friends. Friend link open, ${left}. Show the link`,
    doneTitle: "Friends",
    doneOne: (name: string) => `You and ${name} are friends.`, // = page.accepted(name)
    doneMany: (n: number) => `You have ${friendsCount(n)}.`,
    doneAria: (line: string) => `Friends. ${line} Open Friends`,
  },
};
