# READINESS — the Mana Pool link-out (#330), R1

**Verdict: 🟡 Amber.** Every design decision is made, defended and drawn. The amber is one gap and
it is not a design gap: **the brief's source of truth is not in this project**, so three mechanical
facts that document owns are carried rather than restated. Nothing visual depends on them.

`docs/superpowers/specs/2026-09-05-manapool-checkout-design.md` is absent (`docs/superpowers/`
holds `design-tables/appshell.md` alone), as is `src/components/cards/card-modal.tsx` (`src/` holds
`components/shell/nav.tsx` alone). **No claim in this pass is sourced to §4 or §7.** The modal's
anatomy is taken from the drawn record — `PARITY-lightbox-to-modal.md` and the Full Card canvas.

## The rulings

| Question | Ruling |
|---|---|
| **1 · Weight in the export dialog** | **Quieter than both local actions, and on its own row below a hairline.** Not primary: promoting it demotes what the player opened the dialog to do, and makes the app a funnel — a commercial posture, not a layout. Not peer: every button here acts locally and returns you where you were, so a third identical box that opens a storefront teaches the player that the row's shapes mean nothing. **The hairline is where the app ends** — hierarchy read off structure, not colour, which is the only "quieter" that survives six themes. |
| **2 · Where it goes in the card modal** | **Last position, below the same hairline**, after the meta grid (phone) / field row (desktop). The modal gets the actions row it lacked, containing exactly one action — which is why no row had to be designed. Not in the meta grid (those cells are facts), not inside the printing region (a disclosure that stays vs. a link that leaves). **One state: owned and unowned identical**, all three routes identical. |
| **3 · The outbound treatment** | **Tint + underline, destination named, `↗` glyph kept.** Brass tint already means five other things in this app, so tint alone cannot mean "this navigates" — the underline is the only mark not already spent. Label grammar `Buy … on Mana Pool ↗`, **no count** (R3's lesson: the dialog already says `8` twice). Hover → `--fg`; focus → 2px `--accent` ring at 2px offset; active → `--accent-strong`; **`:visited` identical to rest.** |
| **3b · The ink** | **`--accent-hover`, not `--accent`.** Measured: `--accent` lands at **4.3 on phyrexia** and **4.5 on kaldheim** for 14px text. A per-theme override for those two is six primitives; the lighter step already exists in every theme and clears AA in all six. Hover then leaves the ramp for `--fg`, which is brighter in all six and makes hover the one moment the link stops being brass. |
| **4 · `:visited`** | **Not styled.** It renders the browser's purchase history on a screen that may be shared or streamed — a fact the app does not own — and being per-URL it would make one *looked-at* card read as *done*. |
| **5 · Empty Shopping list** | **Absent, not disabled** — the price strip's own rule. No basket, no destination; a disabled link says *you may not* when the truth is *there is nothing to*. **The hairline goes with it.** |
| **6 · The buy tag** | **Still never a link**, and this pass is the reason it was right: the primitive requires a focus ring, and a 9px tag inset into card art has nowhere to put one. First negative rule of the convention: **a link-out goes only where its focus ring fits.** |
| **7 · Decklist tab** | **Not drawn, and no slot held.** Rejected, not deferred. |

## Carried — mechanical, for that document or eng

1. **The URL contract for both mechanisms.** Deck payload shape; per-card identifier. One design
   constraint attaches: **the card link resolves to the printing on screen**, since the modal's Set
   row states which printing that is.
2. **`rel` beyond `noopener`.** Specified as `noopener` only — the safe floor. If a referral
   arrangement needs the referrer, `noreferrer` must not be added. **Commercial, not visual; not
   guessed at.**
3. **New tab, confirmed.** If same-tab is ruled, **the glyph and the hidden "(opens in a new tab)"
   text come out together** — one decision, and a same-tab link wearing an outbound glyph is a lie
   the convention would inherit.

## Open, non-blocking

- **The second footer row is a new construct on a shipped dialog.** Worth one look in place before
  beta — whether the hairline reads as *the app ends here* or as a divider that grew.
- **`Buy these on Mana Pool ↗` at 390px** fits at 14px with room; not measured against Rune Frost's
  body metrics in the centred phone row.
- **44px is applied to the row, not the text** — deliberate, so the link never acquires a button's
  box, but the tappable area is wider than the underline. Standard; flagged because it is the first.
- **`--accent-hover` now has two jobs.** No collision today: item 4's absences keep accent-filled
  controls and link-outs off the same shelf. A future surface that puts them adjacent is that
  surface's ticket.

## Unchanged and still verified

The buy tag is never a target at either density · the price strip is the Shopping filter's · the
92% scrim, the 50% inset and the R2 token table · `export.pricingNote` and its two call sites ·
`builder-spine.tsx:391` · exports copy names only · every shipped element of the export dialog and
of the card modal, including all a11y behaviour from `useDialogA11y` · curly apostrophes throughout.
