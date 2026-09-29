# Plan: navigation pending, with the escalation to the full screen

Deliverable 0 for the navigation-pending build. Sources:
- The parent handoff, `design/design_handoff_the99_navigation_pending/` (#1087): README, and `READINESS-audit.md` corrections 1–7.
- The escalation addendum and its audit, `…/addendum-escalation/` (#1100): Yellow, with engineering corrections 1–9 and no product question.

The two combine into one behaviour. A press paints its mark at 120ms. At 400ms, if the navigation is still pending, the route's `LoadingScreen` fades in over the page. **No loading screen is removed from the reader's view.** A direct load or refresh still streams one.

## What gets built

1. **`NavigationPendingProvider`** (client, in the shell):
   - **Starting the clock.** It holds one pending run: the target path and the start time.
     - `PendingPip`, `PendingTrack` and the inline reporter start it from `useLinkStatus().pending`.
     - A code-started navigation starts it from the `router.push` inside `startTransition` (escalation correction 3).
     - A reporter ignores a link whose path is the current one (correction 4).
   - **Rapid presses.** The clock runs from the first press of a run, and the words follow the last press. Only the last-pressed link stays pending, so the provider decides once per commit: a first link's `pending=false` and a second's `pending=true` arriving together must neither end the run nor restart its clock. A fake-timer test presses one target, moves to a second at 300ms, and asserts the screen at 400ms carries the second target's words.
   - **At 400ms**, if the run is still pending and its target is not a kept route, it mounts the overlay.
   - **At commit** (pathname change, or the pending flag clearing), the overlay fades out.
2. **The overlay.**
   - **Where it lives:**
     - It is a sibling of `<main>` in the DOM, not inside it (correction 2), because it is a `role="status"` live region.
     - It is fixed-position over the visible part of `<main>`: below the phone header (clamped to 0 when scrolled), above the tab bar, clear of `--about-sheet-h`, and right of the rail.
     - It sets `aria-busy` on the shell's `<main>` by ref, never by a `main` selector, since two set routes render a nested `<main>`.
   - **Timing:**
     - It fades in over 150ms ease-out and blocks pointer events from its first frame.
     - At commit it takes `pointer-events: none` and fades out over 120ms ease-out, then unmounts.
     - There is no minimum hold.
   - **Reduced motion** keeps both fades, departing from `globals.css:745` on purpose, with a comment saying so (correction 7). The crown doesn't pulse.
   - **Still regions** cut in and out, and when one joins the overlay it draws that route's own screen: for Help me choose, `ChooseLoading`, not `<LoadingScreen still>` (correction 9). None joins in this plan, since every still region is on a kept route.
3. **The route map** (`src/lib/shell/pending-routes.ts`): pathname to `shellCopy.loading` key, exactly as today's 17 `loading.tsx` files resolve.
   - `/decks/import` maps to `decks`, the screen it inherits today (correction 5).
   - The four kept routes are named as kept: `decks/[id]`, `decks/[id]/changes`, `decks/[id]/import` and `decks/new/choose`. They keep their files and their screen at press, with no mark and no overlay.
4. **The page-load fallback (the HIGH correction 1).**
   - The shell's `<main>` gets one `<Suspense>` around `{children}`.
   - Its fallback is a client `ShellLoading` that reads `usePathname()`, looks the route up in the same map and draws that `LoadingScreen`. The fallback is keyed on the pathname; the boundary is **not**, since re-keying it would remount it and show the fallback on every client navigation.
   - On a direct load or refresh it streams. On a client navigation the boundary has already resolved, so the old page stays up and the pip, track and overlay carry it.
   - **Proved by probe on the slow profile:** a slow document load of `/collection` shows its screen, and Home to `/commanders` shows the pip and then the overlay.
   - **The signed-out `/` gets no fallback, on purpose.** `Shell` returns bare children when there is no user, so that branch never meets this boundary. Its page awaits `auth()` alone and then draws a static landing. The root screen it inherited until now read "Setting the table / counting what you've got…", which describes a collection the visitor does not have. A signed-out visitor cannot navigate to any other app route, since each one redirects to sign-in, so nothing else is lost.
5. **The marks** (parent handoff and parent corrections):
   - **`PendingPip`** is a child of every unlocked `NavSlot` `<Link>`: a 4px diamond in `--fg`.
     - The slot's pending fill comes from the pip through `:has()` (parent correction 4). The rail's `transition-colors` must not fade it out on landing.
     - The pulse starts at its peak with a -320ms delay (escalation correction 6).
   - **`PendingTrack`** is a child of every in-page button or row `<Link>`: a 1.5px `--fg-muted` strip with a 40% segment.
     - It runs `sweep 900ms linear -260ms infinite` inside a `pipIn 160ms ease-out 120ms both` wrapper.
     - Pending overrides hover and takes the canvas's `--elevated-hover` / `--border-strong` / `--fg` (parent correction 1).
     - At DPR 1 it is screenshot-checked. If it snaps or smears, it goes to 2px under `max-resolution: 1.5dppx` only (correction 8).
     - The whole-row examples are `commander-row.tsx` and `set-index-view.tsx` (parent correction 2).
   - **Reduced motion** for both uses its own step rule (0s, 120ms delay, `both`), never the `animation: none` list, which would drop the delay and flash a ~95ms navigation (parent correction 5). The track's segment goes full width when held still.
   - **Inline text Links** carry a mark-less reporter child, since `useLinkStatus` must be read inside the Link. A sweep test over every `<Link>` in `src/` enforces this, with named exemptions: kept-route targets, same-route query Links, and the Links inside `PendingPip` and `PendingTrack` hosts.
6. **`route-loading.test.ts`** inverts to an allow-list of the four kept segments. The root and every other segment must have no boundary, and a new test requires every segment with a page to resolve a map key, with the kept routes exempt by name (correction 5).
7. **Code-started navigations** (corrections 3 and 4):
   - `deleteDeck` (`decks/actions.ts:678`) and `dismissAbout` (`about/actions.ts:22`) return the URL instead of calling `redirect()`, and their callers navigate client-side inside `startTransition`, reporting into the provider.
     - `dismissAbout` applies the overlay only when its `safeNext` target is not kept.
     - Their `redirect`-signals-by-throwing comments (`deck-delete-mode.tsx:54`) are rewritten.
   - Five `router.push` sites are wired now: `replace-flow.tsx:41`, `about-sheet.tsx:151`, `update-entry.tsx:213` and `:235`, and `import-entry.tsx:229`.
   - The nine that target kept routes are listed in the PR body and wait for those routes to join.
   - **As built (PR 3, 2026-09-29).** One hook, `usePendingPush`, runs each push as a transition and reports it from the calling component. It is wired at `replace-flow`, `update-entry`'s two `/decks/import` pushes and `import-entry`'s `/decks/new`. It is also wired at two sites this list predates: `nav.tsx`'s Go to step 1 (`/collection/replace`, from first-run PR 2) and the account menu's About (from PR 2's round 1).
     - **`deleteDeck` is not converted.** Its only caller is the `/decks` tile's menu, so its navigation goes to the page it is already on. The same-page rule would never escalate it, and `redirect()` stays.
     - **`dismissAbout` and `about-sheet.tsx:151` wait** for the About how-it-works PR C, which fences `about/actions.ts` and `about-sheet.tsx`. They land after it, in this PR if it is still open, or as a small follow-up.
8. **Stale docs, swept by hand** (parent correction 6): `design-tables/appshell.md:1952-1985`, `LoadingScreen`'s "eight segments" docstring, and `choose-loading.tsx:2-5`.

`shellCopy.loading` keeps every key. No copy changes, so no copy-review item. No About entry: this is perceived-performance chrome (both audits).

## Measurement

`measure:load` gains a **slow profile**: Chromium's Slow 4G preset through CDP `Network.emulateNetworkConditions`, set with `MEASURE_PROFILE=slow`.
- **Before:** taken on `main` before PR 1.
- **After:** taken on each PR, on `next start` against a scratch branch holding a `pull:staging` copy.
- **Reported in every PR body:** Home to `/commanders`, `/discover`, `/decks` and `/collection`; a direct load of `/collection`; and the deck page, unchanged, as the control.

## PR boundaries

None depends on an unmerged sibling. PRs 2 and 3 are under ~20 files and ~800 lines. **PR 1 is not, deliberately:** it is about 30 files, 13 of them the `loading.tsx` deletions. The deletions, the shell fallback that replaces them, and the provider that escalates to their screens cannot land apart. Deletions without the fallback lose the direct-load screen. The fallback without the deletions is never reached. The provider without either escalates to a screen the boundary has already drawn.

| PR | Contents | Proof |
|---|---|---|
| 0 | This plan. | Doc: merges on the bar |
| 1 | Provider, overlay, route map with its coverage test, the shell `<Suspense>` fallback, the 13 `loading.tsx` deletions, the `route-loading.test` inversion, `PendingPip` in `NavSlot`, `PendingTrack` in `ui/button.tsx`'s Link variants plus the two row links, the CSS (marks, overlay, reduced motion, DPR), the stale-doc sweep, and `measure:load`'s slow profile | Component tests for the provider clock (fake timers: nothing at 399ms, overlay at 400, kept routes never) and the overlay's attributes. **`probe:nav-pending`** on the slow profile at 1300 and 390: document load of `/collection` streams its screen; Home to `/commanders` shows the pip at ≥120ms, the overlay by ~550ms, `aria-busy` on the shell's `<main>` only, a press under the overlay goes nowhere, and the overlay fades out after commit; a button link's track at DPR 1 (screenshot); a kept route shows its own screen and no overlay. Mutations: the Suspense removed (the direct load shows no screen), and the 400ms gate set to 0 (overlay before the mark) |
| 2 | The inline-Link reporter sweep: every remaining `<Link>` gets a reporter child, and the sweep test lands with it | The sweep test fails on one reporter removed. The probe gains an inline text link reaching the overlay: an About entry's route link to `/discover`, since the card modal's name link goes to a kept route and never escalates, and `/collection`'s "By set" link is drawn as a chip rather than as text. **Named check (from #1108):** re-measure 390 Home's first client visit (slow profile, 7 runs, main vs branch) once #1108 and 2b's `/discover` window PR have both landed. #1108 measured it at +10% (2,338 → 2,578ms), because the `/discover` phone list stays mounted until Home lands. If it is still above +5%, find the cause in this PR, for example by unmounting the old list's off-screen rows while the new page loads. |
| 3 | The code-started navigations: `deleteDeck` and `dismissAbout` return URLs, and the five `router.push` sites are wired | Unit tests for each caller's `startTransition` report. The probe gains a delete to `/decks` and an About dismiss to a non-kept target, each reaching the overlay |

**The window between PR 1 and PR 2.** Inline text links to non-kept routes show no mark and no overlay: the old page stays up until the new one commits. Nav slots and button links, which are most navigations, are covered from PR 1. **Between PR 1 and PR 3**, the five code-started sites behave as today, less their deleted boundary screens. PRs 2 and 3 follow without a gap.

## Route × viewport inventory (feature-acceptance)

| Surface | 390 | 1300 | Shares with |
|---|---|---|---|
| Rail / tab bar slot pending (pip) | ☐ | ☐ | `NavSlot` (origin) |
| Button link pending (track), e.g. Home's "Browse commanders" | ☐ | ☐ | `ui/button.tsx` |
| Row link pending: commander row, set row | ☐ | ☐ | `PendingTrack` |
| Overlay over `/collection`, `/commanders`, `/discover`, `/decks`, `/about`, set pages | ☐ | ☐ | `LoadingScreen` |
| Direct load / refresh of a non-kept route (Suspense fallback) | ☐ | ☐ | `ShellLoading` → `LoadingScreen` |
| Kept routes: own screen at press, no overlay | ☐ | ☐ | their `loading.tsx` |

The contact sheet rows go in `docs/superpowers/inventories/navigation-pending.json`. Each is reached on the slow profile, since a warm local navigation never shows the overlay.
