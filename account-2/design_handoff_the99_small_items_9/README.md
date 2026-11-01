# The 99 · Small items 9 (account 2, 2026-11-01)

Canvas: https://claude.ai/artifact/Qa5BmA6TzrCohVwz8J2cx5
Status: **R1, awaiting Hugh's audit.** Item 7 (delete a group) was added to R1 on Hugh's addendum the same day.

A light addendum on shipped surfaces: seven states the shipped handoffs left undrawn, and ten shipped defaults confirmed as errata. Each item is drawn at 390 and 1300 over the shipped boards it extends. New pieces carry a dashed copper outline. Strings marked DRAFT go through `/copy-review`.

To view a board, open `Main.dc.html` or the board's own page, with `support.js` and `art/` beside it. `scratch-gen/` holds the generator: `lib9.py` plus one `b*.py` per board. Each module lifts frames from its source board (`SRC9` env var, a folder holding the source boards and their art; `scope()` rescopes each source's helmet so several sit on one board). Run `python3 build.py out b0:Main b1:Games-NoMatch b2:Report b3:CSV-Failed b4:Flags-Kill b5:Rule0 b6:Add-Card b8:Groups-Delete b7:Errata`. Then `node render.js <abs out> Main …` sets each board's preview size and reports broken images, overflow and clipped frames. `canvas9.py <out> <root>` swaps `art/` for the canvas's `/_blob/` urls (`blobs9.json`).

Sources: main @b616d77; game history addendum A1 on design-assets (c7abb39); the source boards are `small_items_8/Report`, `small_items_7/CSV`, `rule_zero_revisions/{Home,Notice,Table}`, `add_card_anywhere/{Dock,D-Card}`, `menu_home/Home-States` and the admin handoff (`README.md`, `README-R3.md`), plus the shipped components each section names.

| Board | Item |
|---|---|
| `Main.dc.html` | Every call and the open questions |
| `Games-NoMatch.dc.html` | 1 · Game history, filters that match nothing |
| `Report.dc.html` | 2 · Report a problem: signed in, signed out, the 90-day line |
| `CSV-Failed.dc.html` | 3 · Flyer launch list, Download CSV fails |
| `Flags-Kill.dc.html` | 4 · Feature flags, kill a flag |
| `Rule0.dc.html` | 5 · Rule 0 defaults |
| `Add-Card.dc.html` | 6 · Add a card: ring, Remove, reopen, toasts |
| `Groups-Delete.dc.html` | 7 · Admin, delete a group |
| `Errata.dc.html` | B · ten shared components, confirmed as built |

## 1 · Game history, filters that match nothing (`Games-NoMatch`)

- **No games match** + **Clear filters**, the shipped Decks filter empty's words. The chips, Clear all filters and *0 games* stay; the headline and month heads go.
- The sheet never disables an option, so *Show 0 games* lands here. These are the same frames as game history addendum A1 (Z1 to Z3).

## 2 · Report a problem (`Report`, Small items 8 item 6)

- **(a) Signed in:** /report draws as a shell page. Drop `CrashWordmark` and `REPORT_MAIN` when `userId` is set. The form keeps its 520 column, centred from `md`, under *‹ Back home*. The failed-send toast takes the shell's own slot.
- **(b) Signed out:** the shipped Fan Content notice stays under the page. It is the one legal line every page carries; the Small items 7 board simply ended at the form.
- **(c) The 90-day line**, signed out only, in `--fg-muted` 12.5/1.5, between the attachment line and Send: *Reports sent while signed out are deleted after 90 days.* (DRAFT, `reportCopy.anonRetention`; the sweep is `ANON_REPORT_RETENTION_DAYS`).
- Unchanged: the crash screen (no shell, no router), and the sent and failed states.

## 3 · Launch list CSV fails (`CSV-Failed`, Small items 7 CSV)

