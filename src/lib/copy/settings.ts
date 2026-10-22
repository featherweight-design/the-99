// Settings (menu and Home handoff, `Settings.dc.html`; plan `2026-10-22-menu-home.md` PR 3). Strings passed
// /copy-review. The What's new on Home section's strings arrive with PR 4.

export const settingsCopy = {
  title: "Settings",
  sub: "Saved as you change them",
  spares: {
    /** The mono section head, drawn uppercase by CSS. */
    head: "Spares",
    explain: "A spare is a copy no deck of yours is asking for, committed or draft.",
    /** The threshold sentence, around the stepper: `Offer a card only when I have [2] or more spare copies.` */
    before: "Offer a card only when I have",
    after: "or more spare copies.",
    stepperLabel: "Spare copies a card needs before it is offered",
    fewer: "Fewer",
    more: "More",
    /** `Offered to {pods}.` with the pod names bold, joined as a list. */
    offeredTo: "Offered to",
    offeredNone: "Not offered to any pod yet.",
    choose: "You choose on each pod.",
    friends: "Friends",
    friendsAria: "Choose who sees your spares, on each pod in Friends",
    keptHead: (n: number) => (n > 0 ? `Kept back · ${n}` : "Kept back"),
    keptExplain: "Never offered, however many spares you have.",
    search: "Keep a card back…",
    searchLabel: "Keep a card back: search your spare cards",
    noMatch: "None of your spare cards match.",
    hitSpare: (n: number) => `${n} spare`,
    keepAria: (name: string, n: number) => `Keep ${name} back, ${n} spare`,
    releaseAria: (name: string) => `Let ${name} go back to your spares`,
    failed: "We couldn’t save that. Try again.", // toast, role alert
  },
  // Your decks (friend decks handoff, README 4b): what friends see on the reader's Decks tab. Placeholder words, for
  // /copy-review.
  decks: {
    head: "Your decks",
    explain: "What friends see on your Decks tab.",
    see: { name: "Friends can see my decks", line: "Each deck’s name, commander and whole list, read-only." },
    unfinished: { name: "Include drafts and decks I’m building", line: "Off: a deck shows once its list is full." },
    foot: "To keep one deck to yourself, tick Hidden from friends in its ⋯ menu.",
    failed: "We couldn’t save that. Try again.", // toast, role alert
  },
} as const;
