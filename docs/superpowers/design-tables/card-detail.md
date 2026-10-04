# Design Property Table — Card detail: price, zoom, flip

Source: `design/design_handoff_the99_card_detail/` — `README.md` (the four §3 calls, §R2, the four
Amendments, Component notes, Notes for engineering, Gap report), `STATES-card-detail.md` (§1 the
twelve price cells, §1b the compact header, §2 zoom, §3 faces, §4 coexistence, §5 themes),
`MOTION-no-token-set.md` (both animations and both static states), `READINESS.md` (R2, self-assessed
🟢 Green), `card-detail · copy strings.ts`, and the canvas
`The 99 - Card Detail (R2).dc.html` (§1 anatomy, §2 four price states, §3 zoom, §4 flip,
§5 reduced motion, §6 themes, §7 spec + a11y, §8 amendments).

Brief: `docs/superpowers/design-briefs/2026-09-12-card-detail.md`. Audited against
`origin/main` at `3cd44538`.

Scope: `src/components/cards/card-modal.tsx` and its art regions at both widths — the price tag,
the zoom layer and the flip inside it. Nothing else in the modal changes.

**Governing-value rule: §Errata at the foot of this table wins over every other row and over the
handoff.** The handoff's own files are kept exactly as Design drew them — a drawing is a record of
what was decided on the day, and correcting it in place would destroy the evidence the audit rests
on. Where the README, the canvas or `MOTION-no-token-set.md` describes shipped code incorrectly, the
erratum below is the correction and the build follows the erratum, not the drawing. That is this
repo's standing convention, not a concession made here. Where the handoff describes shipped code, the code is the authority; each erratum below
was verified in the tree and is what the build implements.

---

## 1. The price tag

| # | Property | Value | Source |
|---|---|---|---|
| 1.1 | Placement | Last row of the art column's under-card stack, which itself begins **10px** under the sharp art (9px phone), centred on the card. The stack is `zoom hint → turn control → tag`, top to bottom (E17). Not in the zoom — row 3.4 | canvas §7, README §1, E17 |
| 1.2 | Why there | The art column is the one region every card has at both widths, owned or not, one printing or fifty-four; the art *is* the printing the figure is about | README §1 |
| 1.3 | Priced | mono 10px, `--accent` on `1px solid --accent-dim`, radius 4, padding `2px 5px` | canvas §7, corrected by E1 |
| 1.4 | Foil-only | `◆ foil $6.10` — the diamond **prefixes**, the finish word comes from which column supplied the figure (`foil` / `etched`) | canvas §2, `set-collections.ts:208` |
| 1.5 | No stock | the word `no stock`, `--fg-locked` on `1px dashed --fg-locked` | canvas §2 |
| 1.6 | Silence | **Nothing renders.** No dash, no `$0.00`, no greyed box, no reserved slot, no skeleton | canvas §2, STATES §1 |
| 1.6b | Silence is not rare, and that is accepted | A holding that names no **single** printing is silent — E15 still prices one whose set holds only one version — so a set that prints several versions of a card shows fewer figures than a small set does — the commander page's `PIP` card was walked and reads blank for exactly this reason. Seen, and ruled 2026-09-13: a figure under a card must belong to that card, two versions can differ by a lot, and a floor-price or a picked-version figure is a number the reader's copy may not have | ruled 2026-09-13 |
| 1.7 | Which state is which | `no stock` = the store answered and the answer was no (sold out **and** never stocked alike). Silence = nothing reached us — the price read failed or was not loaded | READINESS R2 item 2 |
| 1.8 | Phone plate | The over-art plate behind the tag, because it sits over the wash. **The only difference between the two widths.** Its 2px padding is uniform on all four sides — see E18, which is not a value change but the fix that makes this row true | README §1, E18 |
| 1.9 | Re-reads on a pick | Yes. A pick now moves **four** things — art, `Set` field, tile ring, tag | README §1, Amendment 1 |
| 1.10 | Per printing, never per card | If the resolved printing has no figure the state is silence or `no stock` — **never another printing's figure** | README Notes for engineering |
| 1.11 | Not interactive | Not a link, no hover state, no target, not focusable | canvas §7 |
| 1.12 | Accessible form | Read as part of the card's description, one string from copy; a bare figure is never spoken alone | canvas §7 a11y |
| 1.13 | Absent in the DOM | The absent state is absent to assistive tech too — no `aria-hidden` placeholder, no empty node | canvas §7 a11y |
| 1.14 | Height cost | Absent → priced on a pick adds **27px desktop** (a 6px gap and the tag's 21px box) / **35px phone** (an 8px gap and the plated row's 27px) at the column's end. Nothing above moves; the modal does not resize; **do not animate it**. The desktop art derives its width from the room the stack leaves (E19), so a pick can narrow the art on a short window — which is the one thing that moves, and it moves rather than the stack being clipped | STATES §1, E19 |
| 1.15 | Ownership is independent | The twelve cells of STATES §1 all ship: priced/foil-only/sold-out/absent × owned-1 / owned-2+ / unowned | STATES §1 |
| 1.16 | Never joins | The pinned bottom row, the meta grid, the printing region | README §1, Amendment 4 |

