# Design Property Table — UI refresh, chrome (PR B)

Source: `design/design_handoff_the99_refresh/CHROME-rail-and-tabs.md` and the rail/tab-bar
frames in `design/design_handoff_the99_refresh/The 99 - Refresh · Home and Decks.dc.html`.

Scope is the desktop rail, the phone tab bar, their locked variants, and the primary
button's fill. Home and Decks page content are tabled separately when those PRs land.

Where the frames and the prose disagree, both values are recorded and the resolution is
stated. Colour is given as the token the frame's hex resolves to; the frames are drawn in
Amonkhet, and this app has six themes.

## Component: NavRail (desktop, `hidden md:flex`)

### Container

| Property | Mobile | Desktop |
|---|---|---|
| display | none | flex |
| flex-direction | — | column |
| align-items | — | center |
| width | — | 62px |
| height | — | 100vh (sticky, top 0) |
| padding | — | 14px 0 |
| gap | — | — (children space themselves) |
| background | — | `var(--surface-rail)` |
| border-right | — | 1px solid `var(--border)` |
| z-index | — | 30 |

### App mark (the diamond)

| Property | Mobile | Desktop |
|---|---|---|
| width | — | 26px |
| height | — | 26px |
| transform | — | rotate(45deg) |
| border | — | 1.5px solid `var(--accent)` |
| border-radius | — | 4px |
| margin-bottom | — | 16px |
| count | — | exactly 1, at the top — it is the mark, not a nav item |

### Nav section

| Property | Mobile | Desktop |
|---|---|---|
| display | — | flex |
| flex-direction | — | column |
| align-items | — | center |
| gap | — | 4px |
| aria-label | — | "Primary" |
| items | — | Home · Collection · Commanders · Decks, in that order |

### Nav item — rest

| Property | Mobile | Desktop |
|---|---|---|
| width | — | 38px |
| height | — | 38px |
| border-radius | — | 10px |
| background | — | transparent |
| color | — | `var(--fg-faint)` |
| visible text | — | none — icon only |
| accessible name | — | the label |
| title | — | the label |

### Nav item — active

| Property | Mobile | Desktop |
|---|---|---|
| background | — | `var(--elevated)` |
| color | — | `var(--fg)` |
| aria-current | — | "page" |

### Nav item — hover

| Property | Mobile | Desktop |
|---|---|---|
| background | — | `var(--elevated-hover)` |
| transition | — | colors |

### Nav item — locked

The rail and the tab bar share one locked-slot contract (first-run-locked-nav.md §1a, §4a.8, O3).

| Property | Mobile | Desktop |
|---|---|---|
| color | `var(--fg-locked)` | frame: bare Amonkhet hex → **shipped as `var(--fg-locked)`** |
| background | transparent | transparent |
| hover | none | none |
| focusable | yes — a `<button>` in the tab order that raises the lock's note (superseded by first-run-locked-nav.md, O3) | yes — a `<button>` in the tab order that opens the lock's note (superseded by first-run-locked-nav.md, O3) |
| role | button, `aria-expanded` / `aria-controls` / `aria-describedby` the note | button, `aria-expanded` / `aria-controls` / `aria-describedby` the note |
| aria-disabled | none | none |
| aria-current | "page" on its own route | "page" on its own route — a locked route still renders |
| accessible name | `firstRun.lockedItemAria(label)`: "{label}, locked" | `firstRun.lockedItemAria(label)`: "{label}, locked"; the reason is the note it describes |

### Locked divider

| Property | Mobile | Desktop |
|---|---|---|
| width | — | 34px |
| height | — | 1px |
| background | — | `var(--border)` |
| margin | — | 8px 0 |
| count | — | 1, under the fourth item — not per row |

### Locked padlock

| Property | Mobile | Desktop |
|---|---|---|
| width | — | 14px |
| height | — | 16px |
| stroke-width | — | 1.5 |
| border-radius | — | 3px |
| stroke | — | `var(--fg-locked)` (see locked colour above) |
| aria-hidden | — | true — every locked item already carries the reason in words |
| count | — | 1 |

### Account trigger

| Property | Mobile | Desktop |
|---|---|---|
| width | — | 30px |
| height | — | 30px |
| border-radius | — | 50% |
| background | — | `var(--surface)` |
| border | — | 1px solid `var(--border-strong)` |
| position | — | `margin-top: auto` — pinned to the bottom |

## Component: TabBar (phone, `md:hidden`)

### Container

