# Card details carousel (H23) — build plan

Source of truth: `docs/superpowers/design-briefs/2026-10-02-card-details-carousel.md`, and the
merged handoff `design/design_handoff_the99_card_carousel/` (README.md, READINESS.md,
STATES-card-carousel.md, `card-carousel · copy strings.ts`). Status: **plan APPROVED (Hugh, 2026-10-03)**; the About ruling of the same day is in PR 4 below.
Phone = R2 (`PhoneHero.dc.html`, frames H1–H6). Desktop = R1 (`The 99 - Card Carousel.dc.html`,
D1–D5). `PhoneSheet.dc.html` (R1 phone, P1–P7) is superseded and kept for the record only.

Read with this plan: `src/components/cards/card-modal.tsx`, `src/components/cards/
card-detail-provider.tsx`, `src/lib/a11y/dialog.ts`, `src/lib/copy/about.ts` (`card-detail` entry,
id `'card-detail'`, `src/lib/copy/about.ts:248-256`).

## Why this is bigger than the handoff's own PR count implies

The handoff describes a modal enhancement. The modal is shared app-wide: `<CardDetailProvider>`
is mounted in ten files (`app/decks/new/choose/page.tsx`, `commanders/detail.tsx`,
`about/ch01-figures.tsx` (twelve sites on its own), `collection/collection-client.tsx`,
`intake/hand-off-answers.tsx`, `decks/proxy-list-view.tsx`, `decks/review-changes.tsx`,
`decks/update-diff.tsx`, `sets/set-grid-client.tsx`, `decks/builder-shell.tsx`), 21 sites in all,
and consumed by many more through `useCardDetail` / `CardDetailTrigger` (`collection/browser.tsx`,
`commanders/full-card-trigger.tsx`, `decks/change-commander-context.tsx` among them). This is not
a route-scoped feature — it is a change to a provider's public contract, consumed everywhere a
card opens.