## 2. The compact art header (`card-modal.tsx:344`)

| # | Property | Value | Source |
|---|---|---|---|
| 2.1 | When | 2+ owned printings **and** the printing region open past the overflow threshold. Phone only | STATES §1b |
| 2.2 | Tag | **Survives and moves** — out of the art, into the name block: below the name, beside the mana cost. Still re-reads on every pick | STATES §1b |
| 2.3 | Zoom mark | **Withheld** — same threshold and same reason as the shipped flip control | STATES §1b |
| 2.4 | Zoom gesture | **Kept.** The whole 72×100 thumb is the button | STATES §1b |
| 2.5 | Focus ring | Required — the shipped `2px solid var(--accent)` at `2px` offset. With no glyph it is the only evidence the thumb is pressable | STATES §1b, `globals.css:429-431` |
| 2.6 | The zoom it opens | The full one — 318×444, caption, flip plate at 44px. Collapsing the header does not collapse the zoom | STATES §1b |
| 2.7 | Never | Zoom disabled while the picker is open; a shrunken zoom; a mark under 30px; the tag under the 72px thumb | STATES §1b |

## 3. The zoom layer

| # | Property | Value | Source |
|---|---|---|---|
| 3.1 | What it is | `position:absolute; inset:0` **inside the dialog element**. Never the viewport, never a second dialog, never a mode | canvas §7, README §3 |
| 3.2 | Ground | `color-mix(in srgb, var(--bg) 94%, transparent)` + `backdrop-filter: blur(10px)`, blur set at its final value on the first frame | canvas §7, MOTION |
| 3.3 | Card | 63/88, the largest that fits the rect less 28px padding and the caption row — **372×520** desktop, **318×444** phone; radius 14/13; inset hairline + `0 24px 60px rgba(0,0,0,.6)`. A **two-faced** card gives back 56px of the height budget for the turn control now under it: **352×492** desktop, 318×444 phone unchanged (E17) | canvas §7, E17 |
| 3.4 | Caption | One mono 11px line, `--fg-muted`: `set · code · collector number`; gains ` · back` on the reverse. Never the price | canvas §7, copy strings |
| 3.5 | Caption with no collector number | Omit the field **and** its separator. Never "no number" | copy strings |
| 3.6 | Close | The modal's shipped ✕ — 34px desktop / 32px phone, in its shipped slot, gaining an `--elevated` plate to clear the scrim. Its **label** changes, its position does not | canvas §7 |
| 3.7 | Trigger | The sharp art becomes a `button` with `aria-expanded` and `aria-controls`. **No visible mark on the art**: the ⤢ plate is retired and the hint line of row 3.9 is the whole affordance | canvas §7, E17 |
| 3.8 | Corner rule | **Nothing sits on the art at all.** The zoom mark is gone and the turn control has moved under the card (E17). A one-faced card simply has no turn control rather than a different layout | ruled 2026-09-13, E14, E17 |
| 3.9 | Hint | **Both widths**, mono 10px `--fg-locked`, centred, first row of the under-card stack: `Click to zoom` desktop, `Tap to zoom` phone. `aria-hidden` — the art's own button is already named. **Except the compact header**, which withholds the whole stack — hint, turn and tag — at the same threshold row 2.3 withholds the mark at, and for the same reason: a 72px thumbnail is a locator in a printing-picker state, and it has the name and type line beside it instead (rows 2.2, 2.5) | ruled 2026-09-13, E17 |
| 3.10 | Dismissal | Three doors, one stage: tap the card, tap the layer, or `Esc`. Focus returns to the art | README §3 |
| 3.11 | Escape order | Zoom first, dialog second — the printing region's shipped two-stage shape. With the region open as well it is three stages | README §3, gap 4 |
| 3.12 | Focus on open | To the flip control when two-faced, otherwise to ✕ | canvas §7 a11y |
| 3.13 | Not a dialog | A region inside the existing one, `aria-label` from copy. **No second focus trap, no second live region** | canvas §7 a11y |
| 3.14 | No-art card | Zoom still opens: `identityGradient` at 63/88, same caption, no substitute card frame | canvas §7 |
| 3.15 | Unowned | Identical. Ownership changes nothing about the zoom | STATES §2 |
| 3.16 | Never | A second backdrop, a viewport scrim, a title bar, a back control, Prev/Next, the price, or pinch past 1× | STATES §2 |

