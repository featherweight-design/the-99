# READINESS · Deck page loading skeleton (flip and open)

**Verdict: Green.** R1 approved by Hugh 2026-11-21: keep both, A the build and B its fallback; also shown when opening a deck. Build from README.md, one PR, phone and desktop together.

## Rulings
- A (header lands at once) is the build; B (all shapes) is its fallback, drawn whenever the header facts are not in hand, and the whole build if they cannot reach the loading screen.
- Shown on every open of the reader's own deck, not only a flip (README §1 table). Precons, friend decks and sub-routes unchanged.

## Engineering notes (settled by the drawings)
- **E1 Facts.** Widen `FlipDeck` (`src/lib/decks/flip.ts`) with `commanderName`, `commanderColorIdentity`, `commanderArtCropUri`, partner name/colours, `statusPill`, `built`, all already in `listDecksWithStats` rows (`allDecks` in `src/app/decks/[id]/page.tsx`). No new query.
- **E2 Hand-off.** `loading.tsx` cannot take props: the press (strip, ←/→, `DeckCard`, `ResumeDecks`) writes a one-shot sessionStorage entry `{to, header, place?}` before navigating; `loading.tsx` becomes a client component that draws A when `to` matches the route id, else B. Clear it when the page lands.
- **E3 Strip.** On a flip the entry carries `k, n, caption, href, prev, next` so the strip draws its place and stays live; otherwise the shipped pre-read strip (left link only) holds the row.
- **E4 Tab.** The body's tab follows `?tab=` from the target URL.
- **E5 Reuse.** Header markup from `SpineMobile` / `SpineDesktop` (extract a presentational band rather than forking); body shapes from `ui/tile-skeleton.tsx` (`BAR`) and the precons skeleton's pattern.

## Flags
- No migration, no model call, no spend, no email. No new feature switch: it replaces a loading screen.
- Copy DRAFT: run /copy-review on the two status lines.
