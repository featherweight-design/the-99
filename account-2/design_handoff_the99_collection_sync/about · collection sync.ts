// Two ORDINARY EDITS to src/lib/copy/about.ts. No ABOUT_VERSION bump; both re-pin the content hash. Hugh rules
// whether this is owed.

// 1. id: 'upload-choice' (since: 12, switch COLLECTION_EDIT_ENABLED). Title, caption and one key line change.
//    Keys stay at four: Sync's line replaces Add's doubling line (a re-export is now Sync's job, and Add's overlap
//    note still warns on screen).
export const uploadChoiceEdit = {
  title: "Replacing, adding or syncing from a file",
  caption:
    "Drop in a fresh export from ManaBox, Moxfield or any of the others and The 99 asks what the file is for. “Replace” makes your Collection exactly the file. “Add” stacks its cards on top of what you have, which is what you want for a booster haul or a trade binder. “Sync” takes what changed in the file and keeps what you changed in the app.\n\nWhichever you pick, you see every card that moves before anything changes. Replace also tells you if it’ll overwrite changes you made in the app, and names any decks that will read short.",
  keys: [
    "Replace: anything not in the file leaves your Collection.",
    "Add: quantities go up, nothing leaves, and your art picks stay.",
    "Sync: keeps what you changed in the app and takes what’s new in the file. If you both changed a card, it asks.",
    "Your very first upload skips the question, since there’s nothing to replace.",
  ],
} as const;

// 2. id: 'post-import'. The caption's second paragraph gains one sentence; keys unchanged (four already).
export const postImportCaptionParagraph2 =
  "Your decklists don’t change, just whether you own what’s in them. After a sync it also says how many of your own changes stayed.";
