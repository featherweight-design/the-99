# The 99 — Branded user menu (design handoff addendum)

Issue **#35** → paired eng ticket **#13**. A light addendum to the **already-specified** account
menu: three superseding revisions plus the interaction states nobody had drawn. One component, two
viewports. Nothing new is invented — the brass diamond and rail treatment come from #58's shipped
shell.

File: `The 99 - User Menu.dc.html` (canvas — pan/zoom). Spec of record:
`docs/superpowers/specs/2026-07-25-branded-user-menu-design.md`. Read
`design_handoff_the99_appshell/README.md` first — this document records only what **changes** and
what the spec left to Design.

**The problem in one line:** the trigger is already ours; everything that opens still belongs to
Clerk — panel styling, the `SECURED BY CLERK` footer, the lot.

## Superseded rows (spec wins over the table)

| `appshell.md` | Was | Now |
|---|---|---|
| `:1676-1686` (desktop), `:1779` (mobile) | `SECURED BY CLERK` caption block | **Deleted**, not restyled. Its `14px` top margin goes with it. |
| `:157-184` §Open/active | Avatar + name + ellipsis pill spanning the rail; "ellipsis color" row | **Avatar-only compact trigger.** No ellipsis, so that row no longer applies — a 4px brass diamond does the caret's job. |
| `:1584` | `position:absolute; left:12px; right:12px; bottom:calc(100% - 6px)` | `position:absolute; left:12px; width:216px; bottom:calc(100% + 8px)` |

Everything else in §Account Popover / §Account Bottom Sheet holds as written.

## States delivered
- **1 · Compact trigger** — idle, hover/pressed, focus-visible, open. Mobile header slice at 392px
  and desktop rail foot, same 38px box in both.
- **2 · Popover open** — desktop at 1060px, in the full shell frame, anchored to the compact trigger.
- **3 · Bottom sheet open** — mobile at 392px, in device frame, caption gone.
- **4 · `<UserProfile/>` themed modal** — drawn at desktop 1060px (centred `860×560` card over the
  dimmed shell) and mobile 392px (full-bleed, radius dropped, nav collapsed to the menu button), plus
  the `variables` base pass and **44 enumerated `elements` entries**, each with tokens and a note.
- **5 · Accessibility contract** — focus, measured contrast, semantics.

---

## Decisions log

### 1. Resting size → **38px, radius 12px**
The shell's existing value. Two of the three sites already ship it (`nav.tsx:234`, `:348`), so
unification moves exactly one call site — `page-header.tsx:48`. 34px was the outlier, not the
standard, and picking it would have churned two shipped surfaces to satisfy one.

### 2. Touch target → **visual box 38px, hit area padded to 44×44**
A 3px padding ring around the box on both mobile sites. Compact is a visual decision, not a
thumb-hostile one. The same ring is what keeps the focus outline clear of the header's bottom border.

### 3. Popover geometry → **216px wide, left-aligned to the trigger, 8px above it**
`left:12px; width:216px; bottom:calc(100% + 8px)`. 216px is narrower than the 236px rail and sits
clear of the rail's right border, so the panel reads as attached to the avatar rather than as a rail
drawer — which is precisely what the superseded `left:12/right:12` made it look like. No backdrop and
no blur on desktop: this is a menu, not a modal. From a top-anchored trigger (the commanders mobile
header) it flips to `top:calc(100% + 8px)`, right-aligned, diamond above the panel.

### 4. What replaces the removed caption → **nothing**
The footer slot closes up; bottom padding comes from the container's own `8px` pad and the last item
sits flush. Two menu items and a person's name need no chrome underneath. A substitute line — a
version string, a "you're signed in as…" — would just be a different flavour of reassurance nobody
asked for, which was the literal complaint in #35.

### 5. Open-state marker → **4px brass diamond between trigger and panel**
With the ellipsis gone the trigger needs some mark that it is the thing that opened the panel. The
shell's own diamond motif does a caret's job: 4px, `#C9A24B`, centred on the trigger, 6px above it,
`aria-hidden`. It appears **only where the panel is adjacent** — the mobile sheet has no adjacency,
so no diamond. The open trigger also shifts to `--elevated` fill with a `--brass-hover` border.

### 6. Drag handle → **decorative, and honest about it**
`aria-hidden="true"`, no pointer handlers, no `cursor:grab`. It is a shape that says "this came from
the bottom edge", nothing more. Drag-to-dismiss means a gesture library or a hand-rolled pointer-move
implementation, and the constraint is no new dependencies; a handle that half-works is worse than one
that only signals. Three dismissals already work: backdrop tap, Escape, Android hardware back.

