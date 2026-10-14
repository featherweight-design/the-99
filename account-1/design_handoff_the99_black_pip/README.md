# The 99 — The black mana pip (design handoff, R3)

**Amendment 1 of four.** No new brief: this amends the six-theme visual system
(`design/design_handoff_the99_themes/`), which is where `--b` was declared, and it deletes a
compensating one-off introduced by `design/design_handoff_the99_commanders/`'s lightbox.
Amendment 4 (`design/design_handoff_the99_full_card/`) deletes that file outright; the two
are independent and land in either order.

File: `The 99 - Black Mana Pip.dc.html` (canvas — pan/zoom). Read `CONTRAST-black-pip.md`
for the measured ledger (5 swatches × 3 grounds × 6 themes, plus the glyph pass), and
`black-pip · copy strings.ts` for the two string additions — both of which belong to
amendment 4 and are carried here only because they name a pip.

**The one-line summary (R3):** *black is identified by hue and lightness together, and a
shipped test decides how much hue.* `--b` lifts from `#1E1B1A` to `#98748F` in all six theme blocks — one hex, six
declarations, no per-theme toning — and `PIP_TEXT` is deleted. No component file changes.

---

## The call

| | Shipped | Called |
|---|---|---|
| `--b` (all six themes) | `#1E1B1A` | **`#98748F`** |
| vs. `--surface` | **1.01:1** (amonkhet, innistrad) – 1.08:1 (phyrexia) | 4.09:1 – 4.60:1 |
| vs. `--elevated` | 1.01:1 – 1.27:1 | 3.37:1 – 4.21:1 |
| vs. `--bg` | 1.09:1 – 1.15:1 | 4.65:1 – 4.88:1 |
| glyph ink | `--bg` on four pips, `--fg-body` on B via `PIP_TEXT` | `--bg` on all five, ≥ 4.65:1 |
| `PIP_TEXT` (`lightbox.tsx`) | one-off, one file | **deleted** |
| files touched | — | `globals.css` (6 value edits) + one deletion |

Four gates decide the value. The first two are why it is not darker; the third is why it is
this particular violet, and it is a shipped test rather than a judgement:

1. **≥ 3:1 against the lightest ground a pip lands on.** That is `--elevated` `#2D2E35`
   (Rune Frost), and it needs L ≥ 0.163.
2. **≥ 4.5:1 for a `--bg` glyph on the disc.** The binding case is **Innistrad's `#101314`**,
   the lightest `--bg` by luminance (L 0.00636; Rune Frost's `#121217` is bluer, not lighter,
   at 0.00699). Needs L ≥ 0.202 — the constraint that rules out every value still reading as
   "black". *R1's README named Rune Frost here; `CONTRAST-black-pip.md` §2 always said
   otherwise and it is the table that is right.*
3. **ΔE ≥ 0.100 from that theme's accent, per theme.** `src/lib/theme/contract.test.ts:145`,
   iterated over all five pips and all six themes. **This is the binding gate, and both earlier
   values failed it** — R1's neutral at 0.064, R2's 305° violet at 0.087, against Oil and Iron
   and Rune Frost. `#98748F` reaches **0.115** on both. It is also why "add a little hue" was
   never an answer on its own: the amount is fixed by a test, not by taste.
4. **ΔE ≥ 0.100 from every other pip.** 0.122, nearest `--r`.

   *The chroma budgets (≤0.02 surfaces, ≤0.04 borders, ≤0.03 text) do not apply to the WUBRG
   class — `--r` ships at C 0.138. R1's "achromatic, so the chroma gate is unaffected" answered
   a question that was never open.*

`#98748F` sits at L 0.2115 — R1's lightness to within 0.003 — with C 0.059 at hue 335: the hue
the palette had spare, black mana's conventional second colour, and **ΔE 0.115 from the nearest
of the six accents against a shipped floor of 0.100**. `#8E7792` clears the same gate at exactly
0.100 and is rejected for having no headroom — five of the six accents have moved at least once
already, and the themes handoff's own finding is that a value with no headroom fails in all six
the day one of them moves. Neither is distinguishable from the other at 9px; the canvas draws
both.

---

## States delivered

| # | Frame | Desktop | Phone |
|---|---|---|---|
| A | The defect at three grounds, before and after, side by side | ✓ | — (same tokens) |
| A3 | Why not a ring — the known ground and the art ground | ✓ | — |
| B | **All six themes**, before and after, on each theme's own `--surface` | ✓ | — (size-invariant) |
| C1 | Deck card — 12px pips, the Dimir pair | ✓ | ✓ (11px) |
| C2 | Mana cost — 26px pips with glyphs, three B in a row | ✓ | ✓ (22px) |
| C3 | Filter chips + `ColorPip` switch, including the 0.40-opacity unselected state | ✓ | — |
| C4 | Pips over card art — the ground a ring token cannot follow | ✓ | — |
| D | The diff: six value edits, one deletion | ✓ | ✓ |
| E | Token contract / a11y / what does not move | ✓ | ✓ |

