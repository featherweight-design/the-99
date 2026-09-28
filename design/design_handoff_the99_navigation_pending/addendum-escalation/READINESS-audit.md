# Readiness audit: navigation pending, escalation addendum

**Verdict: 🟡 Yellow.** Design answered all four open questions in brief §4, and nothing in the addendum contradicts §3's locked items or §5's engineering notes. Every gap below is an engineering correction. **No product question is open for Hugh.** One would open if the page-load fallback in correction 1 fails its probe.

Audited against `origin/main` at `330135c6d`, with the brief at `docs/superpowers/design-briefs/2026-09-28-navigation-pending-escalation.md`. Design delivered no READINESS file of its own for this addendum.

## What checks out

- **The sequence** (README `:15-22`):
  - the mark at 120ms;
  - at 400ms, if the navigation is still pending, the overlay fades in over 150ms (ease-out, no transform) and is fully shown at 550 (400 + 150);
  - no minimum hold;
  - at commit it takes `pointer-events: none` and fades out over 120ms over the live new page, so nothing delays content.
  
  This agrees with brief §3.
- **The overlay.** It sets `aria-busy` on `<main>` and blocks pointer events from its first frame. Focus stays on the pressed link. It is drawn over `<main>` only, so the rail, the tab bar and the nav pip stay live.
- **The loading copy.** The canvas's 11 entries match `shellCopy.loading` (`src/lib/copy/shell.ts:22-83`) word for word. Its route map (canvas `:325-329`) assigns a key to 16 of the 17 `loading.tsx` files. The one it leaves out is `/decks/new/choose`, a kept route whose file re-exports `ChooseLoading` rather than naming a `shellCopy.loading` key. Two of its paths are not the app's: it writes `/replace/summary/[uploadId]` for `/collection/replace/summary/[uploadId]` (canvas `:326`), and it has no `/decks/import` (correction 5). The retire list is withdrawn (README `:13`, `:54`).
- **The kept files.** `decks/[id]`, `decks/[id]/changes`, `decks/[id]/import` and `decks/new/choose` keep their own screen at press (README `:55`). `/collection`'s file goes and the overlay covers it (README `:56`), as Hugh ruled.
- **Tokens.** No new token. `--bg`, `--accent`, `--accent-strong`, `--fg`, `--fg-muted`, `--fg-faint` and `--elevated-hover` are declared in all six themes.
- **About.** None owed. This is perceived-performance chrome and adds no capability.

## The open questions, as Design drew them

1. **Flash rule:** option (i), a 150ms fade-in, plus a 120ms fade-out at commit (README `:24-25`). A hold is rejected, because it delays ready content by up to 220ms on fast connections and does nothing on slow ones.
2. **Entry:** opacity only (README `:26-30`).
   - The nav pip is outside `<main>`, so it stays up until commit.
   - The in-page track is covered by the overlay, with no exit of its own.
3. **Track:** 1.5px (README `:35-39`), judged at 1x in the canvas and not yet on a device. If it smears, go to 2px.
4. **Scope** (README `:41-50`):
   - Gets the fallback: nav slot Links, in-page button and row Links, inline text Links (no mark), and route changes started in code.
   - Does not: same-route query Links, prefetched static routes, back and forward.

## Engineering corrections

1. **Page loads keep the screen.**
   - Deleting the 13 non-kept `loading.tsx` files (README `:56`) also removes the streamed fallback on a page opened directly or refreshed, which the overlay cannot reach.
   - Add one `<Suspense>` around `{children}` in the shell's `<main>` (`src/components/shell/shell.tsx:55`). Its fallback is a client `LoadingScreen` that picks its copy by pathname from the overlay's route map.
   - On a page load it streams. On client navigations it is already showing, so the old page stays up.
   - Prove it with a probe: a slow page load of `/collection` shows the screen, and Home to `/commanders` shows the pip.
