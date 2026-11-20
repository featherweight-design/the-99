// Alternate printings from search (#3002) R1: new strings, DRAFT for /copy-review. Reused shipped strings are marked.
export const alternatePrintingsCopy = {
  trigger: {
    count: (n: number) => `${n} printings`,
    countOwned: (n: number, k: number) => `${n} printings · you own ${k}`,
    pickedOf: (n: number) => `· ${n} printings`, // after the shipped "Your pick"
    only: "The only printing",
  },
  region: {
    introUnowned: (n: number) => `${n} printings. Select one to see it here.`,
    introOwned: (n: number) => `${n} printings. Pick one of yours to represent this card, or select any to see it here.`,
    // introPicked: shipped printingPickerCopy.printing.regionIntroPicked
    groupYours: (k: number) => `In your collection · ${k}`,
    groupOthers: (m: number) => `Other printings · ${m}`,
    tileNotOwned: "not owned", // shipped addPanelCopy.quickAdd.rowNotOwned
    announcePreview: (set: string, n: string) => `Showing ${set}, number ${n}. Not in your collection.`,
  },
};
