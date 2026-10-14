# The 99 — Deck import (Moxfield) (design handoff)

**R2 — rebased on the add-panel overhaul (#158).** Issue [#42](https://github.com/HartiganHM/the-99/issues/42) · spec
`docs/superpowers/specs/2026-08-02-deck-import-design.md` (workshopped 2026-08-02, brief locked).

File: `The 99 - Decks · Deck Import.dc.html` (canvas — pan/zoom). Nineteen states from
§"States to draw", each as its own frame, phone (392px) leading and desktop (1060px) beside it.
Copy block: `deck-import · copy strings.ts` → `src/lib/copy/deck-import.ts`.

**R2 delta.** R1's states 13–19 were drawn on the shipped builder. #158 retires the 340px rail,
`add-panel.tsx`, `search-pane.tsx`, `search-result-row.tsx` and the mobile sheet, so those states are
redrawn on the new surface: the quick-add bar, the `Your deck | Consider` tab pair, and the coverage
strip above them. The three calls #158 opened are made in the section below. States 1–12 (entry,
failures, commander) are untouched — nothing in #158 reaches them.

---

## ⚠ Read this before auditing

**The spec is not in this project.** The brief points at
`docs/superpowers/specs/2026-08-02-deck-import-design.md`; the local `docs/superpowers/` tree
carries only `design-tables/appshell.md`. R1 was built by reading the spec **from the repo at
`HartiganHM/the-99@main`**, together with the components it names. Everything below is grounded in
that source, not in a paraphrase. If the local tree is meant to be the working copy, it needs a
pull — see gap report 6.

Same for `src/`: the local tree holds `src/components/shell/nav.tsx` only. Token values, the button
and text-field primitives, `DecklistRow`, `DecklistGroup`, `SearchPane`, `SearchResultRow`,
`BuilderSpine`, `CreatePicker`, `UploadEntry` and `EmptyState` were all read from the repo.

---

## The two calls this handoff owns

The spec closed §"Locked decisions on edge cases". It left Design **the visual treatment of an
unresolved row sitting among real cards**, and **how the deck header reads while any exist**.

### 1. The unresolved row → **the shipped decklist row, plus three redundant signals**

Same `#1A160F` plate, same `6px` / `7px` radius, same height, same position in the two-column
desktop grid. Three things change, and no state is carried by colour alone (SC 1.4.1):

| | signal | why |
|---|---|---|
| **Name** | set in **IBM Plex Mono**, `--fg-body` | Every other row is a card name. This one is a string out of a file. Mono is already the app's voice for raw data — quantities, set codes, collector numbers — so the row reads as *text, not a card* before you read a word of it. |
| **Ownership dot** | replaced by a `?` in `--warning`, same slot, same width | Owned and not-owned are the only two things a dot can say. A card with no identity is neither. Keeping the slot keeps the name column aligned with every row above it. |
| **Leading edge** | `2px solid var(--warning)` | The replace flow's warning banner at row scale. Redundant with the glyph and the tag, never the sole carrier. |
| **Tag** | `unmatched`, mono `9.5px`, in the `buy` tag's exact geometry and slot | The `buy` tag already means *this row needs something from you*. Reusing its position makes the two read as one family. |

Deliberately **not** done: `--danger` red, strike-through, reduced opacity, or a separate "problems"
tray. This is a card the deck wants — the app just can't name it. Red is spent on destructive
confirmation in the collection flow and should stay there.

**Placement: their own group, pinned last, labelled `Couldn't identify`.** They cannot join a type
group — a card with no identity has no type line, and inventing one is a lie the rest of the list
can't see. Last rather than first because the deck is the point and these are the tail. Under the
**Shopping** filter the group is hidden entirely: the spec keeps unresolved rows out of
`toBuyCount`, so a shopping view showing them would be showing something you cannot buy.

### 2. The deck header → **no new pill variant; a banner carries the fact**

An unresolved row never counts toward `built`, so a 100-line import with two failures is a **97/99**
deck and `statusPill` already returns `Building`. Drawing a new pill state would be **redundant with
arithmetic that already tells the truth**. The spec's hard block on `Complete` stays as
belt-and-braces for the one deck that reaches 99 built *and* still carries unresolved lines.

