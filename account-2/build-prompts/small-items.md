Build the small items from design/design_handoff_the99_small_items/ (PR #2294). Read its README and READINESS first; READINESS is GREEN. The seven items are independent, so ship them as separate small PRs in any order. Each item's "For engineering" notes in the README are the spec.

1. **Proposed cuts, over + 3.** The Look deeper run returns over + 3 cut rows, each with its reason and cite chips under the same validator, for the same one credit.
   - The result block's head reads "Six to choose from". The lead reads "Three over the ninety-nine. Six named; cut any three." The foot reads "6 named for 3 cuts · …".
   - After enough cuts, the lead reads "Three cut. Back at 99. …", and the rest stay open.
   - Return fewer rows when the run can't back that many. Cap a far-over deck at about 20 rows.
2. **Draft note on a phone: no change.** `group-toggle.tsx` keeps `hidden md:inline`. A test pinning the phone caption is optional.
3. **Answered spare request sheet.** Build engineering's proposal as drawn on `Spare-Answer-Sheet`:
   - `ModalChrome` at 560, phone `fit`, titled "Your request".
   - A Clear text button, and "All your requests ›" in the foot.
   - The Home press reads "Your request ›".
   - `acceptedDetail` becomes "The handover is between you. Once it’s yours, press buy on it in Shopping or add it to your collection."
4. **The ✕ and the time** (`Dismiss-X`, `Eng-Rulings`). This amends #2284.
   - `DismissButton` renders in the flow of the action line, at its right end: 44px on a phone, 32px on desktop with a 44px coarse hit. Drop the `pr-[30px]`/`md:pr-[34px]` reserves in FeedItemRow, TradeRow and AskRow, and the lead's `pr-[28px]`/`md:pr-[20px]`.
   - The time moves into the kicker after the kind, at both widths ("Trade match · 6h ago"), on What's new rows, Waiting on you, the lead story, Your requests and the answer sheet. The desktop right-hand line becomes the press and then the ✕.
   - Your requests' card and owner preview is centred vertically on the row (`items-center`), in the answer sheet too.
5. **Precon Overview** (`Precon-Overview`), on top of #2290.
   - An Overview block under "You own" on /decks/precons/[file]: the label, the aside "written for this precon’s list", the paragraph (max 760 on desktop), and "View full overview →" opening the shipped modal. No block when there is no Overview.
   - Starting a deck from the precon (with or without "I own this precon") copies the reading and the Overview. The verdict's date line reads "Analysis from the precon list · <date>".
   - The first edit makes it stale, with the shipped banner and Re-analyze.
6. **/friends on desktop** (`Friends-Desktop`). From `min-[1180px]`:
   - the container goes from max-w-[720px] to 1160px;
   - `FriendsHead` spans the top;
   - below it, a grid `minmax(0,1fr) 420px` with a gap of 44;
   - left: waiting (Waiting on you, Your requests), then FriendsList;
   - right: pods (seats three to a row, the phone rule), then OpenLinks.

   DOM order stays phone order. Below 1180, and on a phone, nothing changes.
7. **Pod edit state** (`Pod-Edit`).
   - `PodCard` gets an `editing` state, with "Edit" as a text press before the ··· menu (owner only).
   - While editing: the card's border is accent, "Done" (filled) replaces Edit and ···, and each seat but yours shows its shipped ✕ disc. At rest, no seat shows a ✕.
   - Remove works as shipped.
   - Editing ends on Done, Escape, leaving the page, or when you are the only member left.
   - Focus: Edit moves to the first ✕, Done returns to Edit, and after a removal focus goes to the next ✕, else Done.

New copy goes through /copy-review: item 1's lines, item 3's lines, and Edit and Done. UI PRs follow the design-review and feature-acceptance skills as usual.
