# The 99 · Small items 7 (account 2, 2026-10-30)

Canvas: https://claude.ai/artifact/BAKRbEoDodcL8VMGnm9KXY
Status: R1 drawn 2026-10-30, awaiting Hugh's review.

The undrawn parts of the flyer admin section on `/admin/invites`, plus two errata. Source of truth: `design/design_handoff_the99_flyer_trial/` on main (#2404); its rulings are locked and everything it draws builds now. Each part here is drawn over those Admin boards at 390 and 1300. Strings marked as drafts are for `/copy-review`.

Open `Main.dc.html` for the calls, or a board's page; each needs `support.js` and `art/` beside it. `scratch-gen/si7.py` builds every board over the flyer trial kit (`design-assets`, `account-2/design_handoff_the99_flyer_trial/scratch-gen/`): copy `si7.py`, `b7.py`, `all7.sh` and `blobs7.json` beside that kit, add the kit's art, and run `all7.sh`.

Sources read: main @5242a7b; PRs #2420, #2427, #2435, #2444, #2457; `src/components/admin/{setting-dialog,model-confirm,invite-tree}.tsx`, `src/lib/copy/admin.ts`, `src/db/schema.ts` (`flyer_codes`, `launch_list`), `src/lib/flyer/launch-list.ts`, `src/app/friends/[publicId]/(tabs)/layout.tsx`.

| Board | Item |
|---|---|
| `Main.dc.html` | The calls, errata, engineering notes, questions |
| `Launch-Date.dc.html` | 1 · The launch date on the launch list card: empty, typed, saved, cleared, refused |
| `No-Codes.dc.html` | 2 · The flyer section with zero codes |
| `Revoke-Failed.dc.html` | 3 · When revoking a code fails |
| `CSV.dc.html` | 4 · The launch list CSV: columns, order, filename |
| `Print-Revoked.dc.html` | 5 · The print page for a revoked code |
| `Friend-Order.dc.html` | Erratum (a) · The friend page in its shipped order |

## 1 · Launch date

- A second row on the launch list card: **Launch date**, a date field (the shipped admin field: 38 tall, 44 on a phone, 16px text on touch), and one help line: *Optional. Leave it blank until the date is firm.* (draft).
- Blank is the starting state and a valid saved value.
- **Save** shows only while the field differs from what's saved. After a save the row says *Saved* and offers **Clear**; Clear saves a blank and the row says *Cleared*.
- A refused save keeps what was typed and shows the shipped admin line *Didn't save. Nothing changed.* (`adminCopy.setting.saveFailed`) as a `role="alert"` line under the row.

## 2 · No codes

- The section head keeps **New flyer code**; its meta reads *none yet · from your invites, 37 left* (draft).
- The section's card holds the admin's muted empty line: *No flyer codes yet. Make one for a store, then print its flyer.* (draft).
- The launch list card stays, so the date can be set before the first code. With no emails it reads *Launch list · 0* and *no emails yet · a used-up or ended flyer asks for one* (draft), with no Download CSV.
- The tree draws no flyer node.

## 3 · Revoke failed

- The confirm dialog (ModalChrome on desktop, sheet on phone) stays open with an alert line under the lead, as the admin's other dialogs do. Not the player toast.
- Refused: *Couldn't revoke the code, so nothing changed. Try again.* (draft). **Revoke code** stays the retry.
- Lost touch: *Lost touch with the server, so it may have revoked. Check the list before trying again.* (draft, the shape of `groups.errors.unknown`). The list under the dialog refreshes.

## 4 · CSV

- Filename: `the-99-launch-list-YYYY-MM-DD.csv`, the download day in UTC.
- Columns, in order: `email`, `store`, `code`, `added_at`. One row per address, oldest first. Header row always.
- `store` is the code's label and `code` its six characters; both blank for an address left on a code nobody made. `added_at` is ISO 8601 UTC.
- RFC 4180 quoting, UTF-8. A cell that starts with `=`, `+`, `-` or `@` gets a leading `'`.

## 5 · Print, revoked

- `/admin/invites/flyers/[code]` still opens for a revoked code (an old link, Back). The bar keeps **‹ Invites**, the store and the code (muted), and reads *Revoked Nov 2. This code no longer signs anyone up, so there's nothing to print.* (draft). No Print, no Download QR.
- The flyer shows dimmed for reference. `@media print` hides it, so printing anyway gives a blank page.
- The live print page at 390 is drawn beside it for comparison (the bar wraps; Download QR and Print share a 44px row).

## Errata

- (a) `ERRATUM-friend-order.md`: the friend page strip reads Decks, Wishlist, Spares and opens on Decks (#2444).
- (b) `ERRATUM-why-these-cards.md`: Suggested changes v2's "Why these cards" is its own call after both lists are final (#2452). No visual change.

## Open for Hugh

1. What reads the launch date (the launch email, the /join ended states)? Drawn as the field only.
2. Revoke failure stays in the dialog (recommended), not the player toast.
