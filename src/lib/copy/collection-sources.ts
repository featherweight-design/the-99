// Where a collection comes from: the one requirement and a short export guide per app (`parse.ts`: ManaBox, Moxfield,
// Archidekt, Deckbox; Dragon Shield, Delver Lens and TCGplayer in `moreGuideApps`). Shared by the signed-out landing's Bring your collection section and, later, the
// signed-in first run's How to export, so it carries no landing-only wording. A step is plain text or a bold control name.
//
// UNVERIFIED for the first four: their steps were drafted from memory by Design and not checked against a real export. The
// last three were read from the sources the import-friendliness PR cites (TCGplayer's seller help; MTGStand's Delver guide;
// MythicHub's Dragon Shield page), none of them the vendor's own current help, so each is lower confidence than a vendor page.
// The one claim the code can back is the requirement, a Name and a Quantity column (`parse.ts`). US English, no em dashes.

export type GuideText = string | { b: string };

export type GuideApp = {
  id: "manabox" | "moxfield" | "archidekt" | "deckbox" | "dragonshield" | "delver" | "tcgplayer";
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
        ["Press ", { b: "⋯" }, ", then ", { b: "Export" }, ", and choose ", { b: "CSV" }, "."],
        ["Save the file, or share it to yourself, then upload it once you have an account."],
      ],
      hereStep: ["Save the file, or share it to yourself, then upload it here."],
      foot: "ManaBox’s file also carries foils and the exact printing.",
    },
    {
      id: "moxfield", name: "Moxfield", sub: "Export a CSV or paste the list",
      bothColumns: "Moxfield’s export has a Name and a Count column, and both work.",
      steps: [
        ["On moxfield.com, open ", { b: "Collection" }, "."],
        ["Press ", { b: "More" }, ", then ", { b: "Export CSV" }, "."],
        ["Once you have an account, upload the downloaded file. Or copy the list and paste it."],
      ],
      hereStep: ["Upload the downloaded file here. Or copy the list and paste it."],
    },
    {
      id: "archidekt", name: "Archidekt", sub: "Export a CSV, then upload it",
      steps: [
        ["On archidekt.com, open ", { b: "Collection" }, "."],
        ["Press ", { b: "Export" }, " and choose ", { b: "CSV" }, "."],
        ["Once you have an account, upload the downloaded file."],
      ],
      hereStep: ["Upload the downloaded file here."],
    },
    {
      id: "deckbox", name: "Deckbox", sub: "Export a CSV, then upload it",
      steps: [
        ["On deckbox.org, open your ", { b: "Inventory" }, "."],
        ["Press ", { b: "Export" }, " and keep the default columns."],
        ["Once you have an account, upload the downloaded file."],
      ],
      hereStep: ["Upload the downloaded file here."],
    },
  ] satisfies readonly GuideApp[],
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
    /** Under the rows: the requirement, said once for any app not listed. */
    another: "Any CSV with a Name and a Quantity column imports. If yours fails, open it in a spreadsheet and check the first row names both.",
  },
} as const;

/**
 * The signed-in guides' three more apps, kept out of `collectionSources` because the signed-out landing draws that object's
 * apps and names no brand it has no real export of (`bring.test.tsx`). The upload names one of these when a file from it
 * fails (`detectSource`), so its steps are there; the landing does not list them.
 */
export const moreGuideApps = [
  {
    id: "dragonshield", name: "Dragon Shield", sub: "Export a CSV, then upload it",
    steps: [
      ["In Dragon Shield, open ", { b: "Inventory" }, "."],
      ["On the web app, press ", { b: "Export" }, ". In the phone app, open a folder’s ", { b: "⋯" }, " menu and choose ", { b: "Export" }, "."],
      ["Once you have an account, upload the downloaded file."],
    ],
    hereStep: ["Upload the downloaded file here."],
  },
  {
    id: "delver", name: "Delver Lens", sub: "Export a CSV, then upload it",
    steps: [
      ["In Delver Lens, open ", { b: "All Cards" }, " or one of your lists."],
      ["Tap the export icon at the top, then ", { b: "Create CSV file" }, "."],
      ["Once you have an account, upload the file."],
    ],
    hereStep: ["Save the file, then upload it here."],
    foot: "If you pick the columns yourself, include Name and Quantity.",
  },
  {
    id: "tcgplayer", name: "TCGplayer", sub: "Email yourself a CSV, then upload it",
    steps: [
      ["In the TCGplayer app’s settings, set the email export to ", { b: "CSV" }, "."],
      ["Open the ", { b: "Collection" }, " tab and pick a list."],
      ["Press ", { b: "⋯" }, ", then ", { b: "Send via Email" }, ", and send it to yourself."],
      ["Once you have an account, upload the attached file."],
    ],
    hereStep: ["Save the attached file, then upload it here."],
  },
] satisfies readonly GuideApp[];

/** Every guide the signed-in dialog draws, in its order. */
export const allGuideApps: readonly GuideApp[] = [...collectionSources.apps, ...moreGuideApps];