## 4. The flip

| # | Property | Value | Source |
|---|---|---|---|
| 4.1 | Where it turns | **Everywhere the card is drawn.** The 180px phone art and the 264px desktop art turn on the same `rotateY` as the zoom; Amendment 3's instant swap is retired (E17) | Amendment 3, ruled 2026-09-13, E17 |
| 4.2 | Axis | `rotateY`, with `perspective: 1400px` on **whatever contains the turning box** — the zoom layer for the zoom, and each art box for the modal's own art (E17). Never on the box that turns, which is what makes the turn read flat | canvas §4, E17 |
| 4.3 | Duration / easing | `320ms`, `cubic-bezier(.2,.7,.2,1)` | canvas §4 |
| 4.4 | Face swap | At `160ms`, the midpoint, behind the edge; `backface-visibility: hidden` on both faces | canvas §4 |
| 4.5 | Re-press mid-turn | Reverses from the current angle. Never queues, never double-turns | canvas §4 |
| 4.6 | Control | The shipped plate **under the card**, centred, at every size and on every surface: 44px on the phone header and inside the zoom, 32px in the desktop art column. In the art column it sits between the hint above it and the tag below; in the zoom it is the only thing under the card, 12px down. No label, no pill | ruled 2026-09-13, E14, E17 |
| 4.7 | Gate | Renders from the `layout` column only — never from a `//` in the name or type line | canvas §4, STATES §3 |
| 4.8 | `aria-pressed` | Absent. It is a turn, not a toggle state | canvas §7 a11y |
| 4.9 | Accessible name | Changes with the face; the settle is announced by the modal's existing live region | canvas §7 a11y |
| 4.10 | The back face is not remembered | Closing the zoom on the reverse and reopening shows the front. A zoom is a look, not a setting | STATES §3 |

## 5. Motion and the static states

| # | Property | Motion allowed | `prefers-reduced-motion: reduce` | Source |
|---|---|---|---|---|
| 5.1 | Zoom open | 200ms ease-out, opacity 0→1, `scale(.94)→1` | Present at full opacity, 0ms, no scale | MOTION |
| 5.2 | Zoom close | **No exit.** The layer unmounts | Gone, 0ms — unchanged, because it always was | ruled 2026-09-13, E13 |
| 5.3 | Flip | 320ms `cubic-bezier(.2,.7,.2,1)`, **on every surface the card is drawn** — the modal's art as well as the zoom (E17) | Face replaces face, 0ms; the face is then announced on the press rather than on a landing there is none of | MOTION, E17 |
| 5.4 | Scrim | Fades with the layer, same timings; the blur is not animated | MOTION |
| 5.5 | Not animated | The price tag's appearance and the art column's height change with it — **the figure lives in row 1.14 and only there**, because it is derived from the stack's rows and a second copy of it has now drifted twice. **The un-zoomed flip is animated now** — same 320ms turn as the zoom's (E17), so row 5.3 covers every surface | MOTION, E17 |
| 5.6 | How it is written | Two media blocks, one per animation. **Never a global `transition: none`** — the modal has shipped transitions of its own | MOTION, `globals.css:459-462` |

