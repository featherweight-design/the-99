# Design Property Table — Admin R3 masking, PR 2 surfaces

Source: `design/design_handoff_the99_admin/R3/AdminR3.dc.html` (CSS + scenes `list`, `account`, `tree`, `group`, `picker` + fixture script), `README-R3.md` (D1–D14), `STATES-admin-R3.md` (A1, B1, C1–C3), `design-tables/admin-r3.md`. Desktop = `.desk` 900px frame; Phone = `.phone` 390px frame. `.dk` = desktop only, `.ph` = phone only. "Same" = no phone override in the source. Colors are theme tokens (the board declares them per theme on the frame root). Excluded per scope: Show/Hide, revealed states, search fields and lookup lines, toasts, history reveal lines, copy wording.

Shared base: frame font-family `'IBM Plex Sans',sans-serif`, color `var(--fg)`, `box-sizing:border-box` on all descendants. `.mono` = `'IBM Plex Mono',monospace`. Color helpers: `.faint` `var(--fg-faint)`, `.muted` `var(--fg-muted)`, `.body` `var(--fg-body)`, `.acc` `var(--accent)`, `.fgc` `var(--fg)`.

---

## Component: Accounts list (scene `list`, A1)

### Card container `.card`
| Property | Phone | Desktop |
|----------|-------|---------|
| border | same | 1px solid `var(--border-strong)` |
| border-radius | same | 12px |
| background | same | `var(--surface)` |
| overflow | same | hidden |

### Column head `.colhead` (class `dk`)
| Property | Phone | Desktop |
|----------|-------|---------|
| rendered | — (hidden, `display:none !important`) | yes |
| display | — | grid |
| grid-template-columns | — | `minmax(0,2.1fr) minmax(0,0.6fr) 78px 104px minmax(0,0.7fr) 52px` |
| gap | — | 14px |
| align-items | — | center |
| padding | — | 9px 16px |
| background | — | `var(--surface-rail)` |
| font-family | — | `'IBM Plex Mono',monospace` |
| font-size | — | 9.5px |
| letter-spacing | — | 0.12em |
| text-transform | — | uppercase |
| color | — | `var(--fg-faint)` |
| border-bottom | — | 1px solid `var(--border)` |
| columns (structure) | — | 6: Account, Group, Credits now, Invites, Invited by, month (`Oct`); 6th header `text-align:right` |

### Row `.arow`
| Property | Phone | Desktop |
|----------|-------|---------|
| border-top | 1px solid `var(--border)`; `.first` → 0 | 1px solid `var(--border)`; `.first` → 0 |
| position | relative | relative |
| display | flex | grid |
| flex-direction | column | — |
| grid-template-columns | — | `minmax(0,2.1fr) minmax(0,0.6fr) 78px 104px minmax(0,0.7fr) 52px` (identical to `.colhead`) |
| gap | 5px | 14px |
| align-items | (default stretch) | center |
| padding | 11px 8px 11px 14px | 10px 16px |
| min-height | 64px | 64px |
| children | `.acell`, then `.pmeta` (five `.cell`s hidden) | `.acell`, five `.cell`s (`.pmeta` hidden) |

### Account cell `.acell`
| Property | Phone | Desktop |
|----------|-------|---------|
| display | flex | flex |
| align-items | center | center |
| gap | 11px | 11px |
| min-width | 0 | 0 |
| children order | avatar, `a.stack` (name + email), Show (non-owner only; excluded from this table) | same |

### Avatar `.av` (initials) and `.av.nm` (diamond)
| Property | Phone | Desktop |
|----------|-------|---------|
| display | inline-flex | inline-flex |
| align-items / justify-content | center / center | center / center |
| flex | none | none |
| width × height | 34px × 34px | 34px × 34px |
| border-radius | 10px | 10px |
| border | 1px solid `var(--accent)` | 1px solid `var(--accent)` |
| background | `var(--bg)` | `var(--bg)` |
| color | `var(--accent)` | `var(--accent)` |
| font-family | `'IBM Plex Mono',monospace` | `'IBM Plex Mono',monospace` |
| font-size | 11.5px | 11.5px |
| content, named account | initials from the MASKED name (`CR`, `CH`, `MD`, `PK`) | same |
| content, no-name or owner (`.av.nm`) | an empty `<i>`: 8px × 8px, `transform:rotate(45deg)`, background `var(--accent)`; no letters | same |
| which rows | `.av.nm` when the fixture has no `init`: owner `You` and `Account ·9xQe` (D4); `.av` otherwise | same |

