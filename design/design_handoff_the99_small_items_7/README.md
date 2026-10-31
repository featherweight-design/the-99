# The 99 · Small items 7 (account 2, 2026-10-30)

Canvas: https://claude.ai/artifact/BAKRbEoDodcL8VMGnm9KXY
Status: **Approved by Hugh, 2026-10-30** ("all of your designs have my approval. Please open a PR when everything is ready").

These are the states the shipped handoffs left undrawn, across the flyer admin, Suggested changes v2, the cart, the tuning hub, sign-in and About. Two errata and an addendum follow. Each item is drawn at 390 and 1300, over the shipped screens. Everything else in these features builds from its existing boards. Strings marked draft go through `/copy-review`.

To view a board, open `Main.dc.html` or the board's own page. Each needs `support.js` and `art/` beside it. `scratch-gen/` holds the generators:
- `si7.py` + `b7.py` run over the flyer trial kit (design-assets `account-2/design_handoff_the99_flyer_trial/scratch-gen/`).
- `sc7.py` + `sc7-b7.py` run over the Suggested changes v2 kit (`account-2/design_handoff_the99_suggested_changes_v2/scratch-gen/`).
- `ct.py` and `ab.py` read `design_handoff_the99_all_decks_cart_v2/By-Friend.dc.html`.

Sources read: main @575aa32 and the files each section names.

| Board | Item |
|---|---|
| `Main.dc.html` | Every call, the addendum, the errata, open questions |
| `Launch-Date.dc.html`, `No-Codes.dc.html`, `Revoke-Failed.dc.html`, `CSV.dc.html`, `Print-Revoked.dc.html` | 1 · Flyer admin |
| `SC-Cost.dc.html` | 2 · Suggested changes v2, the 2-credit cue (E: addendum 1) |
| `Cart-Toasts.dc.html` | 3 · Cart on the phone, two toasts at once |
| `Cuts-Short.dc.html` | 4 · Proposed cuts notice, shorter than a screen |
| `Sign-In.dc.html` | 5 · Custom sign-in and sign-up |
| `About-Cart.dc.html` | 6 · About, the all-decks cart entry |
| `Dates.dc.html` | Addendum 5–7 · month-first dates in fixed slots |
| `Report-Crash.dc.html` | Addendum 8 · crash screen and standalone report page |
| `Friend-Order.dc.html` | Erratum (a) · friend page order |

## 1 · Flyer admin (`flyer_trial` Admin boards)

- **Launch date.**
  - The date is a second row on the launch list card: **Launch date**, the shipped admin date field (38 tall, 44 on a phone), and the help line *Optional. Leave it blank until the date is firm.* (draft).
  - Blank is the starting state and a valid saved value.
  - **Save** shows only while the field differs from what's saved. After a save the row says *Saved* and offers **Clear**. Clear saves a blank, and the row then says *Cleared*.
  - A refused save keeps what was typed and shows `adminCopy.setting.saveFailed` as a `role="alert"` line.
- **No codes.**
  - The section head keeps **New flyer code**, with the meta *none yet · from your invites, 37 left* (draft).
  - The card holds the muted line *No flyer codes yet. Make one for a store, then print its flyer.* (draft).
  - The launch list card stays. With no emails it reads *Launch list · 0* with no Download CSV.
  - The tree draws no flyer node.
- **Revoke failed.**
  - The dialog stays open with an inline alert under the lead, as the admin's other dialogs do.
  - If the server refused: *Couldn't revoke the code, so nothing changed. Try again.* (draft).
  - If the reply was lost: *Lost touch with the server, so it may have revoked. Check the list before trying again.* (draft). The list refreshes.
- **CSV.**
  - Filename: `the-99-launch-list-YYYY-MM-DD.csv`, dated with the UTC day of the download.
  - Columns, in order: `email, store, code, added_at`. One row per address, oldest first, with a header row always.
  - `store` and `code` are blank for a code nobody made. `added_at` is ISO 8601 UTC.
  - RFC 4180 quoting, UTF-8. A cell that starts with `= + - @` gets a leading `'`.
- **Print, revoked.**
  - The page still opens from an old link or Back.
  - The bar reads *Revoked Nov 2. This code no longer signs anyone up, so there's nothing to print.* (draft). There is no Print and no Download QR.
  - The flyer shows dimmed. `@media print` hides it.

## 2 · Suggested changes v2, the 2-credit cue (`Intake.dc.html`)

The ruling: 1 credit for 1–10 swaps, 2 credits above 10. The free run covers up to 10. One source funds the whole run (`allowance.ts`).

- **A.** Above 10, the stepper's line gets a **2 credits** tag in the tiles' cost-tag shape. At 10 and under, the line is unchanged. The landing tile's cost reads *1 credit · 2 above 10*.
- **B and D.** The line beside **Suggest changes** names the source and the count: *Uses 2 welcome credits. Your free run covers up to 10.* With paid credits it reads *Uses 2 paid credits.*
- **C. Only the free run left, N > 10.**
  - **Suggest changes** is off.
  - The line reads *A run of 12 uses 2 credits. Your free run covers up to 10.*
  - It offers **Change to 10**, which sets the stepper to 10 and turns the press back on, and **Get more credits**, shown only while payments are on.
  - The standing line follows (*1 of 1 free · reset at 2:01 AM*).
- **E (addendum 1). The left line.**
  - It keeps counting credits, never runs.
  - Above 10 it adds what the run leaves: *5 of 5 free left, 3 after this run* (draft).
  - At 10 and under it is the shipped line.

## 3 · Cart on the phone, two toasts at once

- **Neither wins: they stack.**
  - On the phone, while a cart receipt is up, a failed ask (`spareCopy.request.failed`) joins the cart slot 10px above the receipt.
  - The receipt keeps the floor because it holds Undo. This is the Small items 3 deck stack (`deck-toast-stack.tsx`) placed in `CART_SLOT`.
