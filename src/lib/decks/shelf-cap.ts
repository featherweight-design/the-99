// How many suggestions one Consider shelf draws before `Show all N`. One desktop
// row, three phone rows.
//
// A plain module rather than the panel's own constant because the SERVER caps one
// shelf too: `loadDeckSuggestions` trims the unowned append before it ever reaches
// the panel. A server module cannot take a value out of a "use client" file, which
// is how the two limits came apart in the first place — the panel's cap moved to six
// and the loader kept its own five, so the Top picks shelf never reached the cap
// every other shelf had (#391). Both read this one number now.
//
// Was 12 (#352). The cap was always applied — `scripts/probe-consider-shelves.mjs`
// found no shelf drawing more than the cap at either width — but eight shelves
// of twelve is a panel 14,546px tall on a phone, with the Top picks heading
// 13,328px below the top. At six it is 9,393px and 8,175px. A shelf is a sample
// to browse, not the role group in full; `Show all N` is right there for the rest.
//
// Six does not on its own make Top picks easy to find, and nothing at this level
// could: eight shelves is the length. That part of #352 is structural and open.
export const SHELF_CAP = 6;