| Property | Mobile | Desktop |
|---|---|---|
| position | fixed, inset-x 0, bottom 0 | none |
| height | 74px (= 52 + 8 + 14) | — |
| padding | 8px 8px 14px | — |
| display | flex | — |
| background | frame: `var(--surface-rail)`; prose: `--bg`. **Frame wins** | — |
| border-top | 1px solid `var(--border)` | — |
| z-index | 40 | — |
| aria-label | "Primary" | — |

### Tab item — rest

| Property | Mobile | Desktop |
|---|---|---|
| flex | 1 | — |
| height | 52px | — |
| border-radius | 12px | — |
| flex-direction | column | — |
| align-items | center | — |
| justify-content | center | — |
| gap | 3px | — |
| background | transparent | — |
| color | `var(--fg-faint)` | — |

### Tab item — active

| Property | Mobile | Desktop |
|---|---|---|
| background | `var(--surface-inset)` | — |
| color | `var(--fg)` | — |

### Tab item — locked

Same as the rail's locked item: `var(--fg-locked)`, no fill, not focusable, `role="link"`,
`aria-disabled="true"`, accessible name carries the unlock reason.

### Tab label

| Property | Mobile | Desktop |
|---|---|---|
| font-family | `var(--font-mono)` | — |
| font-size | 9px | — |
| letter-spacing | 0.06em | — |
| color | inherited from the slot | — |
| visible | yes — the phone bar has room and the rail does not | — |

## Component: NavIcon (shared by both chromes)

| Property | Mobile | Desktop |
|---|---|---|
| width | 19px | 19px |
| height | 19px | 19px |
| viewBox | 0 0 20 20 | 0 0 20 20 |
| fill | none | none |
| stroke | currentColor | currentColor |
| stroke-width | 1.5 | 1.5 |
| stroke-linecap | round | round |
| stroke-linejoin | round | round |
| aria-hidden | true | true |

Paths, verbatim from the frames:

| Slot | Shape |
|---|---|
| `/` | `<path d="M3 9.2 10 3.6l7 5.6V16a1 1 0 0 1-1 1h-3.5v-4.2h-5V17H4a1 1 0 0 1-1-1z">` |
| `/collection` | four `<rect width="5.8" height="5.8" rx="1.2">` at (3.2,3.2) (11,3.2) (3.2,11) (11,11) |
| `/commanders` | `<path d="M3 14.5 4.4 6l3.2 3.6L10 4l2.4 5.6L15.6 6 17 14.5z">` + `<path d="M3 16.6h14">` |
| `/decks` | `<rect x="6.6" y="3.2" width="10" height="13" rx="1.6">` + `<path d="M4.2 5.4A1.6 1.6 0 0 0 3.4 6.8v8.6a1.6 1.6 0 0 0 1.6 1.6h8.2">` |

**Slot parity is a requirement, not a coincidence.** The handoff says the slots must not
transpose between the two chromes, and that this was caught in review once already.

## Component: PrimaryButton

| Property | Mobile | Desktop |
|---|---|---|
| background | `var(--fg)` | `var(--fg)` |
| color | `var(--bg)` | `var(--bg)` |
| background (hover) | `var(--fg-body)` | `var(--fg-body)` |
| border-radius | 10px (**deferred to PR F**) | 8px |
| height | 44px | 32px |

Locked ruling 14: the one filled button on a screen is bone. Accent means "in use / to buy"
everywhere else, and a filled CTA is neither.

## State coverage

| State | Triggering condition | Rendered | Key props |
|---|---|---|---|
| Rail, unlocked | `stats.uniqueCards > 0` | `NavRail locked={false}` | `theme` |
| Rail, locked | `stats.uniqueCards === 0` | `NavRail locked` | `theme` |
| Tab bar, unlocked | `stats.uniqueCards > 0` | `TabBar locked={false}` | — |
| Tab bar, locked | `stats.uniqueCards === 0` | `TabBar locked` | — |
| Signed out | `auth()` returns no `userId` | bare children, no chrome | — |

`locked` is resolved once, in `src/components/shell/shell.tsx`, and passed to both chromes,
so the two cannot disagree about whether the collection has been read.

## Targets and floors

| | Desktop | Phone |
|---|---|---|
| Buttons | 32px tall | 44px |
| Icon-only controls | 32px (26px on tile art) | 44px |
| Body copy | 12.5–13px | 13.5–14px |
| Mono data | 10.5–13px | 10.5–12.5px |

The rail's 38px items and the tab bar's 52px items both clear their floor. The 30px account
circle sits inside a 3px pad ring, so its hit area is 36px — also clear of the 32px desktop
floor.
