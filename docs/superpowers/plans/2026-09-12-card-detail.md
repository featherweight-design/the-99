# Card Detail Implementation Plan — price, zoom, flip

**Goal:** the card-detail modal states what a printing costs, opens the whole card at something like
hand size, and turns a two-faced card over inside that view.

**Design handoff:** `design/design_handoff_the99_card_detail/` — READINESS **🟢 Green (R2)**.
**Property table:** `docs/superpowers/design-tables/card-detail.md` — **its §Errata wins over the
handoff wherever the two disagree**, and every erratum was verified in the tree.
**Brief:** `docs/superpowers/design-briefs/2026-09-12-card-detail.md`.

**Architecture.** Price is keyed by printing (`printing_prices.scryfall_id`) and the modal's own type
does not carry that id, so the one piece of real data work is carrying `scryfallId` onto
`BrowsePrinting` and adding a per-printing price read that the card-detail action calls. Everything
after that is presentation inside one component. The tag itself is not new: `set-cell.tsx` already
draws exactly the specified tag, so it is **promoted** to a shared component rather than written
again. The zoom is a region inside the existing dialog — no second dialog, no second focus trap, no
second live region — and the flip re-uses the shipped control and its shipped strings.

**Tech stack:** Next.js 16 App Router, React 19, Drizzle ORM on Neon Postgres, Tailwind 4, Vitest.

## PR boundaries — three, in this order, never stacked

Each merges before the next branches, and each is independently shippable.

| PR | Scope | Why this boundary |
|---|---|---|
| **1 — the price tag** | `scryfallId` on `BrowsePrinting`, the per-printing price read, the action/provider plumbing, the shared `PriceTag`, the tag in all three header layouts | The only PR with data work. Ships alone and answers the reported complaint by itself |
| **2 — the zoom** | The art becomes a button, the layer, the caption, the mark, Escape ordering, focus, both motion states | Independent of the flip; ships with the flip control absent from the layer on every card |
| **3 — the flip inside the zoom** | `rotateY` turn, the swap at the midpoint, re-press reversal, the reduced-motion static state | Smallest, and the only one that amends a ratified motion ruling |

## Global constraints

- **No migration.** `printing_prices` exists and is populated; `printings.scryfall_id` is its key.
  Adding a column to a `select` is not a migration.
- **Silence is a state.** No `—`, no `$0.00`, no greyed box, no reserved slot, no `aria-hidden`
  placeholder. Table rows 1.6, 1.13.
- **Per printing, never per card.** If the resolved printing has no figure, the answer is `no stock`
  or silence — **never another printing's figure**. Row 1.10.
- **`no stock` vs silence.** `no stock` when the store answered and the answer was no (sold out and
  never stocked alike); silence only when nothing reached us — the read failed or never ran.
  Row 1.7.
- **Copy is reused, never forked.** The three price forms come from `setPageCopy.cell`
  (`src/lib/copy/set-collections.ts:197-211`); the flip's names come from `twoFacedCopy`
  (`card-surfaces.ts:78-84`). Only the zoom's own strings are new, and they go in
  `src/lib/copy/card-surfaces.ts`. Errata E1, E8.
- **One live region, one focus trap.** The modal already has both (`card-modal.tsx:855`,
  `useDialogA11y`). Do not add a second of either. Row 3.13.
- **Two named reduced-motion blocks, never a global `transition: none`.** `globals.css:459-462`
  requires a named static state per animation. Row 5.6.
- **Six themes:** `amonkhet`, `kamigawa`, `ixalan`, `phyrexia`, `eldraine`, `kaldheim`.
- **Pre-push gate, every push:** `pnpm typecheck && pnpm lint && pnpm test`, plus the stub-DB build
  (`DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build`), then
  `git fetch origin && git rebase origin/main`.
- **Stage files by name.** Never `git add -A`.
- **Do not touch** `src/components/ui/filter-chassis.tsx`, `src/components/ui/colour-pips.tsx` or
  `src/components/collection/filter-bar.tsx` — a filter round is live there.

---

# PR 1 — the price tag

## File structure

| File | Responsibility |
|---|---|
| `src/lib/collection/browse.ts` | `scryfallId` on `BrowsePrinting`; carried through `selectCollectionRows` and `aggregateCollection` |
| `src/lib/collection/card-detail.ts` | `scryfallId` on the catalog printing map (already selected at `:178-186`) |
| `src/lib/cards/prices.ts` | **New.** `loadPrintingPrices(scryfallIds)` → `{ byId, newestAsOf }` |
| `src/app/card-detail-action.ts` | Returns the card **and** its price snapshot |
| `src/components/cards/card-detail-provider.tsx` | Caches and passes the snapshot beside the card |
| `src/components/cards/price-tag.tsx` | **New.** The shared tag, promoted out of `set-cell.tsx` |
| `src/components/sets/set-cell.tsx` | Imports the shared tag; renders byte-identically |
| `src/components/cards/card-modal.tsx` | The tag in the desktop column, the phone header, and the compact header |

