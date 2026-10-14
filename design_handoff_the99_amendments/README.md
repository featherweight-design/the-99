# The 99 — Four amendments to shipped surfaces (design hand-off, R3)

One hand-off, four amendments: three addenda to shipped surfaces and one new flow. Everything
needed to review or build them is in this folder.

> **R3 — correction pass on the R2 audit.** §1's value moves again, and this time a shipped test
> decided it: `src/lib/theme/contract.test.ts:145` asserts `deltaEOk(pip, accent) >= 0.1` for
> every WUBRG pip in every theme, and R2's `#857A93` measured **0.087** against Oil and Iron and
> 0.092 against Rune Frost — two red themes, and the 0.087 this hand-off had been quoting as a
> safety margin *was the breach*. R1's neutral failed it harder at 0.064. **Called: `#98748F`** —
> same lightness, hue 335, C 0.059, **ΔE 0.115** on both binding themes. `#8E7792` also passes,
> at exactly 0.100, and is rejected for having no headroom. Also corrected: the claim that CI
> cannot see this change (**it gates it**), and the chroma-budget argument (the budgets are
> stated for surfaces, borders and text and never applied to WUBRG — `--r` ships at C 0.138).
> §1's ruling sentence is rewritten rather than patched. **No frame is redrawn.**
>
> **R2 — correction pass on the R1 audit.** §1's value moved from R1's neutral `#837D78` to a
> hued value at the same lightness, answering the review's *"reads almost identical to white"*
> (`CONTRAST-black-pip.md` §7). §2's phone entry point became **both**, now that the deck-card
> `⋯` menu ships at 390px. Seven figure corrections: the `--border-dashed` floor, the binding
> `--bg` glyph case (**Moonlit**), `lightbox.tsx`'s length (**282** lines),
> `LightboxCommander`'s **six** fields, the call-site count (**22 reads across 15 component
> files**), §2's state count (**24**), and §3's **two** dead tests.
>
> Amendments 3 and 4 audited Green and are cleared to build; §2 stays 🟡 on the same two items.

**Canvas:** `The 99 - Four Amendments (R3).dc.html` — pan/zoom, with a contents cover. Each
amendment is a section (`#a1` … `#a4`) and every section links back to the cover.

| # | Amendment | Scope | Verdict | The call |
|---|---|---|---|---|
| 1 | **The black mana pip** | app-wide atom, all six themes | 🟢 | `--b` `#1E1B1A → #98748F`, six declarations, `PIP_TEXT` deleted. No component file changes. |
| 2 | **Update a deck by re-import** | new flow, the largest | 🟡 | Diff always shown, nothing written until Apply, removals lead the screen with a per-row `Keep`. |
| 3 | **Decks over 99** | `/decks` + builder | 🟢 | A fifth pill value `Over`, a count that keeps its denominator, a bar whose amber remainder *is* the trim. |
| 4 | **Commanders detail, "Full card"** | `/commanders/[slug]`, both widths | 🟢 | The rich modal wins, the lightbox is deleted, `Full card` → `Card details`. |

## Sequencing — one dependency, one shared file

- **Amendment 2 is blocked on amendment 3.** An update that lands a deck over 99 is refused by
  `add-validation.ts:42`'s cap, and the player's list then arrives five cards short with nothing
  on screen saying which five went missing — the worst outcome available in a feature whose
  whole promise is *the list becomes the deck*. If 3 slips, 2 needs a hard stop in the diff and
  that is a redraw.
- **Amendments 1 and 4 meet in one file.** `PIP_TEXT` lives in `lightbox.tsx`, which amendment 4
  deletes outright. Either order works; whichever lands second finds its work done.
- 1, 3 and 4 are independent of each other in every other respect.

## What the whole hand-off asks for — four rulings

1. **The black pip stops reading as near-black** (§1 decision 2). Rejecting it means accepting a
   ring, and a ring cannot follow card art.
2. **`Over` is a fifth status value** (§3 decision 3). The fallback — `Building` at 104 — is
   drawn and costs one branch.
3. **`Full card` becomes `Card details`** (§4 decision 2). Keeping the old label makes the
   art-size regression a genuine problem rather than a trade.
4. **The diff is the undo** for v1 of re-import (§2 gap 1), on the record. **This is the only
   one of the four whose "no" is a redraw.**

---

