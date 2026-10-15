// Proposed additions to src/lib/copy/collection-edit.ts (the `upload`, `shortWarning` and `history` blocks) and
// src/lib/copy/card-assignments.ts (the summary). Intent only: every string goes through /copy-review.
// Unit: a "card" is one printing in one finish, what the review tiles count. Never ledger entries, never copies
// (except `after`, the shipped figure, reused: README G1).

const n = (x: number) => x.toLocaleString("en-US");
const cards = (x: number) => (x === 1 ? "1 card" : `${n(x)} cards`);
const tokens = (x: number) => (x === 1 ? "1 token" : `${n(x)} tokens`);

export const collectionSyncCopy = {
  choice: {
    /** Replaces choiceTitle and choiceTitlePhone at both widths (README G10). */
    title: "What’s this file for?",
    syncTitle: "Sync my collection",
    syncBody: "Takes what changed in the file and keeps what you changed in the app. Where you both changed a card, you choose.",
    keeps: (k: number, since: string) => `Keeps the ${cards(k)} you changed in the app since your ${since} upload.`,
    keepsNone: (since: string) => `You haven’t changed anything in the app since your ${since} upload, so this does what Replace does.`,
    tokensOnly: (t: number) => `Your cards stay as they are. Sync records the file’s ${tokens(t)}.`,
    nothingNew: "Nothing new in this file. It matches your last upload, tokens included.",
    unavailableLead: "Sync can’t be used for this file.",
    unavailableNoRecord: (since: string) =>
      `We have no record of what changed since your ${since} upload, so we can’t tell your changes from the file’s.`,
    unavailableAged: (last: string) =>
      `Your last upload was ${last}, further back than the 90 days of history we keep, so we can’t tell your changes from the file’s.`,
    unavailableNoUpload: "Sync compares a file with your last upload, and your collection was built in the app without one. Replace or Add will work.",
    continueSync: "Review the sync →",
    nextSync: "Next: what this sync takes from the file, what it keeps, and anything it needs you to decide.",
    nextSyncTokens: "Next: the tokens this sync records. Your cards don’t move.",
    nextSyncAdds: (c: number, t: number) => `Next: the ${cards(c)} and ${tokens(t)} this sync takes. Nothing leaves.`,
  },
  stale: {
    olderTitle: (since: string) => `This file looks older than your ${since} upload.`,
    olderBody: (k: number) =>
      `It’s missing ${cards(k)} that upload added, which usually means an earlier export. If it’s older, taking everything from it would undo them.`,
    sameTitle: (since: string) => `This file looks no newer than your ${since} upload.`,
    sameBody: (t: number) => `Its cards match that upload exactly. What it does have is ${tokens(t)} your collection hasn’t recorded.`,
    question: "What should Sync take from this file?",
    addsTitle: "Only what it adds",
    addsBody: (c: number, t: number) => `${n(c)} new ${c === 1 ? "card" : "cards"} and its ${tokens(t)}. Nothing leaves or goes down.`,
    tokensTitle: "Only its tokens",
    tokensBody: (t: number) => `Its ${tokens(t)}. Your cards stay as they are.`,
    allTitle: "Everything, removals too",
    allBody: (up: number, leaving: number, down: number, t: number) =>
      `${n(up)} new, ${n(leaving)} leaving, ${n(down)} going down, and its ${tokens(t)}.`,
    /** The review's head under a stale pick. */
    pickedAdds: (since: string, c: number, t: number) =>
      `This file looks older than your ${since} upload, so this sync takes only what it adds: ${cards(c)} and its ${tokens(t)}.`,
    pickedTokens: (since: string) => `This file looks no newer than your ${since} upload, so this sync takes only its tokens.`,
    change: "Change",
  },
  review: {
    title: "Review before you sync",
    titlePhone: "Review sync",
    tiles: { decide: "to decide", file: "from the file", kept: "kept from The 99", nothing: "nothing to do" },
    tokensLine: (t: number) => `${tokens(t)} will be recorded from the file, as an upload records them. Tokens you marked by hand stay.`,
    tokensFigure: (t: number, copies: number) => `${tokens(t)} · ${n(copies)} ${copies === 1 ? "copy" : "copies"}`,
    /** The issues panel's third line on a Sync (README G4). */
    emblemsSkipped: (k: number) => `emblem ${k === 1 ? "row" : "rows"} skipped`,
    listKept: (k: number) => `Kept from The 99 · ${n(k)}`,
    listDecide: (k: number) => `To decide · ${n(k)}`,
    decideLede: (since: string) => `You and the file both changed these since your ${since} upload. Pick which count to keep.`,
    decideLeft: (k: number) => (k === 0 ? "All answered." : `${n(k)} left.`),
    colAt: (since: string) => `AT ${since.toUpperCase()}`,
    colApp: "IN THE APP",
    colFile: "IN THE FILE",
    pickApp: "App",
    pickFile: "File",
    rowAria: (card: string, since: string, b: string, a: string, f: string) => `${card}, at ${since} ${b}, app ${a}, file ${f}`,
    rowWas: (since: string, b: string) => `at ${since} ${b}`,
    bulkApp: (k: number) => `Keep the app’s for all ${n(k)}`,
    bulkFile: (k: number) => `Take the file’s for all ${n(k)}`,
    bulkDoneApp: (k: number) => `Kept the app’s count for all ${n(k)}. You can still change any one.`,
    bulkDoneFile: (k: number) => `Took the file’s count for all ${n(k)}. You can still change any one.`,
    bulkCapNote: (shown: number, total: number) => `Showing the first ${n(shown)} of ${n(total)}. The buttons above apply to all ${n(total)}.`,
    overwrite: (k: number, since: string) =>
      `Taking the file’s count overwrites ${cards(k)} you changed in the app since your ${since} upload.`,
    nothing: "Nothing to sync. Your collection already has everything in this file, and its tokens are recorded.",
  },
  bar: {
    sync: (take: number, keep: number, t: number, decided: number, short: number) =>
      [
        `Taking ${cards(take)} from the file and keeping ${n(keep)} of yours${t ? `, with ${tokens(t)}` : ""}.`,
        decided ? `You decided ${n(decided)}.` : "",
        short ? `${short === 1 ? "1 deck" : `${n(short)} decks`} will read short.` : "",
      ].filter(Boolean).join(" "),
    noneKept: (take: number, t: number) => `Taking ${cards(take)} from the file${t ? `, with ${tokens(t)}` : ""}. Nothing of yours to keep.`,
    tokensOnly: (keep: number, t: number) => `Your cards stay as they are, including the ${n(keep)} you changed. Recording ${tokens(t)} from the file.`,
    undecided: (k: number) => `${cards(k)} still to decide.`,
    nothing: "Nothing will change.",
    confirm: "Sync collection",
    confirmTokens: (t: number) => `Record ${tokens(t)}`,
    pending: "Syncing…",
    back: "Back to Collection",
  },
  shortWarning: {
    titleSync: (k: number) => `Syncing leaves ${k === 1 ? "a deck" : `${n(k)} decks`} short`,
    confirmSync: "Sync anyway",
  },
  history: {
    uploadSync: "Sync upload",
    syncNote: (kept: number, decided: number, t: number) =>
      [`Kept the ${cards(kept)} you’d changed in the app.`, decided ? `You decided ${n(decided)}.` : "", t ? `Recorded ${tokens(t)}.` : ""]
        .filter(Boolean).join(" "),
    revertTitle: "Revert this sync?",
    revertTokens: (t: number) => `The ${tokens(t)} it recorded stay recorded.`,
  },
  summary: {
    /** card-assignments.ts: the lede's Sync clause, after "Was N. A arrived, L left" */
    keptClause: (k: number) => `, and the ${cards(k)} you changed in the app stayed as you had them.`,
    decided: (k: number) => `You decided ${n(k)}.`,
    nowShortVerb: "Syncing",
    tokensOnly: (t: number) => `Nothing your decks care about moved. Your cards are as you left them, and ${tokens(t)} from the file are recorded.`,
    stamp: (date: string, file: string) => `synced ${date} · ${file}`,
  },
} as const;