## 6. Coexistence

| # | State | What must be true | Source |
|---|---|---|---|
| 6.1 | priced + claimed | Tag in the art column, availability block under the meta. Both visible, neither styled to reference the other, no connective between them | STATES §4 |
| 6.2 | priced + region open | The tag stays put at every scroll offset of the content column — which is why it is in the art column | STATES §4 |
| 6.3 | absent + claimed | Availability block alone. No silence marker | STATES §4 |
| 6.4 | sold out + claimed | Both, and the pinned link-out still renders: their stock is live, ours is hours old | STATES §4 |
| 6.5 | zoom open + claimed | The layer covers the availability block. Nothing is duplicated into the layer to compensate | STATES §4 |

## 7. Themes

All six — `amonkhet`, `kamigawa`, `ixalan`, `phyrexia`, `eldraine`, `kaldheim` — for the priced tag,
the `no stock` tag, the scrim and the flip control. Tag ink is `--accent` on `--bg` (≥4.6:1 in all
six) — that is the PRICED figure's ink, and the word below has its own.

**`no stock` was measured in build, and it failed.** `--fg-locked` on `--bg` runs 3.23:1 (phyrexia)
to 3.49:1 — a pass for the dashed edge, which is a non-text mark answering to 3:1, and a fail for
the word, which is 10px and answers to 4.5:1. The handoff's suggested `--fg-faint` does not fix it
either: 4.12 in kamigawa, 4.29 in phyrexia. **The word takes `--fg-muted`** (6.61–7.35 across the
six) and the edge keeps `--fg-locked`. Ruled 2026-09-13; it changes the set grid's cell as well,
because that is the same component. Held by `lib/theme/wash-contrast.test.ts`, which measures every
theme, and by a component case asserting which token is asked for.

## 8. Amendments this work makes

| # | Document | The amendment |
|---|---|---|
| 8.1 | `design_handoff_the99_printing_picker/` R3, decisions 2–3 | A pick moves four things, not three. The three-signal table is untouched — the tag is the consequence of a selection, not a signal of one |
| 8.2 | `design_handoff_the99_amendments/PARITY-lightbox-to-modal.md` row 9 (`:20`, summary `:50`) | The 262 → 180px regression is **answered** by the zoom rather than argued with. Nothing else in that parity is reopened |
| 8.3 | `design_handoff_the99_card_surfaces/` R2, rulings 6 + 9 | Zero net motion is amended wherever the CARD is drawn: the flip turns in the zoom and in the modal's own art (E17). Ruling 6's instant swap is retired for both; ruling 9's `layout`-column gate still governs the control |
| 8.4 | `design_handoff_the99_linkout/` R3 | **By exclusion.** The price does not join the pinned row and is not a second door to Mana Pool |
| 8.5 | `docs/superpowers/design-tables/collection.md:750-1069` | The `Card Detail Modal` component gains the tag, the zoom trigger and the zoom layer — and, per E19, the desktop art's width is now derived rather than a flat 264px. It measures 264px at every window 900px and taller, so nothing a reader sees at the drawn size moved; below that the art narrows so the stack under it is not clipped |
| 8.6 | `docs/superpowers/design-tables/commanders.md:1915` | The `detail-card-modal` state row now also holds a price, a zoom and an animated flip |
| 8.7 | Not amended | `design_handoff_the99_availability/` R5 and `design_handoff_the99_set_collections/` R3 are read and reused. The availability block ships as-is; the tag is borrowed, not redefined |

---

## §Errata — verified in the tree, and these win