## §1 · The black mana pip

`--b: #1E1B1A` is declared identically in all six themes and every theme's chrome sits within a
hair of it. Measured against the three grounds a pip renders on, black scores **1.01:1 to
1.27:1** across eighteen theme/ground pairs. The pip is not dim, it is absent — across all 22
reads of it, in 15 component files, since the theme system landed.

**Called:** `--b` becomes `#98748F`. One hex, six declarations, no per-theme toning, and
`PIP_TEXT` is deleted. After: **3.37:1 – 4.88:1**. Full ledger in `CONTRAST-black-pip.md`.

**Four gates set the value**, and the binding one is a shipped test. ≥ 3:1 against the lightest
ground (`--elevated`, Rune Frost) → 3.37. ≥ 4.5:1 for a `--bg` glyph *on* the disc (the lightest
`--bg` by luminance, **Moonlit**) → 4.65. **ΔE ≥ 0.100 from that theme's accent
(`contract.test.ts:145`, all five pips × six themes) → 0.115** — *this* is the binding
constraint, and R1 and R2 both failed it. ΔE ≥ 0.100 from every other pip → 0.122. The chroma
budgets never applied: they are stated for surfaces, borders and text, and `--r` ships at
C 0.138. `#7C7671` clears 3:1 on every ground and still fails
the glyph at 4.17.

