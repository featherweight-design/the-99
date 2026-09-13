# READINESS — One commander image (handoff R6)

**Verdict: 🟢 Green. Shipped 2026-09-12** across PRs #537, #538, #539, #540,
#542, #544 and #548. **§5c is the table of record for every `labelAt` figure** —
read it, not this document's prose, for what a surface ships. §6 is an errata
table: it quotes the superseded values (38/46/63, 40, 57, 46, 83) alongside their
corrections, so a figure appearing there is not a shipped one unless §5c repeats
it. **Amended 2026-09-13 by PR #556, and one of the amendments overturns the
handoff: §A4 is reverted.** The resume row keeps the treatment it has always
shipped — a 72px band with a 99px portrait column — not the 168px `cover` band
this round flipped it to. §A4, the aspect rule that produced it, and every
figure derived from it (`labelAtPx 53`, the cover shadow on that row's strings)
describe a row that no longer ships. The reason is not arithmetic: the flip was
Design's ruling and this verdict carried it, and Hugh's call is that it changed
a surface nobody asked to change. See §6a for the full list of what that
reverted, including the restored portrait's own figures.

Two things stayed open and neither blocked: `/decks` colour filtering reads
`commanderColorIdentity` alone, so a pair filters on its primary while every
surface words the union — now **issue #581**, and the round itself created that
discrepancy by adding the union to the tile — and the 640–699px two-up crop loss
remains, which is `decks-view.tsx`, a file PR #573 is currently editing.

This document was the design record and the plan the build followed: the slices
were PRs 2 through 6 of the plan, and the deck slice shipped as two because the
tile and the spines share no file. §6's amendments are every place the handoff's
own arithmetic had to be corrected inside a rule it got right, and §5c is the one
table that governs the figures. Design self-assessed Green after six rounds and the audit
concurred: every one of the brief's five open calls is made, decision 6's enumeration is complete once
one render added after the brief was written is folded in, and every amendment to the two ratified
wash tables is stated individually with a verdict. Eleven findings, all engineering-resolvable, all ruled below; §6 carries more
rows than that, because one finding can correct several statements. **No Design round-trip.**

- **Handoff:** `design/design_handoff_the99_commander_image/` (R6, 2026-09-12) — committed with this
  verdict, so the record points at files a reader can open
- **Brief:** `docs/superpowers/design-briefs/2026-09-11-one-commander-image.md`, patched 2026-09-12
  for the two facts PR #517 invalidated
- **Audited:** 2026-09-12 against `origin/main` at `47616861`
- **Plan:** `docs/superpowers/plans/2026-09-12-commander-image.md`
- **Amends:** `design/design_handoff_the99_art_wash/` (A-series) and
  `design/design_handoff_the99_deck_details_wash/` (B-series). Neither is edited; both stand as
  delivered, and this file is where their corrections live.

**The handoff's three prose documents are preserved byte-for-byte as Design delivered them.** Each
opens with one banner naming this verdict and the plan as the build contract. Nothing inside them is
rewritten — an earlier round on another handoff tried editing corrections in place and left fragments
and contradictions across several review cycles. §6 below is the correction of record.

---

## What was checked, and against what

Every load-bearing claim was checked against the shipped tree, and every number was recomputed rather
than trusted.

| Claim | Source | Result |
|---|---|---|
| Fifteen renders across twelve files, seven drawing no wash | two-pass sweep re-run | **Exact.** Eight `<ArtWash>` call sites, seven `url(...)`/`cssUrl(...)` commander renders, no sixteenth |
| The `left-portrait` ambient layer is gone | `art-wash.tsx:266-280` | **True** (PR #517). Its own comment records why |
| `Band = 168 \| 148 \| 72`, three union arms | `art-wash.tsx:119,224-249` | **True** |
| `bottomScrimStops` takes one argument and `labelAt` is a percentage | `art-wash.tsx:55-60` | **True.** `[73, labelAt]` is a gradient position — the handoff's trap is real |
| `COVER_SCRIM_STOPS.top` exists and is the top scrim | `art-wash.tsx:26-33` | **True** |
| `OVER_ART_PLATE = 72` is not consumed at runtime | `art-wash.tsx:79`, `full-card-trigger.tsx:72` | **True.** The class hard-codes `72%`; only the test holds the two in step |
| The six statuses, their tokens, alphas and border styles | `status-style.ts:20-43` | **Exact, all six.** `color-mix(in srgb, var(TOKEN) ALPHA, var(--bg))`, Building dashed at 14%, Draft 16%, four signals 18% |
| Chip geometry: 22px, 6px radius, 8px padding, mono 10.5, tracking .06em | `status-pill.tsx:32` | **Exact**, at the `sm:` half of the tile class |
| The deck overflow's desktop plate is `var(--bg)` + `--border-strong` at 26px `rounded-[7px]`, bare at 44px on phone | `deck-card-overflow.tsx:103-105` | **True.** The code states "the drawn plate is desktop-only" in as many words |
| `clearTo` derives from `maskEnd% × width` | recomputed | **True to a pixel.** 58% of 230 = 133.4 vs 134; 58% of 203 = 117.7 vs 118. Band 72 is the stated exception at 3.4px off |
| The new `clearTo` values | recomputed | **Exact.** 58% of 285 = 165.3, of 340 = 197.2, of 560 = 324.8 |
| Portrait widths 230 / 285 / 340 | recomputed at 1.37 | **Exact.** 230.2, 285.0, 339.8 |
| The whole ramp table — six rows of ramp / hold / unveiled | recomputed from the handoff's own formula | **All six exact** to the rounding shown. 288/38 → 80 / 87; 288/57 → 71 / 80; 288/83 → 57 / 71; 248/46 → 73 / 81; 208/46 → 67 / 78; 168/40 → 65 / 76 |
| Band 148's shipped column implies `labelAt ≈ 67px`, a 0.38 ramp and a 78 hold | recomputed | **True.** Hold at 55% of 148 is 81.4px down, so 66.6px from the foot; the clear stop sits 0.378 × that above the block |
| "Opaque takes the control out of the contrast problem" | recomputed over all six themes | **True.** `--fg` on `--bg` is 12.06–15.65:1 and `--fg-body` 9.30–10.15:1 — no per-theme measurement needed |
| `THEMES.size === 6` holds the suite to six themes | `wash-contrast.test.ts:193-194` | **True**, at 193-194 rather than the cited 188-189 |
| The deck grid is three columns from `sm:` up, 189px at 640 | `decks-view.tsx:386` | **True.** `sm:grid-cols-3` with 22px padding and 14px gaps gives 189.3px |
| `--fg-muted` for the unplated pencil clears its floor on art | recomputed | **Fails 4.5:1 in all six themes** at 3.42–3.75. Clears the 3:1 non-text floor. See finding 9 |

---

## §2 The one call the handoff leaves to engineering, ruled here: **the portrait table is keyed by width**

Design's own numbers force this and the handoff does not say it. Render 10 is a 560px portrait on a
288px band above ~1200px of row, and a **340px portrait on the same 288px band** below it. Today
`PORTRAIT_BANDS` is keyed by band height, so one band cannot hold two portraits and the fallback
geometry has nowhere to live.

**Re-key the table by portrait width — 230 / 285 / 340 / 560.** Every column in it is a function of
the portrait's width and none of its height: `clearTo` is `maskEnd% × width` by the handoff's own
derivation, `flatStop` is drawn a few pixels past the width, `maskEnd` and `sharpAlpha` are constants
across every row that ships. The height chose the width only by convention, and on render 10 the
handoff already inverts that convention ("560 is the chosen number and 288 follows it").

Two things fall out for free:

1. **The undrawn fallback is fully specified after all.** It reuses the 340 row — `clearTo` 197,
   `flatStop` 356 — which the 248 band already ships, and its stated 364px title inset clears 356. So
   open item 3 stops being a gap: what was missing was a drawing, not a number.
2. **Two geometries on one surface is a pattern this file already uses.** The two wash layers mount
   unconditionally and CSS picks one, exactly as `SpineMobile` and `SpineDesktop` are both mounted by
   `builder-spine.tsx` and separated by a media query. The alternative — emitting the ramp as a CSS
   variable so a stylesheet could switch it — is the same change B9 asks for and this round did not
   spec; it is not a prerequisite for this one.

Nothing is redrawn. The handoff stands as delivered.

---

## §3 Findings — eleven, all engineering-resolvable

1. **Decision 6's enumeration is one render short, because a fourth placement landed after the
   brief.** PR #517 mounted `FullCardTrigger` at `placement="commander-desktop"` (`left: 12,
   bottom: 12`) inside render 05's card face. Four placements ship;
   the table names three of them. **Resolved by the handoff's own rule** — *bottom, on whichever side
   the block does not reach* — which this one already satisfies: the frame carries no ink of its own,
   the name and type line sit below it. It takes THE PLATE with no move, and the enumeration closes at
   five live tenants across renders 04, 05, 08, 09 and 10. **Thirteen** of the fifteen end with an empty
   top edge: decision 6 keeps a control on two of them — render 09's `Card details` and render 08's
   overflow, which it gives a plate rather than a move. The handoff states eleven in one place and
   fifteen in two others; see the errata.
2. **Both accessible names in the copy file are wrong, and the shipped ones are better.**
   `full-card-trigger.tsx:81` ships `aria-label="View card details"`, not `"Card details"` — a
   verb-led name for a control whose visible words are about to disappear. `deck-card-overflow.tsx:78`
   ships `refreshCopy.decks.menu.trigger(deckName)`, which names the deck it acts on, and the code
   records why: *"Deck options said the same thing for every tile on the page, so a reader tabbing the
   grid heard one label repeated as many times as there were decks."* The copy file proposed exactly
   that string and flagged it as unread. **Both shipped names stand.** The copy file's `nowAriaLabel`
   values are superseded; its substantive point — that dropping the visible words makes the name
   required rather than nice — holds and is what the build must not regress.
3. **Render 01's `labelAt` is stated three times with three values, and none of them is right.**
   STATES says **38**, README §3.2's list says 46, and decision 7 says "`labelAt 63` arithmetic".
   **46 ships** — and it is 46 by measurement rather than by picking §3.2's number: this block is a
   padded ROW, 12px above and below a 22px chip, and 38 counts one of its two insets. The build, the
   plan, the tracker and §6's amendment all say 46; STATES' own ramp row (288/38 → 80 / 87) is the
   arithmetic of a block that does not ship.
4. **The 104px floor is in two consumers, not in the primitive.** `hero-commander.tsx:54` and
   `deck-card.tsx:149` each carry `aspect-[2.2/1] min-h-[104px]`; `art-wash.tsx` contains no 104 at
   all. Retiring the floor means those two roots state a height in px, which is what their bands are
   becoming anyway.
5. **Render 06's "the inset frame retires" has no referent in the shipped tree.**
   `discovery-row.tsx` draws no frame around its band. Its only `--surface-inset` is the data zone
   *below* the `1px var(--border)` divider (`:495`), which art wash decision 4 put there deliberately
   and this round does not reopen. The framed drawing R4 argues against was Design's own comparison,
   not code. **No-op**, recorded so an implementer does not go looking for a panel to delete.
6. **The resume row's commander name cannot be cut on a pair deck.** The cut's own reason is that
   "the band's own art" says it — and a pair's band shows one of two commanders.
   `resume-decks.tsx:142-160` prints `Ishai + Bruse Tarl` precisely because the row has two, under
   #364's decision 19. **Resolved: cut it on single-commander rows, keep the shortened pair line on
   pair rows.** The row's accessible name already carries both in full, so nothing is lost either way;
   what would be lost is the only visible statement that the deck has a partner at all. Decision 23's
   droppable to-buy clause is unaffected and the handoff cuts it outright, which is correct.
7. **`sharpOpacity` for the 560 portrait is unstated.** README's portrait table gives `.92` for
   168 / 208 / 248 and STATES' table omits the column for 288. **Ships at `.92`** — the value every
   portrait in the app draws, and the only one any of these tables names.
8. **The reduced-transparency override retires; the `!important` does not.** Once every band is
   bottom-labelled, `.art-wash-scrim-cover-top` has no subject, and it goes with the `labelEdge` class
   hook that selects it. `.art-wash-art { opacity: var(--art-wash-reduced-opacity) !important }`
   **stays, and the `!important` stays load-bearing**: `<ArtWash>` sets opacity inline and an inline
   declaration outranks any plain selector. `--art-wash-reduced-opacity` remains a **ceiling, never a
   floor** — published per layer through `Math.min`, never applied flat, because applied flat it
   raises a layer already drawn below it and answers a request for less transparency with more art.
   The layer that rule was written against is gone; the rule is not. Design's B9 — whether the
   preference should reach the scrim at all — is recorded as **open with Design and not silently
   closed**; it changes no drawing and blocks nothing, and the answer that would satisfy it is a
   CSS-variable ramp this round did not spec.
9. **`--fg-muted` for the unplated pencil fails the 4.5:1 floor this system holds itself to, and
   clears the 3:1 one that applies to it.** Recomputed over all six themes at the 73% hold against a
   pure white pixel: **3.42 (eldraine) to 3.75 (ixalan)**, against `--fg`'s 6.16–8.08 and
   `--fg-body`'s 4.81–5.18. **Ships as drawn.** The pencil is an icon-only control, so 1.4.11's 3:1
   non-text floor is the applicable one, it clears that in every theme, and it carries
   `COVER_INK_SHADOW` on top of the measurement. The build asserts it at **3:1 with the reason stated
   in the test**, rather than leaving the one glyph on art with no plate unmeasured. Recorded because
   the figure is a floor, not headroom: any future lift of `COVER_ART_OPACITY` or drop of the hold
   breaks this glyph first.
10. **The spine-mobile pencil already has no plate, so R6's reversal is half-shipped.** The top-off
    addendum removed its box; the glyph takes the title's own ink and `COVER_INK_SHADOW` at a 44px
    target, with a 44px spacer opposite it so the centred title stays centred
    (`spine-mobile.tsx:229-268`). What option (a) still changes is the **zero-width container** — and
    the spacer retires with it, since a glyph that steals no width needs nothing opposite it to
    balance — plus the ink in finding 9. Desktop is the real change there: its pencil is a bordered
    box revealed on `group-hover` (`spine-desktop.tsx:197`), and option (a) makes both frames the
    same unplated inline glyph, always present.
11. **The deck tile's 189px column is out of scope twice over.** The handoff's recommended fix is
    one-up below ~700px, which is a `decks-view.tsx:386` change — `sm:grid-cols-3` → a 700px
    breakpoint — and that file was owned by a live filter round when this was written. That round has
    since merged; as of 2026-09-13 the file is PR #573's (deck folders), so the fix waits on that
    rather than on a filter round. It is out of scope on the handoff's own account either way. The tile ships at `0.76 : 1` between 640 and 699px, losing
    ~44% of the crop's width, with `center top` keeping the face. **One capture at 640 before the deck
    PR merges**, per the handoff's own open item 1.

---

## §4 Dependencies

| | |
|---|---|
| **Sequencing · the home redesign** | §3.3's "desktop gains nothing" rests on the Your Decks rail being deleted by the next brief. Render 03 is built as specced — a 44×62 thumb, flagged expiring — which grows the phone rail's row from `min-h-[56px]` to ~86px. That is a real layout change to a component scheduled for deletion; it is five lines, and the alternative is a rail whose phone thumb is the one thumb in the app that did not converge. If the rail survives on either frame, desktop's art-and-count gap returns as its own one-line ticket. Blocks nothing |
| **Grid · the deck tile's column floor** | Finding 11. Not a blocker: the band ships and the grid change is someone else's file |
| **Product · three strings** | Exactly three, and the copy file's six `cuts` entries are not all of them: the resume row's to-buy clause, the deck tile's `all owned`, and desktop's `99 owned · 0 to buy`. Each survives elsewhere — the roll-up on Shopping, and the bar beside the count |
| **Settled here, not Product's** | The round's own three cuts: `Start this deck` (`See the pool` takes the filled treatment as the only action left), the resume row's commander name on single-commander rows, and the tile's `never played`. That last is the one cut with no replacement, and the handoff rules where it goes instead — the overflow menu, or the deck's own page. Built as ruled |
| **Decision · B9, reduced transparency** | Finding 8. Open with Design, blocks nothing |

**No data dependency.** Every field these fifteen renders read — `artCropUri`, `imageUri`,
`commanderImageUri`, `colorIdentity`, `statusPill`, `partnerName` — already exists at every call site.
Nothing here adds a column, a query or an API shape.

---

## §5 What the handoff got right that is worth naming

**It found the trap that would have inverted its own round.** `labelAt` changing from a percentage to
pixels while `bottomScrimStops` keeps a one-argument percentage signature does not fail loudly — it
holds the scrim at 46% of a 248px band where every drawing puts it at 81%, which is the scrim landing
almost exactly where the round exists to remove it. The handoff states the trap, gives the corrected
two-argument formula, and puts both changes in one commit in its own implementation order. That is
the single most valuable paragraph in the package.

**It read the status set out of the code rather than inventing it.** R5 drew four statuses and said
they were inferred; R6 replaced them with the shipped six, verbatim to the token, the alpha and
Building's dashed border. Every figure checked exact.

**It caught its own measurement error and re-derived six values from it.** R5 costed the mobile deck
header's block at 57px; at 390px that 20px Cinzel title wraps to three lines and the real block is
83px, which moves the unveiled figure from 71% to 57%. Deriving `labelAt` from an intended block
rather than a measured one is the round's own failure reintroduced by an optimistic number, and the
handoff says so in the imperative for whoever builds it.

---

## §5c The figures that ship, in one place

Every `labelAt` in this round, measured. STATES and the plan are both **superseded
by this table** wherever they disagree with it, and the build matches it.

**Amended 2026-09-13 (PR #556).** Three rows moved after the round shipped: two
because their blocks changed shape, and one because §A4 was overturned (§6a).
The `ships` column is the current figure; the third column is what the round
first shipped where that differs.

| render | ships | shipped 2026-09-12 | the handoff said |
|---|---|---|---|
| 01 home hero | **71** | 46 | 38 (STATES), 46 (§3.2), 63 (decision 7) |
| 02 resume row | **`flat`** — no vertical ramp | 53 | 40 |
| 04 commander detail, mobile | **96** | 109 | 57 |
| 06 discovery row | **56** | — | 46 |
| 07 owned-lane row | **63** | — | 46 |
| 08 deck tile | **46** | — | 46 ✓ |
| 09 deck spine, phone | **90** | — | 83 |

The hero's 46 counted one inset where its block has padding on both sides, and
the block is two rows now (name and pips, then the type line and the fit chip):
12 + 21 + 4 + 22 + 12 = **71**. Commander detail's name came down from 25px to
19, so two clamped lines are 44 rather than 58: 15 + 15 + 4 + 44 + 4 + 14 =
**96**. The resume row publishes no figure at all — its ink sits beside the
portrait, so the band draws no vertical ramp to key one to.

One of seven survives as given. The rule that produced them is the handoff's and
is right — measure the block, key the ramp to its wrapped worst case — and every
NUMERIC correction is arithmetic against the block that ships (the resume row's
is not a correction at all but a product decision, §6a): a padded row counted on
one side, a name clamped to two lines rather than three, a rank column that is
ink like any other, a desktop block taller than the phone's under one shared
wash.

*Written before the build: nothing in the verdict's own PR was built, and each
figure landed with the slice that drew its surface. Both checks ship now —
`wash-contrast.test.ts` holds every figure in this table, and the browser probe
compares each against the block it measures on the laid-out page, which is what
caught two of the figures above being wrong.*

## §6a Overturned after shipping — §A4, the resume row

Recorded here because a reader of §A4, of the aspect rule, or of the tracker
would otherwise re-apply a flip that has been reverted once.

| The handoff says | What ships |
| --- | --- |
| §A4: "the resume row's whole exception is deleted" — band 72's figures, its `--surface-inset` ground, the type inset and the no-shadow exemption all go | The exception stands. 72px band, 99px portrait column, `--surface-inset` ground, and no text shadow on that row. The type inset is **108px below 1000px of viewport and 116px at or above it** — the gap after the portrait is the part that gives, because at 640px the column leaves the meta line 3px less than its fixed content needs |
| The aspect rule's one flip: "the resume row leaves `left-portrait`" at 2.3–3.1:1 | It stays `left-portrait`. The rule is unchanged for every other render; this row is its one exception |
| Render 02 at a 168 `cover` band, `labelAtPx` 53 (verdict §5c) | 72 band, `labelAtPx="flat"` — no vertical ramp at all, because the row's ink sits beside the portrait rather than over it |
| Every string on that row takes `COVER_INK_SHADOW` | No string on that row takes a shadow. Its type starts at that inset — 108px below 1000px of viewport, 116px at or above it — clear of the art either way |

Restoring it meant restoring what SHIPPED rather than what the rule derives, and
two figures differ from their formulas: the portrait draws at **0.95** (the lift
that layer took when #517 deleted the ambient copy beneath it) and its clear stop
is an explicit **58** where `maskEnd% × 99` gives 61. `PORTRAITS[99]` carries a
`clearTo` override for exactly that, and `wash-contrast.test.ts` reads the
override rather than re-deriving it — composing the rule's 61 there measured a
gradient three pixels from the one the row draws.

One layout change did come with the revert: the rows are two-up only from
1000px of viewport. Each needs 255px before the commander's name gets a pixel
(116 inset + a ~62px pill + 14 gap + a ~45px count + 18 padding), and the
dashboard's left column is the viewport less 388px — so at 640px each row was
120px and its count was clipped away. Below 1000px they stack, and the inset
tightens to 108 with 10px of right padding.

## §6 Errata against the handoff, carried here rather than sent back

None of these changes a drawing. **This table is the correction of record**; the handoff's documents
are preserved exactly as delivered, each carrying a banner naming this file and the plan as the build
contract. It has more rows than the eleven findings above — a single finding can
correct several statements, and each correction gets its own row so it can be
checked one at a time.

| Handoff says | Correct | Why it matters |
|---|---|---|
| Decision 6 enumerates three live `Card details` placements | **Four ship.** `commander-desktop` (`left: 12, bottom: 12`) landed in PR #517 | Finding 1. An enumeration that misses a tenant is how the scrim's removal leaves a glyph bare |
| `nowAriaLabel: "Card details"` on the full-card trigger | Shipped: **`"View card details"`** (`full-card-trigger.tsx:81`) | Finding 2 |
| `nowAriaLabel: "Deck options"` on the deck overflow | Shipped: **the deck-named label** `refreshCopy.decks.menu.trigger(deckName)`. "Deck options" was tried and rejected, with the reason in the code | Finding 2. The handoff flagged this one itself |
| Render 01's `labelAt` is 38 (STATES) / 46 (§3.2) / 63 (decision 7) | **46**, measured. The block is a padded ROW — 12px above and below a 22px chip — and 38 counts one of its two insets, which is why STATES' own ramp row for it is arithmetic on a block that does not ship | Finding 3, and §5c is the table that governs it |
| `OVER_ART_PLATE`'s `72%` is hard-coded at `full-card-trigger.tsx:61` | **`:72`** at `main`'s `eb8d4b04` — `:65` is the comment above it, and the handoff's `:61` predates #534's `z-[2]` — and the mix is `color-mix(in oklab, var(--bg) 72%, transparent)` — 72% of `--bg` over transparency, not 72% mixed *into* `--bg`. The handoff's conclusion ("still passes 28% of a pure white pixel") is right about the value it describes | Anyone grepping `:61` finds the comment, not the class |
| `wash-contrast.test.ts:189` asserts `THEMES.size === 6` under a test named at `:188` | **`:193-194`** | Line drift only |
| `labelAt` "ships as a percentage — `globals.css` names 55% on the commander hero and 57% on the deck spine" | The values live in the components — `detail.tsx:248` and `spine-mobile.tsx:134`; `globals.css:584` only names them in a comment explaining why the override cannot reach them. And **55 is commander *detail* mobile (render 04)**, not the hero: render 01 is `labelEdge="top"` and passes no `labelAt` at all | The hero has no percentage to convert. Its figure is a new number rather than a unit change — and it is 46, per §5c |
| Render 06: "the inset frame retires" | There is no frame. The `--surface-inset` zone below the divider is art wash decision 4 and stays | Finding 5 |
| The desktop deck column is "~445px" at 1440 | The shipped comment says **435px** (`deck-card.tsx:146`) | Immaterial to the band choice — 248 is 1.75:1 either way — and worth not "correcting" the code to match the handoff |
| `clearTo` is derived (`maskEnd% × width`) | True, and deriving it **moves the shipped 230 portrait from 134 to 133** — `Math.round(0.58 × 230)` is 133.4. The handoff's own portrait table already prints 133 for that row, so the 1px is priced rather than discovered. Band 72's 58 (against 61.4) is the stated exception and retires with the row | A derived column that silently disagrees with the value it replaces is how a "no-op" refactor moves a band |
| The README's own title reads "design handoff · R1" | This is **R6** — six rounds, as its banner, `READINESS.md` and `STATES-commander-image.md` all say. The title line was never updated as the rounds stacked | A reader who trusts the title treats the newest package as the first draft |
| The canvas stacks rounds `6a`…`1a` | There is **no `6a`**: the canvas's newest section is R5's. R6 exists in the prose only — the six statuses, the pencil reversal and the measured-block correction are all in `README.md` and `STATES`. So the canvas is superseded by its own package, and a reader opening it for the current geometry sees the round before last | The handoff names the canvas first in its own inventory. Anyone checking a drawing rather than a number needs to know the drawing is one round behind |
| §3.5's aspect rule: `>3:1` → `left-portrait`, `1.37`–`3:1` → `cover`, `<1:1` → thumb | The rule has a **gap from 1:1 to 1.37** and is presented as complete. Ruled: **`cover`**, which makes the selector total — a box in that range is squarer than the crop, so `cover` crops its sides and `left-portrait` would leave ground beside a portrait narrower than its own box. No render in the app falls there today, and the 189px deck tile at 248 (0.76:1) is the nearest, which is below 1:1 and already priced | A selector with a hole is a selector the next surface has to guess at |
| **Five of the seven `labelAt` figures are wrong, and the rule that produced them is right.** STATES gives 38 hero, 57 detail mobile, 46 both commander rows, 83 spine mobile. *(As audited, 2026-09-12. Six of the seven differ as of 2026-09-13: the hero moved to 71 and detail mobile to 96, and the resume row's 40 no longer survives as given — that row publishes no figure at all. §5c is current; this row is the audit's own finding.)* | Measured against the blocks that ship. **These are the 2026-09-12 audit values**; §5c carries the current ones, and two moved on 2026-09-13 — the hero is **71** now and detail mobile **96**. As audited: **46** hero (the block is a padded ROW — 12px above and below a 22px chip — and 38 counts one inset), **109** detail mobile (a 25px name clamped to two lines, plus a rank line and a type line; 57 cannot hold a block whose name alone is 29px), **46** discovery and **63** the owned row (one wash under two breakpoint subtrees, and the desktop block is the taller — the owned lane's carries a type line and discovery's does not), **90** spine mobile (`-webkit-line-clamp: 2` forbids the third title line the handoff's 83 was measured against). Only 40 resume and 78-becomes-46 on the deck tile survived as given at audit, and the resume row's did not survive #556 | The handoff's own R6 note says a `labelAt` derived from an intended block rather than a measured one is the round's failure reintroduced. It is right, and five of its own figures are that. Every one of them now fails a browser check that measures the laid-out block against the ramp's hold rather than trusting either |
| The ramp standardises its hold on **73** for both strategies | **73 for `cover`, 78 for `left-portrait`.** 73 was measured against the cover band's 0.8 art; a portrait's sharp layer draws at 0.92, and the same hold leaves `--fg-body` at **4.33:1** over a white pixel in all six themes — which is why the hand-written column being deleted held at 78. The hold is a parameter with a 73 default, so there is still one ramp function and one shape | The handoff says deleting that column is "a deliberate re-drawing of two constants, not a no-op". This is the half of the re-drawing it got wrong, and the contrast suite caught it |
| `READINESS.md`'s implementation order heads two steps "three call sites" and "six call sites" | **Four and seven.** Step 2 lists `full-card-trigger`, `deck-card-overflow` and the rename trigger on both spines; step 4 lists seven components. The scope under each heading is right and only the count is wrong | Cosmetic, and recorded because a reader ticking off a checklist by its stated count stops one file early |
| `READINESS.md`'s step 1 tells the primitive slice to delete `COVER_SCRIM_STOPS.top`, the `labelEdge` prop, its stylesheet override and the 104px floor | Those deletions are **staged to the last slice**, and the plan says so: every one of them has a live consumer until the surfaces migrate, so deleting them in step 1 breaks four call sites. Only `OVER_ART_PLATE` and its assertion go with the primitive. The handoff's step is right about WHAT retires and wrong about when | Following the handoff's order literally makes the first build PR red |
| The copy file is "the three cuts" | It holds **six** `cuts` entries. Three of them are Product's — the resume row's to-buy clause, the tile's `all owned` and desktop's `99 owned · 0 to buy` — and the other three are this round's own: `Start this deck`, the resume row's commander name and the tile's `never played`. Decision 7's "Product owns three of these strings" is the sentence that is right; the inventory line counts the wrong set | Ownership, not scope: a reader taking "three cuts" literally goes looking for three entries and finds six, then cannot tell which need asking about |
| "Nothing is an aspect ratio. **All fifteen grow.**" | Thirteen grow. Renders **05 and 14 keep their geometry** — 344 and 220 — as the same handoff's own table says two rows later ("card face … unchanged"), and as its thumb spec implies for the two that merely change size. The sentence is true of every band and thumb and false of the two card faces | An implementer reading it as written resizes the two surfaces the round explicitly leaves alone |
| `brand/README.md` points at `The 99 Brand Discovery.dc.html` beside it | That file is not in this package; it lives in `design/design_handoff_the99_brand/`, which is the brand layer this folder carries a copy of the locked sheet from | Only a broken local link, but the brand sheet is explicitly **not a colour source**, so a reader chasing it is already off the path |
| §3.2's settled list gives spine mobile `labelAt` **66** | **83.** R6 corrects it in the same document — the 20px Cinzel title wraps to three lines in a 302px column, so the measured block is 83 and the band unveils 57% rather than 71% — and both STATES and the ramp table use 83 | The whole point of the R6 note is that deriving `labelAt` from an intended block reintroduces the round's own failure. 66 is the intended number it corrects |
| "**All fifteen** renders now have an empty top edge" (R4, repeated in STATES' chrome section) — against "**Eleven** renders have an empty top edge" in decision 6 | **Thirteen.** Two renders keep a control at their top edge, and decision 6 rules both of them there: render 09's `Card details` at `top: 13, right: 16`, because that band centres its title and the rename glyph holds the other bottom corner; and render 08's overflow at `top: 8/10, right: 8/10`, which decision 6 says takes **a plate** rather than a move. Eleven is the count of renders with no tenant before the round. R4's "fifteen" assumed 09's control joins the title row, and R6 makes that impossible — the glyph moves into the title's own run, so a 44px control opposite it would push a centred title off centre again | The count is the enumeration's result, and it is what makes deleting the top scrim safe: two plated controls up there, and thirteen bands with nothing |
| `brand/README.md` lists `The 99 — Brand Sheet.dc.html` with an em dash | The committed file uses an ASCII hyphen: `The 99 - Brand Sheet.dc.html`. **Both** of that README's two file references are broken — the sheet by its dash, and the discovery board because the only copy lives in `design/design_handoff_the99_brand/` rather than beside this one | A reader following the package's stated inventory cannot open either file, and the same section calls both pages "single self-contained HTML files" — also untrue, since each loads the sibling `support.js` that ships beside it. **Three wrong statements in one five-line section, and all three are in prose preserved as delivered**: the fix is this row, not an edit to the handoff. Nothing downstream depends on any of it — the brand sheet is explicitly not a colour source |
| `PORTRAIT_BANDS` gains three rows keyed by band | Keyed by **portrait width**, four rows: 230 / 285 / 340 / 560 | §2. One 288px band needs two portraits |
| The 560 portrait's `sharpOpacity` is unstated | **`.92`** | Finding 7 |
| Render 05's card face and render 14's differ only in shadow offset | They also differ in **ring alpha vs the new value** (both `.3`) and in that render 05 now has a control inside it. The convergence on `0 20px 50px rgba(0,0,0,.5)` and a `.4` ring holds for both | The "geometry untouched" note is true of size only |
| Render 15's plate | The shipped `PLATE` const carries the **dashed border in both states** (`partner-slot.tsx:57`, used at `:90` and `:152`). The handoff's "dashed empty plate keeps its border" reads as: filled takes the ring alone, empty keeps the dash | Otherwise the filled thumb ships a dashed edge and a ring |
| The rail's phone thumb is `26×36` inside a `min-h-[56px]` row | True, and a 62px thumb makes that row ~86px | Dependency table. A consequence the spec does not price |

---

## §7 The one thing this round must not re-derive

Two traps in this system are already documented on the art-wash row of the pipeline tracker, and both
sit directly in this round's path:

1. **`!important` in the accessibility media queries is load-bearing**, because `<ArtWash>` sets
   opacity and gradients inline and an inline declaration outranks any plain selector. The top-scrim
   override retires; the `.art-wash-art` opacity rule and its `!important` do not.
2. **`--art-wash-reduced-opacity` is a ceiling and never a floor.** Applied flat it raises a layer
   already drawn below it — the example it was written against was a `left-portrait` row's ambient
   copy at 0.14 against a flat 0.3 — answering a request for less transparency with more art. That
   layer is gone as of PR #517; the rule stands for every layer that remains, and the no-crop identity
   gradient keeps publishing its own opacity because it is ground rather than photography and is the
   only identity signal a commander with no crop has.
