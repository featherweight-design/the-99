# Design Property Table — Invites PR 4

Source: `design/design_handoff_the99_invites/` (R1, approved by Hugh 2026-10-16): `R1 - Add-Phone`, `R1 - Add-Desktop`,
`R1 - Email-Phone`, `R1 - Email-Desktop`, `R1 - QR-Phone`, `R1 - QR-Desktop`, `R1 - Friends-Count` (`.dc.html`), plus
`README.md`, `STATES-invites-r1.md`, `INDEX.md`. Boards are drawn in the kamigawa theme; hex values are mapped to the
kamigawa token block of `src/app/globals.css`.

## Token map used below

| Hex (board) | Token |
|---|---|
| `#0E0F14` | `--bg` |
| `#16181F` | `--surface` |
| `#191B22` | `--surface-raised` |
| `#12141B` | `--surface-rail` |
| `#101219` | `--surface-sunken` |
| `#20222A` | `--elevated` |
| `#181C26` | `--border` |
| `#262A35` | `--border-strong` |
| `#343843` | `--border-dashed` |
| `#E6E8F0` | `--fg` |
| `#B1B6C7` | `--fg-body` |
| `#959AAD` | `--fg-muted` |
| `#6F7486` | `--fg-faint` |
| `#606476` | `--fg-locked` |
| `#3D404E` | `--fg-disabled` |
| `#FF4D9A` | `--accent` |
| `#FF62A9` | `--accent-hover` |
| `#D33E7E` | `--accent-strong` (= `--accent-mid`) |
| `#843052` | `--accent-shadow` (= `--accent-dim`) |
| `#6FA368` | `--success` |
| `#E0913C` | `--warning` |
| `#C6533F` | `--danger` |
| `#E07A66` | no token (error-line text; nearest is `--danger`; shipped field-error token to be matched) |
| `#F4F5F8` | no token (QR light plate; the shipped friend-link plate's value) |
| `#8E929E` | no token (expired QR plate) |
| `#14151B` | no token (card-back outer face) |
| `rgba(14,15,20,.72)` | scrim: `--bg` at 72% |
| IBM Plex Sans | `--font-sans` |
| IBM Plex Mono | `--font-mono` |
| Chakra Petch | `--font-display` (kamigawa's display face) |

Shared context (not new in PR 4, listed only for anchoring): phone frame 390×844, desktop frame 1300×820, desktop
page column 720px centered with padding 36px 0 60px, phone scroll padding 18px 16px.

---

## Component: Add a friend press + count line (/friends head)

### Add a friend press
| Property | Mobile | Desktop |
|---|---|---|
| copy element | "Add a friend" | "Add a friend" |
| width | 100% | min-width 132px, padding 0 20px |
| height | 48px | 44px |
| margin-top | 16px | — (in `.act` column) |
| border-radius | 8px | 8px |
| border | 0 | 0 |
| background | `--accent` | `--accent` |
| color | `--bg` | `--bg` |
| font | 600 15px `--font-sans` | 600 14px `--font-sans` |
| behavior | now opens the chooser (does not make a link) | same |
| held variant `.pbp.hold` (defined, not used in any frame) | background `--elevated`, color `--fg-locked` | — |
| state at 10 links open (C6) | stays live (aria-disabled false) | stays live |
| state at 0 invites (C2/C5) | stays live | stays live |

### Head action column (desktop `.act`)
| Property | Mobile | Desktop |
|---|---|---|
| display | — (press and line stack in flow) | flex |
| flex-direction | — | column |
| align-items | — | flex-end |
| gap | — | 8px |
| head row `.hd` | — | display flex; align-items flex-start; justify-content space-between; gap 24px |

### Count line `.cnt` (under the press)
| Property | Mobile | Desktop |
|---|---|---|
| copy element | `N invites left` / `Out of invites`, plus optional wait span | same |
| margin | 8px 0 0 (8px below the press) | 0 |
| font | 400 11px `--font-mono` | 400 11px `--font-mono` |
| color | `--fg-muted` | `--fg-muted` |
| text-align | left | right (Add-Desktop sets `text-align:right`; Friends-Count right via `.act` flex-end) |
| `.none` (Out of invites) color | `--fg-faint` | `--fg-faint` |
| wait span `.w` (`· 1 waiting` / `· 1 held by an open QR`) color | `--fg-body` | `--fg-body` |
| wait span shown when | a waiting invite or a live QR exists | same |
| wait span shown at 0 | Out of invites carries no wait span in C2/C5 (E5 in-dialog shows `Out of invites · 1 waiting`) | same |

### 10-link hold line `.held` (C6)
| Property | Mobile | Desktop |
|---|---|---|
| copy element | the shipped 10-link hold sentence | (not drawn; shipped placement) |
| margin | 6px 0 0 (margin-top 6px) | 0 |
| max-width | 340px | 340px |
| font | 400 11px/1.5 `--font-mono` | same |
| color | `--fg-muted` | `--fg-muted` |
| text-align | left | right |
| order | under the press, ABOVE the count line | — |
| shown when | 10 friend links open | same |

### Section head below
| Property | Mobile | Desktop |
|---|---|---|
| `.sh` margin-top | 26px | 34px |
| `.sh` padding-bottom | 8px | 8px |
| `.sh` border-bottom | 1px solid `--border` | 1px solid `--border` |

---

## Component: Dialog / sheet shell (shared by chooser, path 1, path 2, email, QR)

### Scrim
| Property | Mobile | Desktop |
|---|---|---|
| position | absolute; inset 0 | absolute; inset 0 |
| z-index | 3 | 3 |
| background | rgba(14,15,20,.72) | rgba(14,15,20,.72) |

### Container
| Property | Mobile (bottom sheet `.sht`) | Desktop (dialog `.dlg`) |
|---|---|---|
| position | absolute; left 0; right 0; bottom 0 | absolute; left 50%; top 82px; transform translateX(-50%) |
| z-index | 4 | 4 |
| width | full | 440px |
| background | `--surface-raised` | `--surface-raised` |
| border | border-top 1px solid `--border-strong` | 1px solid `--border-strong` |
| border-radius | 20px 20px 0 0 | 14px |
| padding | 9px 18px 24px | 12px 20px 18px |
| box-shadow | 0 -20px 50px rgba(0,0,0,.5) | 0 30px 70px rgba(0,0,0,.6) |
| box-sizing | border-box | border-box |
| role / aria | dialog, aria-modal true, aria-label "Add a friend" (chooser, path 1) / "Invite someone new" (path 2, email, QR) | same |
| screen swap | each path's screen replaces the chooser in the same sheet | same dialog |
| close | ✕ and Esc from any screen; ‹ goes back one | same |

### Grab handle
| Property | Mobile | Desktop |
|---|---|---|
| width × height | 40px × 4px | — (absent) |
| border-radius | 2px | — |
| background | `--border-strong` | — |
| margin | 0 auto 4px | — |

### Header row `.dh`
| Property | Mobile | Desktop |
|---|---|---|
| display | flex | flex |
| align-items | center | center |
| gap | 4px | 4px |
| margin-right | -10px | -10px |
| h2 font | 700 18px `--font-display` | 700 19px `--font-display` |
| h2 color | `--fg` | `--fg` |
| h2 flex | 1 | 1 |
| h2 margin | 0 | 0 |

### Back button `.bk` (‹) — path screens only
| Property | Mobile | Desktop |
|---|---|---|
| shown | path 1, path 2, email, QR screens; absent on the chooser | same |
| aria-label | Back | Back |
| width × height | 44px × 44px | 36px × 44px |
| margin-left | -12px | -10px |
| border / background | 0 / transparent | 0 / transparent |
| color | `--fg` | `--fg` |
| font | 400 22px `--font-sans` | 400 22px `--font-sans` |
| padding | 0 0 3px | 0 0 3px |
| position | left of the title | left of the title |

### Close button `.x` (✕)
| Property | Mobile | Desktop |
|---|---|---|
| aria-label | Close | Close |
| width × height | 44px × 44px | 44px × 44px |
| border / background | 0 / transparent | 0 / transparent |
| color | `--fg-muted` | `--fg-muted` |
| font-size | 15px `--font-sans` | 15px `--font-sans` |
| padding | 0 | 0 |

### Sub line `.dsub` (chooser and path 1)
| Property | Mobile | Desktop |
|---|---|---|
| copy element | chooser sub (nobody is looked up) / path 1 shipped sub | same |
| margin | 0 0 14px | 0 0 14px |
| font-size | 13px | 13px |
| line-height | 1.5 | 1.5 |
| color | `--fg-muted` | `--fg-muted` |

---

## Component: Chooser (A1–A3, D1–D2)

### Options stack `.opts`
| Property | Mobile | Desktop |
|---|---|---|
| display | flex | flex |
| flex-direction | column | column |
| gap | 10px | 10px |

### Option card `.opt` (both cards, `<button>`)
| Property | Mobile | Desktop |
|---|---|---|
| display | grid | grid |
| grid-template-columns | 56px minmax(0,1fr) 14px | 52px minmax(0,1fr) 14px |
| align-items | center | center |
| column-gap | 14px | 14px |
| width | 100% | 100% |
| min-height | 88px | 80px |
| padding | 14px 14px 14px 12px | 12px 14px 12px 12px |
| box-sizing | border-box | border-box |
| border-radius | 12px | 12px |
| border | 1px solid `--border-strong` | 1px solid `--border-strong` |
| background | `--elevated` | `--elevated` |
| text-align | left | left |
| color | `--fg` | `--fg` |
| font-family | `--font-sans` | `--font-sans` |

### Option text column `.tt`
| Property | Mobile | Desktop |
|---|---|---|
| display | flex; column | flex; column |
| gap | 3px | 3px |
| min-width | 0 | 0 |
| title `b` font | 600 15px | 600 14.5px |
| title `b` color | `--fg` | `--fg` |
| body `span` font-size | 12.5px | 12.5px |
| body `span` line-height | 1.45 | 1.45 |
| body `span` color | `--fg-muted` | `--fg-muted` |
| copy elements | card 1: title + sentence; card 2: title + sentence + count line | same |

### Chevron `.cv` (›)
| Property | Mobile | Desktop |
|---|---|---|
| color | `--fg-muted` | `--fg-muted` |
| font-size | 20px | 20px |
| line-height | 1 | 1 |
| aria-hidden | true | true |

### Card 2 count line `.left`
| Property | Mobile | Desktop |
|---|---|---|
| copy element | `N invites left` / `Out of invites` | same |
| font | 400 11px `--font-mono` | 400 11px `--font-mono` |
| color | `--accent` | `--accent` |

### Card 1 glyph tile `.gly`
| Property | Mobile | Desktop |
|---|---|---|
| width × height | 56px × 56px | 52px × 52px |
| border-radius | 12px | 12px |
| border | 1px solid `--border-dashed` | 1px solid `--border-dashed` |
| background | `--surface` | `--surface` |
| display | flex; center/center | flex; center/center |
| color | `--fg` | `--fg` |
| box-sizing | border-box | border-box |
| aria-hidden | true | true |

### Card 1 QR icon (SVG)
| Property | Mobile | Desktop |
|---|---|---|
| width × height | 26 × 26 | 24 × 24 |
| viewBox | 0 0 24 24 | 0 0 24 24 |
| fill | none | none |
| stroke | currentColor | currentColor |
| stroke-width | 1.6 | 1.6 |
| shapes | rect 3,3 7×7 rx1; rect 14,3 7×7 rx1; rect 3,14 7×7 rx1; path `M14 14h3v3h-3zM18 18h3v3h-3zM14 20h1M20 14h1` | same |

### Card 2 fan `.fan` (count as card backs)
| Property | Mobile | Desktop |
|---|---|---|
| position | relative | relative |
| width × height | 56px × 56px | 52px × 52px |
| aria-hidden | true | true |
| minis rendered | one per invite, up to 3 (more reads as 3); at 0 one `.gone` slot | same |

### Fan mini card `.mini`
| Property | Mobile | Desktop |
|---|---|---|
| position | absolute; left 16px; top 10px | absolute; left 14px; top 9px |
| width × height | 24px × 34px | 24px × 34px |
| border-radius | 4px | 4px |
| border | 1px solid `--border-dashed` | 1px solid `--border-dashed` |
| background | radial-gradient(18px 18px at 50% 46%, rgba(255,77,154,.35), transparent 75%), `--surface-sunken` | same |
| display | flex; center/center | flex; center/center |
| text | "99", 700 9px `--font-display` | same |
| color | `--fg` | `--fg` |
| box-shadow | 0 4px 10px rgba(0,0,0,.5) | same |
| `.a` transform | rotate(-14deg) translate(-8px,2px) | rotate(-14deg) translate(-8px,2px) |
| `.b` transform | rotate(0deg) translate(0,-2px) | translate(0,-2px) |
| `.c` transform | rotate(14deg) translate(8px,2px) | rotate(14deg) translate(8px,2px) |
| order of minis at 3 | a, b, c | a, b, c |
| `.gone` (0 invites; class `mini b gone`) | background transparent; border 1.5px dashed `--border-dashed`; box-shadow none; color `--fg-disabled` | same |

### Card 1 pending `.opt.pend` (A3, making a link)
| Property | Mobile | Desktop |
|---|---|---|
| border-color | `--accent-shadow` | (not drawn; phone rule holds) |
| title color | `--accent-hover` | — |
| title copy | replaced by the making-a-link title until the link exists | — |

### Card 2 off `.opt.off` (A2, D2: 0 invites)
| Property | Mobile | Desktop |
|---|---|---|
| aria-disabled | true | true |
| background | transparent | transparent |
| border-style | dashed | dashed |
| border-color | `--border-dashed` | `--border-dashed` |
| title color | `--fg-locked` | `--fg-locked` |
| sentence color | `--fg-locked` | `--fg-locked` |
| `.left` color | `--fg-muted` | `--fg-muted` |
| `.cv` color | `--fg-disabled` | `--fg-disabled` |
| hover | — | none (takes no hover) |
| card 1 | unaffected | unaffected |

### Card 1 held at 10 friend links (Friends C6 note; not drawn as a frame)
| Property | Mobile | Desktop |
|---|---|---|
| rendering | card 1 greys with the shipped hold sentence; card 2 stays live | same |

### Hover — option card (desktop)
| Property | Mobile | Desktop |
|---|---|---|
| `.opt.hov` border-color | — | `--accent` |
| applies to | — | live cards only (not `.off`) |

---

## Component: Path 1 — friend link screen (A4, D3)

Shipped friend-link sheet/dialog, unchanged except the ‹ back in the header.

### Body
| Property | Mobile | Desktop |
|---|---|---|
| sub `.dsub` | shipped sub | shipped sub |
| QR wrap `.qrw` | flex; column; align-items center; gap 8px; margin-top 4px | same |
| QR plate `.qr` background | `#F4F5F8` | `#F4F5F8` |
| QR plate border-radius | 10px | 10px |
| QR plate padding | 16px | 16px |
| QR grid | grid; 29 columns × 7px; auto-rows 7px | grid; 29 columns × 6px; auto-rows 6px |
| QR dark module | `--bg` | `--bg` |
| QR role / label | img, "QR code for the friend link" | same |
| caption `.qcap` | — | "Scan with a phone camera": 10.5px `--font-mono`, `--fg-faint` |
| primary press | Share link `.b1` (with share icon) | link field `.lf` + Copy link `.bf` in a row |
| secondary press | Copy link `.b2` | — |
| meta line | `.meta`: margin 12px 0 0; center; 11px `--font-mono`; `--fg-muted` | `.meta`: margin 10px 0 0; left; 11px `--font-mono`; `--fg-muted` |
| link row `.row` | — | flex; gap 8px; margin-top 18px |
| link field `.lf` | — | flex 1; height 40px; radius 6px; padding 0 12px; background `--surface-sunken`; border 1px solid `--border-strong`; 12.5px `--font-mono`; color `--fg-body` |
| Copy link `.bf` | — | height 40px; padding 0 16px; radius 6px; border 0; background `--accent`; color `--bg`; 600 13px `--font-sans`; flex none; gap 8px |
| back behavior | leaves the link made and open | same |

### Share icon (phone `.b1`)
| Property | Mobile | Desktop |
|---|---|---|
| width × height | 18 × 18 | — |
| viewBox | 0 0 24 24 | — |
| stroke-width | 1.8 | — |
| fill / stroke | none / currentColor | — |
| path d | `M12 15V4M8 8l4-4 4 4` and `M5 12v7a1 1 0 001 1h12a1 1 0 001-1v-7` | — |

---

## Component: Path 2 — Invite someone new (A5, D4; also the base of E1–E6)

### Count sub `.cnt` (in-dialog)
| Property | Mobile | Desktop |
|---|---|---|
| copy element | `N invites left` / `Out of invites`, plus wait span | same |
| margin | 0 0 16px | 0 0 16px |
| font | 11px `--font-mono` | 11px `--font-mono` |
| color | `--fg-muted` | `--fg-muted` |
| text-align | left | left |
| `.w` color | `--fg-body` | `--fg-body` |
| `.none` color | `--fg-faint` | `--fg-faint` |
| position | where the shipped sheet keeps its sub | the dialog's sub |

### Section label `.k.sk` ("At the table", "By email")
| Property | Mobile | Desktop |
|---|---|---|
| font | 500 10.5px `--font-mono` | same |
| letter-spacing | .14em | .14em |
| text-transform | uppercase | uppercase |
| color | `--fg-faint` | `--fg-faint` |
| margin | 4px 0 6px | 4px 0 6px |

### Section sentence `.sp`
| Property | Mobile | Desktop |
|---|---|---|
| margin | 0 | 0 |
| font-size | 13px | 13px |
| line-height | 1.5 | 1.5 |
| color | `--fg-body` | `--fg-body` |

### Show an invite QR press
| Property | Mobile (`.b1`) | Desktop (`.bf`) |
|---|---|---|
| width | 100% | auto (content), flex none |
| height | 48px | 44px |
| margin-top | 12px | 12px |
| padding | — | 0 16px |
| border-radius | 8px | 6px |
| border | 0 | 0 |
| background | `--accent` | `--accent` |
| color | `--bg` | `--bg` |
| font | 600 15px `--font-sans` | 600 13px `--font-sans` |
| display | flex; align-items center; justify-content center; gap 8px | flex; align-items center; gap 8px |
| icon | 18×18, viewBox 0 0 24 24, stroke-width 1.8, rects 3,3 / 14,3 / 3,14 7×7 rx1, path `M14 14h3v3h-3zM18 18h3v3h-3` | 16×16, otherwise same |
| behavior | re-shows the live QR if one exists | same |
| held `.held` (E3 sending, E5 out) | background `--elevated`; color `--fg-locked`; aria-disabled true | same |

### "or" divider `.or`
| Property | Mobile | Desktop |
|---|---|---|
| display | flex; align-items center | same |
| gap | 12px | 12px |
| margin | 18px 0 14px | 18px 0 14px |
| font | 11px `--font-mono` | 11px `--font-mono` |
| color | `--fg-faint` | `--fg-faint` |
| rules `i` | flex 1; height 1px; background `--border-strong` | same |
| aria-hidden | true | true |

### Field label `.lab`
| Property | Mobile | Desktop |
|---|---|---|
| display | block | block |
| font | 600 13px `--font-sans` | 600 13px |
| color | `--fg` | `--fg` |
| margin-bottom | 6px | 6px |
| for | the email field | same |

### Email field
| Property | Mobile (`.fld`) | Desktop (`.lf` in a row) |
|---|---|---|
| layout | full width, own row | flex 1, in a flex row with Send, gap 8px |
| height | 48px | 40px |
| border-radius | 8px | 6px |
| padding | 0 12px | 0 12px |
| display | flex; align-items center | flex; align-items center |
| background | `--surface-sunken` | `--surface-sunken` |
| border | 1px solid `--border-strong` | 1px solid `--border-strong` |
| font | 16px `--font-sans` | 14px `--font-sans` |
| color (value) | `--fg` | `--fg` |
| placeholder color | `--fg-faint` (`.empty`) | `--fg-faint` |
| focused `.on` border-color | `--accent` | `--accent` |
| invalid `.bad` border-color | `--danger` | `--danger` |
| locked `.lock` (sending) color | `--fg-muted` | `--fg-muted` |

### Send invitation press
| Property | Mobile | Desktop (`.bs`) |
|---|---|---|
| width | 100% | auto, flex none |
| height | 48px | 40px |
| margin-top | 12px (`.b1`) / 8px (`.b2` outlined) | — (in row) |
| padding | — | 0 16px |
| border-radius | 8px | 6px |
| filled (field holds an email) | `.b1`: border 0; background `--accent`; color `--bg`; 600 15px | `.bs`: border 0; background `--accent`; color `--bg`; 600 13px |
| outlined (empty / not an email) | `.b2`: border 1px solid `--border-strong`; background transparent; color `--fg-muted`; 500 15px | `.bs.idle`: border 1px solid `--border-strong`; background transparent; color `--fg-muted`; 600 13px |
| sending `.wait` | background `--accent-strong`; copy "Sending…" | background `--accent-strong`; copy "Sending…" |
| keyboard | Return key sends | same |

### Field hint `.hint`
| Property | Mobile | Desktop |
|---|---|---|
| margin | 8px 0 0 | 8px 0 0 |
| font | 11px/1.5 `--font-mono` | 11px/1.5 `--font-mono` |
| color | `--fg-faint` | `--fg-faint` |
| shown | with the form; hidden once the answer replaces it | same |

### Field error line `.err` (E1)
| Property | Mobile | Desktop |
|---|---|---|
| role | alert | alert |
| margin | 8px 0 0 | 8px 0 0 |
| font-size | 12.5px | 12.5px |
| line-height | 1.45 | 1.45 |
| color | `#E07A66` | `#E07A66` |
| position | under the field, above Send | under the field+Send row, above the hint |
| shown when | Send pressed with a bad shape; then live as they type | same |

---

## Component: Email answer — Invitation sent (E4, E5)

### Answer card `.sent` (replaces the form; role status)
| Property | Mobile | Desktop |
|---|---|---|
| border | 1px solid `--border-strong` | 1px solid `--border-strong` |
| border-radius | 12px | 12px |
| background | `--surface` | `--surface` |
| padding | 16px 16px 6px | 14px 16px 4px |
| display | flex; column | flex; column |
| gap | 6px | 6px |
| title `b` | flex; align-items center; gap 8px; 700 17px `--font-display`; `--fg` | same |
| check `b i` (✓) | font-style normal; color `--success`; 16px; aria-hidden | same |
| body `span` | 13px/1.5; `--fg-body` | same |
| address repeated | never | never |

### Invite someone else `.tl`
| Property | Mobile | Desktop |
|---|---|---|
| align-self | flex-start | flex-start |
| min-height | 44px | 36px |
| padding | 0 2px | 0 2px |
| border / background | 0 / transparent | 0 / transparent |
| color | `--accent` | `--accent` |
| font | 500 13.5px `--font-sans` | same |
| shown | E4; absent on E5 | same |
| action | brings an empty field back | same |

### Last-invite line (E5)
| Property | Mobile | Desktop |
|---|---|---|
| font | 11px `--font-mono` | 11px `--font-mono` |
| color | `--fg-faint` | `--fg-faint` |
| padding-bottom | 12px | 10px |
| shown | only when the send spent the last invite | same |

---

## Component: Send-failed toast (E6)

| Property | Mobile | Desktop |
|---|---|---|
| component | shared ToastFrame | shared ToastFrame, at the foot of the page |
| role | alert | alert |
| position | absolute; left 16px; right 16px; bottom 16px; z-index 6 | (not drawn; shipped ToastFrame) |
| display | flex; align-items center; gap 12px | — |
| border-radius | 10px | — |
| border | 1px solid `--border-strong` | — |
| background | `--elevated` | — |
| padding | 4px 6px 4px 16px | — |
| box-shadow | 0 12px 40px rgba(0,0,0,.5) | — |
| text `span` | flex 1; padding 8px 0; 13.5px; `--fg` | — |
| Try again button | height 44px; padding 0 12px; border 0; transparent; `--accent`; 600 13px | — |
| field | keeps typed text | same |
| shown when | transport failure only (never for an existing account) | same |

---

## Component: Invite QR screen (Q1–Q5)

### Count sub `.cnt`
| Property | Mobile | Desktop |
|---|---|---|
| margin | 0 0 14px | 0 0 14px |
| font | 11px `--font-mono` | 11px `--font-mono` |
| color | `--fg-muted` | `--fg-muted` |
| `.w` color (`· 1 held by this QR` / `· 1 waiting`) | `--fg-body` | `--fg-body` |

### QR wrap `.qrw`
| Property | Mobile | Desktop |
|---|---|---|
| display | flex; column; align-items center | same |
| gap | 10px | 8px |

### Countdown ring `.ring`
| Property | Mobile | Desktop |
|---|---|---|
| position | relative | relative |
| padding | 5px | 5px |
| border-radius | 15px | 15px |
| background | conic-gradient(`color` 0 P%, `--border-strong` P% 100%) | same |
| ring color (live) | `--accent` | `--accent` |
| ring color (under 1 minute) | `--warning` | `--warning` |
| P | remaining share of 15:00 (Q1 phone 99%, Q1 desktop 61%, Q2 5%, Q4 0%, Q5 100%) | same |
| drain direction | clockwise over 15 minutes | same |

### Plate `.plate`
| Property | Mobile | Desktop |
|---|---|---|
| position | relative | relative |
| background | `#F4F5F8` | `#F4F5F8` |
| border-radius | 10px | 10px |
| padding | 16px | 16px |
| grid `.qr` | 29 × 7px columns, auto-rows 7px | 29 × 6px columns, auto-rows 6px (206px plate) |
| dark module | `--bg` | `--bg` |
| role / label | img, "Invite QR code" | same |
| expired `.dead` background | `#8E929E` | `#8E929E` |
| expired `.dead .qr` | opacity .28; filter grayscale(1) | same |

### EXPIRED chip `.chip` (Q4)
| Property | Mobile | Desktop |
|---|---|---|
| position | absolute; left 50%; top 50%; transform translate(-50%,-50%) | same |
| height | 34px | 32px |
| padding | 0 16px | 0 14px |
| border-radius | 999px | 999px |
| background | `--bg` | `--bg` |
| border | 1px solid `--border-dashed` | 1px solid `--border-dashed` |
| color | `--fg` | `--fg` |
| font | 600 13px `--font-mono` | 600 12.5px `--font-mono` |
| letter-spacing | .08em | .08em |
| display | flex; align-items center | same |

### Plate caption `.qcap` (live only)
| Property | Mobile | Desktop |
|---|---|---|
| shown | — | live states |
| font | — | 10.5px `--font-mono` |
| color | — | `--fg-faint` |

### Timer `.time`
| Property | Mobile | Desktop |
|---|---|---|
| role / aria-live | timer / off | timer / off |
| display | flex; align-items baseline | same |
| gap | 6px | 6px |
| font | 600 22px `--font-mono` | 600 20px `--font-mono` |
| color | `--fg` | `--fg` |
| format | `mm:ss` (e.g. 14:52, 0:41, 15:00) + `left` | same |
| `small` | 12px `--font-mono`; `--fg-muted` | same |
| `.warn` color (under 1 minute) | `--warning` | `--warning` |
| tick | each second | each second |

### Meta line `.meta` (live)
| Property | Mobile | Desktop |
|---|---|---|
| margin | 2px 0 0 | 0 |
| text-align | center | center |
| font | 11px/1.5 `--font-mono` | 11px/1.5 `--font-mono` |
| color | `--fg-muted` | `--fg-muted` |

### Expired sentence `.dead-t`
| Property | Mobile | Desktop |
|---|---|---|
| margin | 4px 0 0 | 6px 0 0 |
| text-align | center | center |
| font-size | 13.5px | 13.5px |
| line-height | 1.5 | 1.5 |
| color | `--fg-body` | `--fg-body` |

### Presses
| Property | Mobile | Desktop |
|---|---|---|
| Done (live, Q1/Q2/Q5) | `.b2`: width 100%; height 48px; margin-top 6px; radius 8px; border 1px solid `--border-strong`; transparent; `--fg`; 500 15px | `.bo` in `.foot`: height 40px; padding 0 16px; radius 6px; border 1px solid `--border-strong`; transparent; `--fg`; 500 13px |
| Make a new QR (Q4) | `.b1`: width 100%; height 48px; margin-top 6px; radius 8px; border 0; `--accent`; `--bg`; 600 15px | `.bf` in `.foot`: height 40px; padding 0 16px; radius 6px; border 0; `--accent`; `--bg`; 600 13px |
| Done (claimed, Q3) | `.b2`: width 100%; height 48px; margin-top 16px | `.bo` in `.foot` |
| foot `.foot` | — (presses inside `.qrw` column) | display flex; justify-content flex-end; margin-top 14px |
| Done behavior | closes; QR stays live and holding | same |

### Claimed answer `.sent` (Q3, role status)
| Property | Mobile | Desktop |
|---|---|---|
| border | 1px solid `--border-strong` | same |
| border-radius | 12px | 12px |
| background | `--surface` | `--surface` |
| padding | 22px 18px | 20px 18px |
| display | flex; column; align-items center | same |
| gap | 8px | 8px |
| text-align | center | center |
| title `b` | flex; center; gap 8px; 700 20px `--font-display`; `--fg` | same |
| check `i` | `--success`; normal; aria-hidden | same |
| body `span` | 13.5px/1.5; `--fg-body` | same |

### Card back `.back` (Q3)
| Property | Mobile | Desktop |
|---|---|---|
| width × height | 120px × 168px | 120px × 168px |
| border-radius | 9px | 9px |
| padding | 6px | 6px |
| background | `#14151B` | `#14151B` |
| box-shadow | 0 14px 30px rgba(0,0,0,.55), inset 0 0 0 1px `--border-strong` | same |
| transform | rotate(-4deg) | rotate(-4deg) |
| margin-bottom | 6px | 6px |
| aria-hidden | true | true |
| inner `.in` | 100%×100%; radius 6px; border 1px solid `--border-dashed`; background radial-gradient(90px 100px at 50% 46%, rgba(255,77,154,.24), transparent 72%), repeating-linear-gradient(45deg, rgba(255,255,255,.018) 0 6px, transparent 6px 12px), `--surface-sunken`; flex column center/center; gap 6px | same |
| hero `.hero` | flex column center; 700 28px `--font-display`; `--fg`; line-height 1 | same |
| hero pips `.hero i` | "◆ ◆ ◆"; `--accent`; 7px; letter-spacing 2px; margin-bottom 4px | same |
| word `.wd` | "INVITATION"; 7px `--font-mono`; letter-spacing .3em; `--accent` | same |

---

## Hover / interactive states (summary)

| Element | Mobile | Desktop |
|---|---|---|
| Chooser card (live) hover | — | border-color `--accent` |
| Chooser card 2 off hover | — | none |
| Email field focus | border-color `--accent` | border-color `--accent` |
| Email field invalid | border-color `--danger` | border-color `--danger` |
| Card 1 pressed (pending) | border `--accent-shadow`, title `--accent-hover` | phone rule |
| Send pressed (sending) | background `--accent-strong`, field and QR press held | same |

No transitions or animations are specified on these boards beyond the sheet/dialog's shipped ones; the only transforms are the fan minis, the card back's rotate(-4deg), the chip's centering, and the dialog's translateX(-50%).

---

## State Coverage

| State | Triggering condition | What is rendered | Key inputs |
|---|---|---|---|
| A1 | Phone; Add a friend pressed; invites > 0 | Sheet: title, ✕, sub, card 1 (QR glyph), card 2 (fan of up to 3 minis + `N invites left` in accent); page count line under press | invites left (3), no waiting |
| A2 | Phone; chooser with 0 invites | Card 2 `.off` (dashed, greyed, aria-disabled), fan = one `.gone` slot, line `Out of invites`; page line `Out of invites` in `--fg-faint`; card 1 unchanged | invites left = 0 |
| A3 | Phone; card 1 pressed | Card 1 `.pend` (accent-shadow border, accent-hover title) holding the making-a-link title until the link exists; same action, 10-link hold and failure toast as shipped | link creation pending |
| A4 | Phone; link made | Shipped friend-link sheet + ‹ back (44px); QR plate, Share link, Copy link, meta line | link token, expiry |
| A5 | Phone; card 2 pressed with invites > 0 | Path 2 sheet: ‹, title, ✕, count sub, At the table + sentence + Show an invite QR (filled), or, By email + label + field (placeholder) + Send invitation (outlined) + hint | invites left, waiting/held |
| D1 | Desktop; chooser, invites > 0, card 2 hovered | 440 dialog at top 82px; cards 80px; card 2 border `--accent` on hover; count line right-aligned under the page press | invites left (3) |
| D2 | Desktop; chooser, 0 invites | Card 2 `.off`, no hover; page line `Out of invites` in `--fg-faint` | invites left = 0 |
| D3 | Desktop; card 1 → link made | Shipped dialog + ‹ back (36×44): QR plate 6px modules, caption, link field + Copy link row, meta | link token, expiry |
| D4 | Desktop; card 2 pressed | Path 2 dialog: count sub, Show an invite QR (44px), or, label, field + Send (outlined `.bs.idle`) in a row, hint | invites left |
| E1 | Send pressed with a value failing the shape check (an @ and a dot after it) | Field `.bad` (danger border), error line (role alert), Send outlined; no server call; then re-checked live as they type | field value |
| E2 (phone only) | Field holds a valid-shape email | Field `.on` (accent border), Send filled; Return sends | field value |
| E3 | Send pressed with a valid email | Field `.lock` (`--fg-muted`), QR press `.held` (aria-disabled), Send `.wait` (`--accent-strong`) "Sending…"; same wait for every email (server floor) | send in flight |
| E4 | Send returned (any outcome but transport failure) | Form replaced by `.sent`: ✓ Invitation sent, 7-day sentence, Invite someone else; count `N-1 invites left · 1 waiting` | invites left, waiting |
| E5 | Send spent the last invite | Same answer; Invite someone else absent; last-invite line; QR press `.held` aria-disabled; count `Out of invites · 1 waiting` in `--fg-faint` | invites left = 0 after send |
| E6 | Transport failure reaching the server | Shared ToastFrame (role alert) with Try again; field keeps text; form still shown | network error |
| Q1 | Show an invite QR pressed (or re-shown while live) | Ring in `--accent` at remaining share, plate, (desktop caption), timer `mm:ss left`, meta, Done; count `N invites left · 1 held by this QR` | expiry time, invites left |
| Q2 | Live QR with under 1 minute left | Ring and timer in `--warning`; nothing else changes | remaining < 60s |
| Q3 | Newcomer sends their code (claim) | Plate replaced by `.sent` with tilted card back, ✓ Invitation sent, sentence; Done; count `· 1 waiting` | claim event |
| Q4 | QR reached 15:00 unused | Ring empty, plate `.dead` greyed under EXPIRED chip, expired sentence, Make a new QR (filled, the one press); count back up, no held span | expired |
| Q5 (phone only) | Make a new QR pressed | Fresh token, full ring (100%), timer 15:00 | new token |
| C1 | Desktop /friends; invites left with one waiting | Count line under Add a friend, right-aligned: `2 invites left` + `· 1 waiting` (`--fg-body`) | invites left, waiting count |
| C2 | Desktop /friends; 0 invites | `Out of invites` in `--fg-faint`; press stays live | invites left = 0 |
| C3 | Phone /friends; invites left | Count line left-aligned 8px under the full-width press | invites left |
| C4 | Phone /friends; sheet closed on a live QR | `2 invites left · 1 held by an open QR`; re-opening Show an invite QR re-shows the same QR; at expiry the line returns to 3 | live QR held |
| C5 | Phone /friends; 0 invites | `Out of invites` in `--fg-faint`; press live (a new account reads this until given invites) | invites left = 0 |
| C6 | Phone /friends; 10 friend links open | Press stays live; shipped hold line (`.held`) under the press, above the count line; inside, card 1 greys with the same sentence, card 2 live | open friend links = 10, invites left |
