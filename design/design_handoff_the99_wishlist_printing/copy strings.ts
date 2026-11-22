// Wishlist printing R1: new strings, DRAFT for /copy-review. Reused shipped strings are marked.
export const wishlistPrintingCopy = {
  box: {
    label: "Printing",
    any: "Any printing", // also the press back to any printing
    cheapest: "cheapest", // after `Any printing ·` when no other printing is on screen
    want: (set: string, n: string) => `Want ${set} ${n}`,
    wantAria: (setName: string, n: string, card: string) => `Want ${card} from ${setName}, number ${n}`,
    soldOut: "sold out", // shipped priceCopy.tag.soldOut
    soldOutNote: (price: string) => `Mana Pool has none now. Any printing is ${price}.`,
  },
  panel: {
    wantedAny: "Wanted: any printing",
    wanted: (set: string, n: string) => `Wanted: ${set} ${n}`,
  },
  tile: {
    aria: (set: string, n: string) => `wanted printing ${set} ${n}`, // appended to the tile press's label
  },
  linkOut: (set: string, n: string) => `Buy ${set} ${n} at Mana Pool`, // for shipped "Buy any printing at Mana Pool"
  feed: { priceDropAt: (set: string, n: string) => `at ${set} ${n}.` }, // for shipped feed line.priceDrop
  announce: (set: string, n: string) => `Wanted ${set} ${n}.`,
  announceAny: "Wanted any printing.",
};
