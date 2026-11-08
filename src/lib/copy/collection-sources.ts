// Where a collection comes from: the one requirement and a short export guide per app of the four with a fixture (`parse.ts`:
// ManaBox, Moxfield, Archidekt, Deckbox). Shared by the signed-out landing's Bring your collection section and, later, the
// signed-in first run's How to export, so it carries no landing-only wording. A step is plain text or a bold control name.
//
// UNVERIFIED: every app's steps (the menu names and their order) were drafted from memory by Design and have not been checked
// against a real export. The one claim the code can back is the requirement, a Name and a Quantity column (`parse.ts`). No
// brand is named for any app the parser has no fixture for (TCGplayer, Dragon Shield, Delver Lens): "Another app" says the
// requirement and stops. US English, no em dashes.

export type GuideText = string | { b: string };

export type GuideApp = {
  id: "manabox" | "moxfield" | "archidekt" | "deckbox";
  name: string;
  /** What the row says before it opens. */
  sub: string;
  steps: readonly (readonly GuideText[])[];
  /** Under the steps, after the requirement: what this app's file adds (ManaBox only). */
  foot?: string;
};

export const collectionSources = {
  /** The one requirement. */
  requirement: "The file needs a Name and a Quantity column.",
  apps: [
    {
      id: "manabox", name: "ManaBox", sub: "Export a CSV",
      steps: [
        ["In ManaBox, open ", { b: "Collection" }, " and pick the binder or list you want."],
        ["Press ", { b: "⋯" }, ", then ", { b: "Export" }, ", and choose ", { b: "CSV" }, "."],
        ["Save the file, or share it to yourself, then upload it once you’re in."],
      ],
      foot: "ManaBox’s file also carries foils and the exact printing.",
    },
    {
      id: "moxfield", name: "Moxfield", sub: "Export a CSV or copy the list",
      steps: [
        ["On moxfield.com, open ", { b: "Collection" }, "."],
        ["Press ", { b: "More" }, ", then ", { b: "Export CSV" }, "."],
        ["Once you’re in, upload the downloaded file. Or copy the list and paste it."],
      ],
    },
    {
      id: "archidekt", name: "Archidekt", sub: "Export a CSV",
      steps: [
        ["On archidekt.com, open ", { b: "Collection" }, "."],
        ["Press ", { b: "Export" }, " and choose ", { b: "CSV" }, "."],
        ["Once you’re in, upload the downloaded file."],
      ],
    },
    {
      id: "deckbox", name: "Deckbox", sub: "Export a CSV",
      steps: [
        ["On deckbox.org, open your ", { b: "Inventory" }, "."],
        ["Press ", { b: "Export" }, " and keep the default columns."],
        ["Once you’re in, upload the downloaded file."],
      ],
    },
  ] satisfies readonly GuideApp[],
  /** Audit finding 7: no brand names until a real export of each is checked. */
  another: { name: "Another app", sub: "Any CSV with a Name and a Quantity column" },
  list: { name: "A list", sub: "Paste it as it is, one card a line" },
  /** READINESS-audit Copy table: the second sentence is cut, the rest tightened. Moxfield's guide only. */
  moxfieldNote: "Moxfield deck links don’t import. Use Export CSV, or copy the list and paste it.",
} as const;
