# Design Property Table — Social R2 PR 8a: friends with a spare in the stand-ins modal

**Sources (design only):** `design/design_handoff_the99_social_r2/`: `R3 - Spares-Desktop.dc.html` (frame S3),
`R3 - Option B opened-Desktop.dc.html` (frames O1, O2, O3), `README.md` (§Round 3 changes), `STATES-social-r2.md`
(§Spares), `READINESS.md`, `social-r2 · copy strings.ts` (`spareCopy`), and the main board `The 99 - Social R2 (R3).dc.html`
(§The opened view). Round 3 supersedes R1 and R2; R2's `ModalChrome` 560px modal (`.mc`, `.frow`, `.face` 40px, `.fcount`)
is NOT the spec for 8a.

Token mapping read from `src/app/globals.css`, `[data-theme="kamigawa"]` block. Both boards carry byte-identical CSS for
every class used below (`.sim .rep .lab .shd .fr3 .fface .sp2 .nt .grp .new .mscrim .intro2`, checked by hash).

**Board annotation, not a shipped style:** the friends section is wrapped in `<div class="grp new">`. `.new`
(`outline:1.5px dashed rgba(255,77,154,.55); outline-offset:3px; border-radius:6px`) and `.grp`'s
`border:1px dashed #FF4D9A; border-radius:12px` are the board's pink "new part" marker (README: "New parts carry a dashed
pink outline"). Ship neither the outline nor the border. See Contradictions 3 for `.grp`'s padding and margin.

**Not in 8a** (PR 8b/9): the Shopping row marker (`.spm`), the Shopping key item, the cart, every phone frame (SP*, OP1),
the spares-only host.

Phone column: every 8a frame is desktop-only. "built from desktop" means the board draws no phone frame and the phone
takes the desktop rule inside the shipped phone sheet.

---

## Component: stand-ins modal (the shipped Cheaper stand-ins modal, `.sim`)

The modal body itself is the shipped one (O3 caption: "The modal is today's, word for word"). The values below are the
board's drawing of it, recorded so the new section can be placed against them; they are not a request to restyle it.

### Modal shell