### Name/email stack `a.stack`
| Property | Phone | Desktop |
|----------|-------|---------|
| element | `<a>` (the link) | same |
| display | flex | flex |
| flex-direction | column | column |
| gap | 2px | 2px |
| min-width | 0 | 0 |
| flex | 1 | 1 |
| children | `.nm1` name line, `.mm` email line; no third line when masked | same |

### Name line `.nm1`
| Property | Phone | Desktop |
|----------|-------|---------|
| font-size | 14px | 14px |
| font-weight | 500 | 500 |
| color | `var(--fg)` | `var(--fg)` |
| overflow-wrap | anywhere | anywhere |
| content (fixture) | masked name (D1): `You`, `Colin R.`, `chrisplays`, `Max D.`, `Peter K.`, `Account ·9xQe` | same |
| owner tag | `.tag` inline inside `.nm1`, after the name, owner row only | same |

### Owner tag `.tag` (list row)
| Property | Phone | Desktop |
|----------|-------|---------|
| display | inline-flex | inline-flex |
| align-items | center | center |
| height | 18px | 18px |
| border-radius | 999px | 999px |
| border | 1px solid `var(--border-strong)` | 1px solid `var(--border-strong)` |
| padding | 0 7px | 0 7px |
| font-family | `'IBM Plex Mono',monospace` | same |
| font-size | 10px | 10px |
| letter-spacing | 0.08em | 0.08em |
| color | `var(--fg-muted)` | `var(--fg-muted)` |
| margin-left | 6px | 6px |
| vertical-align | 1px | 1px |
| rendered when | `owner` | `owner` |

### Masked email line `.mm.faint`
| Property | Phone | Desktop |
|----------|-------|---------|
| font-family | `'IBM Plex Mono',monospace` | same |
| font-size | 10.5px | 10.5px |
| line-height | 1.5 | 1.5 |
| color | `var(--fg-faint)` (masked `emailCls` = `faint`) | same |
| overflow / text-overflow / white-space | hidden / ellipsis / nowrap | same |
| content (fixture) | masked email (D2), e.g. `c•••@g•••.com`, `h•••@f•••.design`, `m•••@p•••.me` | same |

### Clerk id
| Property | Phone | Desktop |
|----------|-------|---------|
| Clerk id line in masked row | — (absent; `r.id` renders only under `r.rev`, D3) | — |

### Desktop cells `.cell` (class `dk`)
| Property | Phone | Desktop |
|----------|-------|---------|
| rendered | — | yes |
| font-family | — | `'IBM Plex Mono',monospace` |
| font-size | — | 12px |
| color (base) | — | `var(--fg-body)` |
| overflow-wrap | — | anywhere |
| Group cell | — | base color; fixture `testers` / `friends` / `No group` |
| Credits cell | — | base color; fixture content `N of M` (`10 of 10`, `5 of 5`, `4 of 5`, `3 of 5`), no trailing word |
| Invites cell | — | `.fgc` → `var(--fg)`; fixture `8`, `2 · 1 waiting`, `1`, `0` |
| Invited-by cell | — | `byCls`: owner row `founder` in `.faint` `var(--fg-faint)`; others the masked inviter name in `.fgc` `var(--fg)` |
| Spend cell `.cell.r` | — | `text-align:right`; font-size 13px; color `var(--fg)`; fixture `$3.40` etc. |

### Phone meta line `.pmeta` (class `ph`)
| Property | Phone | Desktop |
|----------|-------|---------|
| rendered | yes | — |
| padding-left | 45px (34px avatar + 11px gap) | — |
| font-family | `'IBM Plex Mono',monospace` | — |
| font-size | 10.5px | — |
| color | `var(--fg-body)` | — |
| content order (fixture) | `group · credits · invites · by · spend`, joined by ` · ` (e.g. `friends · 5 of 5 · 2 invites, 1 waiting · by You · $0.84`); owner: `testers · 10 of 10 · 8 invites · founder · $3.40`; spend is LAST | — |

