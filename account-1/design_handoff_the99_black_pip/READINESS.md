# READINESS — The black mana pip (R3)

**Self-assessed: 🟢 Green. One taste call flagged for confirmation, one gap that needs a
ruling only if the audit enforces 3:1 on a decorative control.**

Nothing here is gated. The change is six value edits in one file plus one deletion, and every
number behind it is measured rather than judged — see `CONTRAST-black-pip.md`.

## Needs confirmation — one item, and rejecting it costs a redraw of nothing

1. **`--b` stops reading as near-black.** `#98748F` is a mid-lightness violet-grey. Beside the other
   four pips it reads as the black one; in isolation it reads as a dark violet. **R2/R3 revisions:**
   R1 proposed a neutral `#837D78` and the review found it reads as a second white at 9–12px,
   where the pip has no glyph. R2's `#857A93` fixed the reading and **failed
   `contract.test.ts:145`** at ΔE 0.087 against Oil and Iron; R3 pushes the hue to 335° for
   0.115 against a 0.100 floor. `CONTRAST-black-pip.md` §§0, 3, 5 and 7 carry the numbers.
   This is deliberate
   (decision 2) and it is the substance of the amendment: on six canvases between `#151317` and
   `#1E1F26`, "the darkest disc" and "a hole in the card" are the same picture.
   Design's position: the swatch's job is identity, and black takes both axes the palette
   offers — **the darkest of the five, and the only violet** — which is how three of the other
   four are identified too. All 22 reads sit beside a caption, so no surface leans on the
   swatch alone.
   **Rejecting this means accepting a ring, and a ring cannot follow card art** (decision 1),
   so the fallback is per-surface rings and that is a larger amendment than this one.

## Needs a ruling only if the floor is enforced

2. **`ColorPip`'s unselected pip is 1.74:1, not 3:1.** It was **1.00:1** — pixel-identical to
   its surface — so this amendment takes it from invisible to visible without reaching the
   non-text floor, because the shortfall is the `opacity: 0.40` and not the value. Clearing
   3:1 means editing `color-pip.tsx`, which is a second file, changes all five pips, and puts
   this amendment outside "one token change". `0.55` reaches only 2.18. Design's preference is
   to ship the token change and log the opacity separately; the control also carries a brass
   selection ring and an `aria-label`, so nothing is conveyed by the disc alone.

## Called, not asked — flagged for the record

3. **`PIP_TEXT` is deleted, not promoted.** With the lift, all five keys would hold `--bg`.
   If amendment 4 lands first, the whole file goes with it and this is moot.
4. **One hex for six themes, no per-theme toning** (decision 3). Phyrexia's `--g` exception
   does not generalise: it moved because it collided with that theme's accent by hue, and this
   value sits ΔE 0.115 from the nearest of the six — wider than R1's neutral did.
5. **`#98748F` is the minimum-passing value on the binding constraint**, which is the glyph
   ink, not the disc. `#7C7671` clears 3:1 on every ground and still fails the glyph at 4.17 —
   that is the measurement that set the value, and it is the one to re-run if `--bg` ever
   lightens in any theme.
6. **The 4.5 floor is applied to a 12px pip glyph** even though it is arguably a non-text
   graphic. It is a character, it is the only cue distinguishing `{B}` from `{U}` for anyone
   not reading hue, and it was free.

## Not blocking, and worth reading before estimating

7. **No component file is touched, so there is nothing to review per-surface.** All 22 reads go
   through `WUBRG_COLOR` → `var(--b)`. The estimate is one CSS file, one deletion, and a
   look at `globals.test.ts`.
8. **CI gates this change, and it is the gate that set the value.** `contract.test.ts:145`
   asserts `deltaEOk(pip, accent) >= 0.1` per pip per theme; R1 and R2 both failed it. Run
   `pnpm test` before believing any candidate. What CI cannot see is the legibility half —
   there are no visual-regression baselines for pips, so the six-theme frame is the reference
   for that and a reviewer's eyes are the gate.
9. **Re-measure after quantisation, not before.** The themes handoff found five values that
   clamp clean in OKLCH and bust after 8-bit rounding. Every figure in this handoff is
   post-quantisation.
10. **`identityGradient` / `commanderGradient` pick the value up for free** — including
    `SuggestionTile`'s two-colour split, where a Dimir card previously faded from blue into
    nothing. Not drawn as its own frame; it is the same token.

## Not blocking

- No new token, no new key, no new hex beyond the one value, no new component, no component
  edit, no new motion class, no copy change to any shipped string, no a11y semantics change.
- The 36-key contract stays at 36 keys. `--color-b` in `@theme inline` is untouched.
- `--w` / `--u` / `--r` / `--g` untouched, Phyrexia's `--g` exception untouched.
- The generic `{n}` pip untouched: `--border-dashed` disc, `--fg` glyph.
- `ColorPip`'s selection ring, `OwnershipDot`, `AvailabilityGlyph` and the availability row
  ring untouched — none of them is a WUBRG swatch.
- Every pip size at every call site unchanged: 9, 10, 11, 12, 13, 15, 22, 26px.
- Every contrast figure in the canvas, the README and `CONTRAST-black-pip.md` is computed from
  the hexes at `main` and agrees across the three files.
