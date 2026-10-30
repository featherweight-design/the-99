// Flyer trial R1b (approved 2026-10-30). Every string is new and owed to /copy-review, except the flyer's Fan Content
// passage, which is `fanContentNotice.passageOne` verbatim (locked). "The 99" keeps The and 99 on one line.

export const flyerCopy = {
  kicker: "Magic: The Gathering · Commander",
  pitch: "Build Commander decks from the cards you already own.",
  sub: "We’re looking for players to try it before it launches. Scan, sign up, tell us what you think.",
  scan: "Scan to join",
  orType: "or type",
  facts: ["Free to try", "3 invites for your pod", "the-99.dev"],
} as const;

export const flyerJoinCopy = {
  cardName: "The 99",
  cardType: "Invitation",
  cardRules: "Join before launch, with 3 invites of your own for your pod.",
  cardCredit: "From a flyer",
  title: "Try The 99 before it launches",
  // body: the shipped joinCopy.body
  fine: "You start with 15 welcome credits and 3 invites for your friends.",
  okBody: "Now make your account. You’ll start with 15 welcome credits and 3 invites.",
  fullTitle: "This flyer’s spots are all taken",
  revokedTitle: "This flyer has ended",
  listBody: "The 99 opens to everyone soon. Leave your email and we’ll tell you when it does.",
  listPress: "Tell me at launch",
  listedTitle: "You’re on the list",
  listedBody: (email: string) => `We’ll email ${email} the day The 99 opens to everyone.`,
  launchedTitle: "The 99 is open to everyone now",
  launchedBody: "Flyer codes have retired. Make your account the usual way.",
  launchedPress: "Make your account",
} as const;

export const flyerAdminCopy = {
  section: "Flyer codes",
  meta: (live: number, left: number, listed: number) => `${live} live · from your invites, ${left} left · ${listed} on the launch list`,
  newCode: "New flyer code",
  cols: { store: "Store", code: "Code", signups: "Sign-ups", group: "Group", made: "Made" },
  used: (n: number) => `${n} of 50`,
  full: "full",
  print: "Print",
  revoke: "Revoke",
  revokedOn: (day: string) => `revoked ${day}`,
  store: "Store",
  storeHelp: "Printed on nothing. Only you read it.",
  group: "Group",
  groupNew: (name: string) => `New group: ${name}`,
  groupHelp: "Its sign-ups and the people they invite join it.",
  facts: ["50 sign-ups", "3 free runs a day", "15 welcome credits", "3 invites each", "ends at launch"],
  spends: "Each sign-up spends one of your invites.",
  make: "Make code",
  cancel: "Cancel",
  revokeTitle: (store: string) => `Revoke ${store}’s code?`,
  revokeBody: (code: string, n: number) =>
    `People can no longer join with ${code}. The ${n} who joined keep their accounts, their group and their invites. Printed flyers will say it no longer works.`,
  keep: "Keep it",
  revokeConfirm: "Revoke code",
  treeNode: (store: string) => `Flyer · ${store}`,
  noFriendLink: "no friend link to Hugh",
  launchList: (n: number) => `Launch list · ${n}`,
  launchListMeta: "emails left on used-up and ended flyers",
  csv: "Download CSV",
  printBar: "Letter · black ink on coloured paper · the toolbar doesn’t print",
  downloadQr: "Download QR",
} as const;

export const reportCopy = {
  errorLink: "Tell us what happened",
  aboutTitle: "Something wrong?",
  aboutLine: "Tell us what happened and we’ll look.",
  aboutPress: "Report a problem",
  title: "Report a problem",
  intro: "Tell us what you saw. We’ll fix what we can.",
  what: "What happened?",
  whatPlaceholder: "What went wrong, in a sentence or two",
  doing: "What were you doing?",
  doingPlaceholder: "Which deck or page, and what you pressed",
  optional: "optional",
  attach: "We add the page you were on, your device, and the error code if there was one.",
  send: "Send",
  sending: "Sending…",
  sentTitle: "Sent. Thank you.",
  sentBody: "We’ll be in touch if we need any more insight.",
  close: "Close",
  failed: "We couldn’t send that. Try again.",
  retry: "Try again",
} as const;

export const checkInCopy = {
  title: "How’s it going?",
  intro: "You’ve been using The 99 for a couple of weeks. Three quick questions.",
  rating: "How is it working for you?",
  ratingEnds: ["not well", "really well"],
  uses: "What do you use most?",
  pickAny: "pick any",
  useOptions: ["Collection", "Commanders", "Decks", "Shopping", "Friends", "Precons"],
  pod: "Would you tell your pod about it?",
  podOptions: ["Yes", "Maybe", "Already have"],
  more: "Anything else?",
  morePlaceholder: "Anything you’d change, or love",
  hint: "Takes a minute",
  notNow: "Not now",
  send: "Send",
  sentTitle: "Thanks, that helps.",
  sentBody: "We read every answer. You can always tell us more from About › Report a problem.",
  failed: "We couldn’t send that. Try again.",
} as const;

export const feedbackAdminCopy = {
  tab: "Feedback",
  sub: "What players told us: problem reports and check-ins, newest first.",
  pills: { all: "All", problems: "Problems", checkIns: "Check-ins" },
  kinds: { problem: "Problem", checkIn: "Check-in" },
  summary: (fresh: number, avg: string) => `${fresh} new · check-ins average ${avg} of 5`,
  fields: { what: "What happened", doing: "What I was doing", rating: "Working for you", uses: "Uses most", pod: "Tell the pod", more: "Anything else" },
  notGiven: "not given",
} as const;

// Changed shipped string: shellCopy.errorBoundary.body
export const errorBoundaryBody = "Something broke on our end. Try again.";
