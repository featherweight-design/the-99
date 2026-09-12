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
| 1.1 | Placement | Last child of the art column, **10px** under the sharp art (9px phone), centred on the card | canvas §7, README §1 |
| 1.2 | Why there | The art column is the one region every card has at both widths, owned or not, one printing or fifty-four; the art *is* the printing the figure is about | README §1 |
| 1.3 | Priced | mono 10px, `--accent` on `1px solid --accent-dim`, radius 4, padding `2px 5px` | canvas §7, corrected by E1 |
| 1.4 | Foil-only | `◆ foil $6.10` — the diamond **prefixes**, the finish word comes from which column supplied the figure (`foil` / `etched`) | canvas §2, `set-collections.ts:208` |
| 1.5 | No stock | the word `no stock`, `--fg-locked` on `1px dashed --fg-locked` | canvas §2 |
| 1.6 | Silence | **Nothing renders.** No dash, no `$0.00`, no greyed box, no reserved slot, no skeleton | canvas §2, STATES §1 |
| 1.7 | Which state is which | `no stock` = the store answered and the answer was no (sold out **and** never stocked alike). Silence = nothing reached us — the price read failed or was not loaded | READINESS R2 item 2 |
| 1.8 | Phone plate | The over-art plate behind the tag, because it sits over the wash. **The only difference between the two widths** | README §1 |
| 1.9 | Re-reads on a pick | Yes. A pick now moves **four** things — art, `Set` field, tile ring, tag | README §1, Amendment 1 |
| 1.10 | Per printing, never per card | If the resolved printing has no figure the state is silence or `no stock` — **never another printing's figure** | README Notes for engineering |
| 1.11 | Not interactive | Not a link, no hover state, no target, not focusable | canvas §7 |
| 1.12 | Accessible form | Read as part of the card's description, one string from copy; a bare figure is never spoken alone | canvas §7 a11y |
| 1.13 | Absent in the DOM | The absent state is absent to assistive tech too — no `aria-hidden` placeholder, no empty node | canvas §7 a11y |
| 1.14 | Height cost | Absent → priced on a pick adds 30px desktop / 29px phone at the column's end. Nothing above moves; the modal does not resize; **do not animate it** | STATES §1 |
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
| 3.3 | Card | 63/88, the largest that fits the rect less 28px padding and the caption row — **372×520** desktop, **318×444** phone; radius 14/13; inset hairline + `0 24px 60px rgba(0,0,0,.6)` | canvas §7 |
| 3.4 | Caption | One mono 11px line, `--fg-muted`: `set · code · collector number`; gains ` · back` on the reverse. Never the price | canvas §7, copy strings |
| 3.5 | Caption with no collector number | Omit the field **and** its separator. Never "no number" | copy strings |
| 3.6 | Close | The modal's shipped ✕ — 34px desktop / 32px phone, in its shipped slot, gaining an `--elevated` plate to clear the scrim. Its **label** changes, its position does not | canvas §7 |
| 3.7 | Trigger | The sharp art becomes a `button` with `aria-expanded` and `aria-controls`; visible mark is the zoom glyph on the over-art plate, **bottom-left**, 30px desktop / 28px phone | canvas §7 |
| 3.8 | Corner rule | Flip control owns bottom-**right**, zoom mark bottom-**left**, on every card. A one-faced card has an empty right corner rather than a shifted left one | canvas §7 |
| 3.9 | Desktop hint | `tap the art to hold it`, `--fg-locked`, desktop only | copy strings |
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
| 4.1 | Where it turns | **Inside the zoomed view only.** The 180px phone art and the 264px desktop art still swap, as ratified | Amendment 3 |
| 4.2 | Axis | `rotateY`, with `perspective: 1400px` on the layer | canvas §4 |
| 4.3 | Duration / easing | `320ms`, `cubic-bezier(.2,.7,.2,1)` | canvas §4 |
| 4.4 | Face swap | At `160ms`, the midpoint, behind the edge; `backface-visibility: hidden` on both faces | canvas §4 |
| 4.5 | Re-press mid-turn | Reverses from the current angle. Never queues, never double-turns | canvas §4 |
| 4.6 | Control | The shipped corner plate, unchanged, grown to a **44px** target inside the zoom. No label, no pill, no move | canvas §4 |
| 4.7 | Gate | Renders from the `layout` column only — never from a `//` in the name or type line | canvas §4, STATES §3 |
| 4.8 | `aria-pressed` | Absent. It is a turn, not a toggle state | canvas §7 a11y |
| 4.9 | Accessible name | Changes with the face; the settle is announced by the modal's existing live region | canvas §7 a11y |
| 4.10 | The back face is not remembered | Closing the zoom on the reverse and reopening shows the front. A zoom is a look, not a setting | STATES §3 |

## 5. Motion and the static states

| # | Property | Motion allowed | `prefers-reduced-motion: reduce` | Source |
|---|---|---|---|---|
| 5.1 | Zoom open | 200ms ease-out, opacity 0→1, `scale(.94)→1` | Present at full opacity, 0ms, no scale | MOTION |
| 5.2 | Zoom close | 160ms ease-in, opacity 1→0 | Gone, 0ms | MOTION |
| 5.3 | Flip | 320ms `cubic-bezier(.2,.7,.2,1)` | Face replaces face — **the shipped swap**, so the static path is the status quo | MOTION |
| 5.4 | Scrim | Fades with the layer, same timings; the blur is not animated | MOTION |
| 5.5 | Not animated | The price tag's appearance, the art column's 30px height change, the un-zoomed flip | MOTION |
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
six). `no stock` is `--fg-locked` on `--bg` at 3.2–3.6:1, **the one row to measure in build**, with
phyrexia the floor; if it fails, the fix belongs to the tag everywhere it renders, not here.

