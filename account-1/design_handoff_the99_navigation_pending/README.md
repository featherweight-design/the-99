# Navigation pending: when a loading screen shows at all

Canvas: `The 99 - Navigation Pending.dc.html`. R1 is the rules table, P1 the nav slot (rail at 1300, tab bar at 390), P2 an in-page link, P3 the in-page options (3c chosen), T1 the timing, and K1 the kept screen inside the shell.
The frames are the real signed-in Home (`HomeFrame.dc.html`, from `components/home/*`). Its art (`art/`) is cropped from a production screenshot, as reference only.
Source: `docs/superpowers/perf/2026-09-27-after-pr6.md`, §The navigation floor. No skeleton is redrawn.

## The rule
A route keeps a `loading.tsx` only if its median client navigation is **≥ ~700ms**. Every other route has **no boundary
between it and the root layout**, so Next keeps the current page up until the next one is ready (~95ms warm instead of ~315ms).
The pressed control shows it's working.

## Files
**Delete:** `app/loading.tsx` (root), `about/`, `collection/`, `collection/proxies/`, `collection/replace/`,
`collection/replace/summary/[uploadId]/`, `collection/sets/`, `collection/sets/[code]/`, `commanders/`,
`commanders/[slug]/`, `discover/`, `decks/`, `decks/new/` (its pathname branch to `ChooseLoading` goes with it).
**Keep, unchanged:** `decks/[id]/`, `decks/[id]/changes/`, `decks/[id]/import/`, `decks/new/choose/`.
The `[id]` children would meet `[id]`'s boundary anyway, because it's keyed per child segment.

Unmeasured deletions (collection sub-routes, `/commanders/[slug]`, `/decks/new`, and choose on the keep side): time them with
the lane's in-page script before merging, and move any route that crosses ~700ms to the other list.
The call Hugh may overrule is /collection. Keeping its screen costs ~30ms, but it would flash on every revisit. A `loading.tsx` can't be first-visit-only.

## Pending signals
Both come from `useLinkStatus().pending` and appear after a **120ms CSS delay** (not a timer), so a ~95ms navigation never paints
either. Both clear when the page lands, with no exit. Neither signal uses `--accent`, because colour is status (Refresh rule 3). Both are `aria-hidden`: focus stays on the link.

### Nav slots: pip (P1)
- A 4px square rotated 45°, `--fg`, centred `bottom: 2px` in the 38px rail slot and `1px` in the 52px tab slot.
- The slot holds `--elevated-hover` + `--fg` in the rail, and `--fg` with no fill in the tab bar. The current page keeps `aria-current` and its fill until the new page paints.
- `pipIn` (160ms fade), then the existing `anim-dots` (`dots`, 1.2s, 0.25 ↔ 1).

### In-page button links: bottom-edge track (P2, P3 option 3c)
- An `overflow:hidden` 1px strip, `position:absolute; left:0; right:0; bottom:0`, inside the button's border box. In it, a 40%-wide
  `--fg-muted` segment animates `translateX(-100%) → translateX(250%)`, 1.2s ease-in-out, infinite, with a 120ms delay.
  It loops and never fills: indeterminate, not progress.
- The button keeps its hover fill (`--elevated-hover`) while pending. Box, padding, radius and label are unchanged. The button needs
  `position:relative; overflow:hidden`.
- **Reduced motion / still regions:** no segment. The hairline is held at `--fg-muted` instead (3b's end state).
- **Open check:** 1px was judged at 2× in P3. Check it at 1× on device. If it's too faint, go to 1.5px, still inside the border.
- For a whole-row or tile link (a resume row, a deck tile), the same strip runs along the row's bottom edge.

### Scope
Every unlocked `NavSlot` `<Link>` and every in-page `<Link>` to another route. Locked slots are spans and never pending. Links
into a kept-screen route show neither signal, because the screen commits at once and pending ends. There's no page-level progress line.
Two components: `PendingPip` and `PendingTrack`, each a child of its `<Link>`.

## Tests and copy
- `route-loading.test.ts` inverts. Instead of "every page owns a loading.tsx", it becomes an allow-list
  (`decks/[id]`, `decks/[id]/changes`, `decks/[id]/import`, `decks/new/choose`), and it asserts that no other segment, the root included, has a boundary.
  Drop the discover-words test.
- `shellCopy.loading` keeps `decks`, `deckNew` (ChooseLoading's form address), and `deckUpdate`. It retires `home`, `collection`, `about`,
  `proxies`, `commanders`, `sets`, `setGrid` and `discover`.
- `LoadingScreen`'s docstring ("the eight segments") needs updating. Its markup is unchanged. K1's crown and the rail and header marks are transcribed from `ui/crown.tsx` and `marks.tsx`.
- Measure: nav from Home to /commanders, /discover and /decks at ≤ ~110ms. The deck page is unchanged.
