# The 99 · Small items 8 (account 2, 2026-10-31)

Canvas: https://claude.ai/artifact/WFm5ErpwVJpwU72W9zxQ2D
Status: **R1, awaiting Hugh's audit.**

Six states the shipped handoffs left undrawn or illegible, plus four errata. Each item is drawn at 390 and 1300 over the shipped boards it extends (item 3 at 768 and 1024, where the problem is). Strings marked DRAFT go through `/copy-review`.

To view a board, open `Main.dc.html` or the board's own page. Each needs `support.js` and `art/` beside it. `scratch-gen/` holds the generator: `lib8.py` plus one `b*.py` per board, each reading its source board from main's `design/` (`DESIGN` env var); `build.py out b1:Banner …`, then `node render.js <abs out> Banner …` sets each board's preview size and reports broken images and overflow. `canvas8.py` swaps `art/` for the canvas's `/_blob/` urls (`blobs8.json`).

Sources read: main @ebfb3e1 and the files each section names.

| Board | Item |
|---|---|
| `Main.dc.html` | Every call and the open questions |
| `Banner.dc.html` | 1 · Home, New in the app |
| `Ticket.dc.html` | 2 · Sign-up arriving with a ticket |
| `Cart-Tablet.dc.html` | 3 · Cart toasts at 768–1223 |
| `Beads.dc.html` | 4 · Results beads with 1–4 games |
| `SC-Off.dc.html` | 5 · A v2 run opened with v2 off |
| `Report.dc.html` | 6 · Report a problem after a crash |
| `Errata.dc.html` | Errata i–iv |

## 1 · Home, New in the app (`about_visual` Ways-In, `arrivals-banner.tsx`)

- **No screenshot.** Each About line draws the rail/tab glyph (`NavIcon`) of the page its Show me opens, in `--accent` on the `Mark` plate's tint. 28px plate (16px glyph) in the band; 36px (19px glyph) for a launch alone. Shopping lands on a deck, so it takes Decks. A rule keeps the diamond `Mark`.
- **One sentence a line:** the label's lead plus the first sentence of its rest. The top story goes from six phone lines to three.
- Retires `LaunchCrop`, `CROP_SIZES`, `cropStyle`, the banner's `ThemeRefresh` and the capture fetch.
- Unchanged: band, heading, cap and "and N more", ✕, focus, arrivals lines.
- Unblocks Suggested changes v2's About New mark.

## 2 · Sign-up with a ticket (Small items 7 item 5; flyer trial `Join-*`)

- At launch an account needs a ticket: invite QR or flyer (`/join`, email then code) or an invitation email's link (Clerk ticket, proves the address).
- The hand-over to Clerk's hosted sign-up goes. The name step is drawn on the page the reader is on, under the ticket's card: *Your first name*, the hint, **Make my account**, `LegalLinks` (Small items 7 U3).
- **Invite QR / flyer** keep *That's your email*; body (DRAFT): *Now the name your friends will know you by. You'll join as Colin's friend.* / *… You start with 15 welcome credits and 3 invites.*
- **Invitation email** opens `/sign-up?__clerk_ticket=…`: title `joinCopy.title`, body (DRAFT) *The invitation proved your email. Now the name your friends will know you by.*, the email locked with *from the invitation* (DRAFT), no code step.
- Errors as shipped (N12, flyer E1–E3, U4).

## 3 · Cart toasts at 768–1223 (Small items 7 item 3)

- From `md` the failed ask is bottom centre (≤420) and the receipt bottom right (380, 22 in). They overlap below 1224.
- **Call:** below 1224, while a receipt is up, the failed ask joins the receipt's stack in the receipt's slot, 10px above. The phone's rules carry over. Alone, each keeps its place. From 1224 unchanged.
- Engineering: `useCartPhone` true below `(min-width: 76.5rem)`; from `md` the stack container takes the receipt's fixed slot.

## 4 · Results beads, 1–4 games (Small items 7 addendum 6)

- **Redraw:** `data-results-ends` is drawn only from five beads. Under five, the span line beside the record already names the first and last game. No new string.

## 5 · A v2 run with v2 off (`suggested_changes_v2` History C)

- Drawn as History C: the shipped past-run box, `pastNoteUncounted` (*A past run, read-only. Nothing here can be applied now.*), or `pastNote(n)` when the list moved. Rows Added, Cut or Not picked; no Pick, Apply, Undo or bracket controls. A never-applied run reads Not picked throughout and *nothing applied*.
- Replaces Small items 7 addendum 2 ("no line"). Engineering: take `past.stale`'s box whenever `v2 === null`.
- New run opens the shipped v1 intake.

## 6 · Report a problem after a crash (Small items 7 addendum 8)

- **Confirmed:** already drawn in Small items 7 `Report-Crash` (crash screen with no shell, standalone `/report`), merged in #2499, not built yet. Carried unchanged.
- New states: send failed (shared toast, `reportCopy.failed` + Try again, text kept), sent at 1300, `/report` with no `ref` (no code line).

## Errata (i–iv)

- (i) *· reset at* only once a credit is used: confirmed; SC-Cost C and E redrawn.
- (ii) The 2-credit line: state note first, then lead, why (`whyLot`, *A free credit covers up to 10.*), count; the paid segment follows *N after this run*; the phone's wait hint on its own line only on 2-credit lines; C uses `costsTwoFree` while the free allowance holds one and `costsTwo` otherwise. Confirmed and drawn as built.
- (iii) Cap input 16px on phone, 14px from `md`: confirmed; as built the 14 also needs a fine pointer (an iPad keeps 16). Recommend keeping that.
- (iv) Results' sticky head opaque on `--surface-sunken`; Small items 6 6b Pick above ✕: confirmed.

## Open for Hugh

1. Item 1: glyphs (recommended) or no art at all.
2. Item 2: the invitation email's card is drawn without the ✓, since no code was typed.
