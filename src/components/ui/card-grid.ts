// The card grid's column tracks, shared by `/collection`'s grid and the set page's, so the two
// draw the same number of columns at the same width (Hugh, 2026-10-13, bug batch C item 4).
//
// The phone is an explicit 3-up: auto-fill would collapse a 178px floor to one column there.
// From `md` the track is a TILE FLOOR rather than a column count (card-captions readiness,
// erratum 5): six at the 1300px reference width, three at 768. `auto-fill`, never `auto-fit`,
// which would stretch a filtered-down row across the whole width.
export const CARD_GRID_TRACKS = "grid-cols-3 md:grid-cols-[repeat(auto-fill,minmax(178px,1fr))]";
