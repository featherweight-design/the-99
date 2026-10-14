# READINESS — Commanders detail, "Full card" (R1)

**Self-assessed: 🟢 Green. Two items need a ruling; one is a copy change a player sees, the
other is an addition beyond the brief that can be dropped without touching anything else.**

## Needs a ruling — two items

1. **`Full card` → `Card details`.** The only player-visible change in this amendment, and it
   is the honest cost of pointing the control at a different surface. Design's position: a
   control labelled `Full card` that opens a details panel has lied, and the new label is the
   app's own phrase (the close button on the thing it opens reads *Close card details*).
   Keeping `Full card` costs nothing technically and is drawn in the canvas's rejected-labels
   panel. **If Product keeps the old label, the art-size regression becomes a genuine problem**
   rather than a trade — because then the surface is still promising a picture.

2. **The desktop art panel becoming a trigger** (README decision 6). This is more than the
   brief asked for. It exists because the desktop commander page has **no route to the printing
   picker at all**, on the one card players most want alternate art for. Reject it and nothing
   else in this amendment moves: the mobile call, the deletion and the label all stand alone.
   Cost of taking it: one wrapper on an existing element, no new affordance, no new copy.

## Called, not asked — flagged for the record

3. **`lightbox.tsx` and `lightbox.test.tsx` are deleted, not left unused.** 253 lines, most of
   which is a hand-drawn card frame for the no-art case that the modal covers with a gradient
   plus its own content. Leaving the file in the tree is how a codebase acquires two ways to
   show a card and a bug report about the wrong one.
4. **The sharp art goes 262px → 180px.** The one regression. Answered by the modal's blurred
   full-bleed wash (the lightbox's own device at 0.45 / blur(22px) rather than 0.28 / 3px) and
   by the text becoming real text. Drawn at both sizes in frame A so the audit can judge it
   rather than take the argument.
5. **`Tap anywhere to close` is deleted; the gesture is kept.** At 390px the modal is a
   full-screen sheet, so there is no visible backdrop for the sentence to describe.
6. **No sibling list, so Prev/Next renders `1 of 1`.** Passing the ranked commander list would
   let the modal page to a commander the page behind it is not about.
7. **No `Add` control in the modal on this route** — the derived constraint from the
   recommendations and synergy handoffs, unchanged.
8. **`PIP_TEXT` dies here as well as in amendment 1.** The two are independent and land in
   either order; whichever is second finds its work done.

## Not blocking, and worth reading before estimating

9. **The estimate is a deletion plus two props.** `CardModal`, `CardDetailProvider`,
   `PrintingRegion` and `ManaCost` are untouched; `detail.tsx:240` already mounts the provider.
   The only new code is `full-card-trigger.tsx` losing its state and gaining a
   `CardDetailTrigger`.
10. **The client payload shrinks.** `LightboxCommander` shipped five card fields on every
    commander-detail render for a surface most players never open; the modal fetches on click.
11. **A new wait appears on this route** — the fetch, ~150–400ms, already announced by the
    provider's live region. The lightbox opened instantly off props. Accepted; if it reads
    badly the fix belongs to the provider, not to this route.
12. **`getCardDetail` is route-agnostic and takes an oracle id, owned or not**, so no server
    work is needed. Commanders on this surface are owned by definition, so `You own ×1 copy` is
    the normal case — and `×1` is the dull case that earns its slot only when the copy is
    claimed, which is what the availability block says.
13. **Worth one eyes-on check against a real commander with no `imageUri`.** The gradient
    fallback is strictly less pretty than the drawn frame and strictly more informative; the
    frames assume that trade is fine and it should be looked at once with real data.
14. **Two `Escape` stages now exist** where the lightbox had one. Correct (the printing region
    is a disclosure inside a dialog) and shipped on four other routes.

## Not blocking

- No new token, no new hex, no new component, no new geometry, no new motion class, no new
  live region, no new server action, no schema change.
- Nothing in `src/components/cards/` changes.
- The chip's position, geometry, glyph, backdrop blur, hit box and full-band tap target are all
  unchanged — only its label.
- No visible affordance is added at desktop.
- Every a11y behaviour the lightbox had is kept, and four are gained (real text, the shared
  accessible name, the second Escape stage, `aria-labelledby` over a hand-written label).
- `useIsDesktop` is not needed; both widths open the same component.
- The parity table accounts for all 20 elements of the deleted file: 4 cut, 1 kept smaller,
  8 absorbed, 5 kept, plus 8 additions the lightbox had no row for.
