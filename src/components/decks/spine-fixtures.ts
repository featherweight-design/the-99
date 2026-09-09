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
};

export const props = {
  deck,
  counts: { built: 62, ownedCount: 54, toBuyCount: 8 },
  status: "Building" as const,
  onExport: () => {},
};
