# READINESS · You have a card a friend wants R3

**Verdict: Amber until Hugh picks Q1 (toggle or filter) and approves R3.** R1's Q1–Q3 are settled (no deck dot; Offer kept; call-out + /friends count, no notice). Every gap below has an answer drawn.

## Gaps for engineering
- **G1 · Offers in `spare_requests`.** An offer is a request whose holder sent it: add a direction (`initiated_by`
  `asker|holder`) rather than a second table, so expiry, one-open-per-card, withdraw, Your requests and the purge stay one
  path. Waiting on you reads the asker's open offers as rows for the ASKER (the friend), not the holder.
- **G2 · Your copies read.** `loadMyCopies(viewer, oracleIds)`: the viewer's own collection and claims (hard, soft) and
  spare rule (threshold, Keep), batched by `MAX_SPARES_BATCH`. No cross-user read beyond the friend's wishlist, which the
  tab already reads through `loadFriendWishlist`; both stay in `src/lib/social/` (`check:social-reads`).
- **G3 · Copies offered.** `min(spare, wants − held)`. `held` is the friend's data: compute it server-side in the write
  and never send it to the client (the tab shows `wants N` only).
- **G4 · Offer write re-checks** the friendship, that the card is still on their wishlist and still spare for you, in the
  transaction; a refusal draws the shared toast.
- **G5 · Feed and push.** The friend's item rides the `spare-request` kind (default on) with the offer's title; no new
  kind.
- **G7 · /friends count.** Per friend, how many of their unmet wishlist cards you can spare: the friends list read gains it
  (one batched query over friends' wishlists joined to your own spare rule, in `src/lib/social/`).
- **G6 · Names.** The friend's name in the sheet's kicker, foot and ask row is a `ThirdPartyName` through `PersonText`.

## Checks
- Every board renders, no broken images, no clipped frame (measured with support.js stripped).
- Frames rendered from main f17ab2a with the shipped components; new parts in `scratch-gen/friend-have.tsx`.
