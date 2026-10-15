# Design Property Table — Social R2 PR 8b on the two-line row: the other-ways press and spares

Sources. #1875 (`pr-1875-foil`): `design_handoff_the99_foil_treatment/addendum-foil-mark/README.md` (R3, R4, calls 13, Engineering), `STATES-foil-mark.md`, `M-Deck-Desktop.dc.html` (D2 List, D3 Shopping), `M-Deck-Phone.dc.html` (D6 List, D7 Shopping), `M-Main.dc.html` (busy row, key text), `READINESS.md` (M1 approved by Hugh 2026-10-15). Social R2: `README.md` §Round 3, `STATES-social-r2.md` §Spares, `READINESS.md`, `social-r2 · copy strings.ts` (`spareCopy`), `R3 - Spares-Phone` (SP1–SP3), `R3 - Spares-Desktop` (S1–S5), `R3 - Option B opened-Phone` (OP1), `R3 - Option B opened-Desktop` (O1–O3).
Precedence: #1875 is the later ruling (R3/R4, Hugh) and overrides Social R2 where they differ (see Contradictions). Token names are Kamigawa values in `globals.css`.

## Component: two-line card row (All and Shopping, both widths)

### Row shell

| Property | Phone | Desktop |
|---|---|---|
| Form | two lines (`.xr`) | two lines (`.xr.d`), 2-column grid, gap 8px 30px |
| Padding | 12px 6px 10px 12px | 7px 4px 6px 14px |
| Radius | 12px | 9px |
| Gap line 1 → line 2 | 8px | 3px |
| Background | `--surface-inset` | `--surface-inset` |
| Border | 1px transparent; `short`: `--avail-over-border` | same |
| Row list gap | 8px (`prows`, padding 0 14px) | 8px |
| Height | content | about 60px (README call 13; was 34px) |

### Line 1

| Property | Phone | Desktop |
|---|---|---|
| Order | dot, name, `//`, `×N`, fact marks, ✕ | same |
| Name | 16px, line-height 1.3, `--fg`, wraps | 14px, `--fg`, nowrap, ellipsis |
| Dot | 10px; owned `--success`; in use `--warning`; missing 1.5px dashed `--fg-faint` | same |
| Fact marks | 14px, `--fact` | 13px, `--fact` |
| ✕ | 40×32px, margin -6px 0, 16px, `--fg-faint` | 32×26px, margin -4px 0, 13px, `--fg-faint` |

### Line 2

| Property | Phone | Desktop |
|---|---|---|
| Layout | flex, align center, gap 8px, padding-left 18px, min-height 36px | flex, gap 8px, padding-left 17px, min-height 26px |
| Order | glint (absolute, left -3px, under the dot) · meta (pips, figure on All) `flex:1` · action group: in use / short → other-ways press → buy tag | same |
| Action group | flex, gap 6px, padding-right 6px, `flex:none`, right of meta | same |
| Meta | 11.5px mono `--fg-faint` | 10.5px mono `--fg-faint` |
| EDHREC figure | All only (`· 51.2%`); Shopping none (R4) | same |
| Figure squeeze | when short + press + buy all present, the word `edhrec` drops, the figure stays (call 13) | not set |
| `short` | OverGlyph (two 6px diamonds `--danger`, 1px seam `--surface-inset`) + `short`, 11px mono `--avail-over-fg`, gap 6px | same, 11.5px |
| `in use` | 6px diamond `--accent` + `in use`, `--avail-hard-fg` | same |

### The other-ways press (ONE press, holds ⇄ and the spare glyph)

