// Shared by `spine-desktop.test.tsx` and `spine-mobile.test.tsx`: the two
// widths render the same deck, so one fixture keeps them from drifting apart
// while claiming to describe the same header.

export const deck = {
  id: "d1",
  name: "Atraxa Superfriends",
  commander: {
    oracleId: "o1",
    name: "Atraxa, Praetors’ Voice",
    colorIdentity: ["W", "U", "B", "G"],
    artCropUri: "/crop.jpg",
    imageUri: "/full.jpg",
    typeLine: "Legendary Creature",
    manaCost: "{G}{W}{U}{B}",
    oracleText: "",
  },
  partner: null,
};

/** The same header with a second commander, for the pair-only assertions. */
export const pairDeck = {
  ...deck,
  partner: {
    oracleId: "o2",
    name: "Kratos, God of War",
    colorIdentity: ["R", "W"],
    artCropUri: "/crop-2.jpg",
    imageUri: "/full-2.jpg",
    typeLine: "Legendary Creature",
    manaCost: "{2}{R}{W}",
    oracleText: "Partner—Father & son",
  },
};

export const props = {
  deck,
  counts: { built: 62, ownedCount: 54, toBuyCount: 8 },
  status: "Building" as const,
  onExport: () => {},
};
