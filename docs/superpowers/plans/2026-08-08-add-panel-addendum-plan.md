# Execution plan — Add panel addendum (#183 · #177 · #179 · #185 · #184 · #176)

Six follow-ups left open by the #158 epic-run, drawn in Design's R3 addendum and merged as PR
[#199](https://github.com/HartiganHM/the-99/pull/199). This plan doubles as the eng spec; there is
no separate spec document, matching the decision taken for the printings epic on 2026-07-27 and
repeated for #158.

Design ground truth: `design/design_handoff_the99_add_panel/ADDENDUM-README.md` (decisions log and
component spec), `ADDENDUM-READINESS.md` (verdict and the #176 ruling), the `.dc.html` canvas, and
`add-panel addendum · copy strings.ts` (keyed and ready to paste).

**The canvas beats the README's prose wherever they disagree.** That rule was re-derived three
times during the #158 run; it has not changed.

## How to read this plan

Six PRs, in order. Each has numbered tasks naming the file and what changes. Tests are written
first — every task below that touches logic names the assertion before the implementation.

PR 6 is the polish slot epic-run reserves for cold-eyes findings. It is deliberately unscoped.

## Five corrections to the handoff, found while writing these tasks

The addendum's code claims were verified against `main` at `e14463e` before this plan was written.
Most hold. These five do not, and each one changes a task:

1. **#177's Create button is already inside the mobile sticky footer.** The addendum says it
   "moves into it". `create-picker.tsx:479` already renders `md:hidden fixed bottom-0 left-0
   right-0 z-20` containing a Selected mini-summary, the name input, an error slot, and the
   button. The real defect is narrower and sharper: the shell tab bar at `nav.tsx:215` is
   `md:hidden fixed inset-x-0 bottom-0 z-40`. **Same edge, higher z — the tab bar renders over the
   Create button.** The fix is the footer moving to `bottom-[80px]` with matching page padding,
   not a relocation. The summary line the addendum asks for above the button also already exists.

2. **The builder's empty `<section>` is not `flex-1`.** The addendum says it "stops being `flex-1`
   against the scrollport". `builder-shell.tsx:338` carries explicit `py-[40px] md:py-[60px]` and
   no `flex-1`. The `flex-1` is on the scroll region at `:248`
   (`flex-1 flex flex-col min-w-0 md:min-h-0 md:overflow-y-auto`), and **that element has no
   `padding-bottom` at all**. So the reserve is genuinely missing — which is #183 — but it is
   missing from a different element than the one the addendum names. Task 2.1 targets `:248`.

3. **`RECOMMENDED_MIX.land`'s singular label does not become dead data.** The addendum's §8 note
   for eng says deleting `strip.shelfLinkAria` orphans it. `mix.ts` has **one** `label` field, and
   it has live consumers at `role-counter-strip.tsx:87`, `builder-shell.tsx:144` and
   `unresolved-group.tsx:122`. The replacement string `strip.cellLinkAria` also lowercases the
   label, so the singular form is still consumed by the very string that supersedes it. **Do not
   delete anything from `mix.ts`.** What goes false is the *comment* at `mix.ts:74-75`, which
   explains the singular choice by naming `strip.shelfLinkAria`. Delete the comment, keep the
   label. Flag this to Design at R4 rather than acting on the note as written.

4. **The lift string is hardcoded in the component, not in the copy module.** `suggestion-tile.tsx:109`
   renders `` {`+${Math.round(lift * 100)} pts vs. average`} `` inline. The addendum's `tile.lift`
   is therefore both a new key and a de-hardcoding — a user-visible string currently living
   outside `src/lib/copy/`, which is a convention violation the copy pass should have caught.
   Same for `tile.evidenceLabel`, which has no current equivalent at all.

5. **Two test files assert strings this plan changes.** `role-counter-strip.test.tsx` asserts the
   `shelfLinkAria` anchor across six cases (lines 34–70) and will be substantially rewritten by
   PR 4, not merely updated. `consider-panel.test.tsx` asserts `shelf.noTarget` verbatim including
   its em dash. `src/lib/copy/decks-builder.test.ts` also exists and covers the copy module.
   Test edits ship in the same PR as the string change.

---

## PR 1 — Copy: the six locked-block edits that depend on nothing

The nine `REPLACES` entries split cleanly. Six of them are standalone corrections that no ticket
gates; three (`strip.hint`, `strip.shelfLink`, `strip.shelfLinkAria`) are orphaned by #184 and go
in PR 4 with the code that orphans them. Doing the six first keeps four later PRs off the copy
file and removes the epic's main merge-conflict surface.

1. **`shelf.noTarget`** — `no target — this is the deck's plan` → `no target · this is the deck's
   plan`. Update the verbatim assertion in `consider-panel.test.tsx` in the same commit.
2. **`degraded.body`** — the em dash becomes a full stop, two claims in two sentences. Value
   verbatim from the addendum copy file.
3. **`quickAdd.ownedFilterOffNote`** — `filter off — N results…` → `filter off · N results…`.
4. **`builderEmpty.caption`** — the em dash *and* the doubled "ninety-nine". Verbatim from the
   addendum: `Ninety-nine slots, zero filled. Type a name below, or take the ones we've already
   picked out. ${commander} eats everything anyway.` **"A king with no army." and "eats everything
   anyway" are locked and verbatim** — only the joint between clauses moved.
5. **New `tile.evidenceLabel`** (`edhrec`) and **new `tile.lift`** (`(pts: number) => \`+${pts} pts
   vs. all decks\``). Render the label as a 9px `--fg-locked` span before the inclusion bar with
   `gap 6px`, on every tile that prints a percentage. **Replace the hardcoded string at
   `suggestion-tile.tsx:109` with the new key** — see correction 4. The `inclusionAria` sentence
   is unchanged; this is a drawn label, not a reword.
6. **Tests** (`decks-builder.test.ts`, `consider-panel.test.tsx`, `suggestion-tile` coverage):
   assert the new lift phrasing names the baseline, and that no string in `addPanelCopy` contains
   an em dash. That last assertion is cheap and is what stops this class returning.

**Gate 7** (copy review) fires — this PR *is* copy. **Gate 3** (sibling sweep) fires hard: grep
every changed literal for surviving copies before pushing, including in tests.

---

## PR 2 — #183 + #177: the bottom-of-viewport rule, on two routes

One rule, two routes. The addendum's decision 1 is the whole of this PR:

```
Layer 3  content        reserves the stack below it; centres INSIDE the reserve
Layer 2  route dock     one per route. sticky/fixed, bottom: 80px (phone) / 0 (md)
Layer 1  shell tab bar  fixed, 80px, phone only. owns the true bottom edge
```

Reserve is `dock + 80px + 12px` on phone, `dock + 12px` on md. No new token — `80px` is the value
already hard-coded at `shell.tsx:34` and `builder-shell.tsx:475`.

1. **`builder-shell.tsx:248`** — the scroll region takes the reserve as `padding-bottom`. See
   correction 2: this is the `flex-1` element, and it currently has none.
2. **`builder-shell.tsx:338`** — the empty `<section>` takes `min-height: calc(100% - reserve)`
   so its content centres *inside* the reserve rather than through it. Where that leaves the
   composition tight, **the illustration pays, not the copy**: crab `72 → 64px`, card fan
   `96 → 88px`. The caption is the only line telling a first-time builder what to do next.
3. **Do not take the cheap fix.** Hiding the quick-add bar on the empty builder clears #183 in one
   line and deletes one of the two entrances the empty caption points at. The dock is not
   conditional; the reserve is. Stated here because it is the change a reviewer will suggest.
4. **`create-picker.tsx:479`** — the fixed footer moves from `bottom-0` to `bottom-[80px]` on
   phone, and the page gains matching `padding-bottom` so the last commander row is reachable.
   Per correction 1 the button and summary already live there; **no relocation, no new markup.**
   Keep `fixed` rather than converting to `sticky` — the footer sits outside a scroll region.
   Desktop is untouched: no tab bar, no occlusion, and the Selected sidebar keeps the button.
5. **`shell.tsx` comment** — the `bottom-[80px]` comment at `builder-shell.tsx:465-467` explaining
   why a sticky element does not see the main's `pb-[80px]` stays. It is the other half of this
   rule and is now load-bearing for two routes instead of one.
6. **Tests**: the empty builder's caption is not occluded at a phone viewport, and `/decks/new`'s
   Create button is not occluded. Both are layout assertions best made in Gate 2's runtime pass
   rather than jsdom; assert in tests what jsdom can see (the classes and the computed reserve),
   and force the rest at runtime.

**Gate 2 is the gate that matters here** and cannot be skipped: drive both routes at a phone
viewport, with a real deck and with an empty one, and confirm nothing sits under the tab bar.
**Gate 3**: grep for other surfaces pinning a CTA low — `collection/page.tsx:79` already carries a
`min-h-[calc(100vh-80px)]` and should be read against the new rule even if it does not change.

---

## PR 3 — #179 + #185: the row gets a remove control, and removal gets an undo

These are one component and one branch, so they are one PR. #179 is the affordance; #185 is what
happens after it is used.

1. **`decklist-row.tsx:109-120`** — drop `hidden md:block` from the ✕ and give it a `44×44` phone
   hit box; desktop keeps its inline target. Glyph stays `13px`; **the target is the padding, not
   the glyph.** Keep `disabled={isPending}` and the existing `aria-label={\`Remove ${card.name}\`}`.
   Never render it on a meta row.
2. **Multi-copy aria.** A stack of basics decrements rather than unmounting, so use
   `row.removeCopyAria(name, quantity)` when `quantity > 1` — the phone label says which of the
   two is about to happen.
3. **The undo row replaces the removed row in place.** `decklist-row.tsx:59`'s
   `if (applied && card.quantity <= 1) return null;` returns the undo row instead. Same
   min-height, `--surface-sunken` fill, `1px dashed --border-strong`. Label Plex Mono
   `11.5px / 12px --fg-locked`, **no strikethrough**. Undo control: phone `44px` tall, desktop a
   text button with a `1px --brass-shadow` rule.
4. **Only a last copy gets one.** A stack that decrements keeps its row, so the row is its own
   receipt.
5. **Undo is a re-add, not a rollback.** `addCardToDeck(deckId, oracleId)` — verified at
   `actions.ts:185`, returns `DeckMutationResult` — with the row's own optimistic add, the same
   call the tile makes. **No new server action, no new server state.**
6. **Lifetime, exactly.** The undo row is **decklist state, not row state** (the row unmounts), so
   it **survives a tab switch to Consider and back** and any re-sort. Cleared by exactly three
   things: Undo pressed, the next removal, or leaving the builder route. **Never by a timer** —
   #185 exists *because* the optimistic path makes the row vanish faster than a mis-click is
   noticed, and a 5-second toast that also vanishes fixes half of it.
7. **One undo row at a time.** A second removal settles the first.
8. **The counts do not wait.** The group count above a spent slot decrements immediately
   (`Artifacts 6 → 5`) along with the 99 count. The slot is a receipt, not a pending state — a
   deck that held its counts for the life of the row would be lying about its own size.
9. **Announce on the existing live region.** `builder-shell.tsx:244-246` already has
   `<span className="sr-only" aria-live="polite" aria-atomic="true">`, currently written only by
   `announceAdd`. Removal and undo write to **that same region** so five fast edits read in order:
   `Sol Ring removed · 46 of 99 · undo available`, then `Sol Ring back in the deck · 47 of 99`.
   Do not add a second region.
10. **A failed undo says so in the row**, via the existing `MutationError` — not in a banner. The
    undo row is the only thing between a mis-tap and a lost card.
11. **Tests** (`decklist-row.test.tsx`, extended): the ✕ is present and 44px at a phone viewport;
    a last-copy removal yields an undo row; a multi-copy removal does not; Undo re-adds via
    `addCardToDeck`; a second removal settles the first; the counts decrement on removal rather
    than on undo expiry; both announcements land on the existing region.

**Gate 5 is the gate for this PR** and its repeat pass is not optional. Remove → undo → remove the
same card again, and remove → switch to Consider → switch back. Any state keyed by something that
outlives the row will fail the second one.

---

## PR 4 — #184: the cell is the link, and rationale becomes one disclosure

**Ten targets become six.** An anchor cannot nest inside the button that owns the rationale, so
the build drew the link beneath the cell. That constraint is real; the answer is to move the
rationale, not to add a second control.

1. **`role-counter-cell.tsx`** — a **short** cell becomes the control: `onClick` is `onSeeShelf`,
   the nested `<a>` at `:93-109` goes, and the per-cell `aria-expanded` disclosure at `:112-124`
   goes with it. A **met** cell is a figure with no action — `div`, not focusable, prints `—` in
   `--border-dashed` where the caption was.
2. **The `consider →` caption stays as a label inside the cell**, so it can remain 9–10px: it is
   no longer a target. 44px arrives for free — the desktop cell is `72px` tall, the phone cell
   `62px`. Replace the `cursor: help` at `:44` with a pointer on short cells.
3. **New strip-level disclosure** — `strip-rationale.tsx`, or a `<details>` in
   `role-counter-strip.tsx`. One per strip, carrying all five `RECOMMENDED_MIX[role].rationale`
   strings, which `mix.ts` already holds. Panel spec: `--surface-sunken`, `1px --border`,
   `border-left 3px --brass`, radius `9px`, four lines at `12px --fg-body` with the role in `--fg`.
   Five separate expansions each pushing the strip taller become one panel that answers the whole
   strip at once, which is how a player reads it anyway.
4. **Focus on arrival.** `scrollToShelf` at `builder-shell.tsx:5-6` only scrolls today. Shelf
   headings already carry `id="shelf-${role}"` (`consider-panel.tsx:91,106`) but **no
   `tabIndex={-1}`**. Add it and move focus, not just scroll — otherwise a keyboard user activates
   the cell and their focus stays behind.
5. **REPLACES 7–9, the three strings this PR orphans:**
   - `strip.hint` is the **same key at a new value**: `A cell under target opens its shelf below`.
     Both locked clauses go false once the cell is the control. **Overwrite it — do not merge the
     two objects and leave two live values.** This was the addendum's one genuine shipping hazard.
   - `strip.shelfLink` (`consider`) — **delete**, superseded by `strip.cellLink` (`consider →`).
     The arrow moves into the string because the label is no longer a link and cannot borrow the
     affordance from one.
   - `strip.shelfLinkAria` — **delete**, superseded by `strip.cellLinkAria`:
     `Ramp, 4 of 10. See ramp cards to consider.` Two sentences; the em dash it carried was in
     scope for the same rule that removed four others.
6. **Delete the now-false comment at `mix.ts:74-75`, and nothing else in that file.** See
   correction 3 — the singular label has three other live consumers and `cellLinkAria` still
   lowercases it. Raise the addendum's note with Design at R4.
7. **Tests**: `role-counter-strip.test.tsx` is substantially rewritten, not patched — its six
   anchor cases (`:34-70`) test a link that no longer exists. Replace with: a short cell is a
   button carrying `cellLinkAria`; a met cell is not focusable and has no caption; activating a
   short cell moves focus to the shelf heading; the strip disclosure renders all five rationales;
   `strip.hint` has exactly one live value.

**Gate 3** applies to the two deleted keys — grep both for consumers before deleting, and expect
`role-counter-cell.tsx:104,107`. **Gate 2**: force a strip where every role is met (no short
cells at all) and one where every role is short.

---

## PR 5 — #176: unowned staples get a tile and a shelf

**Product ruled A on 2026-08-06**: unowned EDHREC staples keep reaching Consider, marked.
`getDeckSuggestions()` has appended up to five since #25 — verified at `actions.ts:105-170`, where
`unownedSuggestions = eligible.slice(0, 5)` carries `owned: false` and merges at `:173`. Today
those five signal themselves only by the *absence* of an `aria-hidden` dot.

1. **`suggestion-tile.tsx`** — `suggestion.owned === false` is the only new branch. The ownership
   dot's slot (`:200-206`) takes the decklist row's shipped `buy` tag: Plex Mono `9px --warning`,
   `rgba(20,17,14,.82)` fill, `inset 0 0 0 1px rgba(224,145,60,.5)`, radius `4px`, top-right on
   the art. **Same word and same hex as `decklist-row.tsx:99-106`** — reuse it, do not re-declare
   it, and if that means extracting a shared tag then extract it.
2. **Add goes secondary** — `1px --border-strong`, `--fg` label — per the §404 CTA contract.
   Adding a card you do not own is a real action, just not the deck's default one.
3. **No note line under the type line.** R1 drew one; the R2 audit cut it as a restatement of what
   the tag and the shelf heading already say, in a noun this app does not have. The tag, its aria
   and the shelf heading are three independent carriers of ownership already.
4. **Delete the `#176` comment at `suggestion-tile.tsx:196-199`** with the branch it describes.
5. **`consider-panel.tsx`** — unowned suggestions filter **out** of the coverage shelves and into
   a trailing shelf. A shelf that says *you have 2 of 10* is about cards you can play tonight, so
   the five never mix in. The trailing shelf takes the **existing `shelf.labels.edhrec` heading**
   (`Top picks for Kykar`) with the clause `not in your collection` in `--warning`, then
   `· N to consider` in `--fg-faint`. **Sorts last, after the targetless shelf.** No new role, no
   new taxonomy. `SHELF_CAP` (12, at `:21`) does not apply — the append is already capped at 5.
6. **`consider-toolbar.tsx:34`** — pick `provenanceWithUnowned` on `unownedCount > 0`, else keep
   the locked `provenance`. The string is `59 owned · 5 you don't own`. It deliberately **does not
   reuse the app's `N to buy`**, which counts *cards in this deck you don't own* at
   `builder-spine.tsx:202` and `deck-card.tsx:162` — in Consider the same words would count
   *suggestions you haven't added*. Different denominator, one tap apart.
7. **Tests**: an unowned suggestion renders the `buy` tag and a secondary Add; it never appears in
   a coverage shelf; the trailing shelf renders last and only when the append produced something;
   the provenance line switches only when `unownedCount > 0`; the locked provenance string is
   unchanged when every suggestion is owned.

**Gate 1 (state reachability) fires before this PR builds** — the unowned branch is reachable only
when `getDeckSuggestions` actually appends, which requires an EDHREC payload and a collection
missing staples. Prove at runtime that the branch can be entered before building the UI for it;
this is exactly the #1169 failure shape.

---

## PR 6 — Polish (reserved, unscoped)

The slot epic-run reserves for the mid-run cold-eyes findings and for Hugh's morning read. Do not
pre-scope it. If it turns out empty, it costs nothing.

---

## Gate artifacts

| Gate | Fires | Artifact |
|---|---|---|
| 1 State reachability | Before PR 5's build (the unowned branch) | `docs/superpowers/state-coverage-add-panel-addendum.md` |
| 2 Forced-state runtime | Every PR | Recorded in each PR body |
| 3 Sibling duplicate sweep | Every PR; hardest on PRs 1 and 4 | Recorded in each PR body |
| 4 design-review both halves | Agent 1 before PR 1; Agents 2–3 per PR | `docs/superpowers/design-tables/add-panel-addendum.md` |
| 5 Journey lifecycle | Once PR 3 lands (remove/undo is the journey) | `docs/superpowers/journey-lifecycle-add-panel-addendum.md` |
| 6 Side-effect provenance | **Does not fire** — no records created in response to events | — |
| 7 Copy review | PRs 1, 4, 5 | Recorded in each PR body |

## Settled — do not re-litigate

- **#176 is ruled A.** Keep the append, mark the tiles. Recorded in `ADDENDUM-READINESS.md`.
- **No toast, no timer.** This app has no toast pattern, and after decision 1 the bottom of a
  phone is spoken for.
- **No new token, no new dependency, no new motion.** Nothing joins the
  `prefers-reduced-motion` block at `globals.css:237-243` — the undo row appears in place because
  it *is* the row that was already there.
- **The reserve is arithmetic, not a token.** Two routes implement it. When a *third* surface pins
  a CTA low, that is the moment it becomes a shared layout component instead of a third `calc()`.
- Carried from #158 and still binding: owned-only defaults `true`; the empty-Consider CTA points
  at `/collection`; `Open suggestions` is deleted, not repointed.

## For Design at R4

Three items, none blocking:

1. **The `RECOMMENDED_MIX.land` singular note is wrong** — correction 3. The label has three other
   live consumers and the superseding string still lowercases it. Nothing gets deleted.
2. **The `Owned only` axis in Consider** was kept out at R1 because the axis had one value. Under
   ruling A it has two. Still the wrong control — five cards in one labelled shelf do not want a
   filter — but the reasoning behind that "no" has changed and should be re-read rather than
   inherited.
3. **The undo row's persistence is a judgement, not a measurement.** A long-lived spent slot in a
   99-row list has not been tested. Fallback if it reads as clutter: dismiss on the next
   successful *add*.

## Not in scope

- **#172** — a failed `searchCards` still has no drawn state. It will have to obey decision 1 when
  it is drawn, since a failure line inside the quick-add bar is inside the dock, but it is not in
  this addendum.
- **#182** — the twelve interpretive calls from the #158 run. Ratification, not build.
- **#132** — the buy-list direction that ruling A points at. Backlog.
- `/decks/new` **desktop**, which the addendum asserts rather than redraws.
