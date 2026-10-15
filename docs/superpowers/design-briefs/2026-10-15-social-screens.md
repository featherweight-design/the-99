# Brief: Social screens (friends, pods, spares, wishlist, opponents)

2026-10-15. Hugh moved this up the Design queue.

**What is built.** The whole data layer, behind three switches, with **no UI at all**: friends, pods, view-only spares, the wishlist (your own and a friend's), and opponent seats in the game log. Sources:
- `AGENTS.md`, under "Social foundation", "The wishlist" and "Opponents in the game log";
- Hugh's rulings of 2026-10-12 and the scope facts they rest on, quoted in full under "Rulings" below;
- the code in `src/lib/social/`, `src/lib/wishlist/` and `src/lib/decks/game-opponents.ts` / `matchups.ts`.

**What this brief asks.** Where these live, every state each one has, and how they read on phone and desktop. It proposes three Design rounds.

## The problem

The app is used by Hugh and a handful of friends who play together. Today each person's app is an island:
- You cannot see that the friend across the table owns a spare copy of the card your deck is short of.
- You cannot see what they are hunting for.
- You cannot record that you lost to their Atraxa.

The backend for all three exists and has been proved by probes on scratch branches. A reader can reach none of it, because no screen draws it.

## What is built, and what each read returns

Everything a client receives names a person by `social_profiles.public_id` and a `displayName`. **A Clerk id never reaches a client.** Every read joins the viewer's own friendship row in the same statement, so a stranger, a former friend or a forged id reads nothing.

**Your profile.** `ensureProfile` and `setDisplayName`.
- A display name is 1 to 30 code points (`DISPLAY_NAME_MAX`).
- A friend sees only this name, unless you share more.

**Invites.** `createInvite`, `revokeInvite`, `readInvite`, `redeemInvite`, `declineInvite`.
- A link token is 128-bit random, single-use, and lasts **7 days** (`INVITE_TTL_MS`).
- An inviter holds at most **10 open invites** (`MAX_OPEN_INVITES`). An 11th is refused with `tooMany`.
- An invite's state is `open | expired | redeemed | declined | revoked` (`inviteState`).
- The landing read (`InviteView`) returns that state, the inviter's display name, `self` (your own link) and `alreadyFriends`. Nothing else is said about the inviter.
- Redeeming refuses with `notFound`, `ended` or `self`.

**Friends.** `listFriends` returns `{ publicId, displayName, since }`. `unfriend` removes both directions, and removes each person from the pods the other owns. It is silent: the other side gets no notice.

**Pods.** `createPod`, `renamePod`, `deletePod`, `addMember`, `removeMember`, `leavePod`, `listPods`.
- A pod name is 1 to 40 code points (`POD_NAME_MAX`).
- `Pod` is `{ id, name, isOwner, members: { publicId, displayName, joinedAt, isOwner, isYou }[] }`.
- Members are added only from the owner's own friends.
- When the owner leaves, the pod passes to the longest-standing member (`nextPodOwner`: `joined_at`, then id). The last member leaving deletes it.
- After a hand-on, a member need not be the new owner's friend. A pod grants no visibility by itself.

**Spares** (view-only, shared per pod).
- `shareSparesWith(podId, on)` turns the grant on or off for one pod. `sharedPodsQuery` lists the pods you share with.
- `loadFriendSpares(viewer, oracleIds)` returns `{ oracleId, friend: { publicId, displayName }, spare }`. It answers only for the cards asked about, and only for friends who share their spares with a pod both of you are in.
- A spare is `owned − hard − soft`. A copy wanted only by a draft is not spare (Q12).
- You never see a friend's collection, their other spares, or why a copy is spare.

**Wishlist.** Your own, at card level (any printing).
- `loadWishlist` returns `{ oracleId, quantity, owned, got, addedAt }`, newest first. `setWishlistQuantity` and `clearWishlistLine` change it.
- **GOT** is derived on every read: owned ≥ wanted. A GOT line stays until you clear it (Q9).

**A friend's wishlist.** `loadFriendWishlist(viewer, friendPublicId)` returns `{ oracleId, quantity, got }`, **never an owned count**. Visible to every friend (Q7). Note: no share toggle is built for it. The ruling made it visible.

**Game-log opponents.**
- `listFriendDecks(friend)` returns a friend's decks as `{ deckId, name, commanderOracleId, partnerOracleId }`. Every deck name and commander a friend has is offered to their friends here: the default Q6 allows, name and commander only.
- `listPodSeats(pod)` returns `{ publicId, displayName, decks[] }` for each member who is also your friend.
- A seat is one of three things:
  - a friend;
  - a friend's deck;
  - anyone, by a catalog commander and an optional label of up to 30 characters (`OPPONENT_LABEL_MAX`).
- On a loss, a seat can carry an optional `won` (at most one per game, Q15).
- Seats run from 1 up, and there are fewer seats than the pod size.
- A seat SNAPSHOTS the friend's name and the deck's name and commanders at log time, so history never changes when a friend renames or leaves.
- `summarizeMatchups` splits a deck's games by opponent commander, color identity and friend, as counts with denominators. **No rate is ever shown.**

**Deletion.** An account's deletion purges everything (Q8). A friend's seats in your games keep their snapshot and lose the live link.

**Staging today (read-only, 2026-10-15).** Zero social rows of any kind: 0 profiles, links, invites, pods, wishlist lines and opponent seats. There are 12 logged games across 2 accounts, at most 6 per account. Every first screen Design draws is therefore an empty state, and matchup cells will mostly hold one game each.

## What has no UI today (all of it)

- No route: no `/friends` or `/wishlist`, and no invite landing.
- No nav item. The nav is `Home · Collection · Commanders · Discover · Decks` (`shell/nav.tsx`).
- No display-name field.
- No QR code.
- No pod screens.
- No spares line on any surface.
- No wishlist add control.
- No opponent seating in the game-log form, and no matchup panel.

The only caller of any of it is `logGame` (`src/app/decks/actions.ts`). It accepts opponents and refuses them while `SOCIAL_GAMES_ENABLED` is off.

## Switches

The registry (`src/lib/switches/registry.ts`) holds three. All three are `'true'` on staging and unset on production.

| Switch | Needs | Gates |
|---|---|---|
| `SOCIAL_FRIENDS_ENABLED` | none | friends, invites, pods **and spares** (no separate pods or spares switch was built, though an early draft proposed them) |
| `SOCIAL_WISHLIST_ENABLED` | none (stands alone) | your wishlist; a friend's wishlist also needs friends on |
| `SOCIAL_GAMES_ENABLED` | `SOCIAL_FRIENDS_ENABLED` | opponent seats and matchups |

So **the wishlist must also work for a player with no friends at all.** It is useful alone, as a want list beside Shopping.

## Rulings (Hugh, 2026-10-12, quoted so this brief stands alone)

Hugh answered sixteen questions on 2026-10-12. Each is given here as it was asked, then as he ruled. Several rulings changed the earlier scope, and each change is noted.

- **Q1. Is a link (texted, or a QR code at the table) enough to add a friend, or do you also want a short code you can read out loud?** Link and QR only. There is no short code and no attempt limit to go with one.
- **Q2. Should an invite work for one person, or for anyone holding the link until it expires?** One person: single-use, expiring after 7 days.
- **Q3. When you share your spares, is it with all your friends, or "only my pod"?** Per pod. You choose which of your pods see your spares. This replaced an earlier plan of one "Friends can see my spare copies" toggle.
- **Q4. Can a pod include someone who is not your friend (a friend of a friend at game night)?** No. Pods are friends-only, and an owner adds members from their own friends list. A pod is not a second invite system and has no join code.
- **Q5. If a pod's owner leaves, does the pod pass to someone else or end?** It passes to the longest-standing member. A member can always leave, and the last one leaving ends it.
- **Q6. When a friend shows you a deck, should they ever be able to show the full list, or only its name and commander?** Name and commander by default. The full list is opt-in, per deck, chosen by its owner. The earlier worry was that full lists invite "what's in your deck" browsing, which is a different feature.
- **Q7. Should friends be able to see your wishlist ("what Hugh wants for his birthday")?** Yes, the wishlist is visible to friends.
- **Q8. When someone deletes their account, should the app delete all their decks and collection too, or only their friendships?** Everything: decks, collection and every social row.
- **Q9. Does a wishlist want a specific printing, or is any copy fine? When you get the card, should the line disappear or show as got?** Any copy of the card. Once you own it, the line shows as got until you clear it.
- **Q10. Do you want a saved-commanders shortlist ("favoriting commanders") in this line?** Later, in its own line. It feeds neither spares nor the game log.
- **Q11. While you are borrowing a card, should your deck count it as having the card?** Card borrowing is NOT in scope. It is an edge case, handled if it ever comes up. **Q13** (a short message on a borrow request) and **Q14** (trading for something in return) were dropped with it.
- **Spares are view-only** (Hugh's addition to the borrowing answer). You see that a friend has a spare and sort it out in person. An "ask" tap would be nice later. There is no cart change.
- **Q12. Should a copy that is only in a friend's unfinished draft count as spare, or show as "maybe"?** It is not spare.
- **Q15. When you lose, is recording which opponent won worth one more tap in the log form?** Yes, as an optional "who won" tap on a loss.
- **Q16. When you log a game with a friend's deck, should that friend be offered the same game to log for their own deck?** A later phase.
- **Deck swaps** (Hugh's addition). When you play a friend's deck, the game is logged on that deck, counts in its owner's stats, and is marked "piloted by X". MVP+, built LAST, because it is rare in his pod.

**The scope facts these rest on:**

- **Friendship is mutual and explicit.** It forms only when someone redeems an invite they were handed. There is no search, no directory and no "people you may know". Removing a friend, from either side, is silent: the other person gets no notice.
- **Privacy defaults to the minimum.** A new friendship shows each side only the other's display name. Everything else is the owner's to share:
  - **spares**, per pod (Q3). The friend sees only spares matching cards they asked about: the card and how many, nothing else of the collection.
  - **decks**: name and commander (Q6).
  - **the wishlist**: visible (Q7).
- **Who sees what with spares.** I see "Dave has 1 spare" on a card I need. I never see Dave's collection, his other spares, or why a copy is spare. Dave sees nothing about what I need.
- **"Spare" reuses the app's own claim model**, the one every deck's availability is drawn from. A spare is a copy no deck of the friend's asks for: committed decks and drafts both count, so a copy only a draft wants is not spare (Q12). Nothing restates it.
- **A pod is a quick-pick for game night** (who you play with) and the scope spares are shared with. It grants no visibility beyond friendship. A member who is not your friend, which can happen after an ownership hand-on, shows by display name only.
- **Opponent seats snapshot the friend's name and deck at log time.** History reads the same even after a rename, an unfriending or an account deletion.

## Locked (do not reopen)

**The rulings above, in short.**
- **Q1.** Link and QR only. No short code, no search. Nobody can be found by name.
- **Q2.** Single-use invites, expiring after 7 days.
- **Q3.** Spares are shared per pod. You choose which pods see your spares; there is no all-friends toggle.
- **Q4.** Pods are friends-only.
- **Q5.** When an owner leaves, the pod passes to the longest-standing member.
- **Q6.** A friend sees a deck's name and commander. The full list is opt-in per deck. **Not built**, and out of these rounds unless Design wants to draw it (see open questions).
- **Q7.** The wishlist is visible to friends.
- **Q8.** Account deletion purges everything.
- **Q9.** Wishlist lines are at card level (any copy). An owned line shows as got until it is cleared.
- **Q10.** Saved commanders come later, in their own line.
- **Q11, Q13, Q14.** No borrowing, no request flow, no messages, no trades. **Spares are VIEW-ONLY:** you see that a friend has one and sort it out in person. An "ask" tap is a later nice-to-have. **No cart change.**
- **Q12.** A copy only in a friend's draft is not spare.
- **Q15.** An optional "who won" tap when you lose.
- **Q16.** Offering the game to the friend comes later. Deck swaps ("piloted by X") come last.

**Privacy, across all of this.**
- No search, and no directory of players.
- A new friendship shows only display names.
- Spares show the card and a count, never the collection.
- A friend's wishlist shows the wanted count and got, never what they own.
- Removing a friend is silent.

**No model calls anywhere in this line.** Player-typed text is a display name, a pod name or an opponent label. None of it reaches a prompt, and `game-opponents.test.ts` pins who may read the label.

**Platform conventions still apply.**
- Phone and desktop parity ships in the same PR.
- Matchup counts follow the existing no-percentage rule at small N.
- Copy goes to /copy-review, never to Hugh.

## Open for Design to call

1. **Where friends live.**
   - A sixth nav item (`Friends`) on the rail and the phone tab bar? Or a section reached from the account menu? Or both?
   - The tab bar is already five wide on a phone.
   - Pods: their own page, or a block on the friends page?
2. **Invite creation.**
   - How the link and the QR are shown together.
   - Copy and share actions (the native share sheet on a phone).
   - The list of your open invites, with revoke and the time left.
   - What the 10-open limit looks like when you reach it.
3. **The join landing** (the invite link's own page).
   - A signed-out arrival and its sign-in hand-off.
   - Accept or decline, naming the inviter.
   - Each ended state, plus your own link and already-friends.
4. **The display name.** Where it is set, and whether it is asked for at the first invite or join, since `ensureProfile` takes an offered name.
5. **Removing a friend.** The confirm, and that it is silent.
6. **Pods.** Create and rename, adding members from friends, removing a member (owner), leaving, deleting (owner), and a hint about the hand-on. Also the per-pod "share my spares with this pod" control: on the pod, in a settings block, or both.
7. **Where spares show** (view-only).
   - The candidates: the deck's buy rows and Shopping view, the all-decks cart, card details, and wishlist lines.
   - "Dave has 1 spare" must never read as a buy option or move a price.
   - Several friends with spares on one card.
8. **The wishlist.**
   - The add control: card details, Collection rows, Discover or Commanders results?
   - The list page and quantity editing.
   - The GOT state and clearing a line.
   - How a line meets friends' spares.
   - A friend's wishlist, reached from their row: what you can do there (view only).
9. **Game log.**
   - Seating in the existing log form (`log-a-game`): a pod quick-seat, a friend and friend-deck picker, a commander search for anyone, an optional label, "who won" on a loss.
   - The history row with opponents.
   - The matchup panel at realistic N (mostly one game per cell, counts only).
10. **Whether to draw Q6 now.** That means a per-deck "friends can see the full list" toggle and a friend's deck view. It is ruled but not built. Drawing it here would add an engineering PR.

## Every state to draw

- **Friends.**
  - No friends yet: the first screen everyone sees, and the place that leads to an invite.
  - One friend.
  - Many friends.
  - A friend who has since been removed: absent from the list, still named in old game rows by snapshot.
- **Invites.**
  - None open.
  - Some open, with time left.
  - 10 open (refused).
  - Revoked.
  - Expired.
  - Redeemed (it leaves your list).
- **The join landing.**
  - Signed out.
  - Open (accept or decline).
  - Expired.
  - Already used (redeemed).
  - Declined.
  - Revoked.
  - Not found (a bad or forged token).
  - Your own link.
  - Already friends.
  - Accepted, and where you land next.
- **Pods.**
  - No pods.
  - A pod with only you (one member).
  - A pod you own.
  - A pod you're in but don't own.
  - A member who is not your friend after a hand-on: their display name only.
  - After you leave, the owner changes.
  - The last member leaving deletes the pod.
  - Shared spares on or off for that pod.
- **Spares.**
  - None (the line is absent, not "0").
  - One friend.
  - Several friends on one card.
  - A friend unshares or unfriends mid-visit: the line goes on the next read.
  - The read failed: it degrades to absent, never an error on a deck page.
- **Wishlist, yours.**
  - Empty.
  - One line.
  - A line with quantity above 1.
  - Partly owned.
  - GOT.
  - Clearing a line.
  - Wishlist on, friends off.
- **Wishlist, a friend's.**
  - Empty.
  - Lines.
  - GOT lines.
  - A friend you are no longer friends with: no access.
- **Game log.**
  - No pod.
  - A pod quick-seat.
  - A friend with no decks.
  - A friend's deck.
  - Anyone by commander, with or without a label.
  - Who won on a loss.
  - More opponents than seats is refused.
  - Games-off, which hides seating entirely.
  - Matchups: no opponents recorded, then mostly one-game cells.

## About entries (decided: new entries, batched at launch, behind the switches)

This is a multi-round line, so its entries are **batched at the end of the launch**. That is one bump, or no bump if every entry is switched. Each entry is drawn on the per-entry artboard (`design/design_handoff_the99_about`, §8; `STATES-about-r3.md` §G) in the round that designs its surface. Four entries are proposed:

1. **Friends and pods.** Invite by link or QR, what a friend can see, sharing spares per pod, removing a friend. It follows `SOCIAL_FRIENDS_ENABLED`.
2. **Wishlist.** What it is for, GOT, and that friends can see it. It follows `SOCIAL_WISHLIST_ENABLED`; its friends line is gated on `SOCIAL_FRIENDS_ENABLED`.
3. **A friend has a spare.** What "spare" means (no deck of theirs asks for it), and that it is view-only. It follows `SOCIAL_FRIENDS_ENABLED`, and could fold into entry 1.
4. **Who you played against.** Opponents and matchups, with small-N honesty. It follows `SOCIAL_GAMES_ENABLED`.

A switched entry is announced when its switch flips and carries the current `since` (14 today). Engineering adds the three switches to `AboutSwitch` / `SWITCHES`. Hugh decides which features owe an entry; all four are capabilities.

## Proposed split into Design rounds

One round is too much: about ten surfaces and well over forty states. The split follows the switches, so each round can ship and be walked alone:

- **Round 1: Friends and pods** (`SOCIAL_FRIENDS_ENABLED`).
  - Covers: the nav or placement decision, the friends page, invite creation (link and QR), the join landing with all its states, the display name, removing a friend, pods (create, members, leave, hand-on), and the per-pod spares-sharing control.
  - Every later round hangs off this one's placement decision. About entry 1.
- **Round 2: Wishlist and spares** (`SOCIAL_WISHLIST_ENABLED`, and spares under friends).
  - Covers: the wishlist add control, the list, GOT, a friend's wishlist, and every place the view-only "has a spare" line sits (deck buy rows, Shopping, the cart, card details, wishlist lines).
  - About entries 2 and 3.
- **Round 3: Opponents and matchups** (`SOCIAL_GAMES_ENABLED`).
  - Covers: seating in the log form, the history row and the matchup panel. It extends the shipped `log-a-game` surface rather than adding a page.
  - About entry 4. This is also where the line's batched About work closes.

Q6 (full deck lists for friends), "ask" for a spare, game sharing (Q16) and deck swaps stay out of all three rounds unless Design or Hugh pulls one in.
