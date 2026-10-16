// Discovery R3 · the first-run tour and tools where the need is. PLACEHOLDERS for /copy-review (brief: "Wording goes to
// /copy-review"). Shipped strings are marked `shipped`; every other line is new and drawn on the R3 canvas.
// Rule held: "Select", never "tick". The app names no one outside the note itself.

export const tourCopy = {
  dialogLabel: (title: string) => title, // the card is a modal dialog labelled by its title
  kicker: (n: number, of: number, place: string) => `${n} of ${of} · ${place}`, // drawn in mono caps
  progressAria: (n: number, of: number) => `Step ${n} of ${of}`,
  skip: "Skip the tour", // the bare ✕'s accessible name; Esc does the same
  back: "Back",
  next: "Next",
  finish: "Finish", // step 6's Next
  litAria: (control: string) => `Pointing at ${control}`, // added to the dialog's description each step
  steps: {
    collection: {
      place: "Collection",
      title: "Start with what you own",
      body: "Everything here is built from your collection. Drop in a file from ManaBox, Moxfield, Archidekt or Deckbox.",
      precons: "No file? Precons I own adds every card in the boxes you have, at their own printings.", // PRECONS_ENABLED; "Precons I own" is shipped
      foot: "Six stops · about a minute · ✕ skips the tour",
    },
    commanders: {
      place: "Commanders",
      title: "See what you could build",
      body: "Every commander your cards can lead, ranked by how much of the 99 you already own. It opens once your cards are in.",
      picture: "Commanders, once your cards are in", // caption under the capture
      pictureAlt: "Commanders, on a real collection",
    },
    decks: {
      place: "Decks",
      title: "Build it, tune it, play it",
      body: "Pick a commander and the 99 is assembled from your cards. Then tune it, track it and log the games it plays.",
      picture: "A deck, once you build one",
      pictureAlt: "A deck page, on a real deck",
    },
    buying: {
      place: "Buying",
      title: "Know what it’s missing",
      body: "Each deck’s Shopping lists the cards you still need and what they cost, with one link to buy them. It lives inside Decks.",
      picture: "Shopping, inside every deck",
      pictureAlt: "A deck’s Shopping, on a real deck",
    },
    look: {
      place: "Your look",
      title: "Pick your look",
      body: "Six themes, one for every playmat. Change it any time in your account menu, under Theme.", // "Theme" is the shipped section label
      // The grid, its names and planes, and the status line are the shipped picker's: themeCopy (`${name} applied.`).
    },
    whatsNew: {
      place: "What’s new",
      title: "New things land here",
      body: "When the app learns something, one line on Home says so. This one opens About: every tool, mark and figure, by screen.",
      noteLabel: "A note from the creator", // shipped in R2b (creatorNoteCopy.title)
      noteLead: "There are a lot of Magic: The Gathering apps out there and a lot of them do really great things…", // aboutCopy.pageIntro's opening, cut at the comma
      notePress: "Read the note ›", // R2b's creatorNoteCopy.tourPress, with the chevron
    },
  },
} as const;

// Tools where the need is. Each is absent with its switch off.
export const needCopy = {
  // E1 · /decks and Home's "No decks yet" (DecksZeroActions). HELP_ME_CHOOSE_ENABLED.
  decksZero: {
    lead: "Not sure what to build?", // shipped (helpMeChooseCopy door head on /decks/new)
    press: "Help me choose →", // shipped
  },
  // E2 · /commanders' guided banner (G1). HELP_ME_CHOOSE_ENABLED. Also R1's M12 anchor from now on.
  commandersFirstRun: {
    lead: "Not sure which?",
    press: "Help me choose →", // shipped
  },
  // N1 · a role cell under target at 99 / 99 with no Consider shelf. TUNING_ENABLED.
  roleCell: {
    link: "suggest swaps →", // 1280, beside "rec N"
    linkShort: "suggest →", // 390
    aria: (role: string, have: number, target: number) => `${role}, ${have} of ${target}. Open Suggested changes.`,
  },
  // N2 · the Land cell. Unchanged strings; only its switch rule moves (MANA_BALANCE_ENABLED alone).
  landCell: {
    link: "balance mana →", // shipped (tuningHubShortcutsCopy.balanceMana)
    linkShort: "balance →", // shipped
  },
  // N3 · Stats › Money and ownership. SWAP_TOOLS_ENABLED, and at least one to-buy copy over the deck's limit.
  money: {
    shop: (n: number) => `See the ${n} in Shopping`, // shipped (deckStatsCopy.money.shopLink, plural form)
    shopOver: (n: number, over: number, limit: string) => `See the ${n} in Shopping, ${over} over ${limit}`,
    shopOverAria: (n: number, over: number, limit: string) =>
      `See the ${n} in Shopping. ${over} ${over === 1 ? "is" : "are"} over your ${limit} limit and ${over === 1 ? "has" : "have"} cheaper stand-ins.`,
  },
} as const;
