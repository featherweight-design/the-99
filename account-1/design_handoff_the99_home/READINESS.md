# Readiness — Home parity (R1)

Self-assessed. **Amber.** The design is complete and spends almost nothing; three things need a
decision that is not Design's to make alone, and one figure needs a query that does not exist yet.

## Green

- **Block parity, both widths.** Four blocks, one order, nothing on one width only.
- **No new atom, token, hex or motion class.** Two blocks deleted, one grown, one mono line added
  to a shipped row.
- **Shipped geometry restored after review** — the 300px Ready-to-build crop and the one-line
  resume row with its bleeding art. No row is taller than the row it replaces at either width.
- **Copy is production-final**, including the three strings this change deletes.
- **Phone targets are 44px** on every control on the page.

## Amber — needs a decision

1. **The empty resume block.** Drawn as *absent, heading and all*, at 0 decks. That is a product
   ruling about the first-run page as much as a design one, and the alternative (an empty box with
   a line of prose) is defensible if onboarding wants a third thing to say there.
2. **Relative stamps.** `edited 2h ago` rather than `14:22`. Ratify or reject — it is the one
   copy decision in the handoff that a reviewer could reasonably swap, and it is one string set.
3. **Whether a logged game counts as touching a deck.** It is in the sort key. Four games logged
   last night gives four rows nobody edited. Removing it is a one-line change to the query.

## Red — blocks a green

4. **The resume query does not exist.** `greatest(last_edited_at, last_committed_at,
   last_game_logged_at) desc, name asc` limit 4, **returning which column won** so the stamp can
   name the verb. Without the winning column the stamps cannot be built and the block falls back
   to a bare date, which is the version this handoff argues against.
5. **`last_opened_at` is assumed not to be written.** If it exists it must stay out of the sort
   key. Unverified in this project — `src/` holds only `shell/nav.tsx`.

## Not in scope, named so it is not assumed

- Ready to build's own empty case (0 buildable commanders) is untouched.
- The Decks page itself: its sort, its filters, its rows. This handoff removes home as a consumer
  of `/decks`' sort preference and changes nothing on the page.
- Commitments' figures and their derivation. The panel is mounted on the phone as-is.
- Instrumentation. Gap 4 in the README names what was not measured before `Your decks` was cut.
