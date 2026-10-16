// card-scan · copy strings.ts. R1. PLACEHOLDERS: /copy-review sets the words.
// Target: src/lib/copy/collection-edit.ts (collectionEditCopy.scan). Reuses collectionEditCopy.add for the list,
// the printing step, the combined notice and the receipt.

const n = (x: number) => x.toLocaleString("en-US");

export const cardScanCopy = {
  scanPress: "Scan",
  close: "Close the scanner", // aria-label on the bare ✕

  index: {
    title: "Scan your cards",
    body: "Point your camera at a card and we’ll suggest which it is. You confirm each one, then review the lot before anything is saved.",
    need: "First we need the card index: about 27 MB, downloaded once. After that, scanning works without a connection.",
    download: (mb: number) => `Download · ${mb} MB`,
    wifi: "Best on Wi-Fi.",
    gettingTitle: "Getting the card index",
    figure: (got: number, total: number) => `${got.toFixed(1)} of ${total} MB`,
    leave: "Close this whenever you like. It picks up where it stopped next time you press Scan.",
    downloading: "Downloading…",
    offlineTitle: "You’re offline",
    offlineBody: "The card index needs a connection once. After that, scanning works offline.",
    noConnection: "No connection",
    tryAgain: "Try again",
    searchMeanwhile: "You can still add cards by search once you’re back online.",
    paused: "Paused · you’re offline",
    resumes: (got: number) => `It carries on from ${got.toFixed(1)} MB by itself once you’re back online. Nothing is downloaded twice.`,
    waiting: "Waiting for a connection",
    stopped: "Stopped",
    failedToast: "We couldn’t finish the card index. Try again in a moment.",
  },

  camera: {
    blockedTitle: "The camera is blocked",
    blockedBody: "Your browser isn’t letting The 99 use the camera. Allow it in your browser’s settings for this site, then press Scan again.",
    photosLine: "Or choose photos you’ve already taken, one card in each.",
    choosePhotos: "Choose photos",
    noWebcamTitle: "No camera we can use",
    noWebcamBody: "This computer has no webcam, or your browser is blocking it for this site. Photos work just as well: one card in each.",
    webcam: "Webcam",
    stop: "Stop",
  },

  mode: {
    label: "Printing",
    fast: "Fast",
    normal: "Normal",
    fastLine: "each card takes its first printing. You can change any of them on the list.",
    normalLine: "you choose each card’s printing on the list, before you save.",
  },

  view: {
    looking: "Hold a card inside the frame",
    unsure: "Hold it still",
    add: "Add to the list",
    held: "Held",
    notSure: "Not sure. Which is it?",
    sleeves: "Sleeves and glare make this harder. Tilt the card away from the light.",
    noneOfThese: "None of these",
    darkTorch: "It’s dark, so cards read slowly. Turn on the light, top right.",
    darkNoTorch: "It’s dark, so cards read slowly. Move closer to a lamp.",
    light: "Light", // aria-label, aria-pressed
    onList: (x: number) => `${n(x)} on the list`,
    review: (x: number) => `Review ${n(x)}`,
  },

  again: {
    stillOn: (x: number) => `✓ On the list · ×${n(x)}`,
    addAnother: "Add another copy",
    already: (x: number) => `×${n(x)} on the list already`,
    addSecond: "Add a second copy",
  },

  fix: {
    question: "Which card was it? These are the closest to your scan.",
    yourScan: "Your scan", // alt
    onList: "On the list",
    search: "Search for it instead",
  },

  photos: {
    read: (x: number) => `${n(x)} photos read`,
    sure: "Sure",
    notSure: "Not sure",
    pick: "Pick below",
    photoOf: (i: number, t: number) => `photo ${i} of ${t}`,
    addSure: (x: number) => `Add the ${n(x)} sure ones`,
    more: "Choose more photos",
  },
} as const;
