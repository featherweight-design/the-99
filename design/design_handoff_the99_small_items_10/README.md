# The 99 · Small items 10 (account 2, 2026-11-02)

Canvas: https://claude.ai/artifact/NHhPqYqjocm4vmwkaf4Jij
Status: **R1 APPROVED by Hugh 2026-11-02**: every recommendation below stands, and the four open calls are settled as recommended. Engineering's READINESS audit follows.

Small follow-ups on shipped surfaces: buying credits, Hide a commander, game history filters, admin delete a group, and the app's toasts. Each item is drawn at 390 and 1300 over the shipped boards it extends. New pieces carry a dashed copper outline. Strings marked DRAFT go through `/copy-review`; this round adds no new player-facing copy (item 5's confirm line is admin-only).

To view a board, open `Main.dc.html` or the board's own page, with `support.js` and `art/` beside it. `scratch-gen/` holds the generator: `lib10.py` plus one `b*.py` per board. Each module lifts frames from its source board on main (`DESIGN` env var, main's `design/`; `SRC10` for the art), and `scope()` rescopes each source's helmet so several sit on one board. Run `python3 build.py out b0:Main b1:Plan b2:Toasts b3:Hide b4:Games-Filters b5:Groups-FlyerOff b6:Errata`. Then `node render.js <abs out> Main …` sets each board's preview size and reports broken images, overflow and clipped frames. `canvas10.py <out> <root>` swaps `art/` for the canvas's `/_blob/` urls (`blobs10.json`).

Sources: main @e9b6fce. Source boards: `buying_credits/R1 - Plan-and-Cancel`, `hide_commander/{Page,Undo}`, `game_history/{Populated,Edges}`, `small_items_9/Groups-Delete`, plus the shipped components each section names.

| Board | Item |
|---|---|
| `Main.dc.html` | Every call and the open questions |
| `Plan.dc.html` | 1 · Buying credits, the plan at 50 credits a month |
| `Toasts.dc.html` | 2 · Toasts, one rule app-wide |
| `Hide.dc.html` | 3 · Hide a commander: (a) contrast, (b) Discover's search, (c) For you's aside |
| `Games-Filters.dc.html` | 4 · Game history filters, engineering's defaults |
| `Groups-FlyerOff.dc.html` | 5 · Delete a group with the flyer trial off |
| `Errata.dc.html` | 6 · Errata |

## 1 · Buying credits, 50 a month (`Plan`)

- Plan-and-Cancel redrawn, every frame (K1 to K6, 390 and desktop):
  - The card title reads *50 credits a month*.
  - The crown's diamond mark reads **50**.
  - A month in Purchase history reads *50 credits*.
- Nothing else moves: $5, rollover with no cap, one-tap cancel (A), Keep my plan. The 74 plan credits in the fixtures are a rollover balance and stand.
- The app already reads the count from `PLANS.monthly.units` (`packs.ts`, 60 became 50 on 2026-11-01) for `plan.title`, `OfferArt` and `addedPlan`. No build.
- The board's spellings follow the shipped strings: *Canceling keeps your…*, *Plan canceled.* The settled A/B section is dropped.

## 2 · Toasts, app-wide (`Toasts`)

**The shipped toast is the rule.** Recent boards drew toasts 358 wide over the main column at radius 12, and Hide's with an outlined Try again. On a 390 phone the shipped toast is also 358 wide (`100% − 32px`); the two part at 1300.

- **Frame:** the shared `ToastFrame` (`edit-toast.tsx`). Radius 10, `--elevated` on a 1px `--border-strong` edge, the shipped shadow. No status dot, no colored edge.
- **Slot:** bottom center of the window, `min(420px, 100% − 32px)`.
  - 16px over the tab bar on a phone, 24px from the foot from `md`.
  - Centered on the window, not on the main column.
- **Pages with a foot a toast would cover** keep their shipped stack, with the same frame: the deck stack over the quick-add dock, and the cart stack over the cart's foot. These are the only other slots.
- **/credits joins the center slot.** Its bottom-left 440 slot is the deck slot as it shipped before the stack, and /credits has no dock.
- **Action:** one text press: `--accent-text`, 600 13.5, underlined at 2px, 44px tall. It reads *Try again* or *Undo*. No outlined or filled button in a toast.
- **Close:** the bare ✕ (44px, `--fg-faint`) only on a toast with no action, as *Deleted {group}.* ships. Never both a press and ✕.
- **Timing:** every toast leaves on `TOAST_MS`, held on hover and focus, as shipped.
- **Build:**
  - `hide-commander.tsx`: the outlined Try again becomes the press above.
  - `social-toast.tsx`: its action is underlined.
  - `admin/show-button.tsx`: its action takes 600 and the underline.
  - `credits-toast.tsx`: placement `center`.

## 3 · Hide a commander (`Hide`)