What the header gains is the **replace flow's warning banner**, unmodified —
`--elevated-hover` fill, `1px --border-strong`, `3px --warning` left rule — sitting below the spine
and above the role strip, with the count in the sentence and a `Take a look →` jump. It disappears
at zero. The spine itself is **untouched**: no extra figure, no second bar, no "97 + 2". The deck's
number is what's built; the exception lives in prose.

---

## States delivered

- **Anatomy** — the row treatment, the header, group placement, roles + keyboard.
- **Entry 1–3** — empty (three modes on a chip row), URL fetching, parsing and matching.
- **Entry failures 4–10** — seven, each with its own copy.
- **Commander 11–12** — the picker, and the dead end.
- **Arrival 13–14** — clean, and with unresolved rows.
- **Resolution 15–19** — at rest (rest/pressed/focus/quantity), search and pick, nothing found,
  resolved, deleted.

---

## The three calls #158 opened

### A. A row resolves through a **row-scoped combobox in an inline expander** — never the global bar

The brief's "the picker the builder already uses" no longer exists. Its successor,
`quick-add-bar.tsx`, is **persistent, global and deliberately never a mode**: always mounted, always
meaning *add a card to this deck*, `↵` always adding the top match. Seeding it from a row breaks both
halves of that premise — the control would sit at the bottom of the screen while the row it acts on
is in the middle of the list, and `↵` would mean *add* or *resolve* depending on state the user
cannot see.

So the resolution search is **the same row shape in an expander that belongs to the row**, and the
same construct at both widths (R1 sent the phone to the bottom sheet; there is no sheet). Mechanics
are `quick-add-bar`'s verbatim — combobox, `↑↓` via `aria-activedescendant`, `Esc` to dismiss, the
result row including its 30×42 thumb. Three scoped deltas:

| | delta | why |
|---|---|---|
| **Field** | seeded with the raw string, selected | The usual failure is a typo; the usual fix is one keystroke. |
| **Action** | `Use this card`, not `Add` | Not an addition. The line is already in the deck; you are naming it. |
| **`↵`** | resolves this row | Adding here would make a hundredth card out of a line already counted. |

**On phone the global bar hides while an expander is open.** Two search fields on a 392px screen, one
of which does something else, is exactly the mode confusion #158 removed. It returns on collapse.
Engineering: this is a second scoped *instance* of the component, not a variant flag on the mounted
one — and it must take the **server** `deckOracleIds` list for the reason in the
`builder-shell.tsx:70` comment, same as the bar.

### B. Resolution **overrides** the owned-only default to off. It does not inherit.

Owned-only is a **build-time** filter and it is right to default on there: the question is *what can
I put in this deck tonight*. Resolution asks *what was this line* — a question with one correct
answer whether you own the card or not. An imported list is precisely where the unowned answer is
common; a deck pulled off Moxfield is usually part wishlist.

Inheriting `true` would hide the right card behind a toggle whose relevance is invisible here, and
the failure is silent: an empty result set that reads as *no such card* when it means *not in your
collection*. It would also strand state 17 — the bar's honest no-results escape is "drop the owned
filter", so with the filter on, the no-results copy would have to offer it, which is a worse version
of the same discovery.

The override is **scoped to the expander and stated**, not silent: the toggle renders in its off
position inside the expander and can be flipped back per row; the global bar's setting is untouched
on collapse. This is now the second filter this surface turns off — colour identity is the other —
and one caption carries both: *every card, owned or not — you're naming a line, not shopping*.

### C. No oracle ID → **outside both counts, with the banner above both**

| surface | with 2 unresolved rows | why |
|---|---|---|
| **`Consider · 99`** | unchanged | `suggestDeck()` iterates the owned pool and dedupes against the deck's oracle IDs. A row with no oracle ID can be neither suggested nor excluded. |
| **`Your deck · 97`** | counts **built**, the spine's figure | Not the 99 rows on screen. The group carries its own `2` in its header, where it is a heading rather than a second claim about the deck. |
| **Coverage strip** | no cell, no asterisk | A role comes from a type line and oracle text; there is neither. An "unknown" cell is a sixth column that can never be filled, and a footnote on five cells is five footnotes. |