## Tasks

- [ ] **1.1 `scryfallId` reaches `BrowsePrinting`.** Optional (`scryfallId?: string`) for the reason
  `layout` and `availability` already are — fixtures and tests build `BrowsePrinting` literals that
  cannot reach the catalog. The **owned** path does not select it today: `browse.ts:612` uses
  `collection_items.scryfall_id` only in a join, so add it to the projection and carry it through
  the aggregation. Two finishes of one printing are two rows sharing one id, so the coalesce in the
  aggregation is `??=`, exactly as `imageUri` and `flavorName` already are. The unowned path already
  has it (`card-detail.ts:178-186`).
- [ ] **1.1a Rule the holding that has no id.** `collection_items.scryfall_id` is **nullable**
  (`schema.ts`) — a bare `Name,Qty` import carries neither an id nor a collector number. The read is
  therefore keyed on the identity the entry actually has: the exact `scryfall_id` when present,
  otherwise `(set_code, collector_number)` joined to `printings`. When neither resolves, the tag is
  **silent**. It must never fall back to the representative printing the way `resolveImageUri` does
  for art: a representative is a different collector number in the same set, and row 1.10 forbids
  another printing's figure. Silence is also the honest reading of row 1.7 — we did not ask the
  store about a printing we cannot name.
- [ ] **1.2 `loadPrintingPrices`.** One statement, the shape `price-query.ts:67-95` already proves:
  `newest as (select max(as_of) …)` joined `on true` so `newestAsOf` survives a zero-row match, rows
  keyed by `scryfall_id`, **no filter on liveness** — `priceState` decides that, and filtering would
  make `soldOut` unreachable. Returns `PriceFact` values, so `parseAsOf` is reused, not rewritten.
- [ ] **1.3 Plumbing.** `getCardDetail` returns `{ card, prices }`; a failed price read degrades to
  `prices: null` and a modal with no tag, the treatment the deck page already gives
  (`decks/[id]/page.tsx:122-133`). The provider's cache holds both. **No price on the list payload** —
  this rides the click-time fetch only, per the payload-shrink ruling.
- [ ] **1.4 Promote `PriceTag`.** Move it out of `set-cell.tsx` into `src/components/cards/price-tag.tsx`
  verbatim — `--accent` on `1px solid --accent-dim`, mono 10px, radius 4, `px 5 / py 2`, and the
  dashed `--fg-locked` no-stock form. `set-cell.tsx` imports it. Its tests must pass unchanged; that
  is the proof the promotion changed nothing.
- [ ] **1.5 The tag in the modal, three placements.** Desktop art column and full phone header: last
  child, 10px / 9px under the art, centred (rows 1.1, 1.8 — phone takes the over-art plate, written
  as `color-mix(in oklab, var(--bg) 72%, transparent)`, **never a raw rgba**, erratum E3). Compact
  header: **beside the mana cost**, in the content column's header row — not in the art header's
  name block. On a phone in that state the two are in different regions (erratum E12), and the name
  block's heading is `aria-hidden` because the `h3` carries the dialog's accessible name, so a
  figure placed there reaches no assistive technology at all (erratum E10).
- [ ] **1.6 It follows the pick.** The tag reads `resolved` (`card-modal.tsx:329`), the same object the
  art and the `Set` caption already read, so a pick moves four things together (row 1.9).
- [ ] **1.7 Tests.** The twelve cells of STATES §1 as a table-driven test; the `no stock`/silence
  split of row 1.7; a pick changing the figure; the compact placement not being inside the
  `aria-hidden` block; the accessible description.
- [ ] **1.8 Probe.** Extend `scripts/probe-price-ui.mjs` or add `scripts/probe-card-detail-price.mjs`:
  open a card in the modal on `local-dev`, assert the tag paints under the art, assert it moves in
  the compact state, and assert an unpriced card renders **no node at all**. Anchor to structure, not
  to text position.

---

# PR 2 — the zoom

## File structure

| File | Responsibility |
|---|---|
| `src/components/cards/card-modal.tsx` | `zoomed` state, the art as a button, the layer, caption, mark, Escape ordering, focus |
| `src/lib/copy/card-surfaces.ts` | `zoomAria`, `layerAria`, `printing`, `backSuffix`, `close`, `hint` |
| `src/app/globals.css` | Two keyframes/transitions and one named reduced-motion block |

## Tasks

- [ ] **2.1 The trigger.** The sharp art becomes a `button` with `aria-expanded` and
  `aria-controls`; accessible name from `cardZoomCopy.zoomAria(name)`. The visible mark sits
  bottom-**left** on the over-art plate, 30px desktop / 28px phone, because the flip control owns
  bottom-right on every card (rows 3.7, 3.8). The compact header takes the gesture with **no mark**
  and must carry the shipped focus ring (rows 2.3–2.5).