## 8. Amendments this work makes

| # | Document | The amendment |
|---|---|---|
| 8.1 | `design_handoff_the99_printing_picker/` R3, decisions 2–3 | A pick moves four things, not three. The three-signal table is untouched — the tag is the consequence of a selection, not a signal of one |
| 8.2 | `design_handoff_the99_amendments/PARITY-lightbox-to-modal.md` row 9 (`:20`, summary `:50`) | The 262 → 180px regression is **answered** by the zoom rather than argued with. Nothing else in that parity is reopened |
| 8.3 | `design_handoff_the99_card_surfaces/` R2, rulings 6 + 9 | Zero net motion is amended in exactly one place: inside the zoom, the flip turns. Everywhere else the ratified swap stands, and ruling 9's `layout`-column gate now governs this control too |
| 8.4 | `design_handoff_the99_linkout/` R3 | **By exclusion.** The price does not join the pinned row and is not a second door to Mana Pool |
| 8.5 | `docs/superpowers/design-tables/collection.md:750-1069` | The `Card Detail Modal` component gains the tag, the zoom trigger and the zoom layer. No shipped geometry changes |
| 8.6 | `docs/superpowers/design-tables/commanders.md:1915` | The `detail-card-modal` state row now also holds a price, a zoom and an animated flip |
| 8.7 | Not amended | `design_handoff_the99_availability/` R5 and `design_handoff_the99_set_collections/` R3 are read and reused. The availability block ships as-is; the tag is borrowed, not redefined |

---

## §Errata — verified in the tree, and these win

| # | The handoff says | The tree says | Consequence |
|---|---|---|---|
| E1 | "The tag is the deck-side buy tag, verbatim" | It is **`set-cell.tsx`'s** tag, verbatim: priced is `--accent` on `1px solid --accent-dim`, mono 10px, radius 4, `px 5 / py 2` (`set-cell.tsx:70-77`); no-stock is the dashed `--fg-locked` (`:51-56`). The deck buy tag is warning-tinted at 9/9.5px with a `--fg-body` figure and a **suffixed** `foil` | Build from `set-cell.tsx`. Promote its `PriceTag` to a shared component rather than copying it. The canvas's `2×7` padding goes with the wrong ancestor: row 1.3 is `2px 5px`, set-cell's own |
| E2 | Flip control is "the `--accent` plate … radius 9" | `--bg` at 86% with a `--border-strong` hairline and a `--fg` glyph, **radius 7**, `right 10 / bottom 10`, 34px desktop and **already 44px on phone** (`card-modal.tsx:812-833`) | Inside the zoom the control grows to 44px on desktop; on phone it is already there |
| E3 | Phone plate `rgba(10,8,6,.72)` | The shipped over-art plate is `color-mix(in oklab, var(--bg) 72%, transparent)` — `OVER_ART_PLATE = 72` (`art-wash.tsx:79`), written out at `full-card-trigger.tsx:65` because Tailwind cannot compile an interpolated class | Use the token expression. A raw rgba is not theme-aware and would not survive the six themes |
| E4 | Desktop ✕ at `top 18 / right 18` | `top 22 / right 24`, 34px (`card-modal.tsx:608-616`) | The drawing's 52px title gutter is a canvas correction; the shipped slot is what the ✕ keeps |
| E5 | Amendment 2 targets `design_handoff_the99_full_card/` | No such folder. That work lives in `design_handoff_the99_amendments/` | Row 8.2 above |
| E6 | Ship order gates the flip behind ruling 9's data work | Already shipped — `cards.layout` and `backImageUri` exist and the flip is live (`browse.ts:76-77`, `faces.ts:19`, `card-modal.tsx:455`) | The flip needs no wait |
| E7 | MOTION quotes "the disclosure's 160ms" | No such literal. The shipped family is `0.12s / 0.14s / 0.18s` (`globals.css:531-535`) | 200/160/320 are three new literals. Allowed — §3.4 is Design's call — but the justification's premise is wrong |
| E8 | `toBack: "Turn it over"`, `toFront: "Turn it back"`, `announce: "Now showing {face}"` | Shipped and ratified: `flipToAria` is `Turn over to {face}` and names **the face it turns to, never a generic** (`card-modal.tsx:802-811`); `flippedAria` is `Showing {face}` (`card-surfaces.ts:78-84`) | Reuse the shipped strings. Do not fork them |
| E9 | "Drawn — canvas §1b, the fifth region" | The R2 canvas has §1–§8; §1 draws two frames and contains no compact state. The ruling is in `STATES` §1b and one row of the §7 spec table | Buildable as specified; the citation is wrong |
| E10 | "The tag … joins the name block" on the compact header | That block is `aria-hidden` (`card-modal.tsx:565-577`) because the `h3` stays in the DOM as the dialog's accessible name | Render the tag as a visible sibling **outside** the `aria-hidden` subtree, or the figure is invisible to assistive tech |
| E11 | Themes (price table `price-on-the-buy-tag.md:187`) lists `innistrad` / `duskmourn` | The shipped six are `amonkhet`, `kamigawa`, `ixalan`, `phyrexia`, `eldraine`, `kaldheim` (`globals.css`) | The handoff's list is right; **row 6.4 of the buy-tag table is stale** and is corrected here |

**One consequence worth stating plainly.** E1 plus row 1.7 settle card detail on the
set-collections vocabulary rather than the buy tag's. The same unstocked card therefore reads
`no stock` in the detail panel and a bare `buy` in the decklist row one click away. That is
Design's ruling, made deliberately and with a reason; it is recorded here so it is not later
"corrected" as drift.
