// About · Invites entry (account 1, 2026-10-16). One new entry for `aboutEntries` in
// `src/lib/copy/about.ts`, drawn on the §G per-entry template (`The 99 - About · Invites Entry.dc.html`),
// plus one edited sentence in the shipped `friends` entry.
//
// Version: it follows the switch engineering names for the chooser (README gap G4). If that switch is
// what announces it, `since` is the current version and there is NO bump, as the Social line's entries
// did. If invite-only ships unswitched, it is a new entry and bumps ABOUT_VERSION. Re-pin the content
// hash either way.
//
// Placement: chapter 04, straight after 'friends', before 'game-opponents'.
// Specimen: the Add a friend chooser (both cards, 3 invites), from the component that ships it, at its
// desktop size; phone reduction drops each card's body line but keeps the count.
// All strings owed to /copy-review except the quoted locked labels.

export const invitesEntry = {
  id: 'invites',
  switch: 'INVITES_ENABLED', // placeholder: engineering names it (README G4)
  chapter: '04',
  title: 'Inviting someone new',
  route: '/friends',
  opens: 'opens Add a friend',
  width: 'plate',
  caption:
    'The 99 is invite-only, so new players arrive through the people already in it. On Friends, press “Add a friend”, then “Invite someone new”. At the table, show an invite QR: they scan it, type their own email, and confirm it with a code. Or type their email here, and The 99 sends the invitation.\n\nOnce they make their account, you’re friends. Adding someone who already plays? Pick “They’re on The 99” and send a friend link: it uses no invite.',
  keys: [
    'An invite is used only when someone makes an account. One that isn’t used within 7 days comes back.',
    'An invite QR holds one invite for its 15 minutes, and gives it back if nobody uses it.',
    'Whatever the email, you’re told “Invitation sent”, so nobody can use an invite to find out who’s on The 99.',
    'How many you have left shows under “Add a friend”. Invites are given out by The 99, not bought.',
  ],
  marksPending: true,
  since: 14, // see Version above
} as const;

// EDIT · entry 'friends', caption, sentence 2 (an edit, no bump of its own):
//   was: 'Open “Friends” from your account menu, press “Add a friend”, and send them the link, or let them scan the QR code off your screen.'
//   now: 'Open “Friends” from your account menu, press “Add a friend”, pick “They’re on The 99”, and send them the link, or let them scan the QR code off your screen.'
