# READINESS — Card availability (#43), R2 addendum

**Verdict: 🟢 Green.** R1's two blockers are closed, the four provenance corrections are landed,
and the three rulings the audit asked for are made and drawn. No decision is waiting on anyone.

R1's canvas is unchanged. This addendum adds rulings and a degraded state; it redraws nothing.

## What the audit asked, and what R2 answers

| Ask | Ruling |
|---|---|
| **A · Does the rank numeral recompute under `What's free`?** | **Yes**, from a second global rank map. The shipped invariant is about *filtering* — which changes no score — and this changes the score itself. Frozen numerals would render `3, 4, 1, 2` down the page. |
| **A · Global or post-filter?** | **Global**, both maps, built before any colour filter. So `filtering never renumbers` survives verbatim in both modes. Drawn with a skipped numeral. |
| **A · Does flipping the toggle reset the window?** | **Yes** — `shown → REVEAL_STEP`, same as a filter change, because different cards occupy the revealed range. |
| **A · Does the delta survive windowing?** | **It was never at risk.** `↓21 from 82` compares a card to its own other score, never to another row. Window-independent by construction. |
| **B · `rowAria`** | Respecified as the **shipped 3-arg signature plus one optional trailing argument**. A free card produces the byte-identical shipped string. |
| **§6 · degraded read** | **Reuses `DegradedBanner` on `/commanders`** and disables the `What's free` segment; **fails quiet on the builder surfaces**. A banner is owed only where the failure changes what a control means. |

## Corrections landed

All four, with the reasoning restated rather than just patched — see `ADDENDUM-README.md` for the
ledger. The one worth a second look: **brass is AA and AAA for normal text**, and R1's phrasing
could have been read as a general rule against brass text. It isn't one. `--avail-hard-fg` is kept
for a *size* reason (8.5px mono on a scrim over card art), and the glyph stays `--brass`.

## Open, non-blocking

- **Gap §10 — a commander can vanish on the flip.** Rank 3 under `Everything I own` can be rank 60
  under `What's free`, outside batch 1. Accepted: the toggle is telling the truth and the window
  count says there is more. Revisit if beta users report losing their place.
- **Gap §11 — two degraded reads co-occurring** (EDHREC *and* availability) is one banner, two
  sentences, one `Retry now`. Copy is written (`degraded.bodyWithSynergy`); specified, not drawn.
- **Gap §2 — deck names have no length budget.** Unchanged from R1 and still the most likely
  real-world snag: `0 free — in Atraxa` fits, a 38-character deck name does not. A product call
  about whether the name truncates or drops.
- **The `was 1st` annotation** in the window-reset drawing is optional and I would ship without it.
- **The desktop toolbar is now three controls wide.** Fits at 1300px; the row most likely to break
  first at a narrow desktop width, and this pass is what pushed it there.

## Unchanged and still verified

Silence end to end · nothing blocked · nothing asserting physical location · one status vocabulary ·
AA without colour · zero net motion · no new dependency · four derived tokens, no new hues.

Decision 5 — the two ownership controls survive because they never meet — stands as written.
