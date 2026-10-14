# The card mark — handoff package (R1, Round 1 of 5)

**Canvas:** `The 99 - The Card Mark.dc.html` — three turns of exploration, newest at top.
**Adopted: `3d`.** Everything above Turn 3 is superseded history, kept for the audit trail.

**Brief:** `docs/superpowers/design-briefs/2026-09-19-the-card-mark.md` on `main`.
**Self-assessed:** 🟢 Green, one data dependency (see `READINESS.md`).

## The mark in one line

Three solid glyphs — **bolt** (Game Changer), **peak stripped** (mass land denial), **turn again**
(extra turns) — **bare, no container**, in one theme-independent ink `--fact #8FA6BE`, lit by a
static drop-shadow glow. The ink says *a bracket fact is present*; the glyph says *which one*; the
key on the page says what it means.

## What is in this folder

| File | What it is |
|---|---|
| `The 99 - The Card Mark.dc.html` | The canvas. Turn 3 is the adopted design; Turns 2 and 1 are history. `theme` switches amonkhet / kamigawa in Tweaks. |
| `README.md` | The four calls (§5), placement surface by surface, the engineering ledger, and what was rejected. **Start here.** |
| `STATES-card-mark.md` | Six state matrices — decklist row, collection tile, collection row, modal, key, tooltip — at 390px and desktop. |
| `CONTRAST-the-card-mark.md` | §3's measurement, done before the build. Four grounds × two themes, weakest **6.7:1**; plus the distinctness pass against seven neighbouring marks. |
| `card-mark · copy strings.ts` | Every string, with reasoning and rejected alternates inline. Three quoted names, one heading, three tooltips. |
| `READINESS.md` | The one dependency, twelve things called rather than asked, and the engineering list in dependency order. |
| `assets/` | The three glyphs as standalone SVGs. `currentColor` ink; the glow is applied by the caller, not baked in. |
| `brand/` | The brand sheet, for token names and theme values. Reference only — not reopened by this round. |

## Reading order for engineering

1. `README.md` §A (the mark) and §B (placement) — what to build and where it goes.
2. `STATES-card-mark.md` — the matrices you implement against.
3. `READINESS.md` — the engineering list in dependency order, and the guardrails.
4. `card-mark · copy strings.ts` — copy in, verbatim.

## The three things most likely to get broken in build

1. **Do not put the mark in a box.** Boxed means *about your copies*; bare means *about the card*.
   Tidying it into `CARD_TILE_SLOT_BOX` erases that in one edit.
2. **One ink for all three, never one per fact.** The glyph distinguishes; the colour classifies.
3. **The key ships in the same release.** A glyph without its gloss is the retired deck-status
   design. The tooltip does not substitute — it does not exist on touch.

## Open for the reviewer

`#8FA6BE` is a new token, cool against six warm status inks. **Kaldheim is the one theme to
eyeball in build** — the app's only cool accent and the nearest neighbour to the ink. Marks and
accent elements never sit adjacent, so the risk is tonal rather than confusable.
