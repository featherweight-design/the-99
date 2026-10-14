// R4 additions to src/lib/copy/precons.ts. Placeholders until /copy-review.
// Ownership stays a count ("31 of 66"), never a verdict. Selection copy, if any is added, says select / unselect.

export const preconsTilesCopy = {
  list: {
    // ViewToggle names: spoken only; the well draws ≣ and ▦.
    view: { rows: "Rows view", tiles: "Tiles view" },
  },
  tile: {
    ownLead: "you own", // as preconsCopy.row.ownLead
    meta: (setCode: string, month: string) => `${setCode} · ${month}`,
    footShared: (shared: number) => `${shared.toLocaleString("en-US")} shared`,
    footBuilt: (shared: number) => `built from this · ${shared.toLocaleString("en-US")} shared`,
    footTwin: "also sold as a Collector’s Edition",
    noArt: "no card image yet",
    // The link's accessible name: the caption is clipped, the commander is on the art only.
    aria: (name: string, commanders: string[], owned: number, of: number) =>
      `${name}, with ${commanders.join(" and ")}. You own ${owned} of ${of} of its cards.`,
  },
  open: {
    // The open precon reuses viewToggleCopy.deck: "List view" / "Card view".
    tileNotOwned: "not owned",
    basicTag: "basic · not counted", // as preconsCopy.group.basicTag
    basicArts: (setCode: string, arts: number) => (arts > 1 ? `${setCode} · first of ${arts} arts` : setCode),
    listNoteCard: "By type, A–Z within each group · press a card for its details · each card shows the precon’s printing",
    listNoteCardPhone: "By type · press a card for its details",
  },
} as const;

export const PRECON_VIEW_KEY = "the99:precons:view"; // "rows" | "tiles", default "tiles"
export const PRECON_OPEN_VIEW_KEY = "the99:precons:openView"; // "list" | "card", default "list"
