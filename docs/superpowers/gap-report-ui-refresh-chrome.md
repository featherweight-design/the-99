# Gap report — UI refresh, chrome (PR B)

Design source: `design/design_handoff_the99_refresh/CHROME-rail-and-tabs.md` and the rail and
tab-bar frames in `design/design_handoff_the99_refresh/The 99 - Refresh · Home and Decks.dc.html`.

Property table: `docs/superpowers/design-tables/ui-refresh-chrome.md`.

Implementation: `src/components/shell/nav.tsx`, `src/components/shell/nav-icons.tsx`,
`src/components/shell/account-menu.tsx`, `src/components/ui/button.tsx`, and the
`--tabbar-h` token in `src/app/globals.css`.

## Verdict

**0 gaps remain.** The verification pass raised 14 items; all 14 were fixed before this report
was written, and the confirmation pass returned zero outstanding. Every visual property in the
table matches, and all five rows of the state coverage table are reachable.

Verified in a real browser as well as in unit tests — JSDOM has no layout, so it can prove the
rail's markup and say nothing about whether 38px squares fit inside 62px.
`scripts/probe-refresh-chrome.mjs` measures both, at both viewports:

| | Desktop (1300×900) | Phone (390×844) |
|---|---|---|
| Rail width | 62px | not rendered |
| Nav items | 38×38 | 94×52 |
| App mark | 1, at the top | not rendered |
| Tab bar height | not rendered | 74px, matching `--tabbar-h` |
| Slot parity | same glyph in the same slot in both chromes | same |

Screenshots for the design record, in both the unlocked and the locked chrome, are attached to
the pull request.

## Deviations from the handoff

Each of these is a deliberate departure. None is an omission, and each is recorded in the code
at the point where it applies.

### 1. Locked colour is spent as `var(--fg-locked)`, not the handoff's hex

The handoff writes the locked item's colour as a bare hex. The frames are drawn in Amonkhet,
and this app has six themes, so a literal hex would stay Amonkhet under the other five and
would not hold its contrast against their surfaces. It ships as `var(--fg-locked)`, a token
every theme already defines. The intent — locked items read as inert, below the rest state —
is unchanged.

Awaiting Design's ratification. If Design wants a different relationship to each theme's
surfaces, the token's per-theme values are the place to express it, not the component.

### 2. Tab bar background — the frames win over the prose

The prose says the bar sits on `--bg`; the frames draw it on the same fill as the rail, which
resolves to `--surface-rail`. The frames win, for two reasons: the two chromes are the same
chrome at two widths and should not part company on their fill, and `--surface-rail` is what
already shipped, so following the prose would have been a regression dressed as a fix.

### 3. Padlock — the prose wins over the frames

The prose calls for a padlock glyph. The frames draw a bare rounded rectangle with no shackle,
which is a box rather than a padlock. The prose wins: the glyph ships with its shackle, at the
frames' 14×16 with a 1.5px stroke.

### 4. Colour moved from inline styles onto Tailwind classes

The plan's example code set `background` and `color` inline on the nav items. This repo's
ESLint config forbids that on `button`, `a` and `Link` — an inline style outranks a `hover:`
utility and silently kills it, which is exactly the hover state the handoff specifies for a
rail item. Colour is therefore expressed as Tailwind arbitrary-value classes. The rendered
values are the ones in the table; only the mechanism differs.

The rail and the tab bar containers, which are not links, keep their inline `background` and
`border` — the rule does not reach them and there is no hover state to lose.

### 5. A locked item is a `span`, not a disabled link

The handoff takes locked items out of the tab order in both chromes: "not focusable as links."
That reverses the usual ARIA guidance, which prefers a focusable control that announces its own
disabled state so a keyboard reader can discover it exists.

The handoff's call is followed, and the discoverability it trades away is paid for elsewhere:
the first-run checklist states the same unlock condition in visible copy on the page itself, so
the information is not reachable only by tabbing into the rail. Each locked item still carries
its role, its name, and the unlock reason (`role="link"`, `aria-disabled="true"`, and an
accessible name of the label plus the reason), so a reader who lands on it by any other means
is told why it cannot be used.

Rendering a `<span>` rather than an `<a>` without an `href` is deliberate: both are unfocusable,
but only the `span` also declines to offer a dead navigation target to a pointer.

### 6. Phone button radius is deferred to PR F

The table records a 10px radius for the phone primary against 8px on desktop. Only the desktop
value ships here. The radius is a shared token across every button in the app, and moving it on
one breakpoint inside a chrome PR would change surfaces this PR does not otherwise touch. It is
scheduled with the rest of the conformance sweep in PR F, where the change can be verified
across all of them at once.

Heights are not deferred: 44px on phone and 32px on desktop both ship here, and both clear the
handoff's target floors.

### 7. The frames' border hex is darker than the shipped `--border`

The frames draw the rail's right edge and the tab bar's top edge in a hex slightly darker than
the default theme's `--border`. The token ships, not the hex, for the same six-theme reason as
item 1. The difference is a fraction of a step on one theme and is not visible at a hairline's
width; raising it as a mismatch would trade a themed token for an Amonkhet constant.

## Adjudication #1 is retired

The 2026-09-07 refresh retires adjudication #1 — "no `<Mark>` icons in rail nav items; Diamond
plus label only" — on client instruction. The reason the ruling existed still holds where it
was made: a `<Mark>` inside a nav row was a second logo competing with the one at the top of the
rail. A 19px stroke glyph is not the Mark, and at 62px the rail has no room for labels, so the
labels moved into `aria-label` and `title` rather than coming out altogether.

If the ruling is ever reinstated, the rail widens to hold labels and the icons come out. A 62px
rail with labels is not a third option. This is recorded in `nav.tsx` beside the item list.

## Slot parity

The handoff says the four glyphs must not transpose between the two chromes, and that this was
caught in review once already. Both chromes now render from one shared icon set, so a
transposition is not expressible: there is a single `NavIcon` keyed on the route. A unit test
asserts the rendered shapes are identical in the same order in both chromes, and the browser
probe compares the shapes at both viewports.