2. **The overlay lives outside `<main>` in the DOM.**
   - It is `role="status"`, and a live region inside an `aria-busy` subtree may not be announced.
   - It is fixed-position, so its geometry is unchanged.
   - Target the shell's `<main>` by ref. `collection/sets/page.tsx:29` and `collection/sets/[code]/page.tsx:23` each render a nested `<main>`.
3. **The clock starts at the navigation.**
   - For code-started navigations, the 400ms runs from the `router.push` inside `startTransition`, not from the action's button.
   - `deleteDeck` (`decks/actions.ts:685`) redirects to `/decks`, a non-kept route. It returns the URL and navigates client-side instead.
   - `dismissAbout` (`about/actions.ts:25`) redirects to `safeNext(next)`, wherever the reader was headed, which may be a kept route (a reader gated on `/decks/abc`). It also returns the URL and navigates client-side, and the overlay applies only when that target is not kept.
   - `decks/actions.ts:489` targets a kept route and waits.
4. **The call sites.**
   - Five code-started navigations are wired now: `replace-flow.tsx:41`, `about-sheet.tsx:151`, `update-entry.tsx:213` and `:235`, and `import-entry.tsx:229`.
   - The nine that target kept routes wait for those routes to join.
   - Inline text Links carry a reporter child, since `useLinkStatus` must be read inside the Link. A sweep test over every `<Link>` enforces it.
   - A reporter ignores a link whose path is the current one.
5. **The route map covers every page.** The canvas's map is a drawing, not the build's map; the build writes its own from `src/app`.
   - `/collection/replace/summary/[uploadId]` maps to `collection`. The canvas writes it as `/replace/summary/[uploadId]` (`:326`); use the real path.
   - `/decks/import` maps to `decks`, which is the screen it inherits today. The canvas does not list it.
   - `/decks/new/choose` is kept, and its screen is `ChooseLoading`: `shellCopy.loading.deckNew` on the form address, and the results header plus `ResultsSkeleton` on a results address. The new test ("every segment with a page resolves a key") exempts the kept routes by name until they join the overlay.
6. **The pip starts at its peak.** Its pulse runs with a -320ms delay, so it does not snap from 1 to 0.25 at 280ms (canvas `:246-247`).
7. **Reduced motion.**
   - The overlay keeps its fades. This departs from the app's rule (`globals.css:745-768`) on purpose, because the fade is what prevents the flash. Say so in a comment where it is built.
   - The pip and the track follow the parent audit's correction 5, and the track's segment goes full width when held still.
8. **The track at 1x.**
   - Chromium and WebKit snap an untransformed box to whole pixels, so 1.5px may paint as 1px or as a soft 2 rows.
   - Screenshot it at device pixel ratio 1. If it snaps or smears, use 2px under `max-resolution: 1.5dppx` only.
9. **Still regions.**
   - `LoadingScreen` already has `still` (`loading-screen.tsx:15`).
   - When Help me choose joins the overlay, the overlay draws what `ChooseLoading` draws for that address, not `<LoadingScreen still>` everywhere. On a results address that means the results skeleton (the handoff's 5c), not the crown screen.
   - The parent audit's line saying still regions have no mechanism is superseded.

## Noted, not blocking

- The README (`:38`) says the new loop crosses once before 400. By its values it covers about half the strip. It is built as drawn.
- The exit's easing is unspecified. It takes the entry's ease-out.
- Rapid presses: the clock runs from the first press of a pending run, and the words follow the last press.
- Keyboard users can still activate links under the overlay. Only pointer events are blocked.
- The overlay adds a second `h1` over the old page.
- The overlay's top is the phone header's bottom edge, clamped to 0 when scrolled. Its bottom clears the tab bar and the About sheet's reserve (`--about-sheet-h`).

## Copy review

- "centred" in the README (`:27`) and the canvas (`:162`, `:305`): use "centered".
- `/decks/import` inherits "Shuffling up / counting the 99…". Consider a key of its own.
- No shipped strings change.
