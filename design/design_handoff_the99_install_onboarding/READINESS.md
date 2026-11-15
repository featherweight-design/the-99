# Readiness Review — Install onboarding (R1c)

**Verdict:** 🟡 Yellow
**Audited:** 2026-11-14 (handoff rebased onto `origin/main` at `62e922c86`)
**Related ticket(s):** design PR #2953; brief `docs/superpowers/design-briefs/2026-11-15-install-onboarding.md` (branch `brief/install-onboarding`); builds on #2943
**Plan PR target:** TBD

## Summary

Every state the build needs is drawn. That covers the Install stop for iPhone Safari, Chrome and Firefox (B1 to B3, with sheets B1s to B3s), Android with a held prompt (B4), and the shipped header after Finish (B1a). It also covers the no-stop cases (N1: installed app, in-app view, iPad, Edge or other browsers, no held prompt, a dismissed slot, `installedAt` set), the fallback row and what follows it (F1, F1s, F2), and desktop (D1). The handoff adds no new control. It reuses `InstallSlot`, `IosInstallSheet`, the tour's slot cutout and the first-run checklist's row box, so it uses only the shipped tokens. No Design round is needed.

The build still needs eng decisions on four points, and two of them correct the handoff's own engineering gaps:

- **(a) G6's trigger is wrong.** It says "the tour is stamped done". `tour_seen_at` is stamped when the tour is claimed, at its start (`src/app/tour-actions.ts:14`, `src/components/discovery/first-run-tour.tsx:154`). As written, the row would draw under the running tour. Because the header slot steps aside for the row, it would also remove the Install stop's own target.
- **(b) G2 misses the inert page.** It says presses "pass through the cutout". The whole page is `inert` while the tour runs (`first-run-tour.tsx:235`), and the card traps focus (`:256`), so the header slot cannot be pressed until it is exempted.
- **(c) G1 needs a migration.**
- **(d) The step list grows.** `stepsFor` goes from four module constants to eight.

Hugh owns one product call, how we know a player installed (README call 7), and a minor one, the re-sign-in line (G4). Copy goes to `/copy-review` before implementation.

## Per-dimension findings

### 🗺️ Scope clarity

- [✅] The boundary is clear: no new control, a last tour stop that lights the shipped slot, and R1's checklist row brought back only as a fallback for players who skipped the tour (README calls 1, 2 and 8). Non-goals are stated: no new dismissal (call 5), no About entry (call 9), and nothing on desktop (call 6, d9 call 1).
- [✅] Open items are logged and named as Hugh's calls: install tracking (call 7) and the re-sign-in line (G4).
- [✅] The R1 to R1b to R1c history is recorded. R1's `io-*` art and `iopatch.diff` are kept for the record, and the README says which parts are live: the fallback row uses R1's `install-row.tsx` and `pwaInstallCopy.row`.

### 🎭 State coverage

- [✅] Phone frames exist for every browser: B1, B2, B3, B4, B1a, N1, F1, F1s and F2. Desktop has D1 (`art/io-home-none-desktop.png`), and the desktop rule is "the tour as shipped". This meets the parity rule.
- [✅] The brief's "after a dismiss" is covered: F2 and N1 (slot dismissed). Its "first launch from the installed app (if A)" is answered in words, as "draws nothing" (call 7).
- [🟡] The fallback row is drawn only for Safari (F1, `io-home-safari-phone.png`). Chrome, Firefox and Android get it through the copy table (`installRowCopy.line`). Those frames would differ only in that line, and Android's press calls `prompt()` instead of opening the sheet. **Eng follows F1's layout for those three.**
- [🟡] The slot's ✕ is inside the cutout, so the slot can be dismissed mid-stop (STATES, last line: "just goes, and Finish ends the tour"). The rect then becomes null, and shipped `TourRun` treats a null rect as What's new's fallback: a centred card that drops the lit-control sentence (`first-run-tour.tsx:332`). **Eng keeps the card docked and drops only the ring.** This follows the phone dock every stop already uses.
- [🟡] Replays (`?tour=1`, dashboard mode) get the stop when the slot draws. The Spec board says so ("on a replay only if the button draws"); the README does not. Eng follows the Spec board.
- [✅] Signed-out visitors cannot reach this: the tour and the checklist are signed-in Home only. Loading and error states: the stop and the row are decided on the client after mount, so there is no loading state to draw. A failed `installedAt` read is treated as null.