---

## Component: Account page head (scene `account`, B1)

### Head row (`.inrow` override)
| Property | Phone | Desktop |
|----------|-------|---------|
| display | flex | flex |
| align-items | flex-start | flex-start |
| gap | 14px | 14px |
| flex-wrap | nowrap | nowrap |
| children | `.av.lg`, `.stack` (Show is `dk` here; phone Show sits in its own row under the head, excluded) | `.av.lg`, `.stack`, Show (excluded) |

### Large avatar `.av.lg`
| Property | Phone | Desktop |
|----------|-------|---------|
| base | `.av` (inline-flex centered, flex none, 1px solid `var(--accent)`, bg `var(--bg)`, color `var(--accent)`, IBM Plex Mono) | same |
| width × height | 48px × 48px | 44px × 44px |
| border-radius | 14px | 12px |
| font-size | 15px | 14px |
| content (fixture) | `CR` (masked-name initials) | same |

### Head stack `.stack`
| Property | Phone | Desktop |
|----------|-------|---------|
| display / direction | flex / column | same |
| gap | 3px (inline override) | 3px |
| min-width / flex | 0 / 1 | same |
| children (masked) | h1, email, role line; no Clerk id line | same |

### h1 `h1.t`
| Property | Phone | Desktop |
|----------|-------|---------|
| margin | 0 | 0 |
| font-family | `var(--display)` | `var(--display)` |
| font-weight | 400 | 400 |
| font-size | 23px | 28px |
| line-height | 1.2 | 1.2 |
| color | `var(--fg)` | `var(--fg)` |
| overflow-wrap | anywhere (inline) | anywhere |
| content (fixture) | masked name `Colin R.` | same |

### Masked email line
| Property | Phone | Desktop |
|----------|-------|---------|
| font-family | `'IBM Plex Mono',monospace` (`.mono`) | same |
| font-size | 11.5px (inline) | 11.5px |
| color | `var(--fg-muted)` (masked `emailCls` = `muted`; note: the list row uses `faint`) | same |
| content (fixture) | `c•••@g•••.com` | same |

### Clerk id
| Property | Phone | Desktop |
|----------|-------|---------|
| Clerk id line, masked | — (renders only under `acct.rev`) | — |

### Role line
| Property | Phone | Desktop |
|----------|-------|---------|
| font-size | 12.5px | 12.5px |
| color | `var(--fg-body)` | `var(--fg-body)` |
| content (fixture) | `5 credits a day.` | same |

### Invites section lines `.who`
| Property | Phone | Desktop |
|----------|-------|---------|
| display | flex | flex |
| align-items | center | center |
| gap | 10px | 10px |
| min-height | 46px | 46px |
| border-top | 1px solid `var(--border)`; `.first` → 0 | same |
| padding | 6px 14px | 6px 14px |
| font-size | 13.5px | 13.5px |
| color | `var(--fg-body)` | `var(--fg-body)` |
| `b` (name) | font-weight 500, `var(--fg)` | same |
| `.txt` | flex 1, min-width 0, flex column, gap 1px | same |
| `small` | IBM Plex Mono 10.5px, `var(--fg-faint)` | same |

### Face `.who .f`
| Property | Phone | Desktop |
|----------|-------|---------|
| width × height | 26px × 26px | 26px × 26px |
| border-radius | 7px | 7px |
| flex | none | none |
| border | 1px solid `var(--border-strong)` | same |
| background | `var(--surface-sunken)` | same |
| display / align / justify | flex / center / center | same |
| font-family | `'IBM Plex Mono',monospace` | same |
| font-size | 10.5px | 10.5px |
| color | `var(--fg-muted)` | same |

### Face variants `.f.nm`, `.f.w`
| Property | Phone | Desktop |
|----------|-------|---------|
| `.f.nm` content | `<i>` 6px × 6px, `transform:rotate(45deg)`, background `var(--fg-muted)`; no letters | same |
| `.f.w` border | 1.5px dashed `var(--border-dashed)` | same |
| `.f.w` background | transparent | same |
| `.f.w` content | empty | same |

