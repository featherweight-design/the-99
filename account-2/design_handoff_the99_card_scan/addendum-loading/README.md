# Addendum: the scanner while it gets ready

Account 2 · 2026-11-15 · a light addendum to the card-scan handoff. There's no new surface: this adds new words to the shipped result panel while the scanner's models load.

Canvas: https://claude.ai/artifact/M3rMrexLygN4R9RZjDJTaJ (boards: `Loading-Phone.dc.html`, `Loading-Spec.dc.html`, `Loading-Desktop.dc.html`). Open them with `support.js` beside them. The boards load their images from the canvas asset store (`/_blob/…`), and the same images are in `../art/`.

## The problem

On a device's first scanner, the detector (3.2 MB) and the embedder (14.8 MB) download and then warm up, which takes about 10s on a phone. During that time the panel already says **Show a card to the camera**, but nothing can read. A cached reopen takes about 3s, with the same mismatch.

D1–D5 in `STATES-card-scan.md` were drawn for the on-device index and were never built (`docs/superpowers/plans/2026-10-16-card-scan.md`). They don't cover this, and this addendum doesn't bring them back. The load starts by itself when the scanner opens, with no consent press.

## The calls

1. **A determinate bar.** The two model files are counted together against their total, so the bar fills once from start to full. The runtime can't be measured, so the bar doesn't count it. Once the last model byte lands, the heading changes to **Almost ready** and a highlight runs along the full bar. That covers the runtime, if it's still loading, and the warm-up (about 1–2s on Android, 0.2s on iPhone). If the server sends no file size, the bar runs indeterminate (as on L4), with L1's words and no figures.
2. **In the shipped panel, over the live camera.** There's no scrim, overlay or extra screen. The phone uses the result panel above the tray, and the desktop uses the result area under the webcam feed. The camera starts as shipped. ✕/Stop, Auto/Normal and the light all work, and a mode chosen while loading is the one the scanner reads with. No outline is drawn while loading, because nothing is reading. The tray, Review and the sheet's list and Save are untouched.
3. **The hand-off.** When the first frame can be read, the panel's contents cross-fade (150ms, none with reduced motion) into the shipped looking panel (D7) in the same box. There's no "ready" message, toast or sound. From there everything is as shipped.
4. **A cached reopen shows it, quietly.** If the scanner can't read 400ms after it opens, the panel shows **Starting the scanner** with an indeterminate bar above the shipped mode line (Auto or Normal). The hand-off then changes only the heading, and the bar goes. There are no figures and no first-time line, because nothing downloads. A device that's ready inside 400ms never sees it.

## States

| ID | State | Shown when | Ends when |
| --- | --- | --- | --- |
| L1 | Getting the scanner ready | The scanner opens and a model file isn't in Cache Storage (or fails its hash check). If one model is cached, the bar and figures count only the one still downloading. | The last model byte lands → L2. ✕/Stop abandons it. |
| L2 | Almost ready | Every model byte has landed, and the runtime or warm-up isn't done. | The first frame can be read → L3. |
| L3 | Show a card to the camera | Shipped, unchanged (D7 / V1). | As shipped. |
| L4 | Starting the scanner | Both models are cached at open, and the scanner still can't read 400ms later. | The first frame can be read → L3. |

- **Closing abandons it.** ✕ or Stop closes at once with no confirm, as today. Nothing half-downloaded is kept, so the next open starts L1 from 0. The copy doesn't promise to resume.
- **Unchanged:** going offline mid-download shows the shipped offline notice (`offlineBody`), and a load that fails shows the shipped "couldn't start" notice (`noStart`).
- A turn across the 768px line keeps the state and its figures.
- Photos (desktop, from the blocked screen) are out of scope. The blocked screen is unchanged.

## Accessibility

- The bar is a `progressbar`: on L1 it's named by `barLabel` and has `aria-valuenow` (0–100). On L2 and L4 it has no value, and L4's bar is named by `reopen`.
- The panel's existing polite live region announces only its heading changes (Getting the scanner ready → Almost ready → Show a card to the camera), never each MB.
- Focus stays on ✕ (Stop on desktop), as shipped.

## Engineering notes (not design calls)

- `model-cache.ts` already knows whether each file is cached before it fetches, which is what picks L1 or L4. Progress needs the download read as a stream against `content-length`. Hugging Face sends it for both pinned files.
- `frame-reader.ts`'s `onModelsReady` (which already marks `timer.loaded`) is the hand-off point to L3.
- Throttle the bar's updates to a few per second. The figure needs no animation.

## New words, for /copy-review

`collectionEditCopy.scan.loading`, in `card-scan · loading strings.ts` here.

| Key | Copy |
| --- | --- |
| `title` | Getting the scanner ready |
| `firstLine` | The first time on this device, the scanner downloads what it needs to read cards. After that it opens in a moment. |
| `size(done, total)` | 7.2 of 18 MB (one decimal, a trailing .0 dropped, the done figure bold) |
| `almost` | Almost ready |
| `reopen` | Starting the scanner |
| `barLabel` | Scanner download |

Kept as shipped: `view.looking`, `mode.fastLine`, `mode.normalLine`, `offlineBody`, `noStart`.
