# Gap report: small items 7 (pod edit state)

Property table: `docs/superpowers/design-tables/small-items-pod-edit.md`, enumerated from the `Pod-Edit` board and README §7. Implementation: `src/components/social/pod-card.tsx`, `pod-menu.tsx`, `seat-art.tsx` and `pods-pane.tsx`.

## Verify (Agent 2)
- **States:** all reachable. These are owner at rest, non-owner at rest, editing, editing after a removal, only member left, failed removal, Escape and leaving the page.
- **Visual:** 16 rows mismatched. They are dispositioned below.

## Dispositions

### Fixed in this PR
- **16. Focus after a removal.** The board's rule is the next ✕, else Done. Removing the last ✕ in the row used to send focus back to the previous ✕. It now goes to Done. Pinned in `pod-card.test.tsx` and mutation-checked.

### The shipped card, outside item 7's scope
Item 7 adds an edit state to the shipped card and does not redraw it. The board's card is a stand-in for the Social R1 card, and its values differ from what ships in rows 1–5, 7–10 and 13–15:
- card radius, padding and gap;
- head gap and meta size;
- seat art height, radius and border;
- seat label ink;
- the Add tile's height and border;
- the spares row's height.

Those values come from the Social R1 handoff, which was built and reviewed against its own board. They are left as shipped. They go to Design as errata so the next board draws the card as built.

### The shipped ✕ disc
README §7 says each removable seat "shows the shipped ✕ disc". The board's 5px inset (row 11) and `rgba(20,17,14,.8)` fill (row 12) are stand-ins for it. The disc keeps its shipped 4px inset and `color-mix(var(--bg) 78%)` fill, which follows the theme where a fixed rgba would not.

### The `···` press
Row 6: the board draws a 32px desktop press; the shipped press is 44px at every width. This predates item 7. Edit now sits beside it at 32px on desktop, and the head stays one line. It is left as shipped and goes to Design as an erratum.

## Walk (scratch branch, 390x844 and 1300x900)
- At rest: no seat carries a ✕.
- Edit puts a ✕ on every seat but yours (2 of 3) and moves focus to the first ✕.
- The card's edge turns accent (an inset 1px `--accent`), and Done replaces Edit and `···`.
- Escape ends editing and focus returns to Edit.
- Press sizes:
  - Edit is 44x44 on a phone and 43x32 on desktop.
  - Done is 60x36 on a phone and 59x32 on desktop.
- No horizontal page scroll at either width.

VERDICT: 0 gaps remain inside item 7. The rows above that stay as shipped are recorded as errata for Design.
