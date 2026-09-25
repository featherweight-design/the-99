# Design property table: Fits picker ("Find a deck for it") and its door

**Scope:** the stacked Fits picker (560 sheet on desktop, a 390 sheet from 96px on the phone) and the card modal's
footer door that opens it. The stand-ins sheet, the stand-ins door and Shopping are out of scope.

**Sources (design only, nothing under `src/` read):**
- `design/design_handoff_the99_swap_tools/README.md` (R2, R3, R4; R1 sections are superseded where they disagree)
- `design/design_handoff_the99_swap_tools/Fits Your Decks.dc.html` (`view="picker"`; its `view="card"` is retired per READINESS)
- `design/design_handoff_the99_swap_tools/Card Details.dc.html` (footer door only)
- `design/design_handoff_the99_swap_tools/The 99 - Swap Tools.dc.html` §1f (the two stacking frames at 1300 and 390)
- `design/design_handoff_the99_swap_tools/swap-tools · copy strings.ts` (`fits.*` keys)
- `design/design_handoff_the99_swap_tools/READINESS.md`, `READINESS-audit.md` (H1, F1, F3, F4, F8, F13, F14, F15, F18, F21, F22)
- `design/design_handoff_the99_swap_tools/addendum_staples_door_stacking/ADDENDUM-README.md` and its `Fits Your Decks.dc.html`, `Card Details.dc.html`, `Swap Tools Addendum.dc.html` §1a. **The addendum wins where it differs.** Its `Fits Your Decks.dc.html` is the base file plus the `staple` / `staplenorole` states, the staple note and the chip's `cmdrInk`; every other value is identical to the base.

**Font families.** The canvases spell families literally. Mapping used below: `'IBM Plex Mono'` = the app's mono
family (`--font-plex-mono`, the `next/font` variable); `'IBM Plex Sans'` = the body family (inherited from the root, no
override); `var(--display)` = the theme's display face (Cinzel / Chakra Petch), which the canvas already reads as a var.
Where a row says "sans" it inherits the root's family.

**Buttons.** Every control is a native `<button type="button">` with the default styling reset (`appearance:none`,
`background:transparent`, `font-family:inherit`, `line-height:1`, `cursor:pointer`) (READINESS "Checks"; audit F22:
the door and the back control are drawn as `span role="button"` and must be built as `<button>`).

---

## 1 · The door in Card Details (`Find a deck for it →`)

