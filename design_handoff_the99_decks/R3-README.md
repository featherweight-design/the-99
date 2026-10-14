# R3 — price on the buy tag (#291), the surface corrections

`design/design_handoff_the99_decks/` · 2026-09-05 · **new files only**

Closes R3's two items. The R2 derivation, the inverted failure mode, the run-health clause, the
`--fg-body` simplification and the token table are **accepted and not reopened**.

Canvas: `The 99 - Decks · Price Addendum (R3).dc.html`. R1 and R2 files are untouched; stale
drawings are recorded in §6.

**Verdict: 🟢 Green.** No decision is waiting on anyone.

**The one-line summary:** *the total was never the spine's to borrow.* Both corrections have the
same cause and the same fix — the price facts belong to the **Shopping filter**, which is what
scopes them, so they get their own strip and stop renting a line off a construct that is
deliberately desktop-only.

---

## 1. Item 1 → **the total and the provenance line leave the spine entirely**

Twice now I have attached a price fact to a header string I cited wrong: R1 invented
`8 cards you don't own`, R2 "corrected" it to `N owned · N you don't own`, which is
`consider-toolbar.tsx:38` — the Consider panel, a different surface. The builder's line is
**`54 owned · 8 to buy`** at `builder-spine.tsx:391`, and its comment records it as desktop-only on
purpose: on mobile `0 owned · 0 to buy` restates the `0 / 99` directly above it.

**The right correction is not a third string. It is to stop borrowing the line.**

`builder-spine.tsx:391` stays **exactly as shipped** — same words, same desktop-only condition,
untouched. The two things this pass adds get their own construct:

> **The price strip** — one element, directly under the `All / Shopping` filter pills, rendered
> **only while Shopping is the active filter**, identical at both widths.

```
$84.25 · 6 of 8 priced
prices from ManaPool · last checked Monday
```

**Why this is better than either string I cited.** The total is scoped by the filter, not by the
deck: it is the sum of *what this filter is showing*. Hanging it off the spine made it look like a
property of the deck, which is what pulled R1 into inventing a deck-level noun for it in the first
place. Put it where its scope is and three things fall out for free:

- **Item 3's ruling re-derives itself.** "No total on the `All` header" is no longer a rule to
  remember — the strip *is* the Shopping filter's, so switching to `All` removes it the same way
  switching removes the rows it summed.
- **One home, both densities.** No per-width disagreement about where a price lives, which is the
  constraint ruling 1 has been defending since R1.
- **The spine's mobile omission is preserved rather than fought.** That comment is a considered
  decision about restatement; a pass that needed the line at phone width would be overturning it
  sideways, and this one doesn't need it at all.

**At phone width the strip is where the total lives, full stop.** Two lines, left-aligned, under
the pills. It is the only price aggregate on the screen, so nothing restates anything: the spine's
line isn't there, and the strip is.

**At desktop the strip sits in the same place**, and the spine's `8 to buy` is above it. Those two
`8`s are one number said twice, which needs one adjustment:

> **When every card is priced, the clause drops entirely** — the strip renders `$129.50` and
> nothing else.

R1 had it render `$129.50 · 8 cards`. That was a third `8` on a screen where the filter pill
(`Shopping · 8`) and the spine (`8 to buy`) already say it. The clause exists to name what is
**missing**; when nothing is, the count is already on screen twice and the figure is the only new
fact. `6 of 8 priced` stays as written — the `8` there is a denominator doing work.

**The "these are behind" clause rides the strip's second line**, both widths, unchanged from R2 in
every other respect: figures stay, total stays, `--fg-locked`, no banner, third clause and last.

## 2. Item 2 → **rename the sort. `Cheapest first` becomes `Cheapest to cast`.**

`consider-toolbar.tsx:57` offers `Cheapest first`; `consider-panel.tsx:109` sorts on `manaValue`.
It sits directly above the tiles this pass gives dollar figures to. **One toolbar, one word, two
currencies** — and the audit is right that it also undercuts the fail-quiet argument, which rests
on *nothing ranks, filters or sorts on price*.

**Renamed, not shared.** `Cheapest to cast` — two words added, the shipped word kept.

- **It keeps what the label earned.** Players who learned `Cheapest first` recognise it; the
  addition disambiguates rather than replacing.
- **A dollar figure is never "to cast."** The collision becomes impossible in the only phrase where
  it could occur, without importing jargon: `Lowest mana value` is the precise name and the wrong
  register for this voice.
- **Fail-quiet survives verbatim.** After the rename, nothing in the app ranks, filters or sorts on
  price — so R1's argument stands as written rather than needing a caveat. That is the real reason
  to rename rather than annotate: a caveat on a locked argument is a slow leak.