- **At most one of each.** A newer toast of the same kind replaces the older one.
- **Each keeps its own clock.** When the receipt goes, the failed ask drops at once to its shipped place, 16px above the tab bar. When the failed ask goes, the receipt stays where it is.
- **The failed spares read** still waits for the receipt to close, as shipped (cart v2 PR 7).
- **Desktop is unchanged.** The bottom-centre and bottom-right slots never meet.

## 4 · Proposed cuts, shorter than a screen (`tuning_hub`)

- The hub keeps its held height (#2310) so nothing jumps.
- **Recommended, B.** An *Other tools* tile row (the hub's shipped tiles, minus Proposed cuts) fills the space under the notice.
- **Fallback, C.** The space stays plain, with the Fan Content foot at the bottom.

## 5 · Custom sign-in and sign-up (replaces Clerk's hosted pages at public launch)

- **The frame.** The newcomer frame (`/join`, the invite-only `/sign-up`): the compact card, one column, the brass button and the quiet line.
- **The flow.** `/join`'s email-and-code flow (`joinCopy`), with no password.
- **Sign in.**
  - The reader types an email and presses **Send code**. They enter the 6-digit code, and it signs them in.
  - A wrong code shows `codeWrong` and an expired one `codeExpired`, both under the boxes.
  - A proven email with no account gets *No account for that email*, with **Make an account with this email** and no second code.
  - Sign-in lands on the page that sent the reader there, or on Home.
- **Sign up.**
  - The steps are email, code, then *Your first name* (Clerk's `firstName`, which the profile already reads). Then the reader lands on Home with the welcome strip.
  - Terms and Privacy (`LegalLinks`) sit under the form.
  - An email that already has an account gets *You already have an account*, and **Sign in** goes straight in.
- **Clerk.** `clerk-hosted.test.ts` pins the hosted redirect today. The build retires it with the hosted pages.
- **Drafts** for `/copy-review`: *Sign in to The 99*; *Type your email. We'll send it a code, and the code signs you in.*; *New to The 99? Make an account*; *No account for that email* and its body; *Make your account*; *Now the name your friends will know you by.*; *Friends see it on your signature card. Change it any time in Settings.*; *Make my account*.

## 6 · About, the all-decks cart entry (`about_visual`)

- **The entry captures the cart, not its way in.**
  - New captures `p-cart` and `d-cart` show `/decks/cart` in By friend, on the G1 fixture account.
  - `p-decks` and `d-decks2` stay for Decks › Your decks.
- **Five labels, the ceiling.** All drafts:
  1. the checkout (`shopping/all-decks/total`)
  2. Decks (`…/decks`)
  3. the view switch (`…/views`)
  4. Ask (`…/ask`, friend spares switch)
  5. buy (`…/buy`, collection edit switch)
- **The way in becomes a sentence.** The sub line ends *Open it from Decks with **Shop all decks**.* (draft).
  - The `shopping/all-decks/cart` region on the Decks shots retires.
  - Its legacy link (`all-decks-cart`) points here.
- **? on the cart lands on this section**, with label 1 lit. `screen-for-path` maps `/decks/cart` to it.

## Addendum (Hugh, 2026-10-30)

1. **The left line beside the 2-credit cue.** Drawn as SC-Cost E (see item 2).
2. **A saved v2 run with v2 off.** Confirmed as built. It opens read-only, like an old run in History, with no Apply, Undo or pick and no line explaining why.
3. **Results' sticky list head.** Confirmed as built: opaque on `--surface-sunken`, like History's (#2491). The board's missing fill was an omission.
4. **About at v2 turn-on.**
   - One entry. The `suggested` label takes `variantOn: "SUGGESTED_CHANGES_V2_ENABLED"`, so turning v2 on marks it New for every reader (`isSeen`).
   - The credits row *1 or 2 credits* is confirmed.
   - The Try it shots regenerate at turn-on.
5. **Game history's desktop slot** widens from 132 to 156, which holds *4-player · Dec 31, 2025* at 11px mono.
   - The year stays as `formatPlayed` has it: dropped in the current year, shown otherwise.
   - The phone is unchanged.
6. **Stats beads.** No date under a bead.
   - The row is dated once, under its first and last beads (*Oct 2, 2025* … *Dec 31, 2025*).
   - On desktop, a bead's date shows on hover or focus (*L · Oct 9, 2025*).
   - The screen-reader label stays.
7. **Phone deck foot.** Each segment carries its leading `·` (joined by a no-break space) and never breaks inside, so no dot dangles at a line end.
8. **Crash screen and `/report`.**
   - `global-error` draws the wordmark over the shipped `ErrorNotice`, with no shell. Its link reads **Report a problem** and goes to `/report?ref=<digest>`.
   - `/report` is the shipped form, whole, on a page of its own in the newcomer frame, with *‹ Back home* above it. It works signed out, and the error code is sent with the report.
9. **What's new, closed offer on the phone.** Confirmed as shipped in #2476: Pick is layered above the ✕, with positions unchanged.

## Errata

- (a) `ERRATUM-friend-order.md`: the friend page reads Decks, Wishlist, Spares and opens on Decks (#2444). It is redrawn on `Friend-Order.dc.html`.
- (b) `ERRATUM-why-these-cards.md`: Suggested changes v2's "Why these cards" is its own call, made after both lists are final (#2452). No visual change.

## Open, not blocking

1. What reads the flyer launch date (the launch email, `/join`'s ended states)? Only the field is drawn.
2. Sign-in methods beyond the email code (Google, passkeys) are a Clerk setting. If any is turned on, it needs its own small board.