### 🔌 Data contract

- [🟡] **G1 `installedAt` needs a DB migration (flagged for eng).** It is a new nullable `installed_at timestamptz` on `user_prefs` (`src/db/schema.ts:2156`), with no backfill. `user_prefs` carries the `user_data_touch` stamp trigger (`schema.ts:2151-2154`), so the write must go through only while the column is null (`where installed_at is null`, like `spendTourWrite`). Otherwise every standalone launch retires Home's and `/decks`' cached payloads.
  - The write is a server action. It is called from the standalone app's first signed-in document, gated by `isStandalone()` and once per launch (the app loader's `sessionStorage` pattern, `src/lib/pwa/launch-detect.ts`).
  - A forged call only hides the caller's own button, so it needs no further guard beyond `requireUserId`.
  - The read rides an existing shell read (`src/components/shell/shell.tsx` already reads `user_prefs` for `momentsSpent` at `:116`) and is handed to `InstallSlot`. It does not add a query per page.
  - This exists only under option A. Under option B, none of it is built.
- [🟡] **G6's premise is wrong** (top finding). "The row draws when the tour is stamped done" cannot work, because `tour_seen_at` is stamped by `spendTourAction` when the tour opens (`first-run-tour.tsx:154`; `src/lib/discovery/tour.ts:46`). It is not stamped at Finish. The same mistake appears in README call 4 ("stamped done, like Finish"); there it is harmless, because pressing the lit slot needs no stamp. **Eng rule:**
  - The row draws when Home's server data says the tour is not due (`tourDue` false), no `FirstRunTour` is running in this tab, the slot would draw, and `the99-install-row` is neither `seen` nor `retired`.
  - A tour that ends early in the current visit shows the row from that moment (`onEnd` without the stop reached).
  - Otherwise, while the tour runs, the row draws under the scrim and the slot steps aside, so the run's start finds no `tour:install` target and drops the stop.
- [🟡] **"The header slot steps aside while the row is on screen"** links two client components on separate trees: the shell's `InstallSlot` and Home's checklist row. Eng adds a small client signal between them, for example a context or an event alongside `install-dismissal.ts`. Pressing the row, or the header button, writes `retired`. The row's ✕ also calls `dismissOnce()` (G6).
- [✅] Android: `prompt()` is called in the press's own user activation (the slot's `onPress`), so `beforeinstallprompt` rules hold. If the prompt arrives after the run starts, there is no stop, and the fallback row covers that case (Spec call R1c).
- [✅] Every name the handoff uses exists: `iphoneInstallBrowser()`, `isStandalone()`, `takeEarlyPrompt()` (`src/lib/pwa/install-detect.ts`), `dismissOnce`/`dismissalState` (`install-dismissal.ts`), `cutoutFor` and the `slot` kind (`src/lib/discovery/tour-steps.ts:97`), and the Credits stop's "decided once at the run's start" (`first-run-tour.tsx:210`).

### 🧱 Codebase fit