---

## Decisions log

### 1. A lifted value, and **no ring** — because a ring cannot follow card art
The brief allowed a ring, a lift, or both. A ring is the more conservative-looking answer and
it is the wrong one, for a reason that is structural rather than aesthetic.

A ring only separates a disc from its ground if the ring contrasts with **the ground**. A ring
token therefore has to follow the ground, which is exactly what the availability pass found
when it wired `--pip-ring` to the row background (`--surface` → `--elevated-hover`) and noted
that hard-coding it leaves a hover hairline. That plumbing works on a row, because a row has a
background colour.

**Pips render over art in three places** — the commander detail art header, the deck card art
thumb, the card modal's blurred art wash — and there the ground is a photograph whose colour
changes per card. No token can follow it. So a ring answer is either "a ring everywhere except
the three surfaces where it matters most", or a per-surface override, which is the per-surface
patching the brief rules out.

A lifted disc has **no ground dependency at all**. That is the whole argument, and it is also
why the answer is one token: a ring is `--pip-ring` *plus* an assignment of it at every call
site.

**Rejected: both.** A ring on a lifted disc is a hairline around something already legible, on
22 reads across 15 component files, at sizes down to 9px. It buys nothing and it is a second token.

### 2. `--b` stops being near-black, and that is the substance of the call
This is the part to argue with if you are going to argue with anything.

A mana pip's job is **identity**: which of five colours is this. On a light canvas, black
identifies itself by being the darkest disc. On six canvases whose surfaces sit between
`#151317` and `#1E1F26`, "the darkest disc" is indistinguishable from a hole in the card, and
the product has been shipping a hole.

So the identification moves to the axis that is still available: **black is the only pip with
no hue.** White is the pale one, blue/red/green are hued, black is neutral at mid-lightness.
It is still the darkest of the five, sits 3.31:1 below `--w`, and is the only violet. Nothing else in
the family moves, so the set stays readable as a set.

The cost is honest and worth stating: **at a glance, in isolation, the new pip reads as a dark violet-grey rather than black.**
Beside the other four it reads black, and beside the other four is where it always renders —
identity pips come in colour-identity groups, and mana costs come in mana costs. A player who
sees a lone B pip sees it captioned (`Black`, `Dimir`, `×3 copies`) in every one of the
22 reads.