| Property | Phone | Desktop |
|---|---|---|
| Container | shipped sheet (board CSS `.sim.ph`: `left:0;right:0;top:52px;bottom:0`, radius `14px 14px 0 0`, border-top only) | `.sim`: width 640px, `top:40px`, centred (`left:50%; translateX(-50%)`) |
| Radius | 14px 14px 0 0 | 16px |
| Border | 1px top, #262A35 (`--border-strong`) | 1px #262A35 (`--border-strong`) |
| Background | #1B1D24 (no token; see Contradictions 1) | #1B1D24 (no token; see Contradictions 1) |
| Shadow | — | `0 30px 80px rgba(0,0,0,.7)` |
| Scrim | built from desktop | `.mscrim` `rgba(14,15,20,.72)` (`--bg` #0E0F14 at 72%) |
| Font | IBM Plex Sans | IBM Plex Sans |

### Header (`.hd`)

| Property | Phone | Desktop |
|---|---|---|
| Layout | flex, `space-between`, align center | flex, `space-between`, align center |
| Padding | 14px 16px 8px (`.sim.ph .hd`) | 22px 26px 10px |
| Title font | built from desktop | Chakra Petch 700, 17px |
| Title color | #E6E8F0 (`--fg`) | #E6E8F0 (`--fg`) |
| Title text, spares + stand-ins (O1) | built from desktop | `Before you buy` (`spareCopy.modalTitleBoth`) |
| Title text, spares only (S3, O2) | built from desktop | `Friends with a spare` (`spareCopy.modalTitleSpares`) |
| Title text, stand-ins only (O3) | built from desktop | `Cheaper stand-ins` (shipped, unchanged) |
| Close glyph | `✕` | `✕`, 15px, #6F7486 (`--fg-faint`) |
| Close accessible name | `Close` (`spareCopy.close`) | `Close` (`spareCopy.close`) |

### Body (`.bd`)

| Property | Phone | Desktop |
|---|---|---|
| Padding | 8px 16px 20px (`.sim.ph .bd`) | 10px 26px 22px |

### Replacing box (`.rep`) — UNCHANGED FROM SHIPPED, drawn identically in O1, O2, O3 and S3

| Property | Phone | Desktop |
|---|---|---|
| Change in 8a | none | none |
| Background | built from desktop | #101219 (`--surface-sunken`) |
| Radius / padding / gap | built from desktop | 12px / 14px / 8px, column |
| Label | built from desktop | `.lab`, `Replacing, in {deck}` (e.g. `Replacing, in HD - Kratos`, `Replacing, in Gishath · Naya Dinos`) |
| Line | built from desktop | thumb 22×31 radius 3, ring dot, name (`.cnm` 16px 600, dotted accent underline), buy tag, optional `over $N` in #E0913C (`--warning`) |
| Meta | built from desktop | `.mono` 12px #959AAD: `instant · mana value 3 · draw` |

---

## Component: Friends with a spare section (NEW)

Present only when at least one friend has a spare. Placed directly under the Replacing box, BEFORE every stand-ins part.

### Section head (`.shd`)

| Property | Phone | Desktop |
|---|---|---|
| Layout | built from desktop | flex, `justify-content:space-between`, `align-items:center` |
| Margin | built from desktop | 12px top (inline override of `.shd`'s 20px) / 6px bottom; plus the wrapper's 16px top (Contradictions 3) |
| Label text | built from desktop | `Friends with a spare · {n}` (n = friends listed; drawn `· 2`) |
| Label font | built from desktop | IBM Plex Mono 10.5px, `letter-spacing:.16em`, `text-transform:uppercase` |
| Label color | built from desktop | #6F7486 (`--fg-faint`) |
| Aside text | built from desktop | `view only` |
| Aside font | built from desktop | IBM Plex Mono 11.5px |
| Aside color | built from desktop | #6F7486 (`--fg-faint`) |
| Aside position | built from desktop | right end of the head row |

### Friend row (`.fr3`)

| Property | Phone | Desktop |
|---|---|---|
| Layout | built from desktop | flex row, `align-items:center` |
| Padding | built from desktop | 9px 0 |
| Gap | built from desktop | 12px |
| Divider | none drawn | none drawn (no border between rows) |
| Children, in order | built from desktop | face, name block (flex 1, `min-width:0`), count chip |
| Press target | none | none (no Take, no link; README: nothing to press but ✕) |
| Order of rows | built from desktop | drawn Colin (1 spare), then Max (2 spares); see Contradictions 5 |

### Face (`.fface`)

| Property | Phone | Desktop |
|---|---|---|
| Size | built from desktop | 30×30px, `flex:none` |
| Radius | built from desktop | 8px |
| Border | built from desktop | 1px #262A35 (`--border-strong`) |
| Overflow | built from desktop | hidden |
| Image | built from desktop | `object-fit:cover`, 100%×100%, `alt=""` |
| Focus | built from desktop | commander image focus applies (README G7) |

### Name block (`.nmb`)

| Property | Phone | Desktop |
|---|---|---|
| Layout | built from desktop | column, gap 2px, `flex:1`, `min-width:0` |
| Name font | built from desktop | IBM Plex Sans 15px, weight 600 |
| Name color | built from desktop | #E6E8F0 (`--fg`) |
| Name text | built from desktop | friend's display name (`Colin`) |
| Via line font | built from desktop | IBM Plex Mono 11.5px |
| Via line color | built from desktop | #6F7486 (`--fg-faint`) |
| Via line text | built from desktop | `shares with {pod}` (`spareCopy.via`), drawn `shares with Thursday pod` |

### Count chip (`.sp2`)

| Property | Phone | Desktop |
|---|---|---|
| Display | built from desktop | `inline-flex`, `align-items:center`, gap 6px |
| Height | built from desktop | 22px |
| Padding | built from desktop | 0 7px |
| Radius | built from desktop | 4px |
| Background | built from desktop | `rgba(143,166,190,.14)` (`--fact` at 14%) |
| Font | built from desktop | IBM Plex Mono 11.5px |
| Color | built from desktop | #8FA6BE (`--fact`) |
| Text | built from desktop | `1 spare` / `N spares` (`spareCopy.count`) |
| Glyph | built from desktop | SVG 13×13, `viewBox="0 0 24 24"`, `fill="none"`, `stroke="#8FA6BE"` (`--fact`), `stroke-width="1.8"`, `stroke-linecap="round"`, `aria-hidden="true"` |
| Glyph paths | built from desktop | `<circle cx="9" cy="8.5" r="3.2"/>` `<path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5"/>` `<circle cx="16.5" cy="9.5" r="2.6"/>` `<path d="M15.5 14.2c2.6-.3 4.6 1.3 5.1 4.3"/>` (two people) |
| Position | built from desktop | row's right end, where a stand-in's price sits |
| Zero | never drawn | never drawn (a friend with no spare has no row) |

### Foot line (`.nt`)

| Property | Phone | Desktop |
|---|---|---|
| Placement | built from desktop | under the last friend row, inside the section, before any stand-ins part |
| Font | built from desktop | IBM Plex Sans 12.5px, `line-height:1.5` |
| Color | built from desktop | #959AAD (`--fg-muted`) |
| Margin | built from desktop | 4px 0 0 |
| Text | built from desktop | `A spare is a copy none of their decks uses, drafts included. Reach out to offer a trade or bargain your prized family goat, and it’s yours!` (`spareCopy.foot`) |

---

## Component: modal body order

| Property | Phone | Desktop |
|---|---|---|
| O1 (spares + stand-ins) | built from desktop | Replacing box → Friends with a spare section (head, rows, foot line) → stand-ins intro (`.intro2`) → `Same type · instants` group → `Show all 43 instants ▸` → `Other types` group |
| O2 / S3 (spares, no stand-ins) | built from desktop | Replacing box → Friends with a spare section; nothing after it |
| O3 (stand-ins only) | built from desktop | shipped, unchanged: Replacing box → intro → groups |
| Hidden when spares exist and no stand-in qualifies | built from desktop | the shipped "nothing cheaper" sentence and every stand-ins part (O2 caption: "No stand-in exists, or none is cheaper. The modal is the Replacing box and the friends section") |
| Stand-ins parts when spares exist | built from desktop | unchanged ("Then the stand-ins exactly as shipped: intro, Same type, Other types, Take, Show all") |
| Stand-ins intro spacing under the section | built from desktop | `.intro2` margin 14px 0 0, 13.5px/1.55 #B1B6C7 (`--fg-body`); shipped |

---

## State coverage

| State | Data trigger | Renders | Copy keys | a11y |
|---|---|---|---|---|
| Friends switch off | `SOCIAL_FRIENDS_ENABLED` off for the reader | Shipped modal, unchanged (as O3) | shipped `Cheaper stand-ins` | shipped |
| Both reads loading | spares and stand-ins pending | Not drawn | — | Not drawn |
| Spares in, stand-ins loading | spares ≥1, stand-ins pending | Not drawn. Rule implies section shows; title cannot be decided until stand-ins land (Contradictions 6) | `modalTitleSpares` / `modalTitleBoth` | Not drawn |
| Stand-ins in, spares loading | stand-ins ready, spares pending | Not drawn. README G3: markers load after the page, absent until read | shipped title | Not drawn |
| Spares + stand-in groups (O1) | spares ≥1, ≥1 stand-in | Title `Before you buy`; Replacing → friends section → stand-ins as shipped | `modalTitleBoth`, `via`, `count`, `foot`, `close` | Close named `Close`; glyph `aria-hidden`; face `alt=""` |
| Spares + no groups (O2, S3) | spares ≥1, no cheaper stand-in | Title `Friends with a spare`; Replacing → friends section; nothing-cheaper sentence hidden | `modalTitleSpares`, `via`, `count`, `foot`, `close` | as O1 |
| No spares (O3) | spares = 0 | Shipped modal word for word, title `Cheaper stand-ins`; no section | shipped | shipped |
| Spares read failed | spares read error | Not drawn. STATES: "absent on failure", silently; renders as O3 | shipped | no error announced |
| Stand-ins read failed, spares in | stand-ins error, spares ≥1 | Not drawn | — | Not drawn |

---

## Contradictions and ambiguities

1. **Modal background.** The board's `.sim` is #1B1D24, which no token holds (`--surface-raised` is #191B22, R2's
   `ModalChrome` drew #191B22 at 560px). The modal is "the shipped stand-ins modal", so the shipped surface wins; do not
   restyle the shell to the board's values (640px, radius 16, #1B1D24) unless they already match.
2. **Face size.** The O1 caption says "Round 1's face"; the drawn `.fface` is 30px radius 8, while R2's spares modal and
   R1's rows drew 40px radius 10 (`.face`). R3 draws 30px; follow the drawing.
3. **The `.grp` wrapper's box.** Besides the dashed border (annotation), `.grp` sets `padding:2px 12px 10px;
   margin:16px -12px 0`. Horizontally it nets to zero; vertically it adds 16px + 2px above the head (plus the head's own
   12px) and 10px below the foot line. Undecided whether that vertical spacing ships or was there to clear the outline.
4. **The section label's count.** The board draws `Friends with a spare · 2`; `spareCopy` has only `modalTitleSpares`
   ("also the section label") with no count, and no key for `view only` (`wishlistCopy.friend.viewOnly` holds the same
   word). Copy keys for both are owed.
5. **Row order.** Drawn Colin (1) above Max (2): by name, or fewest spares first, and not most-spares-first
   (R1 §16's rule, superseded). R3 states no rule.
6. **Loading.** No loading frame. The title depends on both reads (`Before you buy` needs both present), so whether the
   title waits, starts as one and changes, or the section appears late, is undecided.
7. **More than one pod.** `shares with {pod}` takes one pod; a friend who shares with the viewer through two pods is not
   drawn.
8. **Foot line text.** README §Round 3 quotes the foot line as `Reach out to offer a trade or bargain your prized family
   goat, and it's yours!` alone; the boards and `spareCopy.foot` prefix it with `A spare is a copy none of their decks
   uses, drafts included.` (READINESS cites the prefix). Follow `spareCopy.foot`.
9. **Close.** Drawn as a bare `✕` in a span with no size box; the accessible name comes from `spareCopy.close`. The
   shipped modal's close control wins.
10. **The nothing-cheaper sentence.** Its text is the shipped one and is not on any board; O2 only establishes that it
    is absent when spares exist.