Instead the warning banner sits **directly above the strip and the tabs** and takes one extra clause
— *they aren't counted in the mix or in either tab below*. The place the reader is about to use those
numbers is the place the caveat belongs, and it costs no new construct.

**On resolve everything moves in the same optimistic frame**: built 97 → 98, the `Your deck` tab with
it, the group 2 → 1, the role cell (Removal 6 → 7) now the line has a role, and the Consider tile for
that card flipping to `✓ In deck` if it was on a shelf. Drawn in state 18.

One consequence worth naming: **Consider can suggest the card an unresolved row was meant to be** —
`Lightning Bolt` on a shelf while `Lighting Bolt` sits unresolved. See gap report 9.

## Decisions log

### 1. Entry → **one surface, three modes on a chip row, link first**

`UploadEntry` swaps between two modes with a text link (`Paste a list instead →`). At three modes a
link chain stops working — you can get to paste from dropzone but not from paste to file. The modes
become a **single-select chip row** in `chip-row.tsx`'s geometry (`999px`, `--elevated` fill,
`1px --border-strong`, brass active fill, no dismiss ✕ — a view switch, not a filter).

**Moxfield link leads** because that is the ticket, and because it is the only mode with no local
equivalent. Paste and File already exist for collections and behave identically here.

Desktop keeps the shipped **760px content column at `44px 48px`** (§Desktop Content Area). The URL
field and its submit sit on one row; the field is the shipped `SearchField` chrome including its
`focus-within` brass border and `0 0 0 3px rgba(201,162,75,.16)` glow.

### 2. Two waiting states, drawn differently on purpose

The spec separates them because one is "a real third-party round-trip, not an instant local parse".
So they don't look alike:

| | indicator | cancel | why |
|---|---|---|---|
| **2 · Fetching** | indeterminate `.anim-dots` | **yes** | Unbounded, and owned by someone else. A user who has waited four seconds needs a way out. |
| **3 · Parsing** | determinate bar + `64 / 100` | **no** | Local and sub-second. A Cancel you can't reach isn't a control, it's decoration. |

Both replace the field block **in place** in the same 760px column — the page never navigates, so a
failure lands the user back on their own input with it intact.

### 3. Failures → **one container, seven pieces of copy, retry exactly once**

All seven use the replace flow's warning banner, sitting **directly under the input they belong to**,
wired with `aria-describedby` and announced once via `role="alert"`. A generic error toast is
explicitly insufficient per the spec, and a toast is also the wrong container: it is not associated
with the field, and it can time out before a screen reader reaches it.

**`Try again` appears on state 7 only.** On 4 (client-side URL shape), 5 (permission), 6 (404), 8
(file type/size), 9 (nothing matched) and 10 (empty), pressing it re-fails identically. The way out is
instead the mode that will actually work, or the edit that will fix it:

| | heading | way out |
|---|---|---|
| 4 · Invalid or non-Moxfield URL | That's not a Moxfield deck link | Paste the list instead |
| 5 · Private | That deck is set to private | Paste the list instead |
| 6 · Not found or deleted | There's no deck at that link | Edit the link (kept in the field, selected) |
| 7 · Unreachable / rate-limited | Moxfield isn't answering | **Try again** + Paste the list instead |
| 8 · File rejected | We can't open that file | Choose another file |
| 9 · Nothing matched | We couldn't find any of these cards | Clear and start over |
| 10 · Parsed but empty | That deck is empty | Try a different deck |

**None of them uses `--danger`.** A mistyped link and a busy server are not things the user did
wrong. State 8 names the file back with **both** reasons it failed (`.xlsx`, `4.1 MB`) — a generic
"unsupported file" makes people guess which of the two rules they broke. State 9 does **not** clear
the textarea: that would destroy the thing they are about to fix.