- [✅] It uses no new tokens. The stop is the shipped tour card and cutout. The row is the Friends row's box, built only from `var(--…)` tokens (`scratch-gen/iopatch.diff`, `install-row.tsx`). Frames are Low Sun only. Because every surface uses shipped theme tokens, the six themes follow, and eng's contact sheet shows the stop and the row in all six.
- [🟡] **The step list.** `stepsFor` is "one of four module constants, so a run's list is fixed" (`tour-steps.ts:76-80`), and the effect at `first-run-tour.tsx:290` relies on that. Adding Install as a third dimension gives eight constants: `withInstallStop` over the existing four. Do not build a fresh array per render, as `ibpatch.diff`'s `withInstallStop(steps, install)` would if it were called inline. Decide `install` in the same `useState` initializer as `run` (`first-run-tour.tsx:210`): `targets?.targetRect("tour:install")` is non-null only while the slot draws, because `firstInDocument` skips undrawn elements (`targets-provider.tsx:63`), so desktop and the slot hidden while offline drop the stop.
- [🟡] **Registering the target.** `ibpatch.diff` marks the slot with `data-tour-target="tour:install"`, but nothing reads that attribute. Targets register through `<TargetBox id=…>` (`targets-provider.tsx:270`, as `account-menu.tsx:583` does). Add `"tour:install"` to `TOUR_TARGETS` (`src/lib/discovery/targets.ts:13`), and place a `TargetBox` inside a `relative` wrapper on the slot.
- [🟡] **G3 counts.** One stop more means 6 becomes 7 (`footSeven`, already shipped at `src/lib/copy/discovery.ts:220`) and Credits plus Install means 8, which needs a new `footEight`. The draft copy file has no `footEight`. Eng adds `'Eight stops · about a minute · ✕ skips the tour'` alongside `footSeven` for `/copy-review`. The foot's selector at `first-run-tour.tsx:414` (`run ? footSeven : foot`) becomes a count lookup.
- [✅] G5 (the stop scrolls to the top) is already the shipped behavior for every stop except step 1 and Credits (`first-run-tour.tsx:310-313`), so it needs no new code. The probe confirms the quick-return header is fully in view.
- [🟡] **`scratch-gen/` is reference only.**
  - `ibpatch.diff` holds two scratch-only changes that must not ship: the `__installPreview` server-draw switch in `install-slot.tsx`, and `IosInstallSheetFrame`, the sheet split out of its portal.
  - `scratch-gen/clerkstub/index.js` is a fake `@clerk/nextjs` that the board renderer resolves through `run.cjs`. Its user ("Hugh", `h@example.com`) is a placeholder, not a credential.
  - The README explains the folder, and its `tsconfig` and ESLint exclusions cover `design/**`. Nothing from `design/` may be imported or copied into `public/`, and the build re-derives its code from the diffs rather than applying them. Because the folder is explained, it can stay. If the build PR needs to slim the folder, `clerkstub/`, `run.cjs`, `page.mjs`, `post.js`, `css.mjs` and `shoot.cjs` are the render harness and can go. Keep the two `.diff` files and `render*.tsx`.

### ♿ Cross-cutting

- [🟡] **Accessibility of "select the lit button" (top finding).** `TourRun` makes the whole page inert (`useInertPage(host, true)`, `first-run-tour.tsx:235`) and traps focus in the card (`useDialogA11y`, `:256`). The handoff's G2 (lift the slot above the scrim, or cut a hole in it) solves only the pointer. **Eng:** on the Install stop only, exempt the slot from inert (`inertExemptProps`, as `IosInstallSheet` does) and include it in the card's focus cycle. Alternatively, keep the pointer pass-through and rely on Finish plus the header button "any time" (the foot says so) as the keyboard and screen-reader path. Prefer the first option.
  - The stop's live-region announcement already names the lit control (`tourCopy.litAria`) once `lit.install` = "the Install button" is added.
  - The row's two buttons are 44px targets, and its ✕ has `dismissAria`.
- [✅] Performance: no new request on any page. `installedAt` rides an existing shell read, and its write happens once per account.
- [🟡] Telemetry: the handoff states no expectation, and none is required. `installed_at` itself becomes the measure of how many players installed (option A).

### ⏰ Drift from reality

- [✅] The handoff was drawn from current code: #2943's Chrome and Firefox sheet variants (`src/lib/copy/pwa-install.ts`), the Credits stop, and the shipped crowd and offline rules. The rebase onto `62e922c86` was clean. Every file, component and route the handoff names exists as named.
- [🟡] There are two small inaccuracies in the handoff's code description, both covered above: the `data-tour-target` attribute (Codebase fit) and "stamped done" (Data contract).

### 📝 Decision log

