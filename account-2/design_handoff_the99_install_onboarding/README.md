# Handoff: Install onboarding (R1)

Account 2 · 2026-11-15 · a light stateful addendum to the first-run checklist (`design_handoff_the99_first_run_onboarding`). It reuses the shipped Add to Home Screen sheet (`design_handoff_the99_push`, `iPhone.dc.html`; `src/components/pwa/ios-install-sheet.tsx`).

Brief: `docs/superpowers/design-briefs/2026-11-15-install-onboarding.md` (branch `brief/install-onboarding`).
Canvas: https://claude.ai/artifact/EYAvtkuyNtefUVyoFyMc28 (boards `Main`, `Browsers`, `Elsewhere`, `Spec`). Open the `.dc.html` files with `support.js` beside them. The canvas loads images from its asset store (`/_blob/…`), and the files here use `art/`.

**How it was drawn.** Every frame is a PNG of the shipped components (`FirstRunChecklist`, `MobileHeader`, `TabBar`, `NavRail`, and the `IosInstallSheet` body), rendered with the shipped CSS in Low Sun. They come from a scratch copy of main with `scratch-gen/iopatch.diff` applied. The diff is the proposal as code, for reference only. It contains `install-row.tsx`, the `install` slot on the checklist and the draft copy. The sheet body is split out of its portal so it renders on the server. Clerk is stubbed (`scratch-gen/clerkstub`). The recipe is the A3 one (`design_handoff_the99_public_landing/scratch-gen/a3`). `io.py` writes the boards.

## The calls

1. **A checklist row, not a tour stop.** It's an unnumbered row in the first-run checklist, under step 3 and above the signature, Add your friends and Choose your news rows. The tour explains things in place, and installing sends the player out to the Share menu partway through its overlay. Welcome and the About line are banners. A Home card after the first deck comes after the first visit has already been spent in a tab. The kicker stays at Step 1 of 3.
2. **The row.** It uses the Friends row's live box (radius 14, 56px floor, `--surface-inset` on `--border-strong`, 7/8px extra above it). The header slot's install glyph sits in the numerals' 22px slot, in an accent outline like Choose your news' slot. The title is **Install The 99** (the slot's own name), with a browser line under it. There are two presses: the row (min 44px tall) and a bare ✕ (44×44).
3. **Select.** On an iPhone it opens the shipped `IosInstallSheet` for that browser, unchanged. Got it closes the sheet, and the row stays. On Android it calls the held `prompt()`. If accepted, the row goes on `appinstalled`. If declined, the row goes for the visit and nothing is stored.
4. **One ask at a time; the ✕.** While the row is mounted, the header's Install slot draws nothing. The row's ✕ retires the row for good (`the99-install-row` in local storage) and counts as one header-slot dismiss (`dismissOnce()`). The slot is then quiet for 30 days, returns once, and is retired by a second ✕, as shipped. The player keeps a way back without being asked twice in one visit.
5. **Who sees no row:** the installed app, in-app web views (they can't add), iPad, Edge and other unsourced iPhone browsers, Android with no held prompt, and desktop (d9 call 1: the browser's own button covers it). For all of these the checklist is unchanged.
6. **Copy by browser.** Only Safari's line mentions alerts. Push from a Chrome or Firefox install is unconfirmed, so those lines don't promise it.
7. **How we know they installed. OPEN, Hugh's call. Recommendation: A, a server flag.** The installed app stamps `installedAt` on its first signed-in open. Every browser session of that account then stops asking, for both the row and the header slot. Under B (a local ✕ only), a player who has installed is still asked in every Safari tab that a friend's link opens, and invites and spare requests arrive exactly that way from Messages. The first launch draws nothing.
8. **No About entry** (the brief's default).

## Gaps for engineering

- **G1 · `installedAt`.** A nullable timestamp on `user_prefs`. A client effect in the shell calls a server action once, when `isStandalone()` is true and the reader is signed in and has no stamp yet. The write is idempotent. The reads that decide first run already touch `user_prefs`, so this adds no round trip. (Under B, drop G1.)
- **G2 · One decision.** A shared `useInstallAsk()` (browser, held prompt, standalone, dismissal, `installed` from the server) feeds both `InstallSlot` and the row, so they never disagree. The slot hides while the row is mounted.
- **G3 · iOS keeps the installed app's sign-in separate from Safari.** The player signs in once more on the first launch. Hugh's call: should the sheet say so? This round leaves it out.
- **G4 · Android decline.** After `userChoice` returns `dismissed`, the row goes for the visit, and Chrome decides when to offer the prompt again.

## Files

| File | What |
|---|---|
| `Main.dc.html` | I0 (whole first-run page), I1 Safari row, I1s Safari sheet |
| `Browsers.dc.html` | I2/I2s Chrome, I3/I3s Firefox |
| `Elsewhere.dc.html` | I4 Android, N1 no row, D1 desktop 1300 |
| `Spec.dc.html` | calls, states, the open question, gaps, copy |
| `STATES-install-onboarding.md` | the state table |
| `install-onboarding · copy strings.ts` | new words, DRAFT for /copy-review |
| `art/` | the frames |
| `scratch-gen/` | `iopatch.diff`, render scripts, `io.py` |
