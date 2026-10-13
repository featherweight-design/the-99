# Gap report: admin 9a, Groups (2026-10-13)

Design-review against `design/design_handoff_the99_admin` (design table §Groups, STATES G1–G7 and Must-not).

- Verify pass: 0 visual gaps, 1 state gap.
  - G3: a new group with only a name typed raised no pending bar, so `Create` could not be pressed
    (`pendingSummary` counted a name only against a saved group).
- Fixed: a new group's non-empty name now counts as a change and reads `Saving creates ‹name›.`
- Confirm: `groups-rule.test.ts` "offers Create for a new group with only a name typed" pins it.
  It fails against the old guard.
- Remaining: 0.

Copy is out of scope here: the new and reworded `adminCopy.groups` strings go to /copy-review.
That includes the pronoun-free rebuild of the handoff's `pendingMove`.