| # | The handoff says | The tree says | Consequence |
|---|---|---|---|
| E1 | "The tag is the deck-side buy tag, verbatim" | It is **`set-cell.tsx`'s** tag, verbatim: priced is `--accent` on `1px solid --accent-dim`, mono 10px, radius 4, `px 5 / py 2` (`set-cell.tsx:70-77`); no-stock is the dashed `--fg-locked` (`:51-56`). The deck buy tag is warning-tinted at 9/9.5px with a `--fg-body` figure and a **suffixed** `foil` | Build from `set-cell.tsx`. Promote its `PriceTag` to a shared component rather than copying it. The canvas's `2×7` padding goes with the wrong ancestor: row 1.3 is `2px 5px`, set-cell's own |
| E2 | Flip control is "the `--accent` plate … radius 9" | `--bg` at 86% with a `--border-strong` hairline and a `--fg` glyph, **radius 7**, `right 10 / bottom 10`, 34px desktop and **already 44px on phone** (`card-modal.tsx:812-833`) | Inside the zoom the control grows to 44px on desktop; on phone it is already there |
| E3 | Phone plate `rgba(10,8,6,.72)` | The shipped over-art plate is **opaque `var(--bg)` under one `1px solid var(--border-strong)` hairline at radius 7** (`full-card-trigger.tsx:43-59`). It was `color-mix(… var(--bg) 72% …)` until the art-wash ratification landed on 2026-09-12: with the top scrim gone, 72% still passes 28% of a white pixel, and opacity takes a control over art out of the contrast problem entirely | Draw that plate. A raw rgba is not theme-aware and would not survive the six themes, and the superseded 72% mix is no longer the app's answer either |
| E4 | Desktop ✕ at `top 18 / right 18` | `top 22 / right 24`, 34px (`card-modal.tsx:608-616`) | The drawing's 52px title gutter is a canvas correction; the shipped slot is what the ✕ keeps |
| E5 | Amendment 2 targets `design_handoff_the99_full_card/` | No such folder. That work lives in `design_handoff_the99_amendments/` | Row 8.2 above |
| E6 | Ship order gates the flip behind ruling 9's data work | Already shipped — `cards.layout` and `backImageUri` exist and the flip is live (`browse.ts:76-77`, `faces.ts:19`, `card-modal.tsx:455`) | The flip needs no wait |
| E7 | MOTION quotes "the disclosure's 160ms" | No such literal. The shipped family is `0.12s / 0.14s / 0.18s` (`globals.css:531-535`) | 200/160/320 are three new literals. Allowed — §3.4 is Design's call — but the justification's premise is wrong |
| E8 | `toBack: "Turn it over"`, `toFront: "Turn it back"`, `announce: "Now showing {face}"` | Shipped and ratified: `flipToAria` is `Turn over to {face}` and names **the face it turns to, never a generic** (`card-modal.tsx:802-811`); `flippedAria` is `Showing {face}` (`card-surfaces.ts:78-84`) | Reuse the shipped strings. Do not fork them |
| E9 | "Drawn — canvas §1b, the fifth region" | The R2 canvas has §1–§8; §1 draws two frames and contains no compact state. The ruling is in `STATES` §1b and one row of the §7 spec table | Buildable as specified; the citation is wrong |
| E10 | "The tag … joins the name block" on the compact header | That block is `aria-hidden` (`card-modal.tsx:565-577`) because the `h3` stays in the DOM as the dialog's accessible name | Render the tag as a visible sibling **outside** the `aria-hidden` subtree, or the figure is invisible to assistive tech |
| E20 | The phone half of rows 2.1-2.7 (the compact 72px header), 3.7 and 3.9 (the art as the zoom's trigger, `Tap to zoom`), 4.1 (the 180px phone art turns) and 4.6 (the turn control under the card at 44px) | **Superseded on the phone by the card carousel's R2** (`design/design_handoff_the99_card_carousel/README.md` "R2: phone, card first", Hugh LGTM 2026-10-03; built in carousel PR 3). The phone has no art header of either height and no zoom: the card sits at 320 x 447 in a band above a bottom sheet, which is already the zoom's 318. A tap on it does nothing in the teaser and returns to the teaser from the full sheet. The turn plate sits on the card's bottom-right corner at 44px, outside the turning box. The price plate moved onto the sheet's second line beside `×N · <marker>`, and `cardZoomCopy.hintPhone` is deleted. | The compact header's rows and E12 now describe the desktop never and the phone no longer; the desktop rows (zoom, hint, under-card stack, 32px turn) are unchanged. `printingEntryCount` retired with the header that read it. |
| E17 | Rows 3.7-3.9, 4.1 and 4.6 as ratified: a ⤢ mark in the art's bottom-left, a turn control on the art, a desktop-only hint reading `tap the art to hold it`, and a turn that happens only inside the zoom | Four separate reports from Hugh on 2026-09-13 against the built surface. The ⤢ glyph has to be decoded, and a line of words costs the same pixels; two controls printed across the picture are two controls covering the thing the modal exists to show; the hint was absent on the phone, which is the width that most needs it, and its wording named no gesture; and the modal — the surface a reader meets first — swapped faces with no motion while the zoom turned, so one act had two treatments and the quieter one was the default | **Nothing sits on the art.** The stack under the card runs, top to bottom, hint (`Click to zoom` / `Tap to zoom`, mono 10px `--fg-locked`, `aria-hidden`) → turn control → price tag, and it is the ART COLUMN's stack at both widths. The **zoom carries the turn alone**: it has no hint, because the reader is already zoomed, and row 3.4 still forbids the price there. The art in the modal turns on the same `rotateY` the zoom uses, with both faces drawn and `backface-visibility: hidden`; the stretched zoom trigger stays OUTSIDE the rotating box or it faces away on the reverse. Inside the zoom the turn moves 12px under the card, and the card gives back 56px of its height budget to make room — a two-faced zoom is 352x492 desktop where a one-faced one is 372x520. Rows 3.7-3.9, 4.1 and 4.6 now say all of this outright rather than pointing here. Ruled by Hugh, explicitly not a Design round-trip; the earlier rejection of "Tap to zoom" in the copy file is overruled by the same instruction |
| E19 | The desktop art is 264px wide at every window height (canvas §7's 320px column less 28px padding each side) | With the stack moved under the card (E17) that stopped being safe. The column centres the art, so the room beneath it is half the slack: at a 600px-tall window the dialog is `min(620px, 85vh)` = 510px, the column 454px, the 369px art leaves 42px against the 70px the column's own bottom padding brings the room to — and a two-faced card's hint, turn and price want **90**. The dialog is `overflow-hidden`, so the turn control and the tag were simply cut off and unreachable. Found by review, confirmed by measurement | The art takes its **width** from the height the stack leaves: `min(264px, calc((min(620px, 85vh) - 2 * <stack>px) * 0.7159))`, where `<stack>` is 10 + 15 + 38 if two-faced + **27 unconditionally** for the tag's row — 6px of gap and the tag's own 21px box, which is 10px text at the inherited 1.5 line-height plus 2px of padding and a 1px border, measured. An 18px guess for the tag put the reservation 3px short, which is a clipped row on a short window and nothing at all on a tall one. `min(620px, 85vh)` also gives up 2px to the dialog's own border, because the box-sizing is border-box. Two things are easy to get wrong here and both were. **The figure is doubled** because the column CENTRES the art — room under it is `(H - artH)/2 + 28`, so `room ≥ stack` solves to `artH ≤ min(620px, 85vh) - 2·stack`; subtracting the stack once looks right, reads as a fix, and still clips. And **the tag's row is reserved whether or not there is a tag**, or a pick that turns silence into a figure would change the art's width under the reader, which is row 1.14's defect one level up. One dimension set and the ratio deriving the other is the zoom's own rule (row 3.3) — a definite width AND a height cap is how an `aspect-ratio` box gets squashed. 264px at every window 900px and taller, in every state; 235px for a two-faced card at 600px |
| E18 | Row 1.8's phone plate: `p-[2px]` on all four sides | Measured in Chromium at 390px: 7px above the tag and 3px below. `PriceTag`'s standalone form wraps its visible span in a bare `<span aria-hidden>`, which as a flex item generated a line box whose strut came from the inherited 24px body line-height — 4px of it above the 21px tag, none below | The wrapper is `display:flex`, which has no strut, so the tag's own box is the whole height. Measured again after: 3px above, 3px below. No value in row 1.8 changed; the row was simply not true of the rendered box |
| E15 | Row 1.10, read strictly: a holding that names no printing gets silence | **It made the feature invisible on the commonest collection in the app.** 2,733 of this account's 2,733 holdings carry neither a Scryfall id nor a collector number — every Moxfield, Archidekt or pasted import does — so every card in it fell to silence while the catalog knew exactly which printing was meant. Found by the close-out walk, not by 40 rounds of review: `$0.15` was in the database and the panel said nothing | A holding that names a **set** is priced when the catalog holds one printing of that card in that set; a holding that names nothing at all is priced when the card has one printing in existence. Row 1.10 is intact — in both cases there is no sibling to confuse it with — and where more than one printing could be meant it is still silence |
| E14 | Rows 3.8 and 4.6: the turn control sits in the card's bottom-right corner | Bottom-right is where a creature prints its power and toughness. The control covered them on every creature, at all three sizes — the 44px phone header, the 34px desktop column and the 44px zoom — and the P/T is the one figure a reader most often opens a creature to check | **Bottom-centre, at every size** — and then **superseded by E17**, which took the control off the art entirely and put it under the card. Rows 3.8 and 4.6 above say the current placement outright; this entry is kept for the reasoning, which E17 inherits: a control over a whole card covers something printed on it, and there is no corner that is safe. Centre is the only edge position the card itself prints nothing in, and it is where other card apps put this control. Ruled by Hugh on 2026-09-13 from a screenshot of *Tovolar, Dire Overlord* with its `4/4` behind the button; explicitly not a Design round-trip. The zoom mark kept bottom-left at the time, and is now gone (E17). **The class was swept and this is the only control it reaches** — see E16 |
| E16 | Whether any other control in the app sits where a card prints its power and toughness | Swept by grep rather than by eye — `bottom:`+`right:` across `src/components`, unioned with every surface drawing a `63/88` card. Three bottom-right controls exist: `full-card-trigger.tsx`'s `hero` and `deck-mobile` placements, and the commander hero's own label block. **All three sit on an art BAND — a crop, with no printed frame and so no P/T box.** The two surfaces that draw a whole card put their control bottom-left (`commander-desktop`) or bottom-centre (the modal, per E14 — now under the card, per E17) | Nothing else to move. Recorded so the sweep is not repeated: E14 reaches exactly one control, and a future control over a *whole card* is the only thing that would reopen this |
| E13 | Row 5.2 as Design drew it: the zoom leaves over 160ms, `ease-in`, opacity 1→0 | Built, then removed. A layer that is mounted but leaving has to answer Escape without restarting its own timer, ignore a keyboard press `pointer-events-none` does not stop, keep a stale timer from unmounting a zoom the reader reopened, and not take focus back from the stage the next Escape claimed — five review rounds, every finding real, all of them the exit's | **The layer unmounts on close, and row 5.2 above now says so** — Hugh ruled it on 2026-09-13 rather than leaving it for Design to ratify. The enter animation stays: it is what makes the zoom read as picked up rather than pasted in. A 160ms fade on the way out is one nobody waits for, and it cost more in interaction defects than it bought. `MOTION-no-token-set.md` still draws the exit; the handoff is kept as drawn and this table governs |
| E12 | Compact header, row 2.2: the tag goes "below the name, beside the mana cost" | On a phone in the compact state those two are in **different regions**. The name and type line move into the art header (`card-modal.tsx:694-716`), whose heading is `aria-hidden`; the mana cost stays in the content column's header row, which is the only part of that row still drawn at phone width | The tag follows the mana cost, in the content column's header row, and not the art header's name block. "Below the name" cannot also be honoured: the name is not in that row on a phone |
| E11 | Themes (price table `price-on-the-buy-tag.md:187`) lists `innistrad` / `duskmourn` | The shipped six are `amonkhet`, `kamigawa`, `ixalan`, `phyrexia`, `eldraine`, `kaldheim` (`globals.css`) | The handoff's list is right; **row 6.4 of the buy-tag table is stale** and is corrected here |

**One consequence worth stating plainly.** E1 plus row 1.7 settle card detail on the
set-collections vocabulary rather than the buy tag's. The same unstocked card therefore reads
`no stock` in the detail panel and a bare `buy` in the decklist row one click away. That is
Design's ruling, made deliberately and with a reason; it is recorded here so it is not later
"corrected" as drift.