| Property | Phone | Desktop |
|---|---|---|
| Count per row | one | one (#1875 R3; supersedes Social R2's two desktop presses) |
| Position | action group, after `short` / `in use`, immediately before the buy tag | same |
| Height | 36px | 26px |
| Padding | 0 10px | 0 7px |
| Radius | 9px | 6px |
| Border | 1px `--border-strong` | 1px `--border-strong` |
| Background | none | none |
| Inner gap | 8px | 6px |
| ⇄ | text glyph, 16px, `--warning`, first | 14px, `--warning`, first |
| Spare glyph | two-people SVG 16px, viewBox 24, stroke `currentColor` 1.8, round caps, `--fact`; second (after ⇄) | same, 16px |
| Spare glyph paths | `circle 9,8.5 r3.2` · `M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5` · `circle 16.5,9.5 r2.6` · `M15.5 14.2c2.6-.3 4.6 1.3 5.1 4.3` | same |
| Stand-in, no spare | ⇄ alone (Dina) | ⇄ alone (Dina) |
| Spare, no stand-in (under limit) | glyph alone (Miku, buy $4.10 not over) | glyph alone (Miku) |
| Both | ⇄ then glyph (Ashling, short, buy over) | same |
| Neither | no press; nothing reserved; buy tag sits at the right (Lathliss, Gisa) | same: no press, no reserved slot |
| Pressed state | not drawn | not drawn in #1875 (Social R2 S3 desktop marker: `--elevated` bg, outline 1px `--border-dashed`) |

### Buy tag

| Property | Phone | Desktop |
|---|---|---|
| Position | last in action group | last |
| Size | 36px tall, padding 0 10px, gap 10px, 12.5px mono, min-width 0 | 26px, padding 0 7px, gap 14px, 12px mono, min-width 108px |
| Fill | `--warning` text on `--warning` 10%, radius 5px; price `--fg-body` | same |
| Over limit | 1px `--warning` border, transparent bg | same |

### Glint (context)

| Property | Phone | Desktop |
|---|---|---|
| Position | absolute in line 2, left -3px, vertically centered (under the dot) | same |
| Size | 12px | 12px |
| Shown | owned card still listed, every owned copy foil | same |

## Component: what the press opens

| Property | Phone | Desktop |
|---|---|---|
| Opens | shipped Cheaper stand-ins modal as sheet from 52px | shipped stand-ins `ModalChrome` |
| Content | Replacing box, then `Friends with a spare · N` (`view only`), friend rows (face, name, `shares with {pod}`, count in `--fact`, no Take), foot line, then stand-ins as shipped | same |
| Title, both | `Before you buy` (`spareCopy.modalTitleBoth`) | same |
| Title, spares only | `Friends with a spare` (`spareCopy.modalTitleSpares`) | same |
| Title, stand-ins only | `Cheaper stand-ins` (shipped, unchanged) | same |
| Foot line | `spareCopy.foot` | same |
| Close | ✕, `spareCopy.close` | same |
| Accessible name, spare only | `spareCopy.markerAria(card)` = `Friends with a spare of {card}` | same |
| Accessible name, both / stand-in only | not set by either handoff (stand-in only: shipped stand-ins name) | not set |
| Board tooltip | none | Social R2 S2 marker `title="Friends have spares"` (marker superseded) |

## Component: key (Shopping)

| Property | Phone | Desktop |
|---|---|---|
| Layout | ONE 2-column grid (`ShoppingKey`), padding 10px 14px 0, item 10.5px mono `--fg-faint`, gap 7px, wraps, line-height 1.5 | ONE wrapping row, gap 8px 22px, padding 14px 34px 0, item 11.5px mono `--fg-faint`, gap 6px |
| Position | under the tabs/segments, above the first group head | under the price box, above the first group head |
| Order | `cheaper stand-ins` (⇄ 16px `--warning`, 18px cell) · `friend has a spare` (glyph 16px `--fact`, 18px cell) · `press to add` (buy chip) · `over $5` (outlined chip) · game changer · tutor · `foil` | same order |
| Spare item | separate item `friend has a spare` | same |
| Combined item `other ways to get it` | not drawn (R4 split it) | not drawn |
| Shown when | stand-in and spare items: not stated in #1875 (always drawn there); Social R2 S1/SP1: no spare item when nothing is shared | same |
| All view key | `buy · to buy`, game changer, tutor, foil; no spare item drawn | same (D2) |

## Component: commander and token rows

| Property | Phone | Desktop |
|---|---|---|
| Commander row | not drawn on D6 | D2 Commander group: same two-line row (Rootha: dot, glint, pips, `· —`), empty action group |
| Commander in Shopping | not drawn | not drawn |
| Token rows | not drawn (M5: no finish recorded) | not drawn |

## State coverage

| State | Phone | Desktop |
|---|---|---|
| Spare + stand-in + short + over | D7 Ashling | D3 Ashling |
| Spare only, under limit | D7 Miku | D3 Miku |
| Stand-in only | D7 Dina | D3 Dina |
| Short, no press | D7 Zimone | D3 Zimone |
| Neither | D7 Lathliss | D3 Lathliss, Gisa |
| No spares shared at all | Social SP1 (pre-#1875 row) | Social S1 (pre-#1875 row) |
| Pressed / opened | SP3, OP1 (sheet) | S3, O1–O3 |
| All view with a spare | not drawn (#1875 D6 has no press) | not drawn (#1875 D2 Miku has buy, no press); Social S4 drew it on the old row |
| Cart (Shopping for all decks) | not redrawn | Social S5 only (old row) |
| Spare read failed / unshared mid-visit | absent (Social STATES) | absent |
| Press pressed/focus visuals | not drawn | not drawn on new row |

## Contradictions

1. Desktop presses: Social R2 R3 (README, S2–S5, O1) keeps two presses on desktop, a 32×32px marker (radius 8px) BEFORE the buy tag and ⇄ (`.swp`) AFTER it, with an empty 32px slot reserved on rows without a spare. #1875 R3 draws ONE 26px combined press before the buy tag and reserves nothing. #1875 is later.
2. Key: Social R2 phone key uses one item `other ways to get it` (`spareCopy.keyPhone`, ⇄ + 14px glyph); #1875 R4 splits it into `cheaper stand-ins` and `friend has a spare` at both widths. `keyPhone` is unused under #1875.
3. Key wording: `spareCopy.key` was `a friend has a spare` before this PR; #1875 boards and README say `friend has a spare`, which it now ships (d9, call 1). Buy item: Social `bought it? press to add it`; #1875 `press to add`.
4. Key order (desktop): Social puts the spare item after the buy item; #1875 puts it second, after `cheaper stand-ins`.
5. All view: Social S4 and decision 11 put the spare on missing rows in All; #1875 README call 13 lists the press on All's line 2, but D2/D6 draw no press on any All row (Miku, who has a spare in D3) and the D2 caption names only in use and the buy tag.
6. EDHREC figure: Social phone Shopping rows show `· edhrec N%`; #1875 R4 drops it on Shopping.
7. `short`: Social phone draws `◆◆ short` (12px) inside the meta; #1875 draws OverGlyph + `short` (11px / 11.5px) in the action group, before the press.
8. Spare glyph in the phone press: Social 17px with stroke `#8FA6BE` hard-coded; #1875 16px `currentColor` in a `--fact` wrapper.
9. Phone row padding: Social 12px 6px 10px 14px with 8px 14px 0 margin; #1875 12px 6px 10px 12px in a 14px-padded list.
10. Accessible name: `markerAria` names the spare-only marker; no string covers the combined press when it holds ⇄ (both or stand-in only). Not set by either handoff.