**State 9's copy was corrected at R2, on the audit's finding.** R1 wrote it as a *parse* failure
(*"Nothing in there looks like a card"*) — but `parsePasteList` (`src/lib/manabox/paste.ts:38-40`)
falls through to `quantity = 1; name = trimmed` for any non-blank line, so every line parses. What
actually happened is that all of them **failed to match**. The copy no longer tells the player their
paste is malformed: *We couldn't find any of these cards · All 14 lines read fine — none of them
matched a card we know.* The way out is unchanged, and the paste still stays in the box.

That also moves 9 into the **match**-failure family — the vocabulary `/collection/replace` and the
Issue Inspector already own, and the same family as an unresolved row, one step earlier in the flow.

### 4. Commander → **the shipped `/decks/new` picker row, plus a name field**

Same `34×48` / `40×56` thumb, same `2px` radio, same `#211C15` / `1px --brass` selected fill, same
desktop **Selected** sidebar and mobile sticky footer. It reads from the import rather than the
collection, and each row carries `line N` so a user with two similar legends can tell them apart.

**When the source declares a commander, nothing renders.** No confirm, no "is this right?" — a wrong
guess is what the picker prevents, and a correct one doesn't need a ceremony.

The one addition over `/decks/new`: the **deck name comes over pre-filled and editable**, because
the source already named the deck. `CreatePicker` requires a name before Create; here it is
satisfied on arrival.

**State 12 is a true dead end** — no deck is created, and the copy says so
(`Nothing was created · your list is still in the box`). The mark is the builder's own card fan with
the front card **dashed and `--warning`-toned** instead of solid brass with `99`: nothing here is
finished, so it should not wear the finished mark.

### 5. Resolution → **a disclosure, not a dialog; one construct at both widths; both filters off**

*(Rewritten at R2 — §A and §B above carry the reasoning that changed.)*

Desktop: the row **expands in place** inside the decklist and the group drops to one column while
it's open (a two-column grid with one tall cell leaves a hole). Only one row expands at a time.
Phone: **the same expander, in place in the deck column**. There is **no new dialog and no new focus
trap** at either width; `Esc` collapses and returns focus to the row.

Inside it is `quick-add-bar`'s combobox and result row, **pre-filled with the raw string and
selected**, so the usual fix — a typo — is one keystroke. The action reads **`Use this card`**, not
`Add`: this is not an addition, it is naming a line that is already in the deck.

**Two filters are off in this scope** and one caption carries both. **Colour identity**, because the
user is telling us what a line *already in the deck* was and hiding the answer would be perverse.
**Owned-only**, which #158 defaults on everywhere else, because the true card behind an imported line
is often one the player doesn't own.

**Editing the raw text and re-matching is not offered**, per the spec — a guessing loop against a
matcher you can't see. You pick a card or you delete the line.

### 6. Resolve and delete report into **one polite live region**, under the group

It replaces its own text rather than stacking, and it carries **Undo** inside it rather than in a
floating toast that can time out. Resolve: the row leaves the group and joins its real type group,
**carrying focus with it** so the keyboard doesn't lose its place; counts move in the same frame
(97 → 98, group 2 → 1). Delete: the line drops from the deck's **total**, not just from the group —
an unresolved row was a card the deck wanted and you've said it doesn't. Undo restores both.

---

## Accessibility

```
form
  input#deck-source[aria-describedby=src-msg]
  p#src-msg[role=alert]                       ← all seven failures

section[aria-labelledby=unresolved-h]
  h3#unresolved-h  "Couldn't identify · 2"
  button[aria-expanded][aria-controls=fix-N]
    span.sr-only "unmatched line"
  div#fix-N                                   ← row-scoped combobox, inline
    input[role=combobox][aria-expanded][aria-controls=fix-N-list]
          [aria-activedescendant][aria-describedby=fix-N-hint]
    ul#fix-N-list[role=listbox] > li[role=option] "Use this card"
  button "Delete this line"
p[aria-live=polite]                           ← one region, resolve + delete
```

- **Every failure is programmatically associated** with its field and announced once. Colour is
  never the carrier: each has an icon, a heading and a sentence.
