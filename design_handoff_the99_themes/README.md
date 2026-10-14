# Handoff: The 99 — Six-theme visual system

**R2 · 2026-09-01 · amends `design/design_handoff_the99_brand/`**

R1 was audited 🟡 Yellow; both blockers were resolved in the audit (§8.2's fifth column is
`--fg-faint`, and the accent area budget is an eyes-on heuristic rather than a CI check), so
no hex in `TOKEN-TABLE.md` changed. R2 adds the two things the audit asked for: **the mobile
pass** (§G) and **the Metamorphous ruling** (§H), plus two citation fixes applied in place.

Six complete palettes, one display face each, a theme picker, and the retirement of the
character layer across ten empty/loading states.

Brief: `docs/superpowers/design-briefs/2026-09-01-six-theme-visual-system.md`
Eng spec: `docs/superpowers/specs/2026-08-31-theme-system-design.md`

## Files

| File | What it is |
|---|---|
| `The 99 - Six-Theme Visual System.dc.html` | The canvas — six themes, type specimen, picker, all ten empty states in two themes, the density stress test, the measured audit. |
| `The 99 - Six-Theme Visual System (standalone).html` | The same canvas as one self-contained file — fonts and runtime inlined, opens offline in any browser. Send this one to anyone outside the project. |
| `TOKEN-TABLE.md` | **The implementation artifact.** 35 keys × 6 themes as literal hexes, plus the measured audit and every correction to §8's locked values. |
| `tokens.json` | The same data machine-readable, so the CI fixture can be generated rather than transcribed. |
| `themes · copy strings.ts` | New strings (the picker) and `REPLACES` entries (four empty states). |
| `READINESS.md` | Verdict and what is blocking. |

## Reading order

1. **`READINESS.md`** — the verdict and the two rulings that block merge. Two minutes.
2. **The canvas** — §F first if you only have five minutes; it is the measured audit and the
   two places §8 conflicts with itself.
3. **`TOKEN-TABLE.md`** — what eng implements from. The corrections table at the bottom is the
   part to review, not the hexes.
4. **`README.md` decisions log** — the five §9 calls, with reasons.

## What this amends

`design_handoff_the99_brand/` locked **“Palette A · Table Candlelight”** as *the* palette and
**Cinzel** as *the* display face. Both are now one option of six. Everything else in that
package still holds unchanged: the crowned-numeral logomark, WUBRG-as-tags-only, the type
scale, the spacing scale, the radius scale, the button and chip specs.

Two rows of the brand README are superseded outright:

| Brand README row | Superseded by |
|---|---|
| “**Palette:** A · Table Candlelight” | Six palettes; Table Candlelight becomes **Gilded Stone**, the `:root` default. |
| “**Type:** Cinzel (display/headings/wordmark)” | Six display faces; Cinzel is Gilded Stone's. Body and mono are unchanged in all six. |
| “**Accent — brass**” table (`--brass`, `--brass-hover`) | Renamed `--accent*`, six values each. The brass hexes survive only as Gilded Stone's, and even there `--accent` moves `#C9A24B` → `#CF8745` per §8.1. |

## Decisions log

1. **The fifth column of §8.2 is `--fg-faint`, not `--fg-muted`.** Read literally it fails
   §8.9's own 4.5:1 floor in four of six themes (Neon Rain 3.81, Screen Glow 3.36, Moonlit
   4.00, Oil and Iron 4.04). Amonkhet settles it: §8.2 gives `#8E8269`, which is shipped
   `--fg-faint` verbatim, while shipped `--fg-muted` is `#A89B84`. Placed in `--fg-faint`;
   `--fg-muted` is derived above it at Amonkhet's own 6.36:1. **This is the one reading in the
   package that could force a redraw** — READINESS item 1.

2. **Locked values are held unless they fail a gate §8 itself declares CI-enforcing.** Where
   they do, the *minimum* passing change is applied and recorded to four decimal places in
   `TOKEN-TABLE.md`. Six corrections total; four are ΔE ≤ 0.014 and invisible. This policy
   exists because §8 says a bust fails the build — shipping a table that is faithful to the
   brief and red in CI helps nobody.

3. **Theme names are descriptive, with the plane as a subtitle** (§9.1). Gilded Stone ·
   Neon Rain · Moonlit · Oil and Iron · Screen Glow · Rune Frost. Precedent is the palette's
   own existing name, “Table Candlelight”. A Magic player still gets the plane; a friend who
   has never played gets a colour rather than a product name, and the app stops looking like
   it is shipping WotC's trademarks as UI labels.

