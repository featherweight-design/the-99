# Handoff: Install onboarding (R1b)

Account 2 · 2026-11-15 · a light stateful addendum to the first-run tour (`design_handoff_the99_discovery_onboarding`). It points the tour at the shipped header Install button (`src/components/pwa/install-slot.tsx`) and its shipped sheet (`design_handoff_the99_push`, `ios-install-sheet.tsx`).

Brief: `docs/superpowers/design-briefs/2026-11-15-install-onboarding.md` (branch `brief/install-onboarding`).
Canvas: https://claude.ai/artifact/EYAvtkuyNtefUVyoFyMc28 (boards `Main`, `Browsers`, `Elsewhere`, `Spec`). Open the `.dc.html` files with `support.js` beside them. The canvas loads images from `/_blob/…`, and the files here use `art/`.

**R1 → R1b (Hugh, 2026-11-15).** R1 drew a new checklist row. Hugh asked to focus on the header button that already exists, so the row is withdrawn. Its art (`art/io-*`) and `scratch-gen/iopatch.diff` stay for the record.

**How it was drawn.** The frames are PNGs of the shipped components (`FirstRunChecklist`, `MobileHeader` with `InstallSlot`, `TabBar`, `NavRail`, and the `IosInstallSheet` body), rendered with the shipped CSS in Low Sun. They come from a scratch copy of main with `scratch-gen/ibpatch.diff` applied, which is the proposal as code, for reference only. That diff holds the `INSTALL` step in `tour-steps.ts`, the draft copy in `discovery.ts`, the slot's `tour:install` target, a scratch-only switch that makes the slot draw on the server, and the sheet split out of its portal. The tour card is TourRun's markup copied into `render-r1b.tsx`, and `post.js` places its cutout the way `cutoutFor` does. The boards come from `ib.py`.

## The calls

1. **The header button is the ask, and the tour points at it.** There's no new control. A last stop in the first-run tour lights the button and says why to use it. As the last stop, the tour is already over when the player leaves for Share.
2. **Last, after What's new, at 390 only.** It's added when the run starts if the slot draws then, decided once like the Credits stop. The kicker and diamonds count it: 8 of 8 with Credits, 7 of 7 without.
3. **Lit as a slot** (5px room, 14 corner) around the whole slot, Install and its ✕. The card docks above the tab bar like every phone stop. Title **Play it from your home screen**, a body per browser (only Safari's mentions alerts), a mono foot, and Back and Finish.
4. **The lit button can be selected on this stop.** That ends the tour (stamped done, like Finish) and runs the slot's own press: the sheet on iPhone, `prompt()` on Android. Finish only closes the tour, and the button stays.
5. **No new dismissal.** The slot keeps its shipped rules: ✕ means quiet for 30 days, and a second ✕ retires it. The tour runs once.
6. **No stop** wherever the slot doesn't draw: the installed app, in-app web views, iPad, Edge and other browsers, Android without a held prompt, a dismissed slot, and desktop (d9 call 1).
7. **How we know they installed. OPEN, Hugh's call. Recommendation: A, a server flag.** The installed app stamps `installedAt` on its first signed-in open, and the slot (and so the stop) stays away in every browser session of that account. Under B, an installed player keeps seeing the button in every Safari tab a friend's link opens. The first launch draws nothing.
8. **No About entry** (the brief's default). If About's tour entry counts stops, that count is Hugh's call at the next About batch.

## Gaps for engineering

- **G1 · `installedAt`** (option A only). A nullable timestamp on `user_prefs`, written once and idempotently by the installed app's first signed-in open. The shell passes it to `InstallSlot`, which draws nothing when it's set.
- **G2 · The stop.** `INSTALL` (target `tour:install`, registered by `InstallSlot`, kind `slot`), appended by `withInstallStop` when that target exists at the run's start at 390. On this stop only, presses pass through the cutout to the slot (lift the slot above the scrim, or cut a hole in the scrim). The press calls `onEnd(false)` and then the slot's `onPress`.
- **G3 · Counts.** Step 1's foot gets variants for one more stop (`footSeven`/`footEight`). The kicker and diamonds already come from the step list.
- **G4 · iOS keeps the installed app's sign-in separate from Safari**, so the player signs in once more on the first launch. Should the sheet say so? Hugh's call; it's left out.
- **G5 · Quick-return header.** The stop scrolls to the top before lighting, so the header is fully in view.

## Files

| File | What |
|---|---|
| `Main.dc.html` | B1 Safari stop, B1a after Finish, B1s the sheet |
| `Browsers.dc.html` | B2/B2s Chrome, B3/B3s Firefox |
| `Elsewhere.dc.html` | B4 Android, N1 no stop, D1 desktop 1300 |
| `Spec.dc.html` | calls, states, the open question, gaps, copy |
| `STATES-install-onboarding.md` | the state table |
| `install-onboarding · copy strings.ts` | new words, DRAFT for /copy-review |
| `art/` | the frames (`ib-*` R1b; `io-*` R1, and the shared no-stop and desktop frames) |
| `scratch-gen/` | `ibpatch.diff`, `render-r1b.tsx`, `post.js`, `ib.py`; R1's `iopatch.diff`, `render.tsx`, `io.py` |