**The provider's `open()` and `setSiblings()` currently take `siblings: string[]`** (oracle ids
only — the `open` and `setSiblings` members of `CardDetailContextValue`). Openers that currently
hand the provider an id list include `collection/browser.tsx`, `sets/set-grid-view.tsx`, and the
decklist, whose list is built in `decks/decklist.tsx` (`orderedIds`, `shoppingOrderedIds`) and
passed down through `decklist-group.tsx` to `decklist-row.tsx`. None of them pass per-sibling art or color identity today; `opts.art`
only ever carries the art for the **single card being opened**, not its neighbors. Note 2 in the
handoff's README ("Openers that already ship images... pass `{oracleId, imageUri,
colorIdentity}`") is **not yet true of any caller** — READINESS correctly flags this as "Needs
openers," but the scope is: change `siblings` from `string[]` to a richer shape (or add a
parallel lookup) and update every opener that has image/identity data at hand, while openers
that don't fall back to `identityGradient` or the `--elevated` plate per the handoff's note 2.

**Openers with art at hand** (the pre-open pass found the first list short): the decklist
(`decks/decklist.tsx`), `collection/browser.tsx`, `sets/set-grid-view.tsx`, the Consider tiles
(`decks/suggestion-tile.tsx`), the Card view (`decks/deck-card-tile.tsx`), the top-off list
(`decks/top-off-list.tsx`), the update diff (`decks/update-diff-row.tsx`), the stand-ins sheet
(`decks/stand-ins-sheet.tsx`), and the commander page's synergy and coverage lists
(`commanders/synergy-row.tsx`, `commanders/coverage-chip.tsx`). Each passes its list's own art and
identity. Every other opener passes bare ids, which stay valid.

## PR boundaries

Repo rule: split anything over ~20 files or ~800 runtime lines; no stacked PRs (AGENTS.md /
pr-review skill). Given the fourteen-mount-point blast radius, this splits into four PRs by
**kind**, not by surface — each is independently shippable and independently reviewable:

### PR 1 — Provider seam + sibling art plumbing (no visible behavior change)
- Add the wrapper component above `CardModal` inside `card-detail-provider.tsx` that will own the
  strip, the glide, and the arrival announcement (README note 1). For this PR it is a no-op pass-
  through — existing modal rendering unchanged — so it can land and be typechecked/tested without
  any visual diff.
- Change `siblings` from `string[]` to a shape carrying `{oracleId, imageUri?, colorIdentity?}`
  per entry (or add a sibling lookup map alongside the id list — pick whichever keeps `open()`'s
  signature smallest; either way `setSiblings` must accept the same shape).
- Update the openers with art at hand (listed above). The sibling type is `string |
  {oracleId, name?, imageUri?, colorIdentity?}`, so a bare-id opener (search results,
  `about/ch01-figures.tsx`, a commander opened alone) needs no change and falls back to
  `identityGradient`/`--elevated` per note 2. Do not force-fetch art for those.
- Prefetch the two neighbors' detail on arrival (README note 2, "Today nothing reads ahead") —
  reuse the existing `prefetchCard`/`useCardIntent` machinery already proven by
  `probe:card-prefetch`; this is a new *caller* of it, not new fetch logic.
- Move the two shipped inline aria-labels (`Previous card` / `Next card`) to the copy keys in
  `card-carousel · copy strings.ts`.
- Est. size: ~14-16 files (provider, the openers above, copy), under the 20-file ceiling; the
  opener edits are each a few lines.
- **The neighbor prefetch changes what `probe:card-prefetch` counts**: an opened card now reads
  its neighbors, so that probe's "reads a card ONCE" and "passing over reads nothing" checks must
  tell a neighbor read (after arrival) from an intent read (before a press). Extend it in this PR.

### PR 2 — Desktop: neighbors, arrow keys, ends, one/two (R1 stands)
- Draw the two scaled-down neighbor cards on the backdrop at ≥ 1252px (168×235 at .55, 24px off
  the modal, name in 12.5px `--fg-muted`), wired through PR 1's sibling art.
- `← / →` paging while focus is anywhere in the dialog except the printing search input, the
  printing radiogroup, and the zoom region (`useDialogA11y`, `card-modal.tsx:969`).
- Ends: both desktop controls go `aria-disabled` (not `disabled`) at an end, per call #5 — this
  is a change to the existing footer at `card-modal.tsx:1908-1944`, not new markup.
- One/two: a list of one drops `1 of 1` and both dead controls; a list of two pages one side.
- Desktop art-column slide: 24px off its side, 200ms, reduced motion → swap (call #7).
- Arrival announcement in the provider's live region (`{name}, {n} of {total}`), focus restored
  to the control that paged (note 3). The PROVIDER's region owns it (call 8: the modal remounts per
  card, so its own region would be empty on arrival). The modal's region keeps its own messages and
  never says the arrival, so nothing is read twice.
- Est. size: one file (`card-modal.tsx` footer + art column) plus the provider wrapper's
  announcement/motion logic — comfortably under the size ceiling on its own.

### PR 3 — Phone: card-first sheet (R2), replaces the 180px/72px headers
- New sheet component: teaser (top 532, fixed 280 tall) and full (top 64) states, two snaps,
  `min(320px, (100dvh − 85px − 280px) × 0.7159)` card sizing.
- Retire the phone's 180px art header and the 72px compact header entirely (`card-modal.tsx`
  phone block, roughly `:1492-1590`) — the printing picker moves into the full-state sheet.
- Swipe on the card band (y 0–532) only: 10px lock, 1.5× ratio, 25%/0.5px·ms⁻¹ commit, 16px
  edge-to-system. Paging withheld in the full state.
- Retire the phone zoom and its `Tap to zoom` hint; keep the two-faced turn plate.
- Escape ladder: full → teaser → close.
- Teaser price plate relocation (`$1.55 from $0.26`, beside the availability line).
- New copy: `cardSheetCopy.expand` / `cardSheetCopy.grabberAria`.
- **Resolved (engineering call, the-99-3e, 2026-10-03)**: the grip gets a real control. Neither
  phone specimen draws the grabber pill (`PhoneHero.dc.html:33`, the 36×4px bar) with a `role` or
  `aria-label` today — the specimen's *drawn* toggle is the "All details" row at the teaser's
  foot — but the copy file already carries `grabberAria`, and a grip that visibly drags between
  two states is exactly the kind of control that wants a tap fallback for a reader who cannot
  drag. Give the grip pill `role="button"` and `aria-label={cardSheetCopy.grabberAria}`, wired to
  the same teaser↔full toggle the "All details" row calls; both controls end up doing the same
  thing, which is fine — a drag-only affordance having no tap equivalent is the gap, not the
  duplication.
- **Resolved (engineering call, the-99-3e, 2026-10-03)**: `var(--avail)` in `PhoneHero.dc.html:60,72`
  does not exist in `globals.css` (confirmed only `--avail-soft` / `--avail-hard` /
  `--avail-hard-fg` do) and resolves to nothing silently. `cur.avail` draws the same figure the
  deck page's availability label already draws beside an ownership count. Its color is the
  label map in `src/components/ui/availability-marker.tsx` (`LABEL_COLOUR`): `--fg-body` for a
  soft claim, `--avail-hard-fg` for a hard one, `--avail-over-fg` for over, with the glyph beside
  it drawing its own `--avail-soft` outline or `--avail-hard` fill. (Corrected by the pre-open
  pass: an earlier draft named `--avail-soft` as the figure's free color, which no label uses.)
  Wire `--avail` to that same state-conditioned map, through the marker's own export, so the
  carousel draws the SAME label every other availability figure on the app draws.
- Est. size: one new sheet component + the phone block of `card-modal.tsx` removed/replaced +
  gesture hook. Likely 6-10 files; watch the line count on the gesture math (lock/ratio/commit) —
  split the gesture hook into its own file if the sheet component alone would clear ~500 lines.

### PR 4 — Stacked sheets + ledger follow-ups
- Stacked carousel (call #9): top layer pages its own list with its own peeks. Call 9's RULE
  carries over (README: "the rest carry over unchanged ... stacked"), drawn at R2's geometry: frame
  P7 lives in the superseded `PhoneSheet.dc.html`, so its layout is not followed, only its rule. The
  held card draws nothing (`onPrev={null}`, the shape the provider already passes `held`).
- Reduced-motion swap for both widths (ledger item 7: "a swap," never a slide/glide).
- Ledger item 1 (peek contrast, measure the desktop neighbor names in `--fg-muted` on all six
  themes), item 3 (1252px threshold re-check if the 820px modal width ever moves), item 4
  (stacked phone sheets at 96/140 running the same sizing formula — not drawn in the handoff,
  needs its own small spec check against the `phoneTop={52}` / `phoneTop={140}` cases already in
  the provider).
- About entry (**Hugh, 2026-10-03**): an ORDINARY EDIT to the existing `card-detail` entry
  (`src/lib/copy/about.ts`) that mentions stepping between cards, with **NO `ABOUT_VERSION` bump**
  and no new entry. The `about.test.ts` content hash is re-pinned deliberately. The wording goes
  through `/copy-review`. It rides in this PR, the last of the line, so the caption never
  describes a carousel that has not shipped.
- Est. size: small — stacked-sheet wiring plus copy, well under the ceiling.

No PR in this plan stacks on another's unmerged branch; each is independently mergeable once PR 1
lands (2-4 depend on 1's sibling-art shape but not on each other's code).

## Route × viewport inventory

Per the contact-sheet convention (`docs/superpowers/inventories/*.json`, shape confirmed against
`desktop-nav-labels.json`): every row needs `id`, `label`, `view` (the file that renders the
surface — not necessarily the route's own `page.tsx`, since the modal is mounted by a shared
component in most of these), and `steps`. Widths: **1300×900** (desktop neighbors, ≥ 1252px),
**1100×900** (desktop, below the 1252px neighbor threshold — footer-only), and **390×844**
(phone R2 sheet). 768 sits in the same `768–1251` band as 1100 (`STATES-card-carousel.md`),
so it is not a fourth width: 1100 stands for the band.

Proposed inventory file: `docs/superpowers/inventories/card-carousel.json`.

| id | Surface (`view`) | Steps | States to catch |
|---|---|---|---|
| decklist-mid | `decks/decklist-row.tsx` via a deck page | open a mid-list card | s3: both peeks/neighbors, counter |
| decklist-first | `decks/decklist-row.tsx` | open the first card | s4: no left peek/neighbor, rubber-band / `aria-disabled` |
| decklist-last | `decks/decklist-row.tsx` | open the last card | s5: mirror of s4 |
| decklist-one | `decks/decklist-row.tsx` on a 1-card list (e.g. a brand-new brew) | open the sole card | s1: no counter, no peeks, footer = link only |
| collection-tile | `collection/browser.tsx` | open a tile from a filtered/searched list | sibling list respects the live filter (provider `setSiblings`) |
| set-grid-cell | `sets/set-grid-view.tsx` | open a printing cell | neighbor art resolves from the set grid's own data |
| commander-detail | `commanders/synergy-row.tsx` / `commanders/coverage-chip.tsx` | open a synergy card | neighbor art from the commander page's own lists |
| review-diff | `decks/update-diff.tsx` / `decks/review-changes.tsx` | open a card from the what-changed strip | provider mounted on `/decks/[id]/changes` |
| stacked-fits | `decks/proxy-list-view.tsx` or the Fits picker | open a card from a sheet stacked over another card | held card draws no paging (m6) |
| builder-shell | `decks/builder-shell.tsx` | open a card from a Shopping row (door) | `phoneTop={52}` sheet-offset case still holds with the new phone sheet |
| phone-full-picker | any opener, phone width | swipe up to full, open printing picker | m2: counter only, peeks withheld, picker lives in the full sheet |
| phone-zoom | any opener, phone width | tap the centre card in the teaser, then in full | the phone zoom is RETIRED (PR 3): nothing in the teaser, back to the teaser from full, no `Tap to zoom` hint |
| desktop-zoom | any opener, ≥ 1252px | open zoom, press ← / → | arrow keys do nothing inside the zoom (decision 2 stands) |
| reduced-motion | any opener | `prefers-reduced-motion: reduce`, page once | swap, no glide/snap; drag still tracks finger (not photographable — note in the row) |
| about-card-detail | `about/ch01-figures.tsx` | load `/about` | the existing specimen still opens correctly with the new modal shape |

The inventory declares a top-level `widths` array (the contact sheet defaults to 390 and 1300
only): `phone` 390×844, `narrow` 1100×900 and `desktop` 1300×900, so rows without their own
`"widths"` run at all three. Row `widths` take those LABELS, not pixels; `reduced-motion` and the explicit end/one/two rows should carry `"widths"` narrowing
to whichever width actually exercises the state (phone drag rubber-band is phone-only; desktop
`aria-disabled` is desktop-only).

## Probes to extend, not reinvent

- **`probe:card-prefetch`** already proves the modal's two-read model (route prefetch on intent,
  action on press, no race) at 1300×900 and 390×844 on a deck page
  (`scripts/probe-card-prefetch.mjs`). The carousel's "prefetch the two neighbors' detail on
  arrival" (README note 2) is a new *caller* of this exact mechanism — extend this probe with a
  case that pages once and asserts the neighbor's `GET /api/card-detail` fired as a prefetch
  (not a server action) before any press, rather than writing a new prefetch probe from scratch.
- **`probe:scroll-lock`** already walks the card modal among its swept overlays (its label reads
  `"/collection · card modal"`, `scripts/probe-scroll-lock.mjs:101`) and proves the page behind it
  doesn't scroll. The new phone sheet's two snap states (teaser/full) are a second scroll surface
  stacked on the existing lock — extend this probe's card-modal case to also assert the teaser
  and full states each hold the lock, rather than adding a new overlay-scroll probe.
- **`probe:hover-preview`** is the reference for "a shared provider feeding multiple consumers
  the same geometry rule" (its own header: "a change to the provider reaches every consumer, and
  inheritance is the thing to verify rather than assume"). No direct extension needed, but PR 1's
  provider-wrapper work should be reviewed against the same principle it documents: prove the
  wrapper's motion/announcement logic once, not once per opener.
- **New probe needed, not an extension**: nothing existing walks a **swipe-to-page gesture** on a
  touch surface (`probe:last-slots` and `probe:list-scroll` cover hover/scroll, not drag-commit
  physics) or a **two-snap bottom sheet** (no existing probe drives a sheet between two fixed
  tops with rubber-banding at a scroll end). PR 3 needs a new `probe:card-carousel-phone` (or
  similarly named) script proving: the 10px/1.5× lock, the 25%/0.5px·ms⁻¹ commit, the teaser↔full
  snap, the rubber-band at list ends (0.3× drag, max 40px), and the escape ladder
  (full→teaser→close). This is the one piece of this feature with no existing instrument to
  reach for — budget it as new probe-writing work, not a quick addition.
- **New probe needed**: the desktop neighbor layout (168×235 at .55, 1252px threshold, `aria-
  disabled` ends) is also novel geometry with no existing probe reading it — a
  `probe:card-carousel-desktop` companion, proving the neighbor boxes render/don't render at the
  threshold and that focus survives an `aria-disabled` end control, is cheap to write once PR 2's
  markup exists and should ride with that PR rather than be deferred.

## What this plan does not decide

- The `grabberAria` control and the `--avail` token (both PR 3) are resolved above as engineering
  calls — neither needed a Design round-trip.
- The `siblings` plumbing (PR 1) is scoped above; no further resolution needed.
- The About entry was ruled by Hugh on 2026-10-03 (PR 4): an ordinary edit to `card-detail`,
  no version bump. Only its exact wording is left, and that goes through `/copy-review`, not Hugh.