- [✅] The handoff numbers its calls 1 to 9 and its gaps G1 to G6. Tentative items are marked: call 7 is "OPEN, Hugh's call", and G4 is Hugh's call. The R1b and R1c pivots are attributed to Hugh with dates.
- [✅] The brief's §4.4 ("one dismiss ends it for good") is met by the new ask, the fallback row's ✕. The header slot keeps its shipped 30-day rule (call 5), which is a deliberate and recorded departure.

## Eng-side clarifications (Yellow)

1. **Fallback-row trigger (G6).** Gate on `tourDue` false from the server, plus no tour running in this tab, plus the slot drawing, plus the local key being neither `seen` nor `retired`. Never gate on `tour_seen_at` alone, because it is stamped at the tour's start. A tour ended early in this visit shows the row right away.
2. **Lit-slot press (G2).** On the Install stop only, exempt the slot from the page's `inert` and include it in the card's focus cycle. A press calls `onEnd(false)` and then the slot's own `onPress`. Dismissing the slot mid-stop keeps the card docked (`fallback` must not centre it on this stop).
3. **Step list (G2, G3).** Eight module constants via `withInstallStop`, decided in `TourRun`'s initializer next to `run`, from `targets.targetRect("tour:install")`. Register `tour:install` in `TOUR_TARGETS` and through `TargetBox`, not `data-tour-target`. Add `footEight` and select the foot by count. Replays get the stop when the slot draws (Spec board).
4. **`installedAt` (G1, option A only).** A migration adds nullable `user_prefs.installed_at`. The write happens only while the column is null (because of the stamp trigger), from the standalone app's first signed-in launch. The read rides the shell's existing `user_prefs` read and goes to `InstallSlot`.
5. **Slot and row coordination.** A shared client signal so the header slot steps aside while the row is drawn. Selecting either one retires the row. The row's ✕ also counts as one header dismiss.
6. **Fallback row for Chrome, Firefox and Android.** Follow F1's layout with the per-browser line. Android's press calls `prompt()`.
7. **Six themes and a contact sheet.** The stop (B1) and the row (F1) at 390 in all six themes, plus D1 at 1300, plus a `ui-probe` that presses the lit slot and the row on a phone.
8. **Copy.** Every string in `install-onboarding · copy strings.ts`, plus `footEight` and `lit.install`, goes through `/copy-review` before implementation. The draft has no em dashes and uses US English. Only Safari's body promises alerts, which matches the brief's §3 ("push from a non-Safari install is unconfirmed"). "About 10 seconds" repeats the shipped sheet's own claim (`pwa-install.ts`).

## Questions for Hugh

- **How we know they installed (call 7).** **Recommend A, the server flag.** Without it, someone who installed the app keeps seeing the Install button, and the fallback row, in every Safari tab that a friend's invite or spare-request link opens. Those links are how the app spreads. The cost is one nullable column, one write per account and no new read. Under B, none of G1 is built.
- **Re-sign-in on first launch (G4).** iOS gives the installed app its own storage, so the player signs in again the first time they open it. **Recommend yes:** add one line to the sheet's last step, worded in `/copy-review`. This is copy, not a Design round.

## Decisions inherited

- The header button is the ask. The tour's last stop lights it, at 390 only, and is decided once at the run's start, like Credits (calls 1 and 2).
- The kicker and diamonds count the stop: 8 of 8 with Credits, 7 of 7 without (call 2).
- Pressing the lit slot ends the tour and runs the slot's own press. Finish only closes the tour (call 4).
- No new dismissal for the header slot: ✕ means 30 days quiet, and a second ✕ retires it (call 5).
- No stop wherever the slot does not draw, including desktop (d9 call 1), iPad, in-app views, Edge and others, and the installed app (call 6).
- The fallback row only for players who left the tour before the stop. It sits unnumbered under step 3, above the signature and Friends rows, and is retired for good on selection or ✕ (call 8, R1c, Hugh 2026-11-15).
- Only Safari's copy mentions alerts (brief §3).
- No About entry (call 9; About is image pages, and any label is at Hugh's discretion).
