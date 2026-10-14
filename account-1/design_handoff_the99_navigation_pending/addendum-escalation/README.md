# Addendum: escalation to the full screen

Brief: `docs/superpowers/design-briefs/2026-09-28-navigation-pending-escalation.md` (PR #1087).
Canvas: `The 99 - Navigation Pending · Escalation Addendum.dc.html`. It holds:
- E1, the clock;
- E2, the handoff at 1300 and 390;
- E3, the flash case;
- E4, the overlay in each of its states, plus every route's words;
- E5, the track thickness;
- E6, which navigations get the fallback.

`EscalationFrame.dc.html` is the parent's `HomeFrame` with the overlay added. `art/` is a copy of the parent's reference crops.
The parent handoff is unchanged. This addendum withdraws its R1 keep/drop list and its `shellCopy.loading` retire list. Its K1 kept-screen frames stand.

## Sequence (from the press)
| ms | What happens |
|---|---|
| 0 | The pressed slot or button takes its pending fill (parent handoff). |
| 120 | Pip (nav slots) or track (in-page button/row links) fades in, 160ms. |
| 400 | Still pending: the route's `LoadingScreen` overlay starts. `opacity 0 → 1`, **150ms ease-out**, no transform. `pointer-events: auto` on the overlay and `aria-busy="true"` on `<main>` from the first frame. |
| 550 | Fully shown. **No minimum hold.** |
| commit | `aria-busy` is dropped. The overlay takes `pointer-events: none` and fades `→ 0` over **120ms**, over the new page, which is already mounted and interactive. Then it unmounts. |

- **Flash rule (§4.1): (i) plus a 120ms exit.** A hold is rejected. It only affects fast connections: it delays ready content by up to about 220ms and does nothing on slow networks, where screens are up for 200ms or more anyway.
  The exit turns (i)'s hard cut at 550–690ms into a dissolve without delaying content. If Engineering wants (i) alone, drop the exit.
- **Entry (§4.2):**
  - The overlay covers the visible part of `<main>` only, pinned to the viewport: below the phone header, above the tab bar, and right of the rail. On a scrolled page it's centred in view.
  - The rail, the tab bar and the nav pip stay up and uncovered until the new page commits.
  - The in-page track lies inside `<main>`, so the overlay covers it. It has no exit of its own.
  - The screen's words are the pressed link's route: `shellCopy.loading[key]`, mapped as in E4.
- **Still regions** (Help me choose, the version rail): the overlay cuts in and out with no fade, and the crown is still (`still`).
  **Reduced motion:** it keeps both opacity fades, and the crown doesn't pulse.
- **Focus** stays on the pressed link, beneath the overlay. The overlay is `role="status"` (it is `LoadingScreen`).

## Track (§4.3): 1.5px
- 1.5px tall, `--fg-muted`, a 40%-wide segment, inside the border box, as in the parent handoff.
- **Timing change, flagged for audit (outside §4).** The segment gets only 120–400ms on screen, so the parent's 1.2s ease-in-out loop barely leaves the left edge.
  The new loop is `sweep 900ms linear -260ms infinite`, inside a wrapper with `pipIn 160ms ease-out 120ms both`. The segment is already on the button when it appears, and it crosses once before 400.
- Judged at 1× in E5, in the canvas. It hasn't been checked on a physical device. If it smears, go to 2px, not back to 1px.

## Scope (§4.4, audit item D)
**Gets the screen at 400:**
- Nav slot Links, with the pip.
- In-page button and row Links, with the track.
- Inline text Links, with no mark. They report for free, but a wrapping run of text has no box to hold a mark.
- Route changes started in code: the commit flow, and redirects after an action. The action button's own submitting state is their mark. Each call site needs a `startTransition` and a report into the provider, so list the sites before building.

**Doesn't:**
- Same-route query Links (filters and views). Covering the list being refined loses your place. They get no new wiring.
- Prefetched static routes, and back/forward (§5 b, c).

## Files and tests
- The overlay is shell-level: a provider fed by `PendingPip`, `PendingTrack` and the code-started call sites. It times 400ms from the press and renders `LoadingScreen` with the pending route's copy.
- `shellCopy.loading` keeps every key (§3). The route-to-key map in E4 matches the current `loading.tsx` files.
- The four kept `loading.tsx` files (`decks/[id]`, `decks/[id]/changes`, `decks/[id]/import`, `decks/new/choose`) stay until the overlay has been built and measured. Their links show their own screen at press, with no mark and no overlay.
- The other route `loading.tsx` files, and the root one, are replaced by the overlay. Without that, their boundary would commit at press and pre-empt the mark.
- `route-loading.test.ts`: the parent's allow-list inversion stands. Add a test that every route segment resolves a `shellCopy.loading` key for the overlay.
