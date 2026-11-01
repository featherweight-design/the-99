# Readiness: small items 9

**Verdict: Green from Design.** Hugh approved every board on 2026-11-01 (R1, with item 7). One migration (item 7), no new switch. The DRAFT strings go through `/copy-review` before they ship. Engineering's own audit may move any item; where an item changes shipped behaviour, the file it touches is named. Checked against `origin/main` @f0199bc.

## For engineering, by item

Sizes: S under 150 lines, M 150 to 500, L over 500, tests included.

1. **Game history, no match (S, lane game history).** The same frames as game history addendum A1 (Z1 to Z3): build them there. No new string beyond A1's.
2. **Report a problem (S, lane flyer/feedback).** `/report`: when signed in, draw inside the app shell and drop `CrashWordmark` and the newcomer frame. Signed out keeps the Fan Content notice. Add `reportCopy.anonRetention` (DRAFT) between the attachment line and Send, signed out only. `global-error.tsx` is unchanged.
3. **Launch list CSV fails (S, lane flyer admin).** `flyer-launch-csv.tsx`: on a refused, switched-off or lost reply, show the admin's inline `role="alert"` line under the launch card's top row (three DRAFT lines; lost adds Try again). The busy hold stays as shipped.
4. **Kill a feature flag (M, lane flags plan).** Rides the flags plan's PRs: the rename to Feature flags, `killed` as the fourth App-wide value (`override-controls.tsx` `APP_OPTIONS`), the confirm (`model-confirm.tsx` shape, danger action, always), the list's KILLED tag and Resolved *killed*, the page's banner and Killed rung, overrides refused. Lifting saves at once.
5. **Rule 0 defaults (S, lane Rule 0).** The seat push builder splits past 40 characters (title `{host} seated you`, pod and deck in the body; host alone past 40 cuts with an ellipsis). Close confirm: *Closing…* and 60% hold while in flight. First-run Home at 1300: the table card above the About line and checklist. No-table Home: no change.
6. **Add a card (S to M, lane collection/deck).** (a) One ring timing: 2s hold, 400ms ease-out fade, reduced motion skips the fade. (b) `edit-copies-sheet.tsx`: no Remove unless a copy is owned. (c) Desktop: after a save from card details, reopen the card modal on the same card. (d) On a deck page, the save toast joins the deck toast stack above the dock.
7. **Delete a group (M, lane admin).** `group-page.tsx` foot: Delete this group (danger text press), its refused line and *Flyer codes ›*; the shared confirm; a `deleteGroup` action that deletes only when the group has no members and no live flyer codes, checked in the delete's own statement; lands on `/admin/groups` with the shared toast. Migration: add `group_deleted` to `admin_events_kind_check`. Members and overrides cascade; flyer codes `set null` (schema as shipped).

## Errata

B1 to B3 record what shipped; no code change. Each is noted in its own handoff: `design_handoff_the99_game_history`, `design_handoff_the99_add_card_anywhere`, `design_handoff_the99_rule_zero_revisions`.
