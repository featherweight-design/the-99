# Erratum · the friend page order (small items 7, 2026-10-30)

Shipped in #2444 on Hugh's ruling: a friend's page opens on **Decks**, and its strip reads **Decks, Wishlist, Spares**, on phone and desktop.

- `/friends/[publicId]` is the Decks tab; Wishlist is `/wishlist`, Spares `/spares`.
- `/friends/[publicId]/decks` redirects to the bare page; a bare page with `?spare=` redirects to `/spares?spare=`.
- Nothing else on the page changes: head, counts, tiles and copy as shipped.

Boards in earlier handoffs that draw the strip as Spares, Wishlist, Decks (social R1 and R2, menu and Home, friend decks, spare requests, signature card, push notifications) read in the new order. Redrawn here: `Friend-Order.dc.html` (390 and 1300).