### Which `.who` line gets which face (fixture)
| Line | Phone | Desktop |
|------|-------|---------|
| 1 (`.first`) inviter `You` (owner) | `.f.nm` diamond | same |
| 2 invitee `Peter K.` | `.f` with letters `PK` | same |
| 3 waiting invite | `.f.w` dashed empty; masked email `n•••@g•••.com` in `b` (phone drops the `by email` segment, structural `.ph` variant) | `.f.w`; masked email in `b` |

---

## Component: Invite tree (scene `tree`, C1)

### Tree row `.trow`
| Property | Phone | Desktop |
|----------|-------|---------|
| position | relative | relative |
| display | flex | flex |
| align-items | center | center |
| gap | 8px | 10px |
| height | auto | 46px |
| min-height | 52px | — |
| border-bottom | 1px solid `var(--border)` | same |
| font-size | 13.5px | 13.5px |
| color | `var(--fg-body)` | same |
| padding-right | 8px | 12px |
| padding-left (inline) | depth 0: 12px; depth d>0: (d−1)×18px | depth 0: 12px; depth d>0: (d−1)×26px |
| elbow `.elbow` width | 18px (children only) | 26px (children only) |

### Face `.trow .f`
| Property | Phone | Desktop |
|----------|-------|---------|
| width × height | 26px × 26px | 28px × 28px |
| border-radius | 7px | 7px |
| flex | none | none |
| border | 1px solid `var(--border-strong)` | same |
| background | `var(--surface-sunken)` | same |
| display / align / justify | flex / center / center | same |
| font-family | `'IBM Plex Mono',monospace` | same |
| font-size | 11px (no phone override) | 11px |
| color | `var(--fg-muted)` | same |
| `.f.nm` | `<i>` 6px × 6px, `rotate(45deg)`, background `var(--fg-muted)` | same |
| `.f.w` (waiting) | 1.5px dashed `var(--border-dashed)`, transparent | same |

### Name stack (account rows; inline override on `.stack`)
| Property | Phone | Desktop |
|----------|-------|---------|
| flex-direction | row | row |
| align-items | center | center |
| gap | 10px | 10px |
| flex-wrap | wrap | wrap |
| `b` name | weight 500, `var(--fg)`, masked name | same |
| owner tag | — (tag is `dk`; the phone meta line begins `owner ·`) | `.tag` (as list row) with `margin-left:0`, owner row only |
| joined `small` | — | `small.dk`, fixture `joined Sep 14`; owner's is empty |
| phone meta `small.ph` | `flex-basis:100%`, fixture `Sep 14 · 2 left · invited 1` / owner `owner · 8 left · invited 2` | — |
| `small` | IBM Plex Mono 10.5px, `var(--fg-faint)` | IBM Plex Mono 11px, `var(--fg-faint)` |
| trailing | `.chev` `›` (margin-left auto, 18px, `var(--fg-muted)`, flex none) | `small.dk` meta, `Open ›` `.lnk` |

### Which rows get the diamond (fixture)
| Row | Phone | Desktop |
|-----|-------|---------|
| `You` (owner, depth 0) | `.f.nm` diamond | `.f.nm` diamond + owner tag |
| `Account ·9xQe` (depth 3, no name) | `.f.nm` diamond | same |
| `Colin R.`, `Peter K.`, `Max D.`, `chrisplays` | `.f` letters `CR`, `PK`, `MD`, `CH` | same |
| waiting (depth 2) | `.f.w` dashed | same |

---

## Component: Group members (scene `group`, C2)

### Member row `.mrow`
| Property | Phone | Desktop |
|----------|-------|---------|
| display | flex | flex |
| align-items | center | center |
| gap | 12px | 12px |
| min-height | 60px | 52px |
| padding | 8px 14px | 8px 16px |
| border-top | 1px solid `var(--border)`; `.first` → 0 | same |
| `.sel` background | `var(--surface-raised)` | same |
| children | checkbox `.box`, `.stack` (no avatar, no id) | `.box`, `.stack`, `.mstate.dk` |