4. **The picker lives inline in the existing account menu** (§9.2) — a 3×2 grid of miniatures
   in the desktop popover, 2×3 at 44px minimum in the mobile sheet. No new route, no second
   sheet. The user menu is where a preference belongs, and six small objects fit where six
   rows would not.

5. **A theme previews as a miniature of the app, not a swatch** (§9.3): a 46px card painted in
   the theme's `--bg`, holding a `--surface` panel, a `--accent` bar and “99” set in the
   theme's display face. That is precisely the set of things a theme changes, so the preview
   is the feature rather than a stand-in for it. Selected state is an accent ring **plus** a
   tick, never colour alone.

6. **The crown replaces the creature** (§9.4). Three diamonds at small-large-small — the
   logomark's crown, which `completion-reveal.tsx:78–80` **already draws in brass** at 9/13/9px
   directly above the celebration heading. Retiring the character layer does not open a hole;
   it removes what was standing in front of the mark. Three intensities:
   `--border-strong` (quiet, in-page) · `--accent-strong` (page, full-route) · `--accent` at
   2× (loud, the 99/99 reveal only).

7. **The crown absorbs `LoaderDots`.** The loader was three dots on a 1.2s pulse; the crown is
   three diamonds. Same keyframes, same stagger, one fewer component. Under
   `prefers-reduced-motion` all three hold at full opacity, following the existing
   `globals.css` block. **404 is the one surface with no crown** — the numeral is already the
   mark, set in the display face at `--elevated`, and two marks is one too many.

8. **Decks index keeps a mark; the guided banner loses its entirely** (the two §6 asked to be
   called). Decks index is a full-route empty list, structurally identical to first-run and
   404, so it takes the Page crown. The guided banner is an inline directive with copy beside
   it — a decorative mark inside a banner is absence dressed up as design. Its mark is the 3px
   accent left border it already has.

9. **Moonlit's accent gets a chroma floor of 0.045** (§9.5), `#9AA9A3` → `#8AAFA1`, ΔE 0.026.
   Confirmed with a number rather than by eye: at C 0.0189 the locked accent carries **less
   chroma than the border budget allows** (0.04) and sits ΔE 0.021 from its own `--fg-muted`.
   A focus ring indistinguishable from muted body text is not an accent. It remains the least
   saturated theme by 2.5×. One knock-on: the floored sage lands ΔE 0.09 from `--success`, so
   Moonlit's success deepens to `#679F5F`.

10. **Only four of ten empty states get new copy.** The illustration was carrying the
    personality on the celebration, the 404, no-results and filtered-empty; those are
    rewritten. The other six ship their strings verbatim and are listed in the copy file so
    the audit can see the decision was made rather than missed.

11. **The vignette survives, tokenised.** Six surfaces paint `rgba(201,162,75,0.07)` as a
    radial behind the creature and `loading-screen.tsx` a seventh at `0.08` — a hardcoded
    brass literal that must become accent-derived at ≤8% alpha. It is kept because it is the
    only ambient the illustration-free states have, and it is the reason an empty state gets a
    crown and one button and nothing else.

12. **The picker is the one place the six-font budget is spent deliberately.** Rendering six
    miniatures in six faces fetches all six — but the chips do not exist until the menu opens,
    so page load is untouched and the spec's lazy-fetch design holds. One user-initiated
    fetch, once per session.

13. **Mobile is drawn, not argued** (R2). The shell at rest at both widths in three themes
    including Rune Frost, the picker's 390px sheet at a 44px minimum hit box, and five empty
    states at 390px. Three rules fall out: CTAs stack full-width below 480px at 44px (the
    shipped `flex-col md:flex-row` pattern, not a new one); empty-state centring is measured
    inside an 80px tab-bar reserve plus 12px, per the add-panel handoff, so the mark does not
    sit visually low; and **the crown does not resize between widths** — it is a mark, not a
    hero image, and shrinking it would make it read as a bullet.

14. **Rune Frost keeps Metamorphous and drops synthetic bold** (R2, §H).
    `[data-theme="kaldheim"] .font-display { font-synthesis-weight: none; }` — one rule in
    `@layer base`, no call-site changes, no new face, §8.7 intact. Synthetic bold dilates the
    outline uniformly, which flattens exactly the stroke contrast the face is chosen for, and
    it does its worst work at 15–18px where most of the 32 display sites sit. Swapping the
    face was considered and rejected: Metamorphous is the only one of the six doing genuinely
    representational work, and the alternatives with real weight axes are already taken.

## Gap report

