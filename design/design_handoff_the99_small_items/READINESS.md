# Readiness: small items

**Verdict: Green.** Approved by Hugh on 2026-10-28 ("this LGTM"), after R1b feedback on items 1, 3 and 4 and two follow-ups on 7.
Nothing below blocks the build. Every open item has a drawn default. The seven items are independent and can ship in any order.

## For Hugh

1. **Copy** is a placeholder wherever it is new, and needs `/copy-review`:
   - item 1: the head, lead and foot;
   - item 3: the accepted line and "Your request ›";
   - item 7: Edit and Done.
2. **About.** These are cosmetic changes or changes to surfaces that already have About entries. The two candidates are the precon Overview (item 5) and the pod edit state (item 7). Both are edits to the entries that already cover those surfaces, not new entries.

## For engineering, by item

1. **Proposed cuts: over + 3.** Look deeper names three more cuts than the deck needs, using the same credit and the same validator. This is a prompt and schema change only. G2 is open: cap a far-over deck at about 20 rows.
2. **Draft note on a phone: no change.** `group-toggle.tsx` keeps `hidden md:inline`. A test pinning the phone caption is optional.
3. **Answered spare request sheet.** Engineering's 560 sheet is ratified, with the details in README §3. `acceptedDetail` gains "or add it to your collection".
4. **The ✕ and the time.**
   - `DismissButton` moves into the action line, at the line's right end. The text-column reserves are dropped.
   - The time moves into the kicker, after the kind (`Trade match · 6h ago`), at both widths. This amends #2284: the desktop right-hand line is the press and then the ✕.
   - Your requests' preview is centred vertically (`items-center`).
   - #2280 and #2288 are ratified.
5. **Precon Overview.** Builds on #2290 (storage and carry-over):
   - an Overview block under "You own" on `/decks/precons/[file]`;
   - the date line "Analysis from the precon list · date" on a deck started from a precon;
   - the shipped stale banner on the first edit.
6. **/friends on desktop.** From 1180px, `friends-view.tsx` lays out as follows:
   - a 1160 container with `FriendsHead` spanning the top;
   - below it, a grid `minmax(0,1fr) 420px` with a gap of 44;
   - left column: the inbox, Your requests and Friends;
   - right column: Pods, three seats to a row, then Open links.

   DOM order stays phone order. Below 1180, and on a phone, nothing changes.
7. **Pod edit state.**
   - `PodCard` gets an `editing` state. The owner's Edit sits before `···`.
   - While editing, the card's edge turns accent, Done replaces Edit and `···`, and each removable seat shows the shipped ✕ disc. At rest, no seat shows one.
   - Removal works as shipped. Focus rules are in README §7.
