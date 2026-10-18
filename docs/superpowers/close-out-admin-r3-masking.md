# Close-out: Admin R3, PII masking

The feature line: PR 1 #2012 (masked at the source), PR 2 #2022 (the drawn surfaces and Costs), PR 3 #2044 (Show, the
reveal log, the re-mask) and PR 4 #2052 (the exact-email lookup). Plan `docs/superpowers/plans/2026-10-17-admin-pii-masking.md`;
brief `design/design_handoff_the99_admin/` README-R3, STATES-admin-R3 and `design-tables/admin-r3.md`.

## The inventory, walked

Every row of the plan's route × state table was loaded in a real browser at 390 and 1300, against `next start` on a
scratch branch made from local-dev and seeded with `seed:admin-pii-fixture`:

- `node scripts/contact-sheet.mjs docs/superpowers/inventories/admin-masking.json`: A1, A2, A7, A8, B1, B2, C1, Y1, C2, C3
  (overrides and the picker opened) and C5, both widths, all photographed.
- `PROBE_SHOTS=<dir> pnpm probe:admin-pii`: A3, A4, A5 and A6, the four states a press or an aborted request reaches,
  both widths.

What the walk saw: every person on every admin surface is named masked (`Hugh H.`, `Account ·kTd4`, `h•••@f•••.design`),
no Clerk id is drawn on a masked row, head, choice or member line, the owner and no-name accounts carry the diamond,
and a revealed account is the only place the full name, email and id appear, with its accent ring and hide time.

## Design review against the whole brief

Agent 2 over every row of `design-tables/admin-r3.md` and every ruling D1 to D14, at the line's last head: 0 gaps.
Deferred by the brief itself: ruling 5's privacy-page line (no privacy page exists; owned by the launch line) and an
About entry (the brief names none: `/admin` is not a reader's surface).

## Proof that holds the line

`pnpm probe:admin-pii` passes on the line's last head: no page, flight or picker response carries a whole name or email
before a Show; the Show's own answer carries it once and no other response does; one `account_revealed` event per Show;
History draws the line at once; Hide and a reload re-mask; a failed Show and every lookup write nothing; a lookup's
answer carries no name or email.

## Not in this line

- The two-tab first-run tour race found in #2034's review is #2058, a separate follow-up.