### 3. One hex for all six themes, not six tuned hexes
Four of the five WUBRG swatches are already byte-identical across the six theme blocks. The
fifth, `--g`, moved in exactly one theme and only because it collided with that theme's accent
(Phyrexia's oil-teal, ΔE 0.09).

`#98748F` carries the family's lowest chroma and collides with no accent — the
nearest is Innistrad's `#8AAFA1`, which differs in hue family and never renders adjacent, and neither
is ever drawn adjacent to the other. Toning it warm for Gilded Stone and cool for Neon Rain
would look considered and would put six values where the contract needs one, with six ways to
drift.

### 4. `PIP_TEXT` is deleted rather than promoted to a token
`PIP_TEXT` (`lightbox.tsx:~185`) is a per-colour ink map that exists for one reason: black's
disc was too dark for `--bg` ink, so black alone took `--fg-body`. Its own source comment says
the token contract has no pip-text key and that `--bg` is the pattern for a label on a coloured
field.

With the lift, `--bg` clears 4.5:1 on all five discs, so the map has nothing to compensate for.
Promoting it to `--pip-text` would ship a token whose value is `--bg` at every one of its five
keys.

**This also fixes `mana-pips.tsx` with no edit.** That file already gives all five WUBRG pips
`--bg` ink — which is why the `B` glyph is currently invisible on the card modal's mana cost,
a defect nobody logged because the whole disc was invisible too.

### 5. The generic `{n}` pip does not move, and is still distinguishable
`--border-dashed` (`#494037` in amonkhet) reads 2.5:1 darker than the lifted `--b`, they carry
different glyph inks (`--fg` vs `--bg`), and a generic pip's glyph is a digit while a colour
pip's is a letter. Three differences is enough; nothing here needs a fourth.

Worth knowing: this is the pair that gets closest after the change, so if `--border-dashed`
ever lifts, re-measure this pair rather than the black-on-surface one.

### 6. The unselected `ColorPip` is the state that most needed this
`ColorPip` renders unselected at `opacity: 0.40`. Composited on `--surface`, the shipped black
pip landed at **1.00:1** — a filter control with an option you cannot see, on `/collection`
and `/commanders`. At 40% the lifted value holds 1.74:1: not a contrast pass, but a visible
disc, and the control's affordance is carried by the brass selection ring and its `aria-label`,
neither of which changes.

### 7. Ownership dots, availability glyphs and gradients are untouched
`OwnershipDot` is `--success` / `--fg-locked` and never WUBRG. `AvailabilityGlyph` is
`--avail-*`. `commanderGradient` and `identityGradient` compose `var(--b)` and therefore pick
the new value up for free — including the two-colour split on `SuggestionTile`'s art fallback,
where a Dimir card previously faded from blue into nothing.

---

## Component notes

Hexes live only in `globals.css`. **No new token, no new hex beyond the one value, no new
motion class, no new component, no component edit.**

| Component | Spec |
|---|---|
| **WUBRG swatch (all sizes)** | `background: var(--w \| --u \| --b \| --r \| --g)`, `border-radius: 999px`. Sizes unchanged per call site: 9px (`rows-view`), 10px (spine, commander detail), 11/12px (deck card), 13px (`MetaField`), 12px (`MetaCell`), 15px (`ColorPip`), 22/26px (`ManaCost`). |
| **`--b`** | `#98748F` in `:root`/`[data-theme="amonkhet"]` and in the five other theme blocks. Identical value in all six. |
| **Pip glyph (WUBRG)** | `color: var(--bg)`, mono 12/13px, weight 600 — all five colours, no map. |
| **Pip glyph (generic `{n}`)** | Unchanged: `--border-dashed` disc, `--fg` glyph, weight 400. |
| **Seam shadow** | Unchanged wherever it ships (`inset 0 0 0 1px rgba(0,0,0,0.3–0.4)`). It is a seam against art, not a legibility device, and it is now a seam around something. |
| **`PIP_TEXT`** | **Deleted.** |

## Notes for engineering

- **`src/app/globals.css`: six `--b` declarations change value.** Nothing else in the file.
- **`src/components/commanders/lightbox.tsx`: delete `PIP_TEXT`** and pass `var(--bg)` for
  every WUBRG glyph. If amendment 4 lands first the whole file goes and this note is moot.
- **No other component file is touched.** All 22 reads across 15 component files read `WUBRG_COLOR`
  (`browse.ts:110-111`), which reads `var(--b)`.
- **Check the value-pinning tests.** `globals.test.ts`, `lib/theme/contract.test.ts` and
  `lib/theme/no-hex.test.ts` assert key presence and hex-literal hygiene rather than specific
  values, so none of them should break — but `globals.test.ts` is the one to look at first,
  and a snapshot of the parsed theme blocks would need updating.
- **`lib/theme/color.ts` chroma check:** `#98748F` is C 0.005 in OKLCH after quantisation.
  If a CI gate ever asserts "WUBRG swatches carry chroma", this value fails it — measure after
  quantisation, per the themes handoff's own finding.
- **No visual regression baselines exist for pips**, so this change is invisible to CI. The
  six-theme frame in the canvas is the reference.

## Gap report

1. **`--w` is now the outlier.** White at `#F4E9C4` reads 15.8:1 on `--surface` while the other
   four sit between 3.3 and 5.5. Not this amendment's business, but the family is no longer
   evenly spaced in lightness and someone will notice.
2. **The lifted pip at 0.40 opacity is 1.74:1, not 3:1.** `ColorPip`'s unselected state is
   below the non-text floor. It was 1.00:1, so this is a 90% improvement on a control that
   also carries a ring and a label — but if the audit wants 3:1 there, the fix is `opacity`
   `0.40 → 0.55` in `color-pip.tsx` (which reaches 2.18:1, still short), which is a second file and outside "one token".
3. **`--b` vs `--border-dashed` is the new tightest pair**, floor **2.23:1** in Screen Glow
   (`#3F4B55`), then Rune Frost at 2.31 — *not* amonkhet's 2.51, which R1 named. Lifted black
   disc vs. generic pip disc, rendered adjacent inside a single mana cost. Judged sufficient on four simultaneous differences (R2 adds hue: the generic disc is
   desaturated blue-grey, the black pip violet);
   flagged because it is the pair a future `--border-dashed` change would break.
4. **"Black reads grey in isolation" is a real taste cost**, taken deliberately (decision 2).
   The alternative is a ring, and the ring cannot follow art. If Product would rather keep a
   near-black disc and accept per-surface rings, that is a different amendment and it is
   larger than this one.
5. **No theme-picker miniature shows a pip.** The picker's chips preview chrome and accent
   only, so a future theme author gets no warning that WUBRG values are part of the palette.
6. **Phyrexia's `--g` precedent invites a `--b` exception.** Someone will eventually ask for a
   per-theme black. The answer in decision 3 is "the family is shared unless it collides with
   an accent", and this value sits ΔE 0.115 from the nearest of the six; state it once here so the next
   theme does not reopen it.

## Files
- `The 99 - Black Mana Pip.dc.html` — the canvas (this handoff's deliverable).
- `README.md` — this file.
- `CONTRAST-black-pip.md` — the measured ledger: 6 themes × 3 grounds × before/after, plus
  the glyph-ink pass and the two rejected candidate values.
- `black-pip · copy strings.ts` — string additions (both belong to amendment 4).
- `READINESS.md` — self-assessed readiness and what blocks a green.
- `brand/` — the locked brand sheet + brand README, copied in for self-containment.
- `support.js` — runtime for the HTML reference; not production code.