- **(a) Not ranked while hidden:** mono 13 in `--fg-faint`, the look of *Rank #N*, which it replaces.
  - Shipped `--fg-locked` measures 3.1 to 3.4:1 on the hero's `--surface-rail`.
  - `--fg-faint` measures 5.1 to 5.9:1 in all six themes (table on the board).
  - One color in `HeroRankClause`. No new token, no size change.
- **(b) Discover, a commander you own and hid from For you.** Decided: Discover's normal no-match.
  - It shows the shipped `DiscoveryEmpty`: *No commander by that name* + *Clear search* + *Search your commanders*.
  - *Search your commanders* lands on For you's held state, as shipped: *Ghalta, Primal Hunger is here. You hid it* + *Open its page*.
  - Each list reports only the hides that unhiding would put back in it, as `findOwnedExcludedMatches` already does for For you.
  - Build: `findExcludedMatches` leaves owned matches out of its `hidden` cause.
- **(c) For you, a search matching a visible and a hidden commander ("aang").** Decided: yes.
  - The shipped `ExcludedMatchAside` sits above the rows, with `hiddenAlso` (*Aang, Swift Savior also matches, but you hid it, so it stays out of your lists.*) and *Open its page*. Two or more read `hiddenMore` with `hiddenCtaNamed`.
  - Build: For you asks `findOwnedExcludedMatches` on every settled query, not only when nothing matched. That is one request per settled query, as Discover already makes.
  - No new copy.

## 4 · Game history filters (`Games-Filters`)

All four of engineering's defaults are confirmed, with two small redraws.

- **(a) Played against takes one value.** A friend wins when a link names both a friend and a commander. One value fits the summary, which answers one table (*with Peter at the table*, *Peter won 1 of the 3 you lost*).
  - **Redraw:** only the chosen row carries the filled tick (accent, 18px, radius 5). Unchosen rows draw no box, so the list stops reading as multi-select. One class in `AgainstList`, at both widths.
- **(b) Most played is hidden under a deck filter.** There it could only say *{deck}, n of n*. The facts line names the deck instead of a count.
- **(c) The low-games line is hidden under any filter.** It says where games come from, which is about the whole list.
- **(d) Clear all is inert when nothing is on**, never hidden, as the chassis's *Clear all filters* is.
  - **Redraw:** the sheet's inert Clear all reads inert: label `--fg-locked`, edge `--border`, no hover. The shared `GhostButton` draws disabled exactly as enabled today. Use a local class on the sheet's button, not a `GhostButton` change.
  - Desktop has no sheet; its *Clear all filters* is the chassis's.

## 5 · Delete a group, flyer trial off (`Groups-FlyerOff`)

With `FLYER_TRIAL_ENABLED` off, Invites has no Flyer codes section, so the refusal's *Flyer codes ›* leads nowhere and the group can never go.

- **Decided: with the trial off, no code is live, so none blocks.** Off, every code reads as ended and takes no sign-ups (`flyer/flag.ts`). This keeps the approved rule: only live codes block.
  - Build: in `deleteState`, *live* becomes `!revoked && flyerTrialEnabled`. The server re-check uses the same test.
  - **F1 (390):** a group with a code only. The press is live, with the shipped hint.
  - **F2 (1300):** members and a code. The line is the shipped members-only refusal, and *Flyer codes ›* goes.
  - **F3 (1300):** the confirm's Flyer codes fact: *{CODE}, ended with the flyer trial. It loses its group, so if the trial comes back on, people who join with it land in no group.* The code's group goes blank (`set null`), as for a revoked code. Admin-only copy.
- **Alternative (F4), not taken:** keep the block and drop the link: *It has the flyer code {CODE}. The flyer trial is off, so Invites can't revoke it: turn the trial on to revoke it, then delete the group.* It locks the admin in until flyer sign-ups are switched back on.

## 6 · Errata (`Errata`)

- **E1 · Small items 9: US spelling.**
  - Done in this handoff PR: "centred" becomes "centered" in `README.md` (items 2a, B1, B2), `READINESS.md` (B2; the US English note marked done), and the board annotations: `Report` (4), `Errata` (4), `Groups-Delete` (1).
  - `Add-Card`'s "centre" (2) becomes "center", and the generator likewise. `Rule0`'s *central* is an SVG attribute and stays.
- **E2 · Plan-and-Cancel's UK forms**, fixed by item 1. The other buying-credits boards still draw 60 and stand as history; Plan-and-Cancel in this round is the plan's reference.
- **E3 · Toasts:** `game_history/Edges` (L3, X1, X2) and `hide_commander/Undo` (12) yield to item 2. Small items 9 B1's "358×54" holds at 390; from `md` the toast is 420.
- **E4 · Hide:** the README's §4 takes items 3a to 3c once settled.
- **E5 · Game history:** the README's §3 takes the four confirmed defaults and the Played against mark.

## Decided (Hugh, 2026-11-02)

1. **3b:** Discover shows its normal no-match. Discover's "You hid it" line goes.
2. **3c:** For you shows the aside when a hidden commander also matches.
3. **5:** with the trial off no code is live, so none blocks deleting a group. F4 is not built.
4. **2:** /credits joins the center slot.
