# About · collection edit entries (addendum)

Five chapter-01 entries for the collection home epic's sub-projects 1 and 2. They're drawn now and **ship at the end of the launch**, with the epic's single `ABOUT_VERSION` bump (11 → 12). Each is a filled §G template (`STATES-about-r3.md` §G). The parent folder is untouched.

- Canvas: `The 99 - About · Collection Edit Entries.dc.html`. §0 covers chapter order and the sheet. U1–U5 each show the 11-slot template and the entry as drawn.
- Copy: `about · collection edit entries.ts`, the five `AboutEntry` objects plus the `import` line edit.

## Where each goes (chapter 01)
| Entry | After | Why |
|---|---|---|
| U1 `collection-add` Adding cards by hand | `browse` | A way in as well as a top-up (Hugh, 2026-10-09), so it comes before Importing |
| U2 `upload-choice` Replacing or adding from a file | `import` | Importing teaches formats, this teaches the question |
| U3 `edit-copies` Changing how many you own | `card-detail` | It lives in the card's details, and its caption separates it from the art pick |
| U4 `remove-card` Removing a card | `edit-copies` | It carries the short-deck warning in its figure |
| U5 `collection-history` Undoing a change | last | Every other entry here ends up there |

All five are `since: 12` and `switch: 'COLLECTION_EDIT_ENABLED'`, and `AboutSwitch` gains that member. The sheet (N2) reads `5 new in About` with three titles and `and 2 more`.

## Specimens
| Entry | Mounts as shipped? |
|---|---|
| U1 | **No (E4).** Export `AddLine` from the sheet unchanged. The sheet runs catalog search on open |
| U2 | Yes. `UploadChoice` with fixture props |
| U3 | Yes. `OwnedLine` + `YourCopies` in `CardDetailProvider` |
| U4 | Yes. Two `RowsView` rows (`menuOpen` fixture) + `ShortDeckWarning` |
| U5 | Yes. Three `HistoryEntry` rows |

## Open
1. **`import`'s caption goes false with the switch on.** "Heads up: an import replaces your whole Collection, it doesn't add to it." `captionLineSwitches` can't hide a line while a switch is on. Ask: support a negated key (`'!COLLECTION_EDIT_ENABLED'`) in `visible.ts`, and add the replacement line under the positive key. **`captionLineSwitches` only removes a line it finds in the caption — it never inserts one**, so this also needs the shipped `import` caption itself edited at the same time to carry BOTH lines (the existing one and the new one, appended as their own line), with each switch key then just removing whichever doesn't apply. The two line strings are already in the `.ts`; the caption edit that puts the new one into `src/lib/copy/about.ts` is not done here and belongs to the build that wires the negation. If declined, rewrite the line at the bump and accept that it's wrong on a deployment running with the switch off.
2. **Key lines quote no figure except "90 days"**, which is the ruled retention. If retention moves to a year (brief: "easy switch later"), U5's fourth key line and its caption change with it, and they should read the same constant.
