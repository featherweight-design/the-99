# Addendum — Card availability (#43), R2

R1 audited 🟡 Yellow. Both blockers are closed, four provenance corrections landed, and the audit
asked for three rulings. This document records only what **changed or was added**; R1's
`README.md` holds the seven original calls and remains accurate everywhere it isn't contradicted
here.

Canvas: `The 99 - Card Availability Addendum.dc.html`.
**Nothing in R1's marker, states, surfaces or copy is redrawn.**

## Corrections landed

| Item | R1 said | Corrected to |
|---|---|---|
| Light theme | "and take a light-theme pair there" | **Clause deleted.** One `:root`, no `color-scheme`. The two new literals are single-value like every other token. |
| Brass contrast | "brass itself is not AA as small text" — wrong, and dangerous read as a general rule | **Brass is AAA for normal text** — 7.5:1 on `--surface`, 7.84:1 on `--bg`. `--avail-hard-fg` is kept for a **size** reason, restated below. |
| Copy line ref | `decks-builder.ts:158` | `decks-builder.ts:197`, string unchanged. Fixed in README and copy file. |
| Surface token | contrast quoted against `#1A160F` | `#1A160F` is `--surface-rail`; tiles and rows are `--surface #1E1A15`. Figures **recomputed, not adjusted** — the repoint costs about 2%, and everything clears AAA. |

**Why `--avail-hard-fg` survives correction 2.** Not because brass fails — brass passes
comfortably and should keep being used as text. The reason is size, not hue: the tile chip label
is 8.5px mono on an `rgba(11,9,7,0.9)` scrim *over card art* rather than on a flat token, and 8.5px
is below the 14px threshold whatever the ratio. **The glyph itself stays `--brass`.** Nobody should
read this pass as a reason to replace brass text anywhere.

Restated contrast against `--surface #1E1A15` — **all five clear AAA for normal text, brass
included**, so the table states the correction rather than quietly undercutting it: `#E8CE93` ≈
11.8:1 · `#E9917A` ≈ 7.6:1 · `#C6B79A` ≈ 9.2:1 · brass glyph ≈ **7.5:1** · `#C6533F`
glyph-and-border only, never text. Figures recomputed from the hexes, not carried down from R1's.

**Design tables** (supplied by the audit — rows superseded): `commanders.md` §Evidence column,
§"Order: Fit ↓ · fixed", §Filter pip row wrapper, §Fit column, §Score row; `decks.md`
§Decklist Row; `add-panel.md` §4c / §4e / §4g.

---

## A1 · The rank numeral **recomputes** under `What's free`, and is still **global**

Two rank maps. Each is built once over the **full candidate set**, from that mode's base
ordering; which one is in play follows `?avail=`.

**Why recompute, when the shipped invariant says filtering must never renumber?** Because the
invariant is about *filtering*, and this isn't filtering. A filter hides rows without changing any
score — renumbering there would be a lie, since the card's standing among all 214 hasn't moved.
`Score against` changes the score itself: under `What's free`, Kykar genuinely *is* the third-best
thing this player can build right now. The numeral names position in the ranking on screen, so it
has to agree with it.

The alternative is unreadable: frozen numerals render `3, 4, 1, 2` down the page — a list whose
numbers contradict its own order. Worse than either behaviour alone.

**Global, never post-filter.** Both maps are built before any colour filter applies, so the
shipped rule survives verbatim in both modes: **filtering never renumbers.** Drawn — the third
column of the numeral ledger shows `2, 3, 4` with a gap where rank 1 was filtered out.

**`Order: Fit ↓ · fixed` stays literally true** and needs no edit. The order *rule* is Fit
descending in both modes and there is still no ordering control; what changed is the measurement,
not the sort. If the label ever reads as a promise that numerals are frozen, the fix is the label.

## A2 · Flipping `Score against` **resets the window**

`shown → REVEAL_STEP`, remaining recomputed against the current result length — the same
behaviour as a colour-filter change, because it is the same class of event. Windowing's own rule
already covers it: the window is a property of the current result set, not of the session, and a
re-rank produces a new result set in the only sense that matters — **different cards occupy the
revealed range.** Keeping `shown = 50` would hand the player fifty *different* commanders with no
signal that the set beneath them had changed.

Live region on flip: `"Re-ranked by what's free. Showing 25 of 214 commanders."`

