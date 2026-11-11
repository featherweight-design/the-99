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
  /** Under the requirement: this app's file has both columns (Moxfield's guide, which the mock draws). */
  bothColumns?: string;
  steps: readonly (readonly GuideText[])[];
  /** Under the steps, after the requirement: what this app's file adds (ManaBox only). */
  foot?: string;
  /** The third step for a reader already signed in (the first run's guides): the file is uploaded here, not "once you have an account". */
  hereStep: readonly GuideText[];
};

export const collectionSources = {
  /** The one requirement. */
  requirement: "The file needs a Name and a Quantity column.",
  apps: [
    {
      id: "manabox", name: "ManaBox", sub: "Export a CSV, then upload it",
      steps: [
        ["In ManaBox, open ", { b: "Collection" }, " and pick the binder or list you want."],
        ["Select ", { b: "⋯" }, ", then ", { b: "Export" }, ", and choose ", { b: "CSV" }, "."],
        ["Save the file, or share it to yourself, then upload it once you have an account."],
      ],
      hereStep: ["Save the file, or share it to yourself, then upload it here."],
      foot: "ManaBox’s file also carries foils and the exact printing.",
    },
    {
      id: "moxfield", name: "Moxfield", sub: "Export a CSV or paste the list",
      bothColumns: "Moxfield’s export has both columns.",
      steps: [
        ["On moxfield.com, open ", { b: "Collection" }, "."],
        ["Select ", { b: "More" }, ", then ", { b: "Export CSV" }, "."],
        ["Once you have an account, upload the downloaded file. Or copy the list and paste it."],
      ],
      hereStep: ["Upload the downloaded file here. Or copy the list and paste it."],
    },
    {
      id: "archidekt", name: "Archidekt", sub: "Export a CSV, then upload it",
      steps: [
        ["On archidekt.com, open ", { b: "Collection" }, "."],
        ["Select ", { b: "Export" }, " and choose ", { b: "CSV" }, "."],
        ["Once you have an account, upload the downloaded file."],
      ],
      hereStep: ["Upload the downloaded file here."],
    },
    {
      id: "deckbox", name: "Deckbox", sub: "Export a CSV, then upload it",
      steps: [
        ["On deckbox.org, open your ", { b: "Inventory" }, "."],
        ["Select ", { b: "Export" }, " and keep the default columns."],
        ["Once you have an account, upload the downloaded file."],
      ],
      hereStep: ["Upload the downloaded file here."],
    },
  ] satisfies readonly GuideApp[],
  /** Audit finding 7: no brand names until a real export of each is checked. */
  another: { name: "Another app", sub: "Any CSV with a Name and a Quantity column" },
  list: { name: "A list", sub: "Paste it as it is, one card a line" },
  /** The row's toggle, said on every app row (the mock's "How to export" with a chevron). */
  toggle: "How to export",
  /** Moxfield's guide only: the callout's bold lead and its sentences (the mock, Collection.dc.html). */
  moxfieldNote: {
    lead: "Moxfield deck links don’t import yet.",
    body: "Moxfield doesn’t let deck-building apps read them today. They’re working on a way, and The 99 will connect as soon as it’s ready. Until then, export or paste the list.",
  },
  /**
   * The signed-in first run's guides (landing PR 7b): a sheet on the phone and a modal on desktop, opened from the first run's
   * line and from the upload's no-column error. The rows and steps are the ones above; these are its own frame.
   */
  signedIn: {
    title: "How to export your collection",
    lead: "Pick the app your cards are in now.",
    close: "Close",
    /** Under the rows: the requirement, said once for any app not listed. No brand named (audit finding 7). */
    another: "Any CSV with a Name and a Quantity column imports. If yours fails, open it in a spreadsheet and check the first row names both.",
  },
} as const;
