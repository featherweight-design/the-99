# Design Brief — Card detail: the price, the zoom, and the flip

**Workshop:** 2026-09-11, Hugh + agent. No ticket filed — scoped from a direct request, as the
other two briefs from that workshop were. This brief is the source of truth the Claude Design
handoff prompt points at.

**Verified against `origin/main` at `e4b40752` on 2026-09-12.** Every `file:line` below was read on
that commit, not recalled.

Three items ship as one group because they cannot be designed apart. All three land in
`src/components/cards/card-modal.tsx` — one component, mounted once per page through
`CardDetailProvider` (`cards/card-detail-provider.tsx:1-6`) — and two of them land in the same
320px-wide art region. Zoom and flip are the same interaction question asked twice: the modal
already has a flip control on the art, so a zoomed view that does not answer what happens to that
control has not been drawn. Pricing is separable in code and not in layout: it needs a home in a
content column that is already full.

---

## §1 The surface today

The modal is a full-screen sheet on phone and an 820 × 620 dialog on desktop
(`card-modal.tsx:502`). It has two art regions, not one, and they are separate JSX — a phone art
header (`:507-577`) and a desktop art column (`:579-601`) — separated by CSS rather than by a
branch, so any amendment lands in both.

| # | Thing | Where | State today |
|---|---|---|---|
| 1 | Phone art header | `card-modal.tsx:507-577` | A blurred, dimmed, scaled copy of the art as atmosphere (`:521-531`: `blur(22px)`, `scale(1.2)`, `opacity 0.45`) behind one sharp 180px card at `63/88`, radius 10px (`:542-565`) |
| 2 | Phone art header, compact | same, gated on `compactArt` (`:344`) | The sharp card collapses to a 72px thumbnail and the name moves in beside it. Entered only when the printing picker is open past `OVERFLOW_THRESHOLD` |
| 3 | Desktop art column | `card-modal.tsx:579-601` | 320px wide, 28px padding, on `--bg`; the card fills the width at `63/88`, radius 12px |
| 4 | Flip control | `card-modal.tsx:812-833`, mounted at `:557-563` (44px, phone) and `:592-598` (34px, desktop) | A turn-arrow button at `right: 10, bottom: 10`, radius 7px, on an 86%-`--bg` scrim. Its accessible name is the face it turns **to**, never "flip" |
| 5 | Printing region | `cards/printing-region.tsx:77`, rendered by `card-modal.tsx:433-445` at two mount points (`:717` phone, `:741` desktop) | A search field, finish chips and a grid of printing tiles (`printing-region.tsx:430`). **Gated on `hasPicker`** — `ownedPrintings.length > 1` (`card-modal.tsx:336-340`) |
| 6 | Meta fields | `card-modal.tsx:685-702` (phone 2×2 grid), `:721-739` (desktop flex row) | Set · Rarity · Identity · You own. The Set cell is promoted out of the grid when the picker exists |
| 7 | Availability block | `card-modal.tsx:679`, component at `:126` | What other decks hold this card. Sits between the oracle text and the meta fields |
| 8 | Link-out to ManaPool | `card-modal.tsx:743-752` (phone, in flow) and the desktop nav row | Keyed by the oracle card name, never the printing on screen, and unconditional — owned or not, priced or not (#330, R3) |

**What PR #517 already changed, and what it means for this group.** #517 added the
`⛶ Card details` pill to the desktop commander card frame
(`commanders/detail.tsx:483`, `commanders/full-card-trigger.tsx:22` with
`placement: "commander-desktop"`), so desktop now reaches this modal from the commander page.
Two consequences for this brief. First, **the flip now has a desktop route on every surface that
draws a commander.** The control itself has always rendered at both widths (34px in the desktop art
column, `card-modal.tsx:592-598`) and desktop deck surfaces already opened the modal — the decklist
row and the deck spine's own `⛶` pill (`decks/spine-desktop.tsx:133`) — but the commander page's
desktop column was a bare card face with no route in, so a two-faced commander was unflippable
exactly where a player goes to look at one. The animated flip therefore amends a shipped control
rather than routing a new one. Second, `detail.tsx:471-484`
still draws its own 63/88 card face in the sticky desktop column, so a reader on desktop has a
card picture on the page *and* a smaller one inside the modal the picture opens. That is the
regression zoom exists to close, and it is already on the record: when the commander page's
282-line bespoke lightbox was deleted for this shared modal,
`design/design_handoff_the99_amendments/PARITY-lightbox-to-modal.md:20` logged the sharp art going
from 262px to 180px as **"the one regression"**, and `:50` names it as the single thing kept
smaller.

### §1a No price appears anywhere in this modal

Not a missing string — a missing field. There is no price in `src/components/cards/` at all, and
none in `BrowseCard`, the type the modal renders (`lib/collection/browse.ts:46-96`), nor in
`BrowsePrinting`, the per-printing type (`:17-39`). The reported complaint is exactly this
asymmetry: a decklist row draws `buy · $65.64` from `BuyTag` (`decks/decklist-row.tsx:462`) while
the detail panel that row opens says nothing about money.

Two constraints Design should know before choosing a home for the figure, because each rules out
a placement:

1. **Price is keyed by printing, and the app's existing read is keyed by card.**
   `printing_prices.scryfall_id` is the primary key (`db/schema.ts:143-161`), and
   `decks/price-query.ts:67` deliberately collapses that to one chosen printing per oracle card
   with a four-clause `order by` — live before stale, real non-foil stock before foil at any
   price, then cheapest, then id. "The selected printing's price" is a different question than
   that query answers, and it needs a `scryfallId` that `BrowsePrinting` does not carry today
   (the loaders have it — `collection/card-detail.ts:34-42` selects it, and the owned path joins
   on `collection_items.scryfall_id` at `browse.ts:612` — it is simply dropped on the way into the
   type). This is eng work either way and no reason to constrain the drawing; it is listed so the
   drawing can ask for a per-printing figure knowingly.
2. **For a card you do not own there is no printing region to sit next to.** `hasPicker` is false
   at zero or one owned printing (`card-modal.tsx:340`), so an unowned card draws a `Set` meta
   field and nothing else — while `catalogCard` (`collection/card-detail.ts:51`) has quietly
   filled `card.printings` with the *whole catalog* at quantity 0. The unowned card is the one the
   complaint is about, and it is precisely the case where "beside the printings" names no place.

### §1b The flip is instant, silent, and deliberately so

`card-modal.tsx:461-467` swaps `flipped` and announces the new face into the modal's one live
region. The comment at `:464-465` states the ruling: *"The swap is silent by design — no motion,
no caption change — so the live region is the only thing that reports it."* An animated flip
therefore **overturns a shipped decision**, which is the workshop's intent, and the drawing should
say so rather than read as new work on a blank surface.

Adjacent motion facts the drawing has to fit:

- There is no motion token set. Durations and easings are literal values on named classes in
  `app/globals.css:524-536` — the shipped vocabulary is `0.12s ease-out` (menu), `0.14s ease-out`
  (quick-add), `0.18s ease-out` / `0.18s cubic-bezier(0.22, 1, 0.36, 1)` (sheets and backdrop).
  Nothing in the app currently animates a transform in three dimensions.
- **Reduced motion is opt-in per animation, by design.** `globals.css:459-462` records that the
  reduce block lists classes individually *"so that adding a new animation forces an explicit
  static-fallback decision"*, and the block itself is at `:538-556`. The flip's static fallback is
  therefore a drawing decision, not an eng default.
- The decklist's hover preview is the nearest prior art and points the other way:
  252 × 352 at `63:88` (`decks/hover-preview.tsx:29-30`), opened on a 240ms delay
  (`:42`), and `:37` records that *"zero net motion is locked"* for it. That ruling is scoped to
  the hover preview, and the zoom this brief asks for is a tap, not a hover — but a reader who
  hovers a row and then taps the same card should not meet two unrelated languages.

---

## §2 Decisions locked in the workshop

1. **Price. A card you own shows the selected printing's price** — the printing the art on screen
   belongs to, which the modal already tracks as `resolved` (`card-modal.tsx:329`) and captions at
   `:429`. **A card you do not own shows a price at all**, which today it does not. The complaint
   is the asymmetry, not the figure's precision.
2. **The feed's semantics carry over unchanged, and they are subtle.** A printing absent from
   `printing_prices` has never been stocked in any run — it is not free and not unknown. A row
   with a null `price_cents` and a set `price_cents_foil` is stocked in foil only
   (`schema.ts:146-152`). Staleness is `as_of === max(as_of)` over the whole table, never a wall
   clock, because the ingest upserts and never deletes (`decks/price.ts:6-20`). The four states
   and their tails are ratified at
   `docs/superpowers/design-tables/price-on-the-buy-tag.md:35-44` (rows 1.14–1.19), and rule 6.3
   at `:186` is the one to read twice: **there is no string for a missing price — not `—`, not
   `$0.00`, not "price unknown". Silence is the state.** Whatever this brief's figure is, it
   inherits that.
3. **Zoom shows the full card, as if holding it.** Not an art-only lightbox: the printed frame,
   the printed text, the printed name. This is what `PARITY-lightbox-to-modal.md:20`'s regression
   asks for, at a size the 320px column cannot give.
4. **Flip is built into the zoomed view and animated**, so a `transform` card's two faces read as
   one object turning rather than one image replacing another.

---

## §3 What Design is being asked to call — open

- **§3.1 Where the price sits.** The modal's content column is full: name and type, mana pips,
  oracle text, the availability block, four meta fields, the printing region when it exists, and
  the ManaPool link. Design names the price's place in that order **and answers the unowned case
  in the same stroke** — see §1a(2): there is no printing region to sit beside when the player
  owns nothing, which is the case the complaint is about. If the figure rides a printing tile
  (`printing-region.tsx:430`), say what the tile does at the four price states; if it rides the
  meta fields, say which of the four it displaces or whether the grid becomes 2×3 on phone.
- **§3.2 What the zoomed view contains besides the card.** A flip affordance — the same control at
  a new size, or a different one? An explicit dismiss, or tap-anywhere? The modal already owns a
  close button at two positions (`card-modal.tsx:532-542` phone, `:608-616` desktop) and a focus
  trap through `useDialogA11y`, so a second layer with its own Escape has an ordering question:
  Escape currently collapses the printing region first and closes the dialog second
  (`:346-355`). Zoom is a third rung on that ladder and the drawing should say where it sits.
- **§3.3 Whether zoom replaces the panel on mobile or overlays it.** Phone is a full-screen sheet
  already, so an overlay is an overlay on top of a full-bleed surface; replacing the panel means
  the reader loses the printings and the availability block for the duration. Desktop has room to
  do neither and exceed the 820px dialog. State both, and state whether the phone's compact art
  header (§1, row 2) offers zoom at all — its 72px thumbnail is a locator, which is why the flip
  control is withheld there (`card-modal.tsx:552-557`).
- **§3.4 The flip's axis and duration.** Against the shipped values in §1b, and with the
  reduced-motion static state named explicitly, because `globals.css:459-462` requires one per
  animation. Two further specifics eng cannot infer: whether the back face is drawn already
  flipped (a 3D card turning shows its own back mid-rotation, which a CSS `rotateY` on a single
  background image cannot do), and whether the small in-panel flip control animates too or stays
  the instant swap it is today — the locked decision names the zoomed view only.

**One question this brief answers rather than asking.** Which printing's price an *unowned* card
shows is settled by precedent, not by a drawing: `decks/price-query.ts:67-95`'s `order by` already
picks one printing per oracle card for every buy tag in the app, and a second selection rule would
put two different figures for one card on two surfaces. Design should ratify rather than re-choose,
and overrule only if the panel should differ from the tag on purpose.

---

## §4 Constraint — this amends four ratified documents

None of this is a fresh drawing. The surfaces are shipped and audited, and the drawing should
state its amendments explicitly so the readiness audit can check them one by one rather than
re-deriving the modal:

- **`docs/superpowers/design-tables/collection.md:750-1069`** — the `Card Detail Modal` component,
  which owns every geometry in §1: `Mobile: Art Header` (`:768`), `Mobile: Art Image` (`:792`),
  `Desktop: Art Column` (`:831`), `Desktop: Art Image` (`:842`), and the compact variant at
  `:1207`. This is the table the price's placement and the zoom's trigger amend.
- **`docs/superpowers/design-tables/price-on-the-buy-tag.md`** — the four price states
  (`:35-44`) and copy rule 6.3 (`:186`). A price in the detail panel is a **fifth surface** for a
  vocabulary ratified for two, so the drawing either reuses the tag's tail forms verbatim or says
  where and why it departs.
- **`docs/superpowers/design-tables/commanders.md:1915`** — the `detail-card-modal` state row,
  rewritten on 2026-09-12 for #517. It describes what the modal holds today; zoom and an animated
  flip change that description.
- **`design/design_handoff_the99_amendments/PARITY-lightbox-to-modal.md:20`** — row 9, the 262px →
  180px art regression, and `:50`'s summary. Zoom is the answer to a regression this document
  already records, so it should be cited as closing that row rather than as a new feature.

The handoff lands as `design/design_handoff_the99_card_detail/`, with a property table at
`docs/superpowers/design-tables/card-detail.md` and a READINESS verdict. No UI ships before both
exist — the modal is UI, and this group has neither today.

---

## §5 Sequencing

**This brief blocks nothing and is blocked by nothing.** It is independent of the two other
briefs in flight from the same workshop. `2026-09-11-one-commander-image.md` amends the wash
primitive and the fifteen renders of a *commander's* image; the two renders it names inside this
feature — `card-modal.tsx:1026` and `printing-region.tsx:459`, both printing thumbnails — are in
its excluded list, because this modal draws a card rather than a commander, and its two main art
regions are not among the fifteen at all. `2026-09-12-a-commander-you-cannot-build.md` moves
availability facts *out* of this modal onto the rows that open it, and touches nothing the modal
draws. `docs/superpowers/design-pipeline-status.md` records this group at rank 4 of its 📐 table,
which is where this brief files it.

**Two live rounds this brief must not collide with**, noted so the eventual build does not
reach for them: a filter round is open in `ui/filter-chassis.tsx`, `ui/colour-pips.tsx` and
`collection/filter-bar.tsx`, and the folders/stats briefs from the same workshop are being written
on a separate branch. None of the three items here touches those files.