**The delta needs no anchor in the list.** `↓21 from 82` compares a card to *itself* — its own two
scores — never to another row, so it is window-independent by construction: correct at rank 3 or
rank 200, revealed or not, filtered or not. Nothing to fix.

**One accepted cost.** A commander at rank 3 under `Everything I own` can land at rank 60 under
`What's free`, outside the first batch, so it vanishes on the flip. That is the toggle telling the
truth, and `25 shown · 189 more below` says there is more. Auto-revealing far enough to keep a
previously-seen card visible would be a new windowing pattern — not worth it for R2. Gap §10.

The `was 1st` annotation in the drawing is **optional and I'd ship without it**; it's there to show
what the reset costs. The one thing in this addendum I wouldn't defend hard.

## B · `rowAria` — the clause **joins**, it does not supplant

R1 was wrong. It specified a 3-argument replacement that dropped `typeLine` from every Consider
row's accessible name. Respecified as the shipped signature plus one optional trailing argument:

```ts
rowAria: (name, typeLine, owned: boolean, availability?: string | null) =>
  `${name}, ${typeLine}, ${owned ? 'owned' : 'not owned'}`
  + (availability ? `, ${availability}` : '')
```

→ `"Cyclonic Rift, Instant, owned, no free copies; this one is on your Atraxa list"`
→ `"Swords to Plowshares, Instant, owned"` — free state, no fourth argument, byte-identical to
shipped.

Three properties: the first three arguments and their order are untouched, so existing call sites
compile and behave identically; `owned` stays a boolean, because the marker's clause carries its
own counts; and a free card produces the **exact shipped string** — the accessible-name form of
"silence is the default".

`availability` is one of the `marker.*Aria` strings already in the copy file, or `null`. It is
prose, not the visual label: the eye reads `0 free — in Atraxa`, the ear hears *"no free copies;
this one is on your Atraxa list"* — the same reason the diamond is `aria-hidden`. Applies to the
decklist row identically; only the caller differs.

## Gap §6 closed · a failed availability read

**On `/commanders`: reuse the shipped `DegradedBanner`** — amber left border, `Retry now`,
unchanged form, its own message. Availability folds into the same query, so a failure that would
already have shown a banner shows this one instead.

**Because on this surface, quiet failure lies.** A silent fallback would leave `What's free`
selectable and produce scores identical to `Everything I own` — the player would read "nothing you
own is committed" from a network error. So the free segment is **disabled and struck**, selection
reverts to `Everything I own`, and `?avail=free` is honoured again after a successful retry.

**On the builder surfaces: genuinely quiet.** Consider tiles, decklist rows and quick add have no
banner, no recs query, and nothing that changes meaning — the marker is pure annotation there, so
its absence degrades to exactly the silent state a player with no commitments sees. Never block,
and never a banner over a working list.

The distinction is load-bearing, so plainly: **a banner is owed wherever the failure changes what
a control means. Nowhere else.**

Both reads down at once — EDHREC *and* availability — is **one banner, two sentences, one
`Retry now`**, never two stacked. Copy is in the file as `degraded.bodyWithSynergy`; specified,
not drawn. Gap §11.

## Files touched in R2

- `The 99 - Card Availability Addendum.dc.html` — new: correction ledger, numeral ledger, window
  reset, `rowAria` respec, degraded state.
- `README.md` — four corrections landed inline; gaps §6, §7 and §9 struck and closed; §10 and §11
  added. *(A first bulk edit silently no-op'd and was re-applied with validated edits at the end of
  R2 — an audit snapshot taken between the two showed R1's text. Verify at `README.md:229`: the
  light-theme instruction is gone and "Brass is AAA" reads at `:232`.)*
- `availability · copy strings.ts` — line ref fixed; `quantity.rowAria` replaced with the extended
  `rowAria`; new `degraded` block.
- `READINESS.md` — marked superseded by `ADDENDUM-READINESS.md`; stale line ref annotated.
- `The 99 - Card Availability.dc.html` — contrast figures in the a11y panel only. Otherwise
  **unchanged**; no state redrawn in R2 or R3.

## R3

Ledger only. Gaps §7 and §9 restated as **verified engineering-side** — all design tables are in
the tree, and every token name, line reference and component shape has been checked against `src/`.
Nothing in this handoff is reconstructed any more. No canvas touched.