- **Two live regions total across the flow** — one for the waiting phases on the entry surface, one
  under the unresolved group. Do not add a third.
- **The unresolved row is not a colour state.** Glyph + mono face + tag word + rule; any one of them
  alone identifies it.
- Phone controls clear **44px** (the unresolved rows carry `min-height: 44px`, above the shipped
  row's natural height). The seeded search field is **16px** so iOS doesn't zoom.
- Focus is the global `:focus-visible` from `globals.css` — `2px var(--brass)` at `+2px` — not
  overridden anywhere in this flow.
- Only the disclosure animates: height + fade, 160ms, behind `prefers-reduced-motion`, matching the
  filter sheet's `0.18s ease-out` precedent. `.anim-dots` is already reduced-motion-scoped.

---

## Component notes

Hexes live only in `globals.css`; everything below is `var(--*)`. **No new token is introduced.**

| Component | Spec |
|---|---|
| **Mode chip row** | `src/components/collection/chip-row.tsx` geometry: `999px`, `--elevated` fill, `1px --border-strong`, brass active fill with `--bg` text, no dismiss ✕. Mobile 12px / desktop 13px, padding `7px 13px` / `9px 16px`. Single-select. |
| **URL field** | `SearchField` from `text-field.tsx`, unmodified, including `focus-within` brass border + `0 0 0 3px rgba(201,162,75,.16)`. Submit is `PrimaryButton` on the same row (desktop) / full width below (mobile). |
| **Paste box** | `UploadEntry`'s textarea verbatim: `--surface-sunken`, `1px --border-strong`, mono 13px, `h-[300px]`, `maxLength 100_000`. |
| **Dropzone** | `UploadEntry`'s dropzone verbatim: `1.5px dashed --border-dashed`, radius 12px, `--surface-sunken`, brass on hover/drag. |
| **Waiting block** | Replaces the field block inside the same 760px column. Dots are `.anim-dots` (1.2s, staggered 0/.2/.4s). Determinate bar reuses the spine's track — `6px`, `999px`, `--border` track, `--brass` fill. |
| **Failure banner** | `--elevated-hover` fill, `1px --border-strong`, `border-left 3px --warning`, radius `8px` / `10px`, padding `12px 14px` / `16px 18px`, gap `10px` / `12px`. `⚠` in `--warning` at 15/17px. Heading 14/15px 600 `--fg`; body 12.5/14px `--fg-body`. |
| **Commander row** | `create-picker.tsx` row verbatim. Selected `#211C15` + `1px --brass`; rest `--surface-rail` + `1px --border`. Radio `20`/`22px`, `2px --brass` filled vs `2px --border-dashed` hollow. |
| **Arrival strip** | Full-width band below the spine: `--surface-rail`, `1px --border` bottom, `✓` in `--success`, dismiss ✕ in `--fg-faint`. Dismissed state persists per deck; gone on the next visit either way. |
| **Unresolved banner** | Identical to the failure banner. Desktop carries `Take a look →` as a `GhostButton` on the right; mobile carries it as a brass text link under the sentence. |
| **Unresolved group header** | Shipped `DecklistGroup` header. Count is `--warning` rather than `--fg-faint` — the one colour difference, and it sits beside a word. Desktop right note: `counted in the 99, not in what's built`, mono 10.5px `#6E6353`. |
| **Unresolved row** | `DecklistRow` plate + radius + padding, plus `border-left 2px var(--warning)` and `min-height 44px`. `?` glyph occupies the ownership-dot slot at the same width. Name mono 11.5/12.5px `--fg-body`. `unmatched` tag = the `buy` tag's box: mono 9/9.5px, radius 4px, `1px 5px`, `--warning` on `rgba(224,145,60,.13)`. Desktop adds a `Fix` affordance in `--brass` where the remove ✕ sits. |
| **Resolution expander (desktop)** | `--surface-sunken`, `1px --border-strong`, `border-left 2px --warning`, radius 9px, padding `14px 16px`. Two columns: seeded combobox + results (flex 1), and a 220px rail holding the raw line and Delete. |
| **Resolution expander (mobile)** | The **same** container, full width in the deck column at `13px 14px 16px`. No sheet, no grabber, no `.anim-sheet-*` — that class retires with #158. The global quick-add bar unmounts while an expander is open. |
| **Result row** | `quick-add-bar`'s row verbatim — `#1E1A15`, `1px --border` (`1px --brass` active), radius 9px, min-height `52px` desktop / `56px` mobile, `30×42` thumb (`32×45` mobile), name `14/600` with the matched substring in `--brass`, meta mono 10–11px. Right slot: `↵ use this` on the active row, a `Use this card` ghost button otherwise. |
| **Owned toggle (scoped)** | The bar's `30×17` toggle, rendered **off** inside the expander beside the result count. Flipping it affects this row's search only. |
| **No-results (17)** | Inside the panel, **not** the `NoResults` crab state — that mark belongs to browsing a collection you own. A `34px` dashed circle with `?`, Cinzel 17/18px heading, `--fg-body` sentence, then Delete and Leave-it. |
| **Live note** | `--surface-rail`, `1px --border`, radius 8/9px, `10px 12px` / `12px 14px`. `✓` `--success` on resolve, `−` `--fg-faint` on delete. `Undo` in `--brass` 600, right-aligned. |

---

## Notes for engineering

- **New route:** `src/app/decks/import/page.tsx` + `src/components/decks/import-entry.tsx` (mode chip
  row, three inputs, the seven failure blocks, the two waiting phases). `previewPaste` /
  `previewUpload` in `app/collection/actions.ts` are the shape to copy for the paste and file modes,
  minus the preview return — **there is no review gate here.**
- **URL fetch** is the only new server surface: fetch → `parse.ts` → `match.ts`. The seven failures
  map to *(a)* client-side URL shape, *(b)* 403, *(c)* 404, *(d)* 5xx/429/timeout, *(e)* client-side
  file type/size, *(f)* `parse.ts` yielding zero rows from a non-empty source, *(g)* `parse.ts`
  yielding zero rows from an empty source. **(f) and (g) are different messages from the same
  return value** — the caller has to distinguish them, and today it cannot. See gap report 3.
- **Resolution:** a **second, row-scoped instance** of `quick-add-bar`'s combobox inside the
  unresolved row's expander — not a `variant` on the mounted bar. Props the bar does not have:
  `seed`, `ownedOnly={false}`, `identityFilter={false}`, and an `onPick` that resolves the row rather
  than adding a card. `builder-shell.tsx` unmounts the bar on mobile while `expandedRowId !== null`.
- **Commander picker:** `src/components/decks/import-commander.tsx`, or a `variant` on
  `CreatePicker` — the row, sidebar and footer are identical; only the source list and the pre-filled
  name differ. Prefer the variant.
- **Unresolved rows:** `(deck_id, raw_name, quantity, source_line)` per the spec. `source_line` is
  rendered (`line 41 of the import`) and is the group's sort key — import order, not alphabetical,
  so the rows sit in the order the user's own file had them.
- **`DecklistGroup`** gains an `unresolved` variant, or a sibling `UnresolvedGroup` — the header,
  count and grid are the same; the row component differs. `DecklistRow` should **not** grow a
  variant flag: it carries `oracleId` throughout, and an unresolved row has none.
- **Counts:** `deckCounts()` must include unresolved rows in `total` and exclude them from `built`,
  `ownedCount`, `toBuyCount` and the role counter. `statusPill` needs the `Complete` block only for
  the 99-built-plus-unresolved case.
- **Optimistic:** resolve and delete both go through `use-deck-mutation` and
  `useOptimisticDeckCards` so the group count and the spine figure move in the click's frame, as
  adds already do.
- **Sequencing.** Every state from 13 on mounts inside components that ship in #158's PRs 4–6;
  `quick-add-bar.tsx` does not exist yet. **#42 cannot start building until #158's PR 6 merges.** No
  impact on this canvas — it sets the order.
- **No new dependencies**, no new tokens, no virtualisation.
- **Copy:** `deck-import · copy strings.ts` → `src/lib/copy/deck-import.ts`.
- **Mock data:** the import is a mono-green Bristly Bill deck with two deliberate failures — a typo
  (`Lighting Bolt`) and a finish annotation the matcher doesn't strip (`Beast Whisperer (foil)`).
  Both are real failure shapes, not invented ones. Card art is colour-identity gradient placeholder;
  swap in the Scryfall image and keep the frame.

---

## Gap report

*(9–11 are new at R2.)*

1. **A clean import trips the completion reveal.** A 99-line import lands the deck at 99/99 on first
   render, which satisfies `shouldCelebrate` and fires the one-shot kaiju reveal — burning a
   persisted flag on a deck the user never built. Drawn as-is in state 13 with the collision flagged
   on the canvas. **Recommendation:** suppress the reveal when the first render follows an import,
   and let it fire the first time they add a card themselves. Needs a ruling; it is not in the spec.
2. **The `Complete` block may be unreachable.** Because unresolved rows never count as `built`, the
   only deck that can hit 99 built *and* carry unresolved rows is one whose source had more than 100
   lines — which the sideboard rule already excludes. The block is still correct to implement, but
   if it is genuinely unreachable, the spec should say the arithmetic is the mechanism and the block
   is the guard, so a later refactor doesn't "simplify" one of them away.
3. ~~**Failures 9 and 10 are the same return value.**~~ **Closed at the R2 audit — and the premise
   was inverted.** `parsePasteList` (`paste.ts:38-40`) falls through to `quantity = 1` for any
   non-blank line, so gibberish does not yield zero rows: it yields rows that all fail at *match*.
   No parser change. The rule is **zero rows after parse → state 10; rows parsed with zero matched →
   state 9**, and both are buildable today. State 9's copy was rewritten to say what actually
   happened — see decision 3.
4. **Undo has no specified window.** Both resolve and delete offer it inline. Whether it survives a
   navigation, a reload, or only until the next mutation is unspecified. Drawn as persisting until
   the next action on the group.
5. **No design-table rows exist for any of this.** The unresolved row, the unresolved group header,
   the mode chip row, the failure banner and the resolution panel all need entries in
   `docs/superpowers/design-tables/`. There is no `decks.md` section covering an import surface.
6. **The spec and `src/` are not in this project.** Both were read from the repo. If the local
   `docs/superpowers/` and `src/` trees are meant to be the working copies, they are behind — the
   local tree has one `src` file and one design table.
9. **Consider can suggest the card an unresolved row was meant to be.** The dedupe is by oracle ID
   and the row has none. Adding it from Consider gives the deck the card *and* leaves the unresolved
   line — 100 wanted, one of them a duplicate. Not silent (the line is still visibly unresolved), but
   it is a real double-count. Cheapest mitigation is none: resolution or deletion clears it. Wants a
   ruling rather than a fix.
10. **Is the owned-toggle override per row or per session?** Drawn as per row, resetting on collapse.
   Persisting an override of a global default across rows is the kind of hidden state that produces
   the silent-empty-results bug in the first place — but six resolutions is then six flips.
11. ~~**#158's own open item lands on this.**~~ **Closed** — the owned-default flip to `true` was
   ruled 2026-08-04. §B stays an override and the caption clause keeps its point.
7. **#59's richness pass will touch the decklist.** Collision surface: the row plate fill, the group
   header rule, the `buy` tag geometry the `unmatched` tag reuses, and the warning banner's
   `--elevated-hover` fill.
8. **No canvas tweaks.** Unlike the printing picker, this canvas ships none — both open calls are
   drawn as settled treatments with their alternatives argued in Anatomy, rather than as a knob. Say
   so if you'd rather compare them live and I'll wire the row treatment as a switch.

---

## Files
- `The 99 - Decks · Deck Import.dc.html` — R2, the deliverable.
- `deck-import · copy strings.ts` — the copy block for `src/lib/copy/deck-import.ts`.
- `READINESS.md` — rating and what's blocking Green.
- `brand/` — brand sheet + README. `support.js` — canvas runtime, not production code.
