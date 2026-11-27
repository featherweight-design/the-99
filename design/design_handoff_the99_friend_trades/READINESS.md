# Readiness Review: Friend trades

**Verdict:** 🟡 Yellow
**Audited:** 2026-11-27 (Claude, after Hugh approved R11)
**Related ticket(s):** brief `docs/superpowers/design-briefs/2026-11-27-friend-trades.md` (#3395)
**Plan PR target:** TBD (`docs/superpowers/plans/`, opens after this handoff PR merges)

## Summary

Every screen and state is drawn at phone (390) and desktop (1300) from the shipped components, with a reference
implementation of the strings and layouts in `scratch-gen/proposal.diff`. Yellow, not Green, because the data layer
does not exist yet: trades need their own tables, writes, expiry, feed and push. None of that needs Design.

## Per-dimension findings

### 🗺️ Scope clarity
- ✅ The brief's seven open calls are answered in README "Calls"; Hugh's later calls in "Calls beyond the brief".
- ✅ Q9 (a spare in two offers, warned in the picker) and Q10 (one unanswered offer per friend) are decided.
- ✅ Out of scope as the brief says: no collection change, spares only, no messages, no enforced balance.

### 🎭 State coverage
- ✅ All twelve sheet states, the Trades rows, the feed rows, empty list, the cap, asks on tiles, the Offered popover.
- 🟡 `lookYours` (your own card gone) is not drawn; it is S7 with `lookLineYours`.
- 🟡 Not drawn: a side with no spares (`empty.yoursTitle` / `theirsTitle` strings exist, use the Requests box's
  `PanelEmpty`), loading, a failed send. Follow the spare-request patterns.
- 🟡 Tablet uses the desktop sheet (640px) and the Spares tab's existing breakpoints.

### 🔌 Data contract
- 🟡 New tables: a trade (two people, state, created, days left from the first offer, who marked traded) and its cards
  (side, card, copies 1 per D3 v1). A counter replaces the open offer's cards and keeps the trade's clock (D6).
- 🟡 Q10: at most one unanswered offer from you per friend. Accepted trades don't count; counters are never held.
- 🟡 Q9: a spare may be in two live offers; the picker needs, per card on your side, the other friends it's offered to
  and each offer's days left (`OfferedTo`).
- 🟡 Needs a look: a card that stops being spare flags the trade for both people (derived on read, as spare-request
  expiry is; no sweep).
- 🟡 Feed kind `trade` (D7) default on; push for offer, counter, accept, decline (`src/lib/push/message.ts`).
- 🟡 Every read of the other person's trade cards goes through `src/lib/social/` and joins the grant
  (`check:social-reads`); names are `ThirdPartyName`s.
- 🟡 Make it a trade links the new trade to the spare request it grew from (the yes card on your side).

### 🧱 Codebase fit
- ✅ Reuses `DeckBox`, `ModalChrome`, `SegmentedSwitch`, `AnswerPresses`, `TodoRow`, `SpareGlyph`, `WishGlyph`,
  `WantChip`, `PanelEmpty`, the Spares tab chassis and grid. One new prop: `TodoRow markTone="fact"`.
- ✅ Tokens only (`--fact`, `--accent`, `--accent-text`, `--success`, `--danger`, `--fg*`, `--border*`).
- ✅ No new strip tab, no new route; `/friends/{id}/spares?wanted=wishlist,deck` filters the existing tab.

### ♿ Accessibility
- ✅ Chips are `aria-hidden` with full sentences as sr-only text ("Offered to Peter and Chris"); Add is
  `aria-pressed`; the Offered chip is a button with `aria-expanded` and `aria-haspopup="dialog"`.
- 🟡 The Offered popover needs focus handling (focus in, Escape closes, focus back to the chip) in the build.

### 📱 Parity
- ✅ Every frame drawn at both widths. Phone differences are named in README (the arrow on `N friends`, the
  Friends-list key line, the bottom sheet).