| Element | Property | Mobile (390) | Desktop (824 modal on the 1300 page) |
|---|---|---|---|
| Footer container | Layout | `display:flex; flex-direction:column` (in flow at the end of the sheet's scroll, see F8) | `display:flex; align-items:center; flex:none` (fixed, never scrolls) |
| | Height | not fixed | `height: 92px` (grows from about 64px) |
| | Gap | `4px` | `16px` (links column ↔ Prev/Next) |
| | Padding | `6px 16px 24px` | none |
| | Margin | `0` | `0 30px` |
| | Border | `border-top: 1px solid var(--border)` | `border-top: 1px solid var(--border)` |
| Links column | Layout | `flex-direction:column; flex:1; min-width:0` | same |
| | Gap | `0` | `8px` |
| Buy link (sibling above the door) | Typography | sans 14px / 500, `var(--accent)`, `white-space:nowrap` | sans 13.5px / 500, `var(--accent)`, nowrap |
| | Dimensions | `min-height: 44px` | none |
| | Underline | inner span `border-bottom: 1px solid var(--accent-shadow)` | same |
| Door (`Find a deck for it →`) | Element | `<button>` (F22) | `<button>` (F22) |
| | Layout | `display:inline-flex; align-items:center` | same |
| | Gap | `8px` (glyph ↔ label) | `8px` |
| | Typography | sans 14px / 500, `var(--accent)`, `white-space:nowrap` | sans 13.5px / 500, `var(--accent)`, nowrap |
| | Dimensions | `min-height: 44px` (a 44px row) | none (a second 13.5px line, 8px under Buy) |
| | Position | directly under the in-flow Mana Pool link (F8). No phone Prev/Next is built | second line of the links column; Prev/Next stays on the right |
| Door glyph | Layout | `display:flex; gap:3px`, `aria-hidden` | same |
| | Each diamond | `6×6`, `transform: rotate(45deg)`, `border: 1.5px solid var(--accent)`, no fill | same |
| Door label | Underline | `border-bottom: 1px solid var(--accent-shadow)` | same |
| Prev / Next | Layout | not built on the phone (F8 overrides the canvas's phone Prev/Next) | `display:flex; align-items:center; gap:14px`, 14px, nowrap; `‹ Prev` `var(--fg-locked)` (disabled) / `var(--accent)`; position mono 11.5px `var(--fg-faint)` |
| Hover / focus | | Not drawn. The canvas's only hover rule is `a:hover { color: var(--accent-hover) }`, which applies to anchors, not to this button | same |
| Conditional | | Rendered only when the card is Commander-legal **and** the reader has at least one deck (R2, READINESS 3a, F3). Shown even when every copy is spoken for (`none free`). Hidden, with no replacement state, for a card not legal and for a reader with no decks. **Not rendered on a card stacked from the stand-ins sheet**: that footer is the Take footer, which replaces Buy and Find (addendum §3) | same |
| Behaviour | | Nothing loads until pressed. Pressing opens the picker stacked over Card Details | same |

---

## 2 · The picker (stacked sheet)

### 2.1 Stacking and frame

| Element | Property | Mobile (390) | Desktop (560 sheet on the 1300 page) |
|---|---|---|---|
| Underlying Card Details | Rendering | stays mounted; covered by a scrim | stays mounted (addendum §3: "dimmed, with its scroll kept") |
| Scrim over Card Details | Background | `color-mix(in oklab, var(--bg) 60%, transparent)`, `position:absolute; inset:0` | The 1300 frame draws `color-mix(in oklab, var(--bg) 72%, transparent)` over the page **under** the card, and no second scrim over the card. See Ambiguities 1 |
| Picker position | Offsets | `position:absolute; left:0; right:0; top:96px; bottom:0` (Card Details' header stays visible above) | centered horizontally; top at `40px` in the 1300×900 frame (the card sits at `90px` under it) |
| Picker outer shadow / radius | | `box-shadow: 0 -12px 30px rgba(0,0,0,0.45)`, `border-radius: 14px 14px 0 0`, `overflow:hidden` (the frame wrapper) | on the root, below |
| Picker root | Width | `390px` (full width) | `560px` |
| | Background | `var(--surface-raised)` | `var(--surface-raised)` |
| | Border | `border-top: 1px solid var(--border-strong)` | `border: 1px solid var(--border-strong)` |
| | Radius | `14px 14px 0 0` | `14px` |
| | Shadow | (on the wrapper, above) | `0 24px 60px rgba(0,0,0,0.5)` |
| | Layout | `display:flex; flex-direction:column; overflow:hidden` | same |
| | Typography | sans, `color: var(--fg)` | same |
| Escape / scrim tap | | Not stated for the picker specifically. By the addendum's pattern (one layer per Escape, scrim tap = Escape), Escape closes the picker to Card Details. Focus target on return is not stated | same |

### 2.2 Head

| Element | Property | Mobile | Desktop |
|---|---|---|---|
| Head row | Layout | `display:flex; align-items:center; flex:none` | same |
| | Height | `43px` | from padding (not fixed) |
| | Padding | `0 6px 0 16px` | `12px 14px 12px 18px` |
| | Gap | `9px` | `10px` |
| | Border | `border-bottom: 1px solid var(--border)` | same |
| Title `h2` | Typography | `var(--display)` 700, 16px, line-height 1.2, `var(--fg)`, `white-space:nowrap` | same |
| | Layout | `flex:1`, `margin:0` | same |
| Back control | Element | `<button>` (F22) | `<button>` (F22) |
| | Form | `×` glyph, mono 14px, `var(--fg-faint)` | pill: `←` then `{card}` |
| | Dimensions | `44×44`, `margin-right: -10px` | `height: 32px`, `padding: 0 12px` |
| | Layout | `flex:none; display:flex; align-items:center; justify-content:center` | `flex:none; display:inline-flex; align-items:center; gap:6px; white-space:nowrap` |
| | Radius | none | `999px` |
| | Background | none | `var(--elevated)` |
| | Border | none | `1px solid var(--border-strong)` |
| | Typography | mono 14px `var(--fg-faint)` | sans 12.5px / 600, `var(--fg)` |
| | Accessible name | `aria-label="Back to {card}"` | visible text `← {card}` (`fits.backLabel(card)`) |
| Hover / focus | | Not drawn | Not drawn |

### 2.3 Body

| Element | Property | Mobile | Desktop |
|---|---|---|---|
| Body | Layout | `display:flex; flex-direction:column` | same |
| | Padding | `14px 16px 24px` | `16px 18px 20px` |
| | Gap | `14px` between blocks | `14px` |

### 2.4 Card plate (the card and its copies line)

| Element | Property | Mobile | Desktop |
|---|---|---|---|
| Plate | Layout | `display:flex; align-items:center; gap:10px` | same |
| | Padding | `10px 12px` | same |
| | Border / radius / bg | `1px solid var(--border)`, `10px`, `var(--bg)` | same |
| Thumb | Dimensions | `22×31`, `flex:none` | same |
| | Radius / border | `3px`, `1px solid var(--border-strong)` (placeholder stripes stand in for the card image) | same |
| Name + identity column | Layout | `flex:1; min-width:0; flex-direction:column; gap:3px` | same |
| Card name | Typography | sans 14px / 600, `var(--fg)` | same |
| Identity line | Typography | mono 10.5px, `var(--fg-muted)` (e.g. `green · legal in Commander`) | same |
| Copies line | Typography | mono 11.5px, `white-space:nowrap`, `flex:none` | same |
| | Color | `var(--fg-body)` while any copy is free; `var(--avail-hard-fg)` when it reads `none free` (R4: "none free in the hard-claim ink") | same |
| | Conditional | F15: drawn in **every** state that knows ownership, including all-hold and colors (the canvas omits it there; the audit corrects that). Drawn during loading on the canvas | same |

### 2.5 Staple note (addendum §1)

| Element | Property | Mobile | Desktop |
|---|---|---|---|
| Note box | Layout | `display:flex; flex-direction:column; gap:6px` | same |
| | Padding | `11px 13px` | same |
| | Radius | `10px` | same |
| | Border | `1px dashed var(--border-dashed)`, no fill (neutral, not a warning) | same |
| | Position | directly under the card plate, above the groups | same |
| Label row | Layout | `display:flex; align-items:center; gap:7px` | same |
| | Typography | mono 9.5px, `letter-spacing:0.12em`, uppercase, `var(--fg-body)`; text `staple` | same |
| Label dot | | `7×7`, `border-radius:50%`, `border:1.5px solid var(--fg-muted)`, no fill, `aria-hidden` | same |
| Sentence `p` | Typography | sans 12.5px, line-height 1.55, `var(--fg-body)`, `text-wrap:pretty`, `margin:0` | same |
| Conditional | | Only when the card is a universal staple (the shared predicate, F18). Two variants: staple with a role, staple with no role. Rendered once per picker, not per row | same |

### 2.6 Loading (on open)

| Element | Property | Mobile | Desktop |
|---|---|---|---|
| Container | Role | `role="status"` | same |
| | Layout | `display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center` | same |
| | Dimensions | `min-height: 230px` | same |
| | Padding | `24px 20px` | same |
| | Radius | `10px` | same |
| | Background | `radial-gradient(380px 200px at 50% 70%, color-mix(in oklab, var(--accent) 8%, transparent), transparent 70%)` | same |
| Crown | | three diamonds 8 / 11 / 8px, `rotate(45deg)`, `var(--accent-strong)`, row `gap:9px; height:16px`, `aria-hidden`; animation `dots 1.2s ease-in-out infinite`, delays 0 / 0.2 / 0.4s (opacity 0.25 → 1 → 0.25). **Build from the shipped `LoadingScreen`, which stops under reduced motion** (F15b) | same |
| Heading `h3` | Typography | `var(--display)` 700, 18px, line-height 1.25, `var(--fg)`, `text-wrap:balance`, width 100% | same |
| | Margin | `margin-top: 20px` | same |
| Status `p` | Typography | mono 12px, `var(--fg-faint)` | same |
| | Margin | `margin-top: 8px` | same |
| Conditional | | While the payload loads. The card plate (with copies line) stays above it; no groups render | same |

### 2.7 Failed (undrawn; F4)

| Element | Property | Mobile | Desktop |
|---|---|---|---|
| Container | | Takes the stand-ins sheet's `failed` shape (F4): `role="alert"`, column, centered, `padding: 30px 20px 26px`, radius 10, `1px solid var(--border)`, bg `var(--surface)` | same |
| Still crown | | the crown shape, not animated, in `var(--border-strong)` | same |
| Tag | | `margin-top:18px`, mono 9.5px, `letter-spacing:0.12em`, uppercase, `var(--danger)` | same |
| Heading | | `margin-top:8px`, `var(--display)` 700 18px, line-height 1.25, `var(--fg)`, balance | same |
| Body | | `margin-top:10px`, `max-width:420px`, 13px, line-height 1.55, `var(--fg-body)` | same |
| Kept line | | `margin-top:8px`, `max-width:420px`, 12.5px, line-height 1.55, `var(--fg-muted)` (whether the picker needs a kept line is unstated; nothing was changed by a failed load) | same |
| Try again | | Apply skin: phone `height:44px`, `padding:0 18px`, radius 8, 13px / 600; desktop `padding:7px 16px`, radius 7, 12.5px / 600; `var(--accent)` on `1px solid var(--accent)`; `margin-top:18px` | see Mobile |
| Copy | | No `fits.*` key exists for the tag, heading, body or kept line; new sentences go to `/copy-review` | same |

### 2.8 One-sentence states (all hold it, colors rule them out)

| Element | Property | Mobile | Desktop |
|---|---|---|---|
| Sentence `p` | Typography | sans 13px, line-height 1.55, `var(--fg-body)`, `text-wrap:pretty`, `margin:0` | same |
| Conditional | | `allHold`: the sentence, then the `already holds it` group listing every holding deck. Colors: the sentence alone, no groups | same |

### 2.9 Group heading (`could take it`, `already holds it`)

| Element | Property | Mobile | Desktop |
|---|---|---|---|
| Group | Layout | `display:flex; flex-direction:column` | same |
| Heading | Typography | mono 9.5px, `letter-spacing:0.12em`, uppercase, `var(--fg-faint)` | same |
| | Padding | `0 0 6px` | same |
| | Border | `border-bottom: 1px solid var(--border)` | same |
| Order | | `could take it` first, then `already holds it`. v2 D3 (Hugh's Q7): `could take it` rows run by a combo the card completes, then a theme it joins (the most cards first), then each deck's commander (or pair) synergy, never drawn; the heading carries the order note `fits.orderReasons` at its right (mono 10px, `var(--fg-locked)`), except on a staple's list. A staple's rows stay by name, as the staples addendum drew them | same |
| Conditional | | `could take it` renders only when at least one deck can take the card. `already holds it` renders when at least one deck holds it. No `can't play it` group (R4 removed it) | same |

### 2.10 Could-take-it row

| Element | Property | Mobile | Desktop |
|---|---|---|---|
| Row | Layout | `display:flex; flex-direction:column; gap:7px` | same |
| | Padding | `10px 0` | same |
| | Border | `border-bottom: 1px solid var(--border)` | same |
| Line 1 | Layout | `display:flex; align-items:center; gap:10px; min-width:0` | same |
| Deck name (link to the deck) | Typography | sans 13.5px, `var(--fg-body)`, `text-decoration: underline`, `text-underline-offset:2px`, `text-decoration-color: var(--border-strong)` | same |
| | Layout | `flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap` | same |
| | Accessible name | `fits.deckLinkAria(deck)` | same |
| **Add** (a free copy remains) | Skin | Apply: transparent, `1px solid var(--accent)`, `var(--accent)` | same |
| | Typography | 13px / 600 | 12px / 600 |
| | Dimensions | `height:44px; min-width:64px; padding:0 14px` | `padding:5px 12px`; READINESS/README specify **32px** (see Ambiguities 3) |
| | Radius | `8px` | `7px` |
| | Layout | `flex:none; display:flex; align-items:center; justify-content:center` | `flex:none; display:inline-flex; align-items:center` |
| | Accessible name | `fits.addUsesFreeAria(card, deck)` | same |
| **Add to buy** (no free copy remains; H1) | Skin | quiet: transparent, `1px solid var(--border-strong)`, `var(--fg-muted)` | same |
| | Typography | 13px / 500, nowrap | 12px / 500, nowrap |
| | Dimensions | `height:44px; padding:0 12px` (no min-width drawn) | `padding:5px 11px`; 32px per READINESS |
| | Radius | `8px` | `7px` |
| | Layout | as Add | as Add |
| | Accessible name | `fits.addToBuyAria(card, deck)` | same |
| Added stamp (replaces the button) | Layout | `flex:none; display:inline-flex; align-items:center; gap:6px; min-height:44px` | same, `min-height:0` |
| | Typography | mono 9.5px, `letter-spacing:0.1em`, uppercase, `var(--success)`; text `in the draft` | same |
| | Check box | `15×15`, radius 4, font 9px, `border:1px solid var(--success)`, `✓`, `aria-hidden` | same |
| Reason line (v2 D3, addendum §1c) | Layout | one `p`, mono 10.5px, `line-height:1.45`, `text-wrap:pretty`, `var(--fg-muted)`; replaces the two chips, so the row keeps its height | same |
| | Content | `{reason}`, then ` · ` in `var(--border-strong)`, `this deck ` in `var(--fg-locked)` and `fits.need(role, count, target)` | same |
| Reason: combo | Typography | `var(--fg)`: `fits.reasonCombo` then the other piece's name, dotted `var(--accent)`, a `CardDetailTrigger` that opens that card | same |
| | Condition | Spellbook's two-card variant, every other piece already in the deck's draft or its commanders (Hugh's Q8), read by `loadCompletionPartners` | same |
| Reason: theme | Typography | `var(--fg-body)`: `fits.reasonTheme(n, word)`, `word` from `fits.themeWord`, or the deck's key creature type for a creature of that type | same |
| | Condition | the card's theme the most of the deck's other cards carry; a tie goes to the earlier theme in the approved order | same |
| Reason: staple | Typography | `var(--fg-body)`, italic: `fits.cmdrStaple`, never a figure | same |
| No reason | | the need alone (R2: never the two shares); with no need either, no line | same |
| Added note (line 3) | Typography | sans 12.5px, `var(--fg-muted)`; then `Open the deck →` in `var(--accent)` with `border-bottom:1px solid var(--accent-shadow)` | same |
| | Conditional | Only on the row just added | same |
| Refused add (undrawn; F4) | | `MutationError` under the row, the row's shipped pattern, with `fits.addRefused`. The button stays (the deck is unchanged) | same |
| Hover / focus | | Not drawn for any element in the picker | same |

### 2.11 Already-holds-it row

| Element | Property | Mobile | Desktop |
|---|---|---|---|
| Row | Layout | `display:flex; align-items:center; gap:10px` | same |
| | Dimensions | `min-height:44px` | `min-height:34px` |
| | Border | `border-bottom: 1px solid var(--border)` | same |
| Deck name (link) | Typography | sans 13px, `var(--fg-body)`, underline, offset 2px, decoration `var(--border-strong)`; truncates (`flex:1; min-width:0; ellipsis; nowrap`) | same |
| Holds note | Typography | mono 11px, `var(--fg-muted)`, `flex:none`; `holds {n}` | same |
| Controls | | none (no Add on a holding deck) | same |

---

## 3 · State coverage

| State | Triggering condition | Component rendered | Key props required |
|---|---|---|---|
| Door shown | Card is Commander-legal and the reader has ≥1 deck; card not stacked from the stand-ins sheet | Footer door `Find a deck for it →` (§1) | `commanderLegal`, `hasDecks`, `stacked=false` |
| Door hidden | Not Commander-legal, or no decks, or a stand-in stacked card (Take footer) | Nothing (no replacement state) | same flags |
| Loading | Picker opened; payload not yet back | Head, card plate with copies line, loading block (§2.6) | `card`, `copies` (owned, free), reduced-motion via `LoadingScreen` |
| Failed | Picker payload request errors | Head, card plate, failed block (§2.7) with Try again | `card`, `onRetry`; new copy (no key yet) |
| Several decks fit | ≥1 deck can take the card (identity fits, not already holding) | `could take it` group with rows (§2.10), then `already holds it` if any | `rows[] {deckId, deckName, commanderChip, need?}`, `holds[] {deckName, count}`, `copies` |
| All hold it | Every deck that can play the card already holds it | Sentence `fits.allHold`, then `already holds it` group listing them; copies line (F15) | `card`, `holds[]`, `copies` |
| Colors rule them out | No deck's commander identity covers the card | Sentence `noneByColorsOne` (one color) or `noneByColors` (several); no groups; copies line (F15) | `card`, card color words, `copies` |
| Copies line, any copy free | `free > 0` | `×{owned} · {free} free` in `var(--fg-body)` | `owned`, `free` |
| Copies line, none free | `free === 0` | `×{owned} · none free` in `var(--avail-hard-fg)` | `owned`, `free` |
| Copies line, all states (F15) | Any state in which ownership is known: several, loading (drawn), all hold, colors, staple, staple-no-role, added | Copies line in the plate | `owned`, `free` |
| Add with a free copy | `free > 0` | Apply-skin `Add` on every could-take row | `addUsesFreeAria(card, deck)` |
| Add to buy (H1) | `free === 0` (by this Add or anything else) | Quiet-skin `Add to buy` on every remaining could-take row; the card joins that deck's Shopping list as a buy. No hard stop (H1 ruled) | `addToBuyAria(card, deck)` |
| Brew add | Adding to a brew (soft claim) | Does not spend a free copy and never flips rows to Add to buy | deck `isCommitted` / brew flag |
| Added | An Add on a row succeeded | That row: stamp `in the draft` in place of the button, note line + `Open the deck →`. Other rows re-evaluate Add vs Add to buy; the copies line updates. No undo in the picker | added deckId, note variant (`addedUsedLast` / `addedFree` / `addedToBuy`), deck href |
| Refused add (`addRefused`) | The add action refuses | `MutationError` under that row with `fits.addRefused`; row keeps its button (undrawn; F4) | row id, error |
| Reason line (v2 D3) | Card is not a universal staple | `Completes a combo with {card}`, else `Joins {n} other {theme} cards`, else the need alone; ` · this deck {need}` after it | inclusion pct, the `listed` flag, commander (or pair) name |
| Staple reason | Card is a universal staple (`loadUniversalStaples` membership, F18) | italic `var(--fg-body)`: `staple · any commander`, no %, then the need | `isUniversal` |
| Staple note, with role | Universal staple that has a counted role (Sol Ring) | Dashed note under the plate, label `staple` + sentence; rows keep the need on the reason line | `isUniversal`, role present |
| Staple note, no role | Universal staple with no counted role (Reliquary Tower) | Dashed note (no-role variant); rows carry the staple reason only, no need | `isUniversal`, role absent |
| Need absent | No role, or the deck's targets unmeasured | The reason alone, or no line | `rolesUsable`, role |
| Holding deck | Deck already holds ≥1 copy | Row in `already holds it` with `holds {n}` | `deckName`, `count` |

---

## 4 · Copy keys by element (`swapToolsCopy.fits.*` unless noted)

| Element | Key | Arguments |
|---|---|---|
| Door label | `callout` | none (the `→` is drawn beside it; the canvas renders `Find a deck for it →`) |
| Door accessible name | `calloutAria` | `(card)` |
| Picker title | `pickerTitle` | none |
| Desktop back pill text | `backLabel` | `(card)` |
| Phone back aria | none in `fits` (addendum string `Back to {card}`, owed to /copy-review, F21) | `card` |
| Loading heading / status | `loadingHeading`, `loadingStatus` | none |
| Group headings | `groupJoin`, `groupHolds` | none |
| Copies line | `copies` | `(owned, free)` |
| Add | `addUsesFree`, `addUsesFreeAria` | aria `(card, deck)` |
| Add to buy | `addToBuy`, `addToBuyAria` | aria `(card, deck)` |
| Added stamp | `added` | none |
| Added note | `addedUsedLast`; also `addedFree`, `addedToBuy` | none |
| Open the deck | `openDeck` | none |
| Refused add | `addRefused` | none |
| Holds note | `holds` | `(n)` |
| Deck link aria | `deckLinkAria` | `(deck)` |
| Reason line (v2 D3) | `reasonCombo`, `reasonTheme`, `themeWord`, `needLabel`, `orderReasons` | `reasonTheme(n, word)` |
| Need value | `need` | `(role, count, target)` |
| All hold it | `allHold` | `(card)` |
| Colors rule out | `noneByColorsOne`, `noneByColors` | `(card, color)`, `(card, colors)` |
| Staple chip value, staple note label and both note sentences | `cmdrStaple`, `stapleLabel`, `stapleNote`, `stapleNoteNoRole` (addendum strings, F21) | notes name the card |
| Failed state | `failed.heading`, `failed.body`; tag and Try again from `sheet.failed.tag`, `sheet.retry` | none |

Retired or unused in the picker: `heading`, `order`, `excludedOne`, `excludedMany`, `outsideColors`, `notLegal`,
`noDecks`, `hardStop` (H1 ruled no hard stop), `add` / `addAria` (replaced by `addUsesFree*`) (F13).

---

## 5 · Ambiguities and base/addendum conflicts

1. **Desktop dim.** The addendum says the card under a sheet stays "dimmed", "the same way Find a deck's picker stacks over Card Details". The 1300 frame in §1f draws the page scrim (`--bg` 72%) *under* Card Details and no dim over it; only the phone frame dims the card (`--bg` 60%). The desktop dim's value is unspecified.
2. **Desktop vertical position.** The picker's top is 40px in a 1300×900 frame with the card at 90px. No token or rule states the offset.
3. **Add height on desktop.** README and READINESS say Add is 32px on desktop; the drawn button is `padding:5px 12px` at 12px with `line-height:1` (about 24px, and the audit notes the button reset shortened it). Add to buy has no drawn height either. The phone Add has a 64px min-width and Add to buy has none.
4. **Copies line.** The canvas omits it in `allhold` and `colors` (F15a); the audit requires it in every state that knows ownership. The loading state draws it, which implies the free count is known before the payload loads.
5. **Colors sentence and allHold drift (F13).** The canvas reads "neither of your commanders is" and drops "They're listed above."; the copy file says "none of your commanders" and keeps it. The copy file is the source.
6. **Added note variants.** The canvas uses only `addedUsedLast`; the file also keeps `addedFree` and `addedToBuy`. Which note goes with which case is not drawn.
7. **Staple, no role, free copies.** `staplenorole` offers Add (free) on all three rows with `×1 · 1 free`. That fits the rule while one copy is free, but it's unclear whether the rows flip after the first add.
8. **Staple strings have no keys.** The chip value, the note label and the two note sentences exist only in the addendum canvas, so keys still have to be created.
9. **Base vs addendum.** The only differences are additions (the staple states, the note, the italic `--fg-body` chip ink). No base value is contradicted. The base canvas's ordinary chip ink (`--fg-muted`) still holds for non-staples.
10. **Escape and focus.** The addendum's per-layer Escape list covers card → sheet → card. For the picker, only the phone back label (`Back to {card}`) is stated. Where focus lands when the picker closes (presumably the door) is not stated.
11. **Hover and focus states** are drawn for nothing in scope.
