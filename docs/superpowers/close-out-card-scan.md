# Close-out: Card scanning

**Walked:** 2026-10-18, on `main` with the plan's PRs merged (#1908, #1906 2a, #1910 2b, #1912 2c, #1915, #1926,
#1929) and the later rulings and fixes (#1941, #1942, #1961, #1968, #1969, #1978), then again after the close-out's own
fixes (#2087).

**Where.** A scratch branch made from local-dev, migrated to `main`'s schema. `next start` ran with `CARD_SCAN_ENABLED`
and `COLLECTION_EDIT_ENABLED` on. The sheet is `docs/superpowers/inventories/card-scan-closeout.json` (#1980):
- Chromium's fake camera plays Sol Ring.
- The match endpoint is answered by the inventory's `mock`, which stages each state without an index: sure (many
  printings and one), not sure, and not ready.
- The photos row picks three card images from `SCAN_PHOTOS_DIR`.
- Every row stops before Save, so nothing is written.

Plan: `docs/superpowers/plans/2026-10-16-card-scan.md`. Handoff: `design/design_handoff_the99_card_scan/`, with the
tables `docs/superpowers/design-tables/card-scan-viewfinder.md`, `card-scan-review.md` and `card-scan-photos.md`.

## Route inventory

The plan carries no route × viewport table, so this one is built from the surfaces and the files that open the sheet.

| Surface | 390 | 1300 |
|---|---|---|
| `/collection`, Add cards, the Scan press | ✓ `review` | ✓ `stop` |
| The viewfinder (phone) and webcam panel (desktop): Auto, Normal with many printings and with one, not sure, not ready | ✓ | ✓ |
| Choose photos, each read | ✓ | ✓ |
| The empty collection's sheet (`collection-empty-doors.tsx`) | not photographed | not photographed |
| Home's first run (`first-run-step-one.tsx`) | not photographed | not photographed |

The last two open the same sheet and scanner as `/collection`'s Add cards.

**Photographed by** `scripts/contact-sheet.mjs` over `card-scan-closeout.json`: 14 of 14 cells. `review` is phone-only and
`stop` is desktop-only.

## Design review against the whole brief

Every row of the three tables matches, except these. Fixed in #2087:
- **Desktop printing step.** With many printings, the fourth tile and the actions were clipped under the 250px feed.
  The guess's `aria-live` wrapper was a plain block, so the panel's
  `min-h-0` never took effect. It is now a flex column on desktop, the feed keeps its 250px and the tile box gives up
  height first. Re-photographed at 1300: Add this printing and Not this card are in view, and the intro, the set search
  and the further tiles are reached by scrolling the box. The phone is unchanged.
- **Status line.** "✓ On the list · ×1" no longer wraps on desktop.
- **Held Save** is `aria-disabled` and stays in the tab order, as the review table says. A press while held does
  nothing.
- **Small drifts.** Six 2px spacing and size drifts on the review sheet now match their rows.

Left as shipped:
- **The photo tile ground** is `--elevated`. The table records `#2A241C` as drawn, and no token equals it.
- **The receipt** (no tick disc, a 19px title) is the shared Added receipt, which predates scanning.
- **The phone search placeholder** is cut off beside the Scan press ("Search any card by nar"). That is copy, for
  `/copy-review`.
- **Not ready** keeps the outline and "Show a card to the camera" under its notice, and places the notice differently
  at the two widths. There is no design for the state (#1969). It goes to Design.
- **The sleeve line** cannot be reached: the code passes `sleeves: false`, because there is no sheen detector. The
  viewfinder gap report accepted this.

## States not photographed

- **Need a real camera and the real index. For Hugh, on a device against staging:**
  - V2 unsure
  - V4 held
  - V5 flip
  - V7 to V9, dark and light
  - R2, a second copy
  - the live sure gate
- **Reachable in code, not staged by the inventory:**
  - the camera blocked
  - V1, looking with nothing in view
  - V3, sure with a press
  - the L2 fix
  - L3, the printing step from the list
  - L4, saved
  - a not-sure photo row with its top three
  - R4, the combined notice
- **Dropped on purpose.** D1 to D5, the index download, went when matching moved to the server.

## About entry

**Owed, and now scheduled.** The plan deferred it until the About redesign (plan PR 6). The handoff already drafts it:
`about · scanning your cards.ts` (id `card-scan`, chapter 01, after `collection-add`) and its board `R1 - About-Entry.dc.html`
(`STATES-card-scan.md`, A1). On 2026-10-18 the orchestrator added it to the launch-end About batch as entry 6 of
`2026-10-18-about-launch-entries.md`, reusing that draft, at `since: 16`.
