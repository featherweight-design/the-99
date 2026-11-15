# Readiness Review — Card scan addendum: the scanner while it gets ready

**Verdict:** 🟡 Yellow
**Audited:** 2026-11-14 (cold read, against `origin/main` at 324383674)
**Related ticket(s):** design PR #2947; builds on #2917 (model cache); interacts with #2946 (WebGPU embedder, open)
**Plan PR target:** TBD (`docs/superpowers/plans/`)

## Summary

The addendum can be built as drawn. It adds no surface: four panel states (loading L1, L2, L4, plus the shipped
looking panel as L3) inside the shipped result panel, on phone and desktop, with copy, a determinate bar that counts
only what can be measured, and an accessibility section. Every state maps to a real signal in the code: cache presence
in `model-cache.ts`, the byte stream of each model download, and `onReady` after both sessions are created and warmed.
Nothing needs Design. The eng items are plumbing that does not exist yet (streamed progress, a cache-presence signal,
a `ready` input to the panel), one live-region trap, a close/reopen behavior the spec describes differently from the
code, the 0-400ms window on a cached open, and the overlap with #2946. The new strings go to `/copy-review` before
the build PR.

## Per-dimension findings

### 🗺️ Scope clarity

- ✅ Boundary stated: the shipped panel only; no scrim, overlay or screen; tray, Review, the sheet's list and Save
  untouched; photos and the blocked screen out of scope; D1-D5 stay unbuilt (README "The problem", "States").
- ✅ The load starts on open with no consent press, as `useFrameReader`'s mount effect already does
  (`src/components/collection/scan/frame-reader.ts:61-72`).

### 🎭 State coverage

- ✅ L1, L2, L4 and the L3 hand-off are drawn at 390 (`Loading-Phone.dc.html`); failure and offline stay the shipped
  `noStart` / `offlineBody` notices; no-`content-length` falls back to the indeterminate bar.
- 🟡 Desktop draws L1d and L3d only (`Loading-Desktop.dc.html`); L2 and L4 on desktop are described, not drawn. The
  phone pattern settles them: the same contents in the desktop result area (`PANEL_DESK`,
  `scanner-view.tsx:262`).
- 🟡 The first 400ms of a cached open is not drawn. The spec's own reasoning ("about 3s is too long to show Show a card")
  implies the shipped looking panel holds for those 400ms, then L4. See clarification 5.
- 🟡 What the panel shows between a failed load and its retry is not stated. See clarification 6.

### 🔌 Data contract

- ✅ Byte progress is measurable. Both pinned Hugging Face files answer the redirect with `200`, a `content-length`
  (3,185,226 and 14,756,557 bytes), no `content-encoding`, and `access-control-allow-origin: *` (curl, 2026-11-14), so
  bytes read equal the header and the browser can read it.
- ✅ The runtime is correctly left out of the bar. ORT 1.27's `ort-wasm-simd-threaded.wasm` is 13.5 MB decoded but
  2.5 MB on the wire (brotli), served `immutable` from jsDelivr, so the 18 MB bar covers about 88% of first-open wire
  bytes and L2 honestly covers the rest. On a cached reopen the runtime comes from the HTTP cache.
- ✅ The hand-off signal exists: `onReady` fires after both sessions are created and warmed
  (`frame-reader.ts:46`, `pipeline.ts:90-112`), surfaced as `onModelsReady` in `card-scanner.tsx:67`.
- 🟡 No progress plumbing exists yet: `modelBytes` reads `res.arrayBuffer()` and tees `res.clone()` into the cache
  (`src/lib/scan/model-cache.ts:70-71`). See clarification 1.
- 🟡 Cache presence is known inside `modelBytes` (`model-cache.ts:56`) but not exposed before the fetch, which is what
  picks L1 or L4. See clarification 2.
- 🟡 "Closing abandons it ... the next open starts L1 from 0" does not match the code: the byte load is shared
  module-wide (`pipeline.ts:48-69`) and is not aborted on close, so a quick reopen joins the download in flight.
  See clarification 3.

### 🧱 Codebase fit

- ✅ The boards' colors are the Kamigawa theme's tokens: `#FF4D9A` `--accent`, `#20222A` `--elevated`, `#959AAD`
  `--fg-muted`, `#E6E8F0` `--fg` (`src/app/globals.css:137-149`); the figure is `font-mono`. No new tokens.
- 🟡 No progressbar component exists in `src/components`. The indeterminate bar should reuse the existing sweep pattern
  (`search-progress`, `pending-sweep` in `globals.css:777,967`) rather than the board's `slide` keyframe; the L2
  highlight needs one new keyframe, off under reduced motion.
- 🟡 Bare IDs L1-L4 already name Review, Fix a card, Printing step and Saved in `STATES-card-scan.md:27-30`, and code
  comments cite them (`use-card-scan.ts:24`). See clarification 9.
- ✅ Copy follows the convention: a new `collectionEditCopy.scan.loading` group (`src/lib/copy/collection-edit.ts`),
  `CopyPart` for the bold figure as `wishlist.ts` does. No em dashes, US English. Kept keys exist as named:
  `view.looking` (:571), `mode.fastLine` (:566), `mode.normalLine` (:568), `offlineBody` (:549), `noStart` (:546).

### ♿ Cross-cutting

- ✅ Accessibility is specified: a named `progressbar` with `aria-valuenow` on L1, none on L2 and L4, focus left on
  ✕/Stop, heading changes only announced.
- 🟡 The whole panel sits inside the polite live region (`scanner-view.tsx:90`), so the changing MB figure would be read
  out on every update. See clarification 4.