- [ ] **2.2 The layer.** `position:absolute; inset:0` inside the dialog element, `--bg` at 94% with
  `blur(10px)`, card at 372×520 / 318×444, radius 14/13, one mono 11px caption in `--fg-muted`
  (rows 3.1–3.4). No collector number → omit the field and its separator (row 3.5).
- [ ] **2.3 Close and Escape.** The shipped ✕ keeps its slot and gains an `--elevated` plate and a
  new label; `Esc` closes the zoom first and the dialog second, which with the printing region open
  is three stages (rows 3.6, 3.11). Extend the existing `onEscape` at `card-modal.tsx:346-355`
  rather than adding a handler.
- [ ] **2.4 Focus.** On open, to the flip control when two-faced, else to ✕; on close, always back to
  the art (rows 3.10, 3.12). No second trap — the shipped trap already covers the subtree.
- [ ] **2.5 Motion.** 200ms `ease-out` on open with `scale(.94)→1`, 160ms `ease-in` on close, blur set at its final
  value on the first frame; a named reduced-motion block that keeps the zoom working without the
  transform (rows 5.1, 5.2, 5.4, 5.6).
- [ ] **2.6 Tests + probe.** Open/close by all three doors; the Escape ladder; focus return; the
  no-art card (row 3.14); the unowned card being identical (row 3.15). Probe presses the art on a
  real page and measures the layer's box against the dialog's, not the viewport's.

---

# PR 3 — the flip inside the zoom

## Tasks

- [ ] **3.1 The turn.** `rotateY` 0→180 over 320ms `cubic-bezier(.2,.7,.2,1)`, `perspective: 1400px`
  on the layer, `backface-visibility: hidden` on both faces, the face swapping at 160ms behind the
  edge (rows 4.2–4.4).
- [ ] **3.2 Re-press.** Reverses from the current angle; never queues, never double-turns (row 4.5).
- [ ] **3.3 The control.** The shipped button at a 44px target inside the layer — which on phone it
  already is (erratum E2). No label, no pill, no move; `aria-pressed` absent (rows 4.6, 4.8).
- [ ] **3.4 Strings.** `twoFacedCopy.flipToAria(otherFace)` and `flippedAria(face)`, unchanged —
  the accessible name is the face it turns **to** (erratum E8). The settle is announced by the
  modal's one live region.
- [ ] **3.5 The un-zoomed flip does not change.** Amendment 8.3 is one place only; the 180px and
  264px arts keep the ratified swap (row 4.1).
- [ ] **3.6 The back face is not remembered.** Closing the zoom and reopening shows the front
  (row 4.10).
- [ ] **3.7 Reduced motion.** Face replaces face — the shipped swap, so the static path is the status
  quo and the animated path is the amendment. Named block, never global (rows 5.3, 5.6).
- [ ] **3.8 Tests + probe.** The gate is the `layout` column, never `//` (row 4.7); a split card gets
  the mark and no control; the probe turns a real `transform` card in the zoom and asserts both faces
  render.

---

## The route inventory

Every surface the modal opens on, walked against the running app at close-out rather
than against a diff. Machine-readable at `docs/superpowers/inventories/card-detail.json`;
`node scripts/contact-sheet.mjs <that file>` photographs every row at both widths.

| Route | 390px | 1300px | Notes |
|---|---|---|---|
| `/collection` (rows) | ✅ | ✅ | price, zoom mark, hint |
| `/collection` (rows) — zoom open | ✅ | ✅ | whole card, caption, plated ✕ |
| `/collection` (grid) | ✅ | ✅ | |
| `/collection/sets/[code]` | ✅ | ✅ | cell opens the same modal |
| `/decks/[id]` | ✅ | ✅ | decklist row |
| `/commanders/[slug]` | ✅ | ⬜ | phone walked; desktop's `⛶` trigger was not reached by the harness — the surface is the same component, proven at the other width |
| two-faced card — the turn, in the zoom | ✅ | ✅ | control bottom-centre, clear of the P/T |

## Self-review

- **The riskiest change is `scryfallId` on the owned path**, because the aggregation collapses many
  collection rows into one printing entry. The entry must take the id of the printing it *is* —
  the same row `flavorName` and the exact image already come from — never an arbitrary sibling.
- **The compact header is the state most likely to be skipped.** It is reached only with 2+ owned
  printings and the region open past the overflow threshold; the probe has to force it rather than
  hope for it.
- **`set-cell.tsx`'s tests are the promotion's proof.** If they need editing, the promotion changed
  behaviour and the edit is the bug.
- **Three Escape stages is a real cost** and was accepted by Design (gap 4). If the ladder feels
  wrong in the browser, that is a finding for Design, not a licence to re-order it here.