**Sharing the word is declined, and there is precedent.** The availability pass turned down
`available` as a one-word swap because `buy` and the availability marker appear on the same tile
four millimetres apart, and "available next to buy reads as purchasable." This is the same
collision with the currencies reversed: a price-shaped word above a price-shaped figure, on the
same shelf. One vocabulary per concept, and money already has this one.

## 3. The tile scrim → **raise it to 92%, unconditionally, on the tile tag only**

Thank you for the measurements. Over normal dark art the tag is fine in all six. The worst case —
the 82% scrim over pure-white art — is `amonkhet 5.18 · phyrexia 4.66 · duskmourn 4.50 ·
kamigawa 4.48 · kaldheim 4.27 · innistrad 4.31`, so **kaldheim, innistrad and kamigawa sit at or
under AA at 9px over the brightest art a card can have.**

**Raise the scrim from 82% to 92%.** The reason is exactly the one the audit names:

> **A word is recognised; a figure is read.** `buy` survives a poor ratio because a player matches
> its shape and its colour and its position. `$45.00` is read digit by digit, and a misread digit
> is a wrong number in somebody's budget. The tail is the first thing on that scrim that has to be
> read rather than recognised, so the scrim it inherited is no longer sufficient — pre-existing or
> not.

**Unconditionally, and not only when a figure renders.** A scrim that changes because of what is
written on it is a primitive deciding how to look based on its own content — the same objection R5
made to a conditional pip ring, and the same answer: one value, no state. State 4's bare tag gets a
slightly darker scrim it does not need, at a cost of nothing.

**10 points, and no further.** The scrim is already near-opaque; the delta is invisible over normal
art and only does work over the bright art where it is needed. A larger step, or an opaque plate,
would start reading as a chip glued to the card rather than a label on it — and the tag's whole
position in the tile anatomy depends on it looking like part of the art's furniture.

**Nothing else moves:** the `--warning` inset stays at 50%, the inks stay as the R2 token table has
them, the position and the `pointer-events: none` are untouched.

**One ask, for the ledger:** the same worst-case figures recomputed at 92%. I expect all six to land
between the normal-art column and AA with room, but the number should be measured and written down
rather than expected.

## 4. The derivation is now total

Closed with one word. `absent` stops being a condition and becomes the **default branch**:

```
priced   = live && cents !== null
foilOnly = live && cents === null && (foilCents ?? etchedCents) !== null
soldOut  = row exists && !live
absent   = default                     ← everything else, including a live row with no price at all
```

A live row with all three price columns null is a row that tells us nothing about buying the card,
which is what the bare tag means. It counts as unpriced in the strip's denominator. Zero such rows
in staging; total now regardless.

## 5. Ratified, eng-resolvable

- **Both copies of the claim, swept with one key.** `export-dialog.tsx:397` and the mobile note at
  `:425` (`names only · pricing planned`) take the same `export.pricingNote` —
  `Prices show in the app · exports copy names only`. Two call sites, one live value; do not leave
  the mobile one behind.
- **The apostrophe is curly.** `don’t` throughout, matching shipped. Noted for every string this
  pass touches.
- **The six themes are `amonkhet · kamigawa · innistrad · phyrexia · duskmourn · kaldheim`.** "Neon
  Rain" is not among them; it came out of R4's theme flag and I repeated it without checking.
  Withdrawn from my prose — R4's own text is not mine to correct, but the shape of its flag still
  holds under the real names, and the measurements above supersede the guess anyway.

## 6. Stale drawings, recorded

R1 and R2 are kept as the record. Stale, and drawn correctly in the R3 canvas:

1. **Every Shopping header in both canvases** — R1's invented string and R2's Consider-panel one.
   The spine's real line is `54 owned · 8 to buy`, desktop-only, and this pass no longer touches it.
2. **The total's position in both canvases** — drawn inside a spine-attached header box. It is now
   a filter-scoped strip under the pills.
3. **`$129.50 · 8 cards`** (R1 item 6, all-priced state) — the clause now drops entirely.
4. **The tile scrim at 82%** in every tile drawn in R1 and R2.
5. **"Neon Rain"** in R2's item 4 panel and its README §4.

`ADDENDUM-README.md` gap §2 stays retired. R2's one open ask of eng is answered and replaced by the
92% re-measure above.

## Files

- `The 99 - Decks · Price Addendum (R3).dc.html` — the price strip at both widths, the renamed
  sort in the toolbar, the scrim comparison, the total derivation.
- `R3-README.md` — this file.
- `R3-READINESS.md` — the verdict.

R1 and R2 documents and canvases, and the shipped Decks handoff: **untouched.**
