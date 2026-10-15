// Social R1 (friends and pods): copy. Taken from the handoff's `social-r1 · copy strings.ts` (R2), after
// /copy-review. PR B brought the menu row, the title and the signed-out card; PR C1 the head (the name line and
// its field), the modals' Close and the commander picker. The friends list, the open links and the Add a friend
// dialog arrive with PR C2, the request card with PR D and the pods with PR E.

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

  landing: {
    kicker: "Friend request",
    signedOutTitle: "Someone sent you a friend request",
    signedOutBody: "Sign in to turn the card over and see who it’s from.",
    signIn: "Sign in",
  },
} as const;