- 🟡 The L2 board's bar carries `aria-valuenow="100"` (`Loading-Phone.dc.html`, the `.bar.warm` element) while the
  README says L2 has no value. The README wins.
- ✅ Performance: the spec asks for throttled updates (a few per second) and no figure animation.
- ✅ Telemetry: the existing start-up marks (`src/lib/scan/marks.ts`, `scan:*-model` with `from: cache|network`)
  already record which path an open took; nothing new is required.

### ⏰ Drift from reality

- ✅ Every file, key and component named exists on `origin/main` at audit time; the handoff is two days old and lands on
  the code it describes (#2917's cache).
- 🟡 Small naming drift: the README places `onModelsReady` in `frame-reader.ts`; it is `card-scanner.tsx:67`, and the
  hook's parameter is `onReady`.
- 🟡 #2946 (open) rewrites the cache step into `pinnedCache` / `pinnedBytes`, shared by the models and the new 24.3 MB
  WebGPU runtime cache (`scan-ort-*`). The addendum does not mention it, which is correct (that download starts after
  `scan:answer-drawn` and never gates readiness), but the progress hook must not pick it up. See clarification 8.

### 📝 Decision log

- ✅ The four calls (determinate bar, shipped panel, hand-off, quiet reopen) are stated as decisions with reasons;
  engineering notes are marked as "not design calls"; out-of-scope items are listed.

## Eng-side clarifications (Yellow only)

1. **Streamed progress.** Read each model download as a stream, counting bytes, while still teeing a copy into Cache
   Storage and hashing the whole buffer before use (`model-cache.ts:70-71`). Pin each file's byte size beside its
   SHA-256 in `models.ts` (3,185,226 and 14,756,557, from Hugging Face's `X-Linked-Size`), so the total is known with
   or without the header; fall back to `content-length`, then to the indeterminate bar only when neither matches.
   Figures use decimal MB (which is how 3.2 and 14.8 are already quoted), so the real total reads **17.9**, not the
   boards' "18"; the boards' figures are illustrative.
2. **L1 or L4 is decided on cache presence, at once,** not after 400ms: expose whether each file was found in the cache
   (a probe or a first progress event carrying `from`). A cached file that fails its hash and downloads again moves the
   panel to L1 with that file's bytes counted. With one file cached, the total is the other file's size.
3. **Close and reopen mid-download.** Keep the shared in-flight load (`pipeline.ts:48-69`) rather than aborting it: it
   saves the player's data, and the spec says the copy never promises to resume, so a reopen that shows the bar part
   full is within the spec. The bar reads the shared load's progress, not a per-mount counter. If the plan prefers the
   spec's literal "from 0", it must add an abort on close.
4. **Live region.** Keep the MB figure out of the announced text (`aria-hidden` on the figure, the value carried by the
   progressbar), so the polite region (`scanner-view.tsx:90`) announces only the headings: Getting the scanner ready,
   Almost ready, Show a card to the camera (or Starting the scanner on a reopen).
5. **The first 400ms of a cached open** shows the shipped looking panel; L4 replaces it at 400ms if `onReady` has not
   fired. Because L4 keeps the mode line where the looking panel has it, both swaps change only the heading and the bar.
6. **A failed load.** A failure clears the attempt and the next frame retries with a fresh one (`frame-reader.ts:53-58`),
   and the shipped notice shows after three failures (`use-card-scan.ts:259`, `READ_FAILURES_TOLD`). The panel stays
   in L1 (or L4) through the retries, its bar following the new attempt; the notice is the shipped one, unchanged.
7. **The `ready` input.** Lift `onModelsReady` into scanner state and pass it to `ScannerView`; the `looking` panel
   (`scanner-view.tsx:281`) renders L1/L2/L4 while not ready. Frames are not processed before ready (`readFrame` awaits
   the load), so no other panel can appear first. The 150ms cross-fade follows the shipped motion tokens and is off
   under `prefers-reduced-motion`.
8. **#2946.** Whichever of #2946 and this build merges second rebases onto the other. Progress is an option on the
   model download only, so the WebGPU runtime's fetch through the shared `pinnedBytes` never feeds the bar and never
   puts the panel back into a loading state.
9. **IDs.** In the plan, tests and comments, call these states "loading L1-L4" (or LD1-LD4), never bare L1-L4, which
   already name the review states in `STATES-card-scan.md`.
10. **Copy for `/copy-review`.** `firstLine` says "After that it opens in a moment", which is untrue where Cache
    Storage is unavailable (`model-cache.ts:33-38`: some private windows), since every open there downloads again.
    Copy-review decides whether to hide the line in that case or reword it. Wording only, not a Design gap.

## Decisions inherited

- No scrim, overlay or extra screen; the camera, ✕/Stop, Auto/Normal and the light all work while loading, and a mode
  chosen while loading is the mode the scanner reads with.
- No outline while loading; no "ready" message, toast or sound at the hand-off.
- The bar counts the two model files only, never the runtime; L2 ("Almost ready", a highlight on the full bar) covers
  the runtime and the warm-up.
- L4 waits 400ms, shows no figures and no first-time line.
- ✕/Stop closes at once with no confirm; the copy never promises to resume.
- `offlineBody` and `noStart` stay as shipped; the blocked screen and photos are unchanged.
- D1-D5 stay unbuilt.
- `design/` is reference only: the PR adds files under `design/` alone, and nothing from this addendum may be imported
  into `src/` or copied into `public/`.