### 7. Focus-visible → **no override; the global ring already fits**
`globals.css:130` gives `2px solid --brass` at `2px` offset. The offset leaves a band of `--bg`
between ring and the trigger's brass border, so brass-on-brass still reads as two distinct edges.
Adding a bespoke ring here would fork a global for no gain.

### 8. Motion → **two named utilities, added to the existing reduced-motion list**
- `.anim-menu-in` — popover, `120ms ease-out`, opacity 0→1 plus a 4px rise. Short enough that it
  never delays the first item's hit test.
- `.anim-sheet-up` — sheet, `180ms cubic-bezier(.22,1,.36,1)`, `translateY(100% → 0)`. Backdrop
  cross-fades over the same duration.

Both names join the block at `globals.css:166-173`, following its **explicit-fallback** pattern
rather than a blanket rule — so the next animation still forces a decision. Reduced-motion: both
surfaces appear at final position, fully opaque, no fade. Closing is instant in both modes.

### 9. Token mapping → **one section recipe, applied to all of them**
The spec's worry was #13 guessing which of profile / email / password / sessions / MFA gets which
token. The answer is that they don't differ: `profileSection*` is specified once and every panel
takes it. The map enumerates 44 elements across seven groups (shell, nav, header, section, form,
feedback, footer) so there is no inference left. Notable calls:

