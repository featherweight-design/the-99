# Design Property Table — Navigation pending (PR 1)

Sources: `design/design_handoff_the99_navigation_pending/` (README, `READINESS-audit.md` corrections 1–7)
and the escalation addendum's audit (corrections 1–9, #1100). Where the addendum changed a figure
the parent drew, the addendum's figure is the one listed, and the row says so. Verified against the
build in this PR; every row reads ✅.

## Component: PendingPip (nav slot, P1)

| Property | Mobile (tab slot, 52px) | Desktop (rail slot, 38px) | Built | |
|---|---|---|---|---|
| shape | 4px square rotated 45° | same | `size-[4px] rotate-45` | ✅ |
| ink | `var(--fg)` | same | `bg-[color:var(--fg)]` | ✅ |
| position | centred, `bottom: 1px` | centred, `bottom: 2px` | `absolute left-1/2 -translate-x-1/2`, `pipBottom` | ✅ |
| slot | `position: relative` | same | `relative` on the slot `<Link>` | ✅ |
| slot fill while pending | none | `--elevated-hover` | `has-[[data-pending]]:bg-elevated-hover` (rail only) | ✅ |
| slot ink while pending | `--fg` | `--fg` | `has-[[data-pending]]:text-[color:var(--fg)]` | ✅ |
| fill and ink timing | at once (audit 7) | same | `:has()` matches the pip from press; the pip itself waits | ✅ |
| rail `transition-colors` | — | removed, so the fill does not fade on landing (audit 4) | removed | ✅ |
| entrance | `pipIn` 160ms ease-out, 120ms delay, `both` | same | `.anim-pending-in` | ✅ |
| pulse | `dots` 1.2s, starting at its peak (addendum 6) | same | `.anim-pending-pip`, `-320ms` | ✅ |
| a11y | `aria-hidden`; focus stays on the link | same | `aria-hidden` | ✅ |
| locked slot | never pending (a span) | same | the pip mounts only in the `<Link>` branch | ✅ |

## Component: PendingTrack (button and row links, P2)

| Property | Mobile | Desktop | Built | |
|---|---|---|---|---|
| strip | `position:absolute; left:0; right:0; bottom:0; overflow:hidden` | same | `absolute inset-x-0 bottom-0 overflow-hidden` | ✅ |
| strip height | 1.5px; 2px at 1× (addendum 8) | same | `.pending-track`, `max-resolution: 1.5dppx` | ✅ |
| segment | 40% wide, `--fg-muted` | same | `w-[40%] bg-[color:var(--fg-muted)]` | ✅ |
| sweep | `translateX(-100%) → translateX(250%)`, 900ms linear, `-260ms`, infinite (addendum; the parent drew 1.2s ease-in-out) | same | `.anim-pending-sweep` | ✅ |
| entrance | 120ms delay, `both` (audit 3) | same | `.anim-pending-in` on the strip | ✅ |
| host | `position:relative; overflow:hidden` | same | button links; the commander row's link; the set row | ✅ |
| ghost pending | `--elevated-hover` fill, `--border-strong`, `--fg`; overrides hover (audit 1) | same | `PENDING[GHOST]`, restated under `hover:` | ✅ |
| primary pending | own fill, track over it (audit 1) | same | no override | ✅ |
| row pending | the row's own hover fill | same | commander row `--elevated-hover`, set row `--elevated` | ✅ |

## Component: PendingOverlay (escalation)

| Property | Mobile | Desktop | Built | |
|---|---|---|---|---|
| when | still pending at 400ms, target not kept | same | `OVERLAY_AFTER_MS` | ✅ |
| what | the target route's `LoadingScreen` | same | `shellCopy.loading[key]` from `pendingRouteFor` | ✅ |
| words | follow the last press | same | derived from the last reporter's target | ✅ |
| place | over main's visible box: below the header (top clamped to 0), above the tab bar and `--about-sheet-h` | right of the rail, to the bottom | `fixed`, main's rect, `bottom-[calc(var(--tabbar-h)+var(--about-sheet-h,0px))] md:bottom-0` | ✅ |
| DOM | sibling of `<main>` (a live region) | same | rendered by the provider, outside `ShellMain` | ✅ |
| `aria-busy` | the shell's `<main>`, by ref | same | `mainRef` | ✅ |
| in | 150ms ease-out, blocks pointer events from its first frame | same | `.anim-overlay-in`, no `pointer-events-none` | ✅ |
| out | at commit: `pointer-events:none`, 120ms ease-out, unmount, no hold | same | `.anim-overlay-out pointer-events-none`, `OVERLAY_OUT_MS` | ✅ |
| reduced motion | both fades kept (addendum 7), crown still | same | restated in the reduced-motion block; the crown's `anim-dots` is in the list | ✅ |

## Reduced motion (audit 5)

| Mark | Rule | Built | |
|---|---|---|---|
| pip, track entrance | step: 0s, 120ms delay, `both` — never `animation: none` | `.anim-pending-in { animation: pending-in 0s linear 120ms both }` | ✅ |
| pip | still, full opacity | `animation: none; opacity: 1` | ✅ |
| track | still `--fg-muted` hairline | `animation: none; width: 100%` | ✅ |

## State coverage

| State | Trigger | Rendered | |
|---|---|---|---|
| Press under 120ms | `useLinkStatus().pending` clears before the delay | the slot's or link's pending fill and ink for that moment (audit 7: at once), and no mark | ✅ |
| Pending | pending ≥ 120ms | pip or track | ✅ |
| Escalated | pending ≥ 400ms, target not kept | the overlay | ✅ |
| Kept route | target is `decks/[id]`, `…/changes`, `…/import`, `decks/new/choose` | its own `loading.tsx`, no overlay | ✅ |
| Same page | a link to the path already open | no run | ✅ |
| Direct load / refresh | shell `<Suspense>` fallback | `ShellLoading`: the route's screen, `ChooseLoading` for choose | ✅ |
