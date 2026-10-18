# Gap report: Admin R3 PII masking, PR 3 (Show, the reveal and its log)

Design: `design/design_handoff_the99_admin/` R3, rulings D3, D5 to D8 and D13; design table `design-tables/admin-r3.md`
rows A1, A2, B1, B2 and History; boards A2 and B2 in `R3/AdminR3.dc.html` at 900 and 390.

Implementation: `src/components/admin/show-button.tsx`, `use-reveal.ts`, `accounts-list.tsx`, `account-page.tsx`,
`switch-page.tsx` (History's mark), `invites-section.tsx` (the field help), `src/lib/admin/reveal.ts`,
`src/lib/admin/invites-rule.ts`, `src/app/admin/accounts/actions.ts`.

## Agent 2 (verify)

Pass 1, visual: 0 gaps. The Show button (32 at `md`, 44 and a 64 minimum on the phone; `--border-strong`, accent
while on), the revealed row (raised surface, inset accent ring, lines that wrap instead of clipping), the revealed
head (name, email in `--fg-body`, the id faint and `break-all`, the role, the accent `Shown and logged` line), Show's
place (the head's right from `md`, its own row under the head on the phone), History's 6px accent diamond, and no
Show on the owner's row or the viewer's own all match.

Pass 2, state reachability: 1 gap.

1. History after a Show (B2, D8). The line was written and read but only drawn after a reload, because nothing
   refreshed the page. **Fixed**: `useReveal` takes an `onShown` callback and the account page passes
   `router.refresh()`; the reveal is client state and survives it. Proved by `accounts.test.tsx` (the refresh is
   called; mutation-checked) and `probe:admin-pii` (`History draws the Show's line without a reload, the head still
   revealed`).

Outside this PR: History's time column is the R2 `HistoryList`'s 130px at 11px, where R3's `.hist` draws 118px at
10.5px. It is the shared list the Switches and Groups pages draw too, R2 stands, and R3 named no change to it.

## Agent 3 (confirm)

Item 1: FIXED. 0 gaps remain.

## Proof

- `probe:admin-pii` presses Show once on the scratch branch: the whole email reaches the browser in the Show action's
  POST response and in no other response, one `account_revealed` event is written, History draws the line at once,
  Hide masks the head, and a reload draws the line and sends no email.
- Contact sheet `admin-masking.json` gains `masking-accounts-revealed` (A2) and `masking-account-revealed` (B2), both
  widths.
