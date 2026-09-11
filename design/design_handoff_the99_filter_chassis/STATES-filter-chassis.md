# STATES — the filter chassis

Six states × four routes × two widths. The chassis is one component, so most cells are the same
drawing with a different dimension list; this file exists to say which cells differ and **what each
state must not do**, which is where the shipped surfaces disagree with each other today.

Drawn in the canvas: `/decks` desktop S1–S5, `/decks` phone P1–P4, and `/commanders`,
`/discover`, `/collection` at *several active*. Everything below that is not drawn is the same
frame with its own controls, and is enumerated rather than redrawn deliberately — per §3.2, if it
reads at five dimensions it reads at four.

---

## The four control types

The type is chosen by the shape of the values, never by the route — so the same dimension is the
same object on two surfaces and at both widths.

| Type | Used by | Wide | Compact |
|---|---|---|---|
| **Field** | search | 34px, the only shrinking child of row 1 | 44px, persistent row |
| **Pip row** | colour identity | 22px circles inline | 44px circles, **first block in the sheet** |
| **Segmented** | colour match, score against, view | 34px, inline, never behind a trigger | 44px, same shape |
| **Trigger + panel** | status, last played, type, set, availability, printed-in, sort | 34px trigger, anchored panel | chip group in the sheet, or a 44px row opening a searchable list |

**Segmented is only for a dimension with no off state.** Colour match is always Any or Exactly;
score-against is always one or the other; view is always rows or grid. Last-played has two values
*and* an off, so it is a panel — which is why the shipped deck column draws it as two
independently-clearable rows rather than a pair of segments.

**A control never changes type between widths.** Only the target size changes, and whether a panel
is anchored or a block in the sheet.

## Sheet order, fixed across routes

1. Pips.
2. Segmented controls.
3. Chip groups.
4. Anything carrying a hint line, hint last within its group.

Never sort, and never search — both are on the persistent row.

---

## The dimension list per route

| Route | Dimensions | Modifier | Sort options |
|---|---|---|---|
| `/decks` | search · status · colour · played-window | — | 3 (`DECK_SORT_ORDER`) |
| `/commanders` | search · colour · **printed-in** · score-against | Any / Exactly | 3 (Fit, Name, Recently added) |
| `/discover` | search · colour · **printed-in** | Any / Exactly | 5, all glossed |
| `/collection` | search · colour · type · set · availability | — | 5 × direction, + view toggle |

`printed-in` is the one dimension this round adds. `status` and `played-window` are deck-only;
`type`, `set` and `availability` are collection-only. Per §2.2 that is correct and not a gap.

---

## 1 · Rest

Nothing on. Row 1 all hairline `--border-strong`; row 2 prints `no filters on`; row 3 states the
lane rather than a ratio.

