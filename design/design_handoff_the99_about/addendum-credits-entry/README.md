# About · How credits work (`credits`), redrawn for buying credits

**Approved by Hugh 2026-10-21** with the bracket reach round (see
`design/design_handoff_the99_help_me_choose/addendum-bracket-reach/`). Brief: `2026-10-21-bracket-reach-choice.md`,
"About entries" item 2. The strings are in that folder's `bracket-reach · copy strings.ts` (`aboutCredits`).

- **Screen:** the entry moves from *A deck · Analysis* to a new **Credits** screen (`/credits`), after Account menu. Its frame is
  the `/credits` balance strip, highlighted. Engineering adds `credits` to `ABOUT_SCREENS` and captures `credits.webp` per theme.
  The board draws the frame from the shipped `balance.tsx`.
- **Caption:** opens with the approved `/credits` line ("Browsing is always free. Anything we write just for you uses a
  credit."). Then it lists what spends a credit and what stays free. Last, it lists where credits come from, in spend order
  (free, welcome, plan, gift, pack). `{allowance}` fills the free figure as today.
- **Keys (4):** expiry, refunds and disputes, the shared daily limit, the button line.
- **Not drawn:** the two Overview keys (`OVERVIEW_V2_ENABLED`). The suggestion is to move them to the Overview's own entry.
  That is Hugh's call at the About batch.
- Every fact comes from `src/lib/copy/legal/terms.ts` and `docs/agents/payments.md`, as the brief carries them.
