// Foil mark addendum · proposed strings for /copy-review. Not shipped code.
export const foilMarkCopy = {
  key: { foil: "foil", etched: "etched" },
  tooltip: {
    foil: "Every copy you own of this printing is foil.",
    etched: "Every copy you own of this printing is etched foil.",
    preconOne: "This deck's copy is foil.",
    preconMany: "This deck's copies are foil.",
  },
  // appended to the name in the tile's or row's accessible name
  spoken: { foil: ", foil", etched: ", etched foil" },
} as const;