- **Must not** print `18 of 18`. A ratio nobody narrowed is a fact nobody asked for
  (`result-line.tsx`'s own rule).
- **Must not** collapse row 2. The line is what keeps the height fixed.
- **Must not** draw the phone `Filters` badge. Zero draws nothing, and the trigger keeps its width
  by trading 2px of padding for the badge.
- `/collection` at rest still shows its view toggle lit on the current view — that is not a filter
  and is not counted anywhere.

## 2 · One filter active

- Trigger takes `--accent` **and** its label takes the value: `Status · Building`.
- One chip in row 2. No `Clear all filters` yet — at one filter the chip's own `×` is the shorter
  route and a second control beside it is noise.
- Row 3 flips to the ratio and announces once, 300ms later.
- **Must not** move the grid. Row heights are identical to state 1.
- **Must not** announce on arrival — `result-line.tsx` holds its first line silently; the reader
  did not just do anything.

## 3 · Several active

- Every active trigger lit, each carrying its own value or `n on`.
- Chips in dimension order, never in click order — the same canonicalisation `toggleIn` and
  `colour-control.tsx`'s WUBRG rebuild already do, so the chips and the URL always read alike.
- **Colour collapses past one pip**: one lit pip is a named chip (`White`), two or more is a
  shingled pip run plus `n colours` (`filterCopy.colour.collapsed`). Never one chip per hue.
- `Clear all filters` appears at the chip line's trailing edge.
- **Must not** let the chip line grow to two lines at desktop before it wraps — it wraps, and the
  result line follows it down. This is the one place the chassis height may change, and it changes
  with the *filters*, not with the results.
- **Must not** include sort in `Clear all filters`. A reader who chose an order did not ask for it
  back — both shipped surfaces already promise this in comments.

## 4 · Open panel

- Anchored to its trigger, 280px, `--surface-rail` on a `--border-strong` hairline, 16px/40px
  shadow. Opening lands focus on the current value, not the first row.
- Rows 44px, rotated-diamond marker (filled `--accent` when on), label, trailing count.
- Footer: `n of m on` beside `Clear <dimension>`.
- Search field appears in the panel only past a length threshold — `Set ▾` has it, `Type ▾`,
  `Status ▾`, `Availability ▾` and `Played ▾` do not. That is `filter-panel.tsx`'s existing
  `searchable` prop and its existing reasoning: a fixed short vocabulary has nothing to search.
- Sort's panel is the same shape in single-select mode; picking the chosen order again reverses it
  and `Clear` never renders, because a list is always sorted by something.
- **Must not** expand in flow. The `<details>` the collection bar replaced pushed the whole grid
  down on every open; that is the defect this shape exists to avoid.
- **Must not** be a hidden duplicate. One treatment per width — a closed panel renders nothing, so
  no second copy of any radiogroup reaches the accessibility tree.
- **Must not** trap focus. It is a menu, not a dialog: `Escape` closes it and hands focus back to
  the trigger; a click outside dismisses on `pointerdown`.

## 5 · Empty result

- Chassis unchanged and complete. Row 3 reads `0 of n … match`.
- Below it: a heading, one sentence naming the control to blame and promising the rows that
  dropping it returns, and a `Drop <control>` button beside `Clear all filters`.
- When no single filter is responsible, the sentence is `bodyNoSingleFix` and only
  `Clear all filters` is offered — never a `Drop` button that would not fix it.
- **Must not** replace the chassis. The filters that caused this have to stay on screen and stay
  removable; an empty state that hides them is a dead end.
- **Must not** promise a row count it has not computed. The count is the whole value of the
  sentence; a vague "try removing a filter" is what three of four routes already say.
- `/commanders` and `/discover` keep their existing search-specific empties
  (`emptySearch` / `empty`), which say which *lane* holds the thing you searched for. That
  boundary is a lane fact, not a filter fact, and no shared empty state can state it.

## 6 · Phone, 390px

Persistent row: **search (flex) · sort (44px icon) · Filters (44px, badge)**. Then chips, then the
result line. The sheet holds every other dimension.

- Badge = active dimension count. **Never** search, **never** sort — both are on the row and
  visible, so counting them would claim a narrowing the reader can already see.
- Chips scroll horizontally, they do not wrap. Two lines of chips on a 390px screen costs the list
  a row of content.
- Sheet: 44px targets throughout, grouped by dimension with mono captions, a dismiss button
  carrying the count (`Show 3 decks`) and a text `Clear all`.
- Sheet **must not** carry sort (decision 11) and **must not** carry search — search is on the
  persistent row, which is why the badge cannot count it.
- Sheet **must not** be CSS-hidden when closed. Absent, or its search field stays focusable behind
  the page.
- Escape and swipe-away both commit nothing and revert nothing: filtering already happened as the
  reader ticked, so there is nothing to apply and nothing to undo.
- Initial focus lands on the dialog, not the first focusable — raising the keyboard on a reader who
  pressed `Filters` is not what they asked for. A reader who arrived *through* the search
  affordance gets the field.
- 320px: the row holds. Search shrinks to its minimum, both buttons stay 44px, and the `Filters`
  label truncates before the badge does.
- **`/collection` is the tightest cell in the matrix** and is drawn in full (§3b, P5–P6): seven
  dimensions, four of them in the sheet, plus a view toggle that is not a filter. The view toggle
  sits on the **result line's trailing edge** — never on the persistent row, where it would leave
  search at its minimum on the app's most search-driven surface.
- `Set` and `Printed in` **must not** be chip groups in the sheet. 41 owned sets is not a chip row
  and the full set list is thousands; they are a 44px row that opens the panel's own searchable
  list as a second layer. This is the only place the compact form nests.

## 7 · The two forms, and the absence of a third

Wide above 900px, compact below. **The control row never wraps at any width.**

- Search is the only child that shrinks; every control is `flex: none` with `white-space: nowrap`;
  the trailing sort group is `flex: none`, so it can never be pushed to a second line.
- **Must not** wrap row 1 to two lines. R1 did, the sort landed on its own line, and it read as a
  layout bug rather than a trailing slot.
- **Must not** introduce a third, intermediate form. A route with fewer dimensions has more room at
  the same width; it does not get a different frame.
- The 900px switch is set by `/collection`'s seven controls, not `/decks`' five — the widest list
  in the app decides the breakpoint for all four routes, or the breakpoint is a per-route fact and
  the chassis is not one thing.
- Row 2 may still wrap at desktop when many filters are on, and the result line follows it down.
  That is the one legitimate height change, and it is caused by the **filters**, not the results.

---

## What is not drawn, and why

- **Ordered keyboard-walk frames.** The model is stated per state above and matches the four
  existing implementations, which already share `useDialogA11y`, roving radiogroups and
  selection-follows-focus. No new pattern is introduced, so there is nothing a walk would settle.
- **Pending/in-flight.** `/discover`'s sort is the app's only server-answering filter control, and
  the in-flight handoff ruled it — `PENDING_OPACITY` on the trigger, the crown in the chevron slot,
  the result line **holding** its outgoing sentence for the whole flip. Unchanged here, and
  deliberately not redrawn.
- **The six themes on every frame.** The canvas draws the pip in all six (§4) because that is where
  the risk was. Everything else in every frame is a token, so the theme matrix is the pip matrix.
- **Set-collections pages.** They inherit the pip (brief §5) but are not among the four routes, and
  their own handoff is Green. The inheritance needs ratifying, not redrawing.