**Why not a ring.** A ring only separates a disc from its ground if it contrasts with *the
ground*, so a ring token has to follow the ground — which is what the availability pass found
when it wired `--pip-ring` to the row background. **Pips render over art in three places** (the
commander art header, the deck card thumb, the card modal's blurred wash) and there the ground
is a photograph. No token can follow it. So a ring answer is either "a ring everywhere except
where it matters most" or a per-surface override — the per-surface patching the brief rules out.
A lifted disc has no ground dependency at all.

**Black stops being near-black, and that is the substance.** A pip's job is identity. On six
canvases between `#151317` and `#1E1F26`, "the darkest disc" and "a hole in the card" are the
same picture, so the identification moves to the axis still available: **black is the only pip
with no hue.** It remains the darkest of the five, 3.35:1 below `--w`. Honest cost: in isolation
it reads grey — and it never renders in isolation; all 22 of them sit beside a caption.

**Two unreported halves of the same bug, found by measuring.** `mana-pips.tsx` gives all five
WUBRG pips `--bg` ink, so the card modal's `B` glyph has been invisible too — nobody logged it
because the disc was invisible as well. And `ColorPip`'s unselected black composited to
**1.00:1**, pixel-identical to its surface: a filter control with an option you cannot see.

**Engineering:** six `--b` values in `globals.css`; delete `PIP_TEXT`. Nothing else. All
22 reads read `WUBRG_COLOR` → `var(--b)`. Check `globals.test.ts` for value pinning;
measure chroma *after* quantisation.

**Gaps:** `--w` is now the family's outlier at 15.8:1 · `ColorPip` at 0.40 opacity reaches only
1.74:1 (was 1.00) and fixing it is a second file · `--b` vs `--border-dashed` is the new tightest
pair, floor **2.23:1** in Screen Glow, accepted on four simultaneous differences · "black reads
violet in isolation" is a real taste cost, taken at R2 in preference to R1's neutral, which read
as a second white.

---

## §2 · Update a deck by re-import

The shipped importer says the opposite in a source comment: *"there is deliberately no dedupe —
updating in place is sync, a different and much larger feature, and quietly becoming it is the
failure mode this comment guards against."* This is that feature, built deliberately.
**Everything in the shape follows from one fact: a first import risks nothing, and an update can
remove cards the player placed by hand.**

**Numbers, used consistently across the canvas, `STATES-reimport.md` and the copy file:** deck at
91 built + 2 unresolved; paste of 106 lines → 103 matched + 3 unnamed; 84 unchanged, 19 in, 7 out
of which the player keeps 1 → applied as 19 in / 6 out; lands at 104 / 99, which is §3's `Over`
on purpose.

| Call | Answer |
|---|---|
| Entry point | **Both, at both widths** — the deck card's `⋯` menu (first, above Rename) and a `GhostButton` beside Export in the spine. One route, `/decks/[id]/import`, reachable only from a deck. |
| Diff first? | **Always.** The product's first confirm step, earned because this is its first destructive action. A **page**, not a dialog. |
| Removals | **Listed, not counted**, first on the screen. Per-row `Keep` (`aria-pressed`, row changes not just the glyph) and `Keep all N` in the header. Default is remove: the list is the source of truth. No strikethrough, no red. **Corrected at amendment 6 R1: the `you added this` marker is deleted** — see the note at the foot of this file. |
| Arrival | The shipped strip's geometry with **delta copy instead of total copy**, its own `?updated=19-6` param parsed strictly, and **a dismissal that is not persisted** — reusing `arrivalDismissKey(deckId)` would mean the strip never shows on any deck that was ever imported. |
| Celebration | **Suppressed, with no new flag** — the update param is read into the existing `arrivedFromImport` argument. `celebration.ts` untouched. |

**Four groups, ordered by what is at stake:** out, in, unnamed, unchanged. Out first because it
is the only group with a decision and the only one that can lose the player something. In is a
list, not a decision — refusing individual additions turns update into a curated merge, which is
the quick-add bar's job. Unnamed reuses the shipped unresolved-row treatment whole. Unchanged is
collapsed behind one disclosure; eighty-four decision-free rows above the apply control would
*be* the screen. Groups cap at four rows plus a disclosure at both widths, which is what keeps
the removals and the dock on one phone screen.

**The CTA states what it will do, live:** `Update the deck — 19 in, 6 out`, recomputed on every
`Keep`, with `1 kept · lands at 104 / 99` beside it. It is the last thing read before the only
irreversible click in the flow, so it does not say "Apply".

**Update cannot change the commander.** A swap re-decides the colour identity and legality of all
ninety-nine — a new deck wearing an old name. The conflict state is the shipped warning banner
with two exits, and the primary one is the flow that already works: the list becomes its own
deck, carrying the text already pasted. It also cannot merge, cannot rename, and never runs
unattended.

**`Everything out` is a line, not a block.** Past 75% removals, one warning line and one extra
exit. Nothing is blocked — rebuilding a deck from scratch is legitimate.

**What Apply writes (five non-visual calls):** added cards are `auto = false`; **`auto` is
cleared on every unchanged card the list names**, so `Clear all auto` afterwards cannot delete
what the player just declared; unresolved rows are replaced, not merged; kept cards are left
exactly as they were, `auto` included; one transaction, with the shipped synchronous-ref
double-submit guard.

**Engineering:** new route `app/decks/[id]/import/page.tsx`; new components `update-entry.tsx`,
`update-diff.tsx`, `update-diff-row.tsx`; new **pure** module `lib/decks/update.ts`
(`planDeckUpdate`) so every ruling is a unit test; new server action `updateDeckFromList` that
**re-parses server-side** — the client contributes only the `keep` array; `UPDATED_PARAM` +
`parseUpdateArrival` in `arrival.ts`, no new localStorage key; one `<a>` in
`deck-card-overflow.tsx`; one `GhostButton` in `builder-spine.tsx`. `buildDeckImport` is reused
unchanged. **The one shipped edit in this amendment is `importDeck`'s doc comment**, which is now
wrong and is load-bearing documentation.

**Gaps:** no undo of an applied update (the ruling above) · a basic land's quantity change is
invisible · ~~`you added this` is a proxy — `auto = false` is also true of a previous import's
cards~~ **closed at amendment 6 R1 by deleting the marker** · the hard dependency on §3 · no stored source or
import history, deliberately · a 400-line paste expands to a 300-row group with no windowing ·
the 75% threshold is a judgement · the diff cannot show what a card *does*.

---

## §3 · Decks over 99

Lifting the cap means a list can arrive at 104 and be trimmed back. Overfilling then cutting is
how a deck actually gets built, so the over state takes **no `--danger`, no `role="alert"`, no
band, no disabled control, no confirm step and no ceiling** — it takes `--warning`, the colour
`Building` already wears, and it says how many to cut.

| # | Element | Shipped | Called |
|---|---|---|---|
| 1 | Count | `104` / `104 / 99` | `104 / 99` **+5**, built figure `--warning` |
| 2 | Bar | `Math.min(100, built/99)`, one fill | denominator `max(99, built)`: 99 in `--success` + remainder in `--warning`, 1px `--bg` seam |
| 3 | Pill | `Complete` at `>= 99` | **`Over`** at `> 99`; `Complete`/`Playable` narrow to `=== 99` |
| + | Spine | — | one trim line under the owned/to-buy caption |
| + | Deck card | — | `5 to cut`, in the unresolved marker's slot and type |

**Under 99, every surface is byte-identical to what ships**, `Math.min` and all. Full matrix in
`STATES-over-99.md`.

**The bar's re-scaling is the load-bearing idea:** the amber segment *is* the trim, at scale
(4.8% at 104, 27.7% at 137) — and because the fill can never overflow its track, an unbounded
cap has no drawing problem. That is what removes the need for a "sane maximum" nobody can
defend.

**Why a fifth pill value is cheap here.** The deck-import handoff closed the vocabulary at four
because a fifth would have threaded `unresolvedCount` — *a new input* — through the server list
and the optimistic client list. `statusPill()` already takes `built`. This is one branch on an
argument that is already there. Falling back to `Building` was rejected as a lie of omission: a
player at 104 is cutting, not building toward anything, and `Building` beside a `Complete` 99
makes the bigger deck look less finished for no stated reason.

**The trim line is in the spine's centre column, not a band.** `RollupBands` is the availability
system — claims about your *collection*, red because two decks wanting one card is a real
conflict. Being over 99 is a claim about this deck's arithmetic, so it sits beside the
arithmetic. It reads: *"**Five over the ninety-nine.** Cut five and it is legal. Building long
and trimming back is a normal way to get there."* — the third clause tells a first-time
overfiller they have not broken anything, and it drops at 390px.

**Two free consequences of `Complete === exactly 99`:** a deck that *arrives* over 99 can never
fire the completion reveal, which closes the #42 collision from a third direction with no new
suppression; and cutting 104 → 99 by hand *does* fire it, correctly, because the status flips on
a removal the player performed.

**Only a human add and an import can exceed 99.** `add-validation.ts`'s `deck-full` guard goes;
every other stop stays — the 68-card fill, both last-31 controls and every suggestion path still
stop at 99, because the app cannot know which five cards the player meant to cut.
`planLastSlots` needs no edit at all: `openSlots <= 0` already returns an empty plan, so the
last-31 strip unmounts on its own arithmetic.

**`MATURE_DECK_SIZE` stays `>= 99`, deliberately not narrowed to match the pill.** An over deck
claims your collection *hard* — 104 sleeved cards are 104 cards another deck cannot have. The
pill is about legality; that constant is about physical cards.

**Export stays enabled and brass**, gaining one line inside the dialog. `mutation-result.ts`'s
cap message is **deleted, not reworded**, along with its union member and **both** its tests
(`mutation-result.test.ts` and `add-validation.test.ts:66`).

**Gaps:** the fifth value sets a precedent (the test is "is the input already an argument to
`statusPill`?") · nothing walks the player to the cards to cut, deliberately · `toBuyCount` at
104 offers cards for slots that do not exist · two `--warning` lines now share the deck card ·
137 is drawn but not designed for.

---

## §4 · Commanders detail, "Full card"

Every other card on the commander detail page opens `CardModal` through the provider already
mounted at `detail.tsx:240`. The commander itself opens a bespoke lightbox that draws a picture
of a card and tells you to tap anywhere.

**Called: the rich modal wins and the lightbox does not survive** — 282 lines plus a test file.
Element-by-element mapping in `PARITY-lightbox-to-modal.md`: 4 cut, 1 kept smaller, 8 absorbed,
5 kept, 8 added.

The modal is a strict superset except art size (262px → 180px). It adds Set, Rarity, Identity,
You own, **the printing picker** — on the card players most want alternate art for, previously
unreachable from either width — the availability block (*"your only copy is in a finished
deck"*), real oracle text instead of pixels plus an `sr-only` transcript, and desktop, which the
lightbox never had. **Enriching the lightbox instead produces `CardModal`, badly, on one route.**

**The label changes with the destination:** `Full card` → **`Card details`**. A control labelled
`Full card` that opens a details panel has lied. `Details` alone is weightless on a page that is
already all detail; `Card details` names subject and surface, and is the app's own phrase — the
close button on the thing it opens reads *Close card details*. The `⛶` glyph stays (it is the
"open this bigger" mark, not a promise about pixels) and the accessible name stops being bespoke,
falling back to the shared `View details for {name}`.

**The art regression is answered, not argued away.** The modal's phone header puts the same art
full-bleed behind the sharp copy at `0.45 / blur(22px) / scale(1.2)` — the lightbox's own device
(`0.28 / 3px`) taken further — and the card modal's source explains why the sharp copy is small:
at full sharpness the band and the tile made the card's text legible twice over at two sizes.

**The no-art fallback is kept by not drawing a card.** The lightbox drew a frame — name, pips,
oracle glass over a gradient — because the picture *was* the surface. The modal puts all of those
on screen at larger sizes as its own content, so the art slot takes `identityGradient`. That
frame is most of the 282 deleted lines.

**Desktop gets the same trigger — the one thing beyond the brief.** The desktop page has no
route to the printing picker at all, so the art panel becomes the same `CardDetailTrigger`
`builder-spine.tsx` already uses on the commander thumb. No chip, no glyph. **Reject it and
nothing else changes.**

`1 of 1` with both arrows disabled (a commander has no peers on its own page; passing the ranked
list would let the modal disagree with the page behind it). No `Add` control on this route — the
modal must not assume a deck. The client payload shrinks: `LightboxCommander` shipped six card
fields on every render for a surface most players never open.

**Gaps:** the gradient fallback wants one eyes-on check against a real commander with no
`imageUri` · the fetch is a new ~150–400ms wait on this route, already announced · `You own ×1
copy` is dull except in the claimed case · nothing replaces the poster gesture · the desktop art
becomes a button with no visible affordance (matching the spine) · two Escape stages where the
lightbox had one.

---

## Files

- `The 99 - Four Amendments (R3).dc.html` — the canvas: cover + four sections (`#a1`–`#a4`).
  The cover carries the R3 change block; §1 opens with the candidate-comparison panel.
- `README.md` — this file: the combined decisions log and gap report.
- `READINESS.md` — combined readiness, per amendment, with what blocks each.
- `CONTRAST-black-pip.md` — §1's measured ledger: 6 themes × 3 grounds × before/after, the
  glyph pass, and the rejected candidate values.
- `STATES-reimport.md` — §2's state matrix: 24 states across five steps, both widths.
- `STATES-over-99.md` — §3's state matrix across the whole range of `built`.
- `PARITY-lightbox-to-modal.md` — §4's element-by-element mapping of the deleted file.
- `black-pip · copy strings.ts`, `deck-reimport · copy strings.ts`, `over-99 · copy strings.ts`,
  `full-card · copy strings.ts` — production copy, one per amendment, each naming what it
  replaces and what it deletes. **Filenames deliberately match the per-amendment folders**, so
  the canvas's own links resolve whether it is read here or in its source folder; numbering them
  broke those links twice.
- `brand/` — the locked brand sheet + brand README, copied in for self-containment.
- `support.js` — runtime for the HTML reference; not production code.

**Amendment 5 (#281) — Shopping reads availability — was added to this folder on 2026-09-05 as
new files only, and nothing above is reopened by it:** `The 99 - Shopping Availability (R1).dc.html`,
`AMENDMENT-5-README.md`, `AMENDMENT-5-READINESS.md`, `STATES-shopping-availability.md`,
`shopping-availability · copy strings.ts`. It is independent of all four above; on an over-99
deck it and §3 both render and neither mentions the other.

**Amendment 6 (#292) — Keep all auto — was added to this folder on 2026-09-06** as
`The 99 - Keep All Auto (R1).dc.html`, `AMENDMENT-6-README.md`, `AMENDMENT-6-READINESS.md`,
`STATES-keep-all-auto.md`, `keep-all-auto · copy strings.ts`. One control in the decklist group
toolbar: `Keep all {n}` beside `Clear all auto · {n}`, so that agreeing with the fill has an
affordance and the `auto` tag can finally clear. **It reopens exactly one thing above** — §2's
`you added this` marker, whose four copy keys (`handAdded`, `ariaHandAdded`, `outBodyHandAdded`,
`outBodyMobileHandAdded`) are deleted from `deck-reimport · copy strings.ts`, closing §2's gap 3
by deletion rather than by wording. No frame in the R3 canvas is redrawn.

The four per-amendment folders (`design_handoff_the99_black_pip/`, `…_deck_reimport/`,
`…_over_99/`, `…_full_card/`) remain as the sources this package was assembled from; nothing in
them is newer than what is here.