### Name line (inline flex span)
| Property | Phone | Desktop |
|----------|-------|---------|
| display | flex | flex |
| flex-wrap | wrap | wrap |
| align-items | baseline | baseline |
| gap | 0 8px | 0 8px |
| name `.nm1` | 14px, 500, `var(--fg)`, overflow-wrap anywhere | same |
| email `.mm.faint` (inline beside name) | IBM Plex Mono 10.5px, lh 1.5, `var(--fg-faint)`, nowrap + ellipsis | same |

### Sub line
| Property | Phone | Desktop |
|----------|-------|---------|
| font-size | 12px | 12px |
| color | `var(--fg-muted)` | same |
| content (fixture) | `owner`, `in testers`, `moves from friends`, `in friends`, `no group` | same |

### Stack and state
| Property | Phone | Desktop |
|----------|-------|---------|
| `.stack` | flex column, gap 2px, min-width 0, flex 1 | same |
| Clerk id | — | — |
| `.mstate` | — | IBM Plex Mono 10.5px, `var(--fg-faint)`, nowrap, flex none; `.u` `var(--accent)`, `.s` `var(--fg-body)` |

---

## Component: Override picker (scene `picker`, C3)

### Results container `.res`
| Property | Phone | Desktop |
|----------|-------|---------|
| border | 1px solid `var(--border)` | same |
| border-radius | 10px | 10px |
| overflow | hidden | hidden |

### Choice row `.res div`
| Property | Phone | Desktop |
|----------|-------|---------|
| display | flex | flex |
| align-items | center | center |
| gap | 10px | 10px |
| min-height | 44px | 44px |
| padding | 7px 12px | 7px 12px |
| border-top | 1px solid `var(--border)`; `.first` → 0 | same |
| children | `.stack` (name, email), then `already set` when taken | same |

### Choice text
| Property | Phone | Desktop |
|----------|-------|---------|
| name `.rl` | 13.5px, `var(--fg)` | same |
| name `.rl.off` (taken) | `var(--fg-disabled)` | same |
| email `.mm.faint` | IBM Plex Mono 10.5px, lh 1.5, `var(--fg-faint)`, nowrap + ellipsis; masked email | same |
| `already set` | `.mm.faint`, `flex:none`; rendered only when `taken` (fixture: `Max D.`) | same |
| Clerk id | — | — |

### Existing override row (`.orow` stack, for reference)
| Property | Phone | Desktop |
|----------|-------|---------|
| name | `.nm1` 14px 500 `var(--fg)`, `Max D.` | same |
| email | `.mm.faint` `m•••@p•••.me` | same |
| note | 12px `var(--fg-muted)` | same |

---

## State Coverage

| State | List row (A1) | Account head / Invites (B1) | Invite tree (C1) | Group member (C2) | Picker choice (C3) |
|---|---|---|---|---|---|
| Owner row (`You`) | `.av.nm` diamond; `You` + `.tag owner`; masked email `h•••@f•••.design`; no Show; invited-by `founder` in `--fg-faint`; phone meta `… · founder · $3.40` | inviter line: `.f.nm` diamond + `Invited by You` | `.f.nm` diamond; desktop owner tag (margin-left 0), empty joined; phone meta `owner · …` | name `You`, email masked, sub `owner`; no special mark | `You` + masked email, plain |
| No-name account (`Account ·9xQe`) | `.av.nm` diamond; name `Account ·9xQe`; masked email; Show present | not drawn on board | `.f.nm` diamond | plain row | plain row |
| Named account (`Colin R.` etc.) | `.av` initials from masked name; masked name/email; no Clerk id | `.av.lg` `CR`; h1 masked; email `--fg-muted`; role line; no id; invitee line `.f` letters `PK` | `.f` letters | masked name + masked email inline, sub line | masked name + masked email; `already set` + `--fg-disabled` name when taken |
| Username-only (`chrisplays`) | initials `CH`, name as is | — | `.f` `CH` | plain | plain |
| Waiting invite | n/a (no account) | `.f.w` dashed empty face; masked email in bold; Revoke | `.f.w` dashed; desktop `Waiting · by email · n•••@g•••.com` + `returns` small; phone two lines; Revoke | n/a | n/a |
| Deleted invitee | not drawn in R3 (no board, no state row) | not drawn | not drawn | not drawn | not drawn |
