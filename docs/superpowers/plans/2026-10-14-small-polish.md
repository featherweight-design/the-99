# Small polish: implementation plan

Brief: `docs/superpowers/design-briefs/2026-10-14-small-polish.md`. Handoff: `design/design_handoff_the99_small_polish/`
(R2, approved by Hugh 2026-10-14; PR #1756), with the post-audit decisions at the foot of its README.

Five independent items, all cosmetic or a loading state. **No About entry and no `ABOUT_VERSION` bump** (brief §The About
entry; every item restyles or retimes something a reader already knows). No switch: each PR ships live.

## Standing rulings (not re-litigated)

- **One lock glyph, `Lock`**, in LockMark's language (README §1). The first-run card ink moves to `--fg-locked`.
- **A new `--fg-placeholder` token**, hex in all six themes; no `--fg-faint` use moves (README §2).
- **Two motion classes, one kept curve.** `--motion-ease-out` names `cubic-bezier(0.2, 0.7, 0.2, 1)`. `anim-stack-rise` and
  `anim-phone-card-enter` KEEP it, with the 100ms delay and 320ms duration on tokens (README decision 1; a ratified curve is
  not retired by an inconsistency in a table).
- **The precon skeleton is tiles, not the crown**, on `--surface-sunken` art boxes like the shipped tile (decision 3). The open
  precon keeps the shared decks screen through its own boundary (decision 4).
- **The token tile is one line taller than a card tile and no more**; makers and `I have one` move to Token details; a refused
  press is a deck toast (README §5).
- **Copy:** two placeholder strings (`Loading precons`, `<name> token`), settled by `/copy-review` before PR C and PR D merge.

## PR boundaries

Eight PRs, each from `main`, none stacked, each under ~20 files. Independent, so the order is only priority; merged
one at a time.

| PR | Item | Contents | ~Files |
|---|---|---|---|
| 1 | 2, placeholder | `--fg-placeholder` in the six `globals.css` theme blocks; the 9 class sites in 7 files; `filter-panel.tsx:896` comment; `deck-import.md` and `deck-notes.md` rows. A test reads `globals.css` and fails when a theme lacks the token or a measured ratio on `--surface-sunken` is under 4.5 | 13 |
| 2 | 1, lock | `ui/lock.tsx` (`sm`, `md`, `lg`, `open`, `ink`); `Padlock` and `LockMark` become callers or are deleted; 4 nav and first-run sites, 7 deck sites; tests updated; design tables naming the old glyph sizes | 16 |
| 3 | 4, skeleton | `ui/tile-skeleton.tsx`; `app/decks/precons/loading.tsx` and `[fileName]/loading.tsx`; `pendingRouteFor` (list kept, open precon unchanged); `shellCopy`; tests | 10 |
| 4 | 5, token tile | `token-tile.tsx` one-line foot and rules text inside the frame; the `In this deck` box for a token in card details; `useTokenPress` announces through a deck toast; grid `items-stretch`; copy; tests | 12 |
| 5 | 3, E6 | the retune table in `globals.css`, `--motion-ease-out`, the reduced-motion list; `OVERLAY_OUT_MS` to 140; the stack drop's exit; tests pin each class's duration, delay and curve | 8 |
| 6 | 3, E7 | art brighten on the four tile families under `@media (hover: hover)` | 7 |
| 7 | 3, E9 | staggered Show more, one hook and its callers | 12 |
| 8 | 3, E8 | count-up, one component and the figures listed below | 8 |

PR 5 before 6 to 8, since they use its tokens. PRs 1 to 4 are independent of everything.

## Engineering resolutions (approved with the audit)

- **Overlay exit timer.** `pending-overlay.tsx` unmounts on a JS timer matched to `overlay-out`, which is 120ms today and 140ms
  after PR 5. One constant is shared by the CSS value's test and the timer.
- **The precon loading boundary.** A `loading.tsx` under `decks/precons` is also the boundary for `decks/precons/[fileName]`,
  so the open precon gets its own that renders the shared decks `LoadingScreen`; `pendingRouteFor` returns `kept` for the list
  only. The skeleton follows the stored view when the client can read `precons_view` (README G5); otherwise tiles.
- **The deck toast slot** is shared with the got-it receipt: one toast at a time in that slot, the newest replacing the
  older, so a token refusal and a receipt cannot overlap.
- **The stack drop** (`card-modal.tsx`, WAAPI, 200ms ease-in) takes the exit rule, about two-thirds of its entrance on the
  same curve.
- **E8's figures** are listed by engineering. A count is a standalone whole number, never money, never a percentage, 10 or
  more. The copy functions that build a sentence around a number (the Home kicker, the commitments counts) return parts so the
  number draws in its own `tabular-nums` span; the sentence is what a screen reader hears. The final inventory is the first
  commit of PR 8, from a grep of the two surfaces, and any figure it cannot split without rewriting copy is left out and
  named in the PR.

## Verification

Per PR: `pnpm typecheck`, targeted tests, the border-collision and token checks, and a browser measurement at 390 and 1300 for
anything drawn (measurements in the PR body). The motion PRs carry a probe that reads each class's computed `animation-*`
values. UI PRs run `design-review` and `feature-acceptance`.

## Out of scope

E5 (a fade on route content after a loading screen): its status was never confirmed (README G7). Moving the other grids to
`TileSkeleton`: they adopt it when their loading is next touched.
