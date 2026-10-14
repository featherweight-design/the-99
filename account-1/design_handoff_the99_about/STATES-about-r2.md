# STATES — /about, R2 additions

`STATES-about.md` still governs the page, the mark, the dismiss, the menu row and the gate.
This file covers what the figures add, and **supersedes it wherever the two disagree** —
principally §1's W-table, which described text rows.

## §A The specimen

| # | State | Draws | Must not |
|---|---|---|---|
| A1 | Inset | 300px figure column, 20px gutter, caption right. Figure on `--surface-sunken`, `--border` hairline, radius 8. | Exceed 300px. Grow its own height to match the caption — it centres instead. |
| A2 | Plate | Caption above, figure the full column, key beneath. | Sit beside another plate with no hairline between. |
| A3 | Any specimen | Inert: no hover, no focus ring, no handler, no transition, `aria-hidden` in full. | Respond to a pointer in any way a reader could mistake for a control. |
| A4 | A component that ships with a transition | Mounted with it off. | Animate on scroll into view. |
| A5 | A component whose real size is below 12px | Its real size, unchanged, at every width. | Scale up "for legibility" — the reader has to recognise it in the app at 6px. |
| A6 | A component that needs data we cannot fixture | The entry becomes prose-only and says what it cannot show. | Draw a plausible-looking figure from invented vocabulary. |
| A7 | Art-bearing specimen | `ArtWash`'s colour-identity gradient plus its ink scrim. | Load a Scryfall crop, or draw a grey box where art would be. |

## §B The annotation key

| # | State | Draws | Must not |
|---|---|---|---|
| B1 | A numeral | 14px circle, `--accent` hairline and ink on `--bg`, mono 9px, beside the part. | Sit on top of the part it names. Appear anywhere off this page. |
| B2 | A key line | One mono `--fg-faint` line per numeral, under the figure, ordinary prose. | Read as a caption for the whole figure. Say only "the diamond" — it names the meaning. |
| B3 | Five or more parts | Two figures, or fewer numerals. | Five numerals on one figure. |
| B4 | A figure needing no annotation | No numerals and no key. | An empty key block, or one line saying what the caption said. |
| B5 | Screen reader | Every key line read in order; the specimen contributes nothing. | Leak a component's internal `sr-only` prose into the link's accessible name. |

## §C Phone reduction, per figure

| Figure | At 390px | Must not |
|---|---|---|
| Availability rows | All four rows, full width, marks unchanged | Drop a state — the four together are the explanation |
| Set grid | 3 cells: owned, missing, never-stocked | Shrink a cell below the 63/88 ratio, or scroll sideways |
| Ready to build | One hero card; the caption says two at a time | Draw two at 172px each |
| Fit score | Bar and legend full width; the three key columns stack | Collapse the key behind a control — this page has no controls |
| Discover orders | All five, stacked, glosses kept | Drop the glosses; they are the entry's subject |
| Decklist marks | 2×2 tiles | Go to one column — the corners read as a set |
| Role coverage | All four roles, bars kept | Drop the baseline figure |
| Versions | Pending banner plus two version rows | Drop the record column; it is why versions matter |
| Statuses | Badge, figure and sentence; progress column dropped | Drop a status, or the sentence |
| Folders | The segments wrap to two rows | Become a horizontal scroller |
| Commitments | Unchanged | — |
| Log form | Result row and one axis column | Drop the axis chips entirely |

## §D The page, restated where R2 differs

| # | State | Draws | Must not |
|---|---|---|---|
| D1 | Version 0, desktop | 24 entries, 24 figures, no eyebrow, no marks, no dismiss, index on the right | Mark anything |
| D2 | Reader behind | Eyebrow with the total, `N new` on affected chapters, the plate on affected titles, dismiss at the foot — **and the new entry's figure, drawn like every other** | Put the `NEW` plate inside a specimen's hairline. Hoist new entries out of their chapters |
| D3 | Reader current | Exactly D1 | Draw a disabled dismiss |
| D4 | Entry boundary | One `--border` hairline | A hairline after a chapter's last entry |
| D5 | Any width | Roughly 4 screens at desktop, 11 at phone | Paginate, tab, or collapse a chapter — ruling 1 |
