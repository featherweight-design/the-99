# Readiness: small items 7

**Verdict: Green.** Hugh approved every design on 2026-10-30 ("all of your designs have my approval. Please open a PR when everything is ready"). Each item takes the recommended call (item 4: B). The items are independent. Addendum 2, 3 and 9 confirm what has shipped and need no build.

## For Hugh

1. **Copy.** Every string marked draft in the README goes through `/copy-review`. The flyer admin, the cost line, the sign-in and sign-up pages, the About cart labels and `/report` add new strings. The cart toasts, the date slots and the crash screen reuse shipped strings.
2. **Open, not blocking.** These are the two questions at the end of the README: what reads the launch date, and whether sign-in methods beyond the email code are turned on.

## For engineering, by item

1. **Flyer admin.**
   - Launch date row on the launch list card. It is nullable, and Clear saves null.
   - The empty section line.
   - The inline revoke alert, with refused and lost-touch variants. A lost reply refreshes the list.
   - The CSV columns, order, filename and formula guard.
   - The revoked print page: no Print or QR, flyer dimmed, hidden in `@media print`.
2. **2-credit cue.**
   - The stepper tag above 10.
   - The cost line names the source by `unitsFor` and the spend order. When the free run is the only source and N > 10, the press is off and the line shows **Change to 10** and **Get more credits** (the latter only while payments are on).
   - The tile cost tag.
   - The left line's *N after this run* clause above 10.
3. **Cart toasts.**
   - On a phone, while a cart receipt is up, `SocialToast` from `cart-by-friend.tsx` renders into a cart-slot stack: the receipt is `order-2`, the alert `order-1`, with a 10px gap.
   - When the receipt closes, the alert falls back to the centre slot.
   - Desktop is unchanged.
4. **Cuts short.** Under the open notice, while the hub holds its height, draw the hub's tile row minus Proposed cuts (B).
5. **Sign-in and sign-up.**
   - Build `/sign-in` and `/sign-up` on Clerk's custom flow (email code), in the newcomer frame. This retires `clerk-hosted.test.ts` and the redirect buttons at public launch.
   - Sign-up asks for `firstName`.
   - A proven email with no account offers sign-up; an existing account signs straight in.
6. **About cart entry.**
   - Add `p-cart` and `d-cart` to `capture:about`, with five regions.
   - Swap the entry's captures and labels (`since` bump, switches as listed), add the way-in sentence, and retire `shopping/all-decks/cart`.
   - Map `/decks/cart` in `screen-for-path`.
7. **Addendum 4.** Add `variantOn: "SUGGESTED_CHANGES_V2_ENABLED"` to the `suggested` label. Regenerate the Try it shots at turn-on.
8. **Addendum 5 to 7.**
   - Game history meta: `md:w-[156px]`.
   - Beads: remove the per-bead date, add the first and last dates under the row and a tooltip on hover or focus.
   - Deck foot: wrap each segment, with its leading `·` and a no-break space, in a `whitespace-nowrap` span.
9. **Addendum 8.**
   - `global-error` draws the wordmark and the link to `/report?ref=<digest>`.
   - Add `/report` as a public page: the shipped report form, *‹ Back home*, and the sent state. It is open to signed-out readers and attaches the digest.

## Errata

- `ERRATUM-friend-order.md` (already shipped in #2444).
- `ERRATUM-why-these-cards.md` (already shipped in #2452).
