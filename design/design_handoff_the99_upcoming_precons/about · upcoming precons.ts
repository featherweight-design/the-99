// Proposed entry for src/lib/copy/about.ts (aboutEntries), chapter '03', placed directly after
// "Starting from a precon" (id 'precons'). Placeholders until /copy-review.
// Tied to its own switch, so it is announced when the switch flips and adds no ABOUT_VERSION bump (as `precons`).

export const upcomingPreconsEntry = {
  id: "upcoming-precons",
  chapter: "03",
  title: "Commander sets on the way",
  route: "/decks/precons",
  opens: "opens the precon list",
  width: "plate",
  switch: "UPCOMING_PRECONS_ENABLED", // new AboutSwitch member; requires PRECONS_ENABLED (gap G7)
  caption:
    "When a Commander set is announced, Commander precons lists it under Announced, above this year’s decklists, with its release date and every commander revealed so far. Its decks aren’t listed yet, so there’s nothing to own or start a deck from.\n\nWhen a set is announced, or its decklists arrive, Home says so once, under the header. Close it, or open Commander precons, and it won’t show again on any of your devices.",
  keys: [
    "A revealed commander is a legendary creature from the set. Until the decks are listed, nothing says which deck it leads.",
    "Dates are release days. A set that’s out stays under Announced until its decklists arrive.",
    "When they arrive, the set’s precons join the list, marked new for two weeks.",
  ],
  specimen: {
    component: "AnnouncedSet",
    fixture: { name: "Darkhold Destiny Commander", code: "MDC", releasesOn: "2027-04-09", today: "2026-10-14", revealed: [{ name: "Gargantos, the Endbringer", colors: ["B", "G"] }] },
  },
  phone:
    "The date line splits in two: the date and countdown, then the code and count. A set with more commanders scrolls sideways in one row.",
  // The version current when it is written: a switch-tied entry is announced by the switch.
  marksPending: true,
} as const;