- The admin's own failure line, `role="alert"` in `--danger` 12.5/1.5, under the launch card's top row (as the switch page's writes and the launch date draw it). The button comes back.
- Refused: *The server refused the download. Reload the page and try again.* Switched off: *The flyer trial is off now, so there's nothing to download. Reload to see the page as it is.* Lost: *Lost touch with the server, so nothing downloaded.* + **Try again**. All DRAFT.
- While the file is being built, the button holds (disabled), as shipped.

## 4 · Kill a feature flag (`Flags-Kill`)

- **Rename:** the tab, title and back link read **Feature flags**, and the column head reads **Flag**. The env column goes, as the flags plan's PR 2 leaves it.
- **The control:** the App-wide segment reads *Not set · On · Off · Killed*. Killed is in `--danger` text; once chosen it fills `--danger` with white text. App-wide only: group and account rows keep On / Off.
- **Confirm, every time:**
  - Title: *Kill {flag} for everyone?*
  - Lead: *Killed turns {flag} off for every account, and beats every override and All features. Nothing is deleted.*
  - Facts: Who, Overrides (*Kept, and refused while killed. Lifting the kill brings them back.*) and When.
  - Note field, then Cancel / **Kill for everyone**. All DRAFT.
- **In the list:** App-wide reads *Killed* in the kill ink, a **KILLED** tag sits by the name, and Resolved reads *Off* with *killed* under it. Overrides read *refused*.
- **On the page:**
  - The kill banner, re-worded: *Killed: off for everyone.* + body (DRAFT).
  - A first **Killed** rung that decides for everyone.
  - Overrides read *refused, killed*, with their On and Off held and Clear live.
- **Lifting:** On, Off or Not set saves at once, with no confirm. A model flag that rises still opens the shipped model confirm.

## 5 · Rule 0 defaults (`Rule0`)

- **Seat notice in the app:** no cap. Names wrap, and Open and ✕ top-align.
- **Seat push over 40:**
  - Title: *{host} seated you*.
  - Body: *At {pod}'s table, with {deck}.* or *At {pod}'s table. Pick your deck there.* (DRAFT).
  - At 40 or under, the shipped title and body.
  - A host name alone past 40 is cut with an ellipsis, the only cut.
- **Closing:** *Closing…* (DRAFT) on the danger button, with both buttons and ✕ held at 60%. No spinner, no new toast.
- **Home 1300 with no table:** as shipped, no slot. **First run 1300:** the table card sits above the About line and the checklist, as one row.

## 6 · Add a card (`Add-Card`)

- **(a) Ring:** a 2s hold, then a 400ms ease-out fade; reduced motion skips the fade. One timing for every "this changed" ring (dock add, search row, game landing).
- **(b) Remove:** Edit copies draws *Remove from collection* only when a copy is owned. No disabled Remove.
- **(c) Desktop after a save:** the card modal reopens on the same card and place, with receipt ×1, *Edit copies*, and the toast as shipped.
- **(d) Toasts on a deck page:** the save toast joins the deck stack. The floor is 10px above the dock; Undo toasts sit on the floor and alerts above, 10px apart.

## 7 · Delete a group, admin (`Groups-Delete`)

Hugh's locked rule: Delete works only on an empty group, with no members and no flyer codes. Deleting also removes the group's feature-flag settings. A group with members or a flyer code can't be deleted, and the page says why in place. Shipped surfaces: `group-page.tsx`, `group-editor.tsx` and `groups-list.tsx`.

- **Where:** at the group page's foot, under History and across a hairline. **Delete this group** is a text press in `--danger`, 44px on the phone and 32px on desktop.
  - Not on the list card, not in the head, not on New group.
  - Under it: *Only an empty group can go: no members, no flyer codes.* (DRAFT)
- **Refused:** the press stays, dimmed and inert, and the hint becomes the reason (DRAFT):
  - Members: *It still has {n} members. Unselect them above and save, then delete it.*
  - A code: *It has the flyer code {CODE}. A flyer code keeps its group, even revoked, so this one stays.* + *Flyer codes ›* (to the section on Invites).
  - Both: *It still has {n} members and the flyer code {CODE}. Only an empty group can go: no members, no flyer codes.* + *Flyer codes ›*.
  - Counts are the saved state, so unselecting without saving keeps it refused.
- **Confirm:** the shared confirm, a sheet on the phone and `ModelConfirm`'s 540 modal on desktop, with no note (DRAFT):
  - Title: *Delete {group}?*
  - Lead: *It's empty, so deleting it changes nothing for any account. Its {n} feature-flag settings are removed with it, and the name is free to use again.*
  - Facts: Members, Flyer codes, Overrides (named, or *None.*), History (*Kept in the admin log, under the group's name.*).
  - Buttons: *Keep it* / **Delete the group**.
- **After:**
  - The page lands on Groups, with the card gone and the count down. The shared toast reads *Deleted {group}.* with a bare ✕ and no Undo (DRAFT).
  - The server re-checks emptiness in the delete's own statement. If someone joined since, the dialog says *{group} isn't empty now. Nothing was deleted.* (DRAFT) and the page refreshes into the refused state.
- **Data:**
  - Members and overrides already cascade from `flag_groups`, and flyer codes `set null`. The refusal is the server's check, not a constraint.
  - `admin_events` gains a `group_deleted` kind; its check constraint needs a migration. The group's past events stay, since `admin_events.group_id` has no foreign key.

## Errata (B)

All ten are confirmed as built: where engineering used the app's shared component instead of a board's one-off, the shared piece wins. The handoff PR records these in the three handoffs. No build work follows.

- **B1 · Game history:**
  - The switch is the shared compact `SegmentedSwitch`, 195×46 at 13px, with a hairline before the deck select.
  - The failed-read toast is the shared `ToastFrame`, centred, 358×54.
  - Filters use the shared Sheet.
  - The deck select is 16px below `md`.
- **B2 · Add a card:**
  - The toast is centred with Undo underlined.
  - The receipt link is regular weight, underline offset 2, 44px tall.
- **B3 · Rule 0:**
  - The Close confirm uses the shared modal and sheet chrome.
  - Toasts share one column.
  - Key marks are 16px.
  - The Change deck modal uses the shared chrome and `SheetLoading`.

## Open questions for Hugh

1. **Item 4:** one segment with Killed (drawn), or a separate danger *Kill* button under App-wide? Recommended: the segment, one control per decision.
2. **Item 5:** split the seat push past 40 (drawn), or let the push layer cut the pod name? Recommended: split.
3. **Item 6a:** add the 400ms fade, or keep the shipped 2s cut with no motion? Recommended: the fade, with reduced motion as today.
4. **Item 7:** a revoked flyer code still names its group, so under the locked rule a flyer group can never be deleted. Count live codes only? On delete, a revoked code's group would go blank. Recommended: live codes only. Drawn as locked until Hugh says.