- `cardBox` matches the Issue Inspector dialog shell — one modal language across the app.
- `card` is transparent with zero padding; `cardBox` owns the surface and must not be doubled.
- `headerTitle` takes Cinzel 700/22 — Clerk's default sans would break the heading voice; section
  titles are Cinzel 600/**15**, not 22.
- `menuList` / `menuItem` are deliberately the account popover's own container and item metrics, so
  a nested menu inside sessions doesn't feel foreign.
- `formFieldInput` is the Issue Inspector filter input verbatim; `fileDropAreaBox` is the collection
  CSV dropzone verbatim.
- `formButtonPrimary` is the app's brass primary — **one per panel**; section-level actions
  (`profileSectionPrimaryButton`) are quiet transparent-brass instead.
- `modalBackdrop` shares `rgba(10,8,6,0.72)` with the account sheet and the card-detail modal, so two
  overlays never disagree.
- The two viewports genuinely differ, which is why both are drawn: Clerk goes **full-bleed under
  ~640px**, so `modalContent`'s 16px radius is dropped and the left nav collapses to
  `navbarMobileMenuButton`. Desktop keeps the card and the rail-styled nav.
- `footer: display none` per decision 1. **Flagged for eng** — see gap #1.

### 10. Voice
Menu copy is two words and a name: *Manage account*, *Sign out*. No "Settings & privacy", no
sub-labels, no email verification nags. Copy externalizes to `src/lib/copy/shell.ts` with the rest of
the shell strings.

---

## Component notes (token references)

| Component | Spec |
|---|---|
| **Trigger — idle** | 38px box, radius `12px`, `bg --bg #14110E`, `1px --brass #C9A24B`, initials Plex Mono 13px `--brass`. 3px pad ring → 44×44 hit area. |
| **— hover / pressed** | `bg --surface-raised #221D16`, border + initials → `--brass-hover #D8B25E`. 120ms colour transition only, no scale. |
| **— focus-visible** | Global ring, unmodified: `2px solid --brass`, `outline-offset 2px`. |
| **— open** | `bg --elevated #2A241D`, border `--brass-hover`, `aria-expanded="true"`, brass diamond above (desktop only). |
| **Popover container** | `216px`, `bg --surface-raised #221D16`, `1px --border-strong #3A3229`, radius `14px`, shadow `0 20px 50px rgba(0,0,0,.6)`, padding `8px`, `z-index 20`. |
| **Popover identity header** | 44px avatar (radius 12), name Plex Sans 600/14 `--fg`, email Plex Mono 11 `--fg-faint`, both truncating. `border-bottom 1px --border #2A241D`. Not a menu item, not focusable. |
| **Popover item** | `padding 11px 12px`, radius `8px`, label 14px `--fg`, 6px diamond marker; hover `bg --elevated`. Sign-out diamond `--danger #C6533F`. |
| **Sheet container** | `bg #1E1A15`, `border-top 1px --border-strong`, radius `20px 20px 0 0`, padding `20px 20px 26px`. The 26px bottom pad sits **on top of** `env(safe-area-inset-bottom)`, not instead of it. |
| **Sheet identity header** | 48px avatar (radius 14), name 16px, email Plex Mono 12. Divider as popover. |
| **Sheet item** | `padding 15px 6px` → **~52px** tall, label 15px `--fg`, 6px diamond. Rows divided by `1px --border`. |
| **Handle** | `40×4`, radius 2, `--border-strong #3A3229`, `20px` below it. `aria-hidden`. |
| **Backdrop** | `rgba(10,8,6,0.72)`. Mobile only — the desktop popover has none. Sheet sits above the tab bar's stacking context; the tab bar is covered by the backdrop, not by the sheet. |

## Accessibility contract
- **Focus trap** active for the whole open lifetime, both viewports.
- **First focus = *Manage account***. There is no close button to land on and no filter to type in, so
  the first action is the right target.
- **Escape closes** and returns focus to the trigger. Outside-click, backdrop tap and Android
  hardware back all take the same path.
- Opening `<UserProfile/>` **hands the trap to Clerk's modal**; when that closes, focus returns to the
  trigger, not to the dismissed menu.
- Trigger is a native `<button>` with `aria-haspopup="menu"`, `aria-expanded`, `aria-controls`. Its
  accessible name is the person, not the glyphs: **"Account — Ana Ruiz"**; initials are `aria-hidden`.
- Panel is `role="menu"` with two `role="menuitem"` children; `↑ ↓` rove and wrap. Sheet adds
  `aria-modal="true"` and a label pointing at the name.
- **Sign out is not signalled by colour alone** — the danger diamond sits beside the literal words
  "Sign out", and the label stays `--fg`.
- Contrast, measured on ground: initials `--brass` on `--bg` **7.4:1**; item label `--fg` on
  `--surface-raised` **11.9:1**; email `--fg-faint` on `--surface-raised` **4.6:1**; focus ring
  `--brass` vs `--surface-rail` **6.6:1**. All AA or better.

## Notes for engineering
- **One component replaces three call sites.** `nav.tsx:234` (rail), `nav.tsx:348` (mobile header),
  `page-header.tsx:48` (commanders header). Only the last changes size.
- **`AccountTrigger`'s click-forwarding goes away.** `nav.tsx:206-244` forwards wrapper-surface clicks
  into the Clerk button as the #31 fix; that workaround exists only because the pill is wider than its
  interactive child. The compact trigger removes the mismatch, so the forwarding logic is deleted
  rather than ported.
- On `/commanders` the trigger exists **only in the mobile header** — the desktop header has none and
  defers to the rail. So the 34/38 divergence is mobile-vs-mobile.
- **Theme-aware values** come from `src/app/globals.css` `var(--*)` tokens; the hexes here are the
  standalone Palette A ("Table Candlelight") values for theme-independent reference only. No new token
  is introduced.
- **Copy** to `src/lib/copy/shell.ts` alongside the existing shell strings.
- **No new dependencies.** No focus-trap library — two menu items and a known DOM subtree; no gesture
  library (decision 6); no popover positioning library, since the anchor geometry is static per site.
- Mock identity ("Ana Ruiz", `ana.ruiz@example.com`, initials AR) is fabricated.

## Gap report
Things this addendum deliberately does **not** answer, for the audit:
1. **`<UserProfile/>` footer branding.** The map sets `elements.footer` to `display:none` for
   consistency with decision 1. Clerk's terms differentiate the mandated **development-instance
   badge** (untouched, per spec) from the modal's footer branding, but whether the current plan
   permits hiding the latter is an eng/legal confirmation, not a design call.
2. **Drag-to-dismiss.** Ruled out on the no-dependencies constraint (decision 6). Revisit only if beta
   feedback shows people dragging at the handle.
3. **Clerk `appearance` coverage drift.** The 44 elements are mapped against Clerk's current element
   catalogue. If eng finds an element rendering unstyled, it belongs to a group in the map — apply that
   group's recipe rather than inventing a value, and tell Design so the table stays honest.
4. **Long names and long emails.** Both truncate with ellipsis at 216px. No tooltip is specced; if a
   real beta email overflows badly, the popover width is the thing to revisit, not the truncation.

## Files
- `The 99 - User Menu.dc.html` — the canvas (this addendum's deliverable).
- `brand/` — the locked brand sheet + brand README, copied in for self-containment.
- `support.js` — runtime for the HTML references; not production code.
