# About · I got it entry

One chapter-03 entry for the collection home epic's sub-project 4 ("I got it" on Shopping). It's packaged with the feature handoff, in `design/design_handoff_the99_i_got_it/about-entry/`. It **ships at the end of the launch**, in the same `ABOUT_VERSION` bump (11 → 12) as the five collection edit entries (`design_handoff_the99_about/addendum-collection-edit/`). It's a filled §G template (`design_handoff_the99_about/STATES-about-r3.md` §G). The about handoff folder is untouched.

- Canvas: `The 99 - About · I Got It Entry.dc.html`. §0 covers placement and the sheet. S1 shows the 11-slot template and the entry as drawn.
- Copy: `about · i got it entry.ts`, the one `AboutEntry` object.
- Feature handoff: the parent folder.

## Where it goes
| Entry | Chapter | After | Why |
|---|---|---|---|
| S1 `shopping-got-it` Marking a card you bought | 03 Building the 99 | `stand-ins` | Shopping says what to buy, stand-ins say what to buy instead, and this is what you do once it arrives. The control lives in the Shopping view, so it belongs with that chapter, even though it writes to the Collection |

**The sheet (N2)** reads `6 new in About` with both switches on. That's the first three titles in page order (all from chapter 01), then `and 3 more`. With only `COLLECTION_EDIT_ENABLED` on, it reads `5 new` as the 1+2 addendum drew it. **The index (O1):** chapter 03's row reads `1 new`. **Search:** the count goes up by one.

## Specimen
| Entry | Mounts as shipped? |
|---|---|
| S1 | **Mostly.** Two `DecklistRow`s inside `SwapToolsProvider` and the switch's provider, with fixture props (the A4 precedent). The receipt is the app's toast with fixture text, mounted static (no timer). The confirm isn't mounted, because it opens on press |

## Open
1. **Two switches, one key.** The control needs `SHOPPING_MARK_BOUGHT_ENABLED && COLLECTION_EDIT_ENABLED`, and `switch` takes one key. Ask: let `switch` take an array, all of which must be on, in `visible.ts`. If that's declined, key the entry on `SHOPPING_MARK_BOUGHT_ENABLED` alone, and make sure no deployment turns it on without collection edit (the feature handoff's §E rule already says that).
2. **Key lines quote no figure, price or limit**, as the launch-entries rule asks. "An older deck" is the seniority rule in the reader's words. It doesn't name `committed_at`.