1. **Rune Frost headings sit lighter than the other five**, as a consequence of decision 14.
   A legibility gain and an honest one, but it is a visible difference between themes and the
   only place the six are not typographically peer. Worth one look on Windows as well as
   macOS, where synthetic-bold and hinting behaviour differ.

2. **Syncopate needs a size cap.** At `card-modal.tsx:390`'s 29px it takes three lines where
   Cinzel takes two, because it is wide, all-caps-ish and has no weight below 700. Oil and Iron
   wants that slot capped at 26px, or the modal header grows a line on every long card name.

3. **Big Shoulders reads a step small.** Condensed; at 22px it looks like 19px beside the
   others. Screen Glow probably wants +1px on headings under 24px. Not measured against real
   screens — flagged, not specified.

4. **The `--fg-body` / `--fg-muted` / `--fg-faint` band is tighter in four themes than in
   Amonkhet**, because the locked faint values sit high (Screen Glow 3.37:1, Neon Rain 3.81:1)
   and `--fg-locked` still has to clear 3:1 beneath them. Locked lands at 3.02–3.05:1 in all
   six — legal, but with no headroom. Any future darkening of a `--surface` breaks it.

5. **Moonlit's `--avail-hard-fg` equals its `--accent` exactly** (`#8AAFA1`). The token exists
   because the tile chip label is 8.5px mono and needs lifting off the accent; Moonlit's accent
   is already light enough to clear 7:1 unaided. Correct, but it means the token is redundant
   in one theme and a reader may assume a copy-paste error. Worth a comment in the stylesheet.

6. **`--avail-over-border` is `#752619` in all six.** `--danger` only moves in Moonlit, so this
   derived value is theme-invariant. It still must be declared per theme for set-equality, but
   nobody should mistake that for six considered decisions.

7. **The accent area budget is a heuristic, not a CI check** (ruled in the R1 audit). §8.4
   makes chroma CI-enforcing; §8.5's “roughly 10%” is eyes-on, and painted area is not
   statically computable. Area × alpha is the model: the vignette costs ~2.5% of the viewport
   and the densest data surface ~4%. The vignette stays.

8. **Per-theme WUBRG was specced and barely used.** The spec's worked example deepens
   Duskmourn's blue pip because it crowds the accent; measured, it does not — ΔE 0.19, well
   clear. Only **one** pip moves in the whole system (Oil and Iron's green, `#4B7A46` →
   `#527030`, ΔE 0.09 from the oil-teal accent). Pips could arguably be global constants with
   one override. Left per-theme as specced, but the contract is carrying five keys × six
   themes to express one decision.

9. **Gilded Stone's `--warning` has to move back toward yellow.** The brand README moved
   warning off brass `#C9A24B` to amber-orange `#E0913C`; §8's accent `#CF8745` is warmer and
   more orange than brass, so amber-orange is now the collision. `#DEAA29`. Same problem,
   opposite direction — and a sign this pair will keep colliding.

10. **Closed in R2.** The empty states are now drawn at 390px as well — five of the ten,
    covering every treatment (page, quiet, loud, numeral, pips). They reflow; nothing
    reorders. The 404's 48px numeral was the only element ever at risk and it fits with room
    to spare.

## A11y contract

- `--fg` on `--bg` ≥ 7:1 — measured 12.06–15.65 across the six.
- `--fg-body` and `--fg-muted` on `--surface` ≥ 4.5:1 — measured 8.77–8.84 and 6.33–6.38.
- `--fg-faint` and `--fg-locked` on `--surface` ≥ 3:1 — measured 3.37–4.59 and 3.02–3.05.
- Accent-button label ≥ 4.5:1 — measured 4.51–7.76. The label is `--bg` in all six; no theme
  needs a light label.
- Focus ring on `--bg` ≥ 3:1 — measured 4.51–7.76. Oil and Iron is the tightest and is the
  reason its accent was lifted.
- Chroma: surfaces ≤ 0.02, borders ≤ 0.04, text ≤ 0.03, **measured on the quantised 8-bit
  hex.** Clamping in OKLCH and then rounding to hex re-introduces chroma — five values in this
  system bust the budget that way. Clamp after quantisation or CI fails on source that looks
  correct.
- Separation: every pip and semantic ≥ 0.10 ΔE OKLab from its accent; every pip ≥ 0.10 from
  every other pip.
- Nothing is carried by theme colour alone. The availability marker keeps glyph + number +
  word, semantics keep their glyphs, pips keep their letters, and the picker's selected state
  is a ring **and** a tick.
