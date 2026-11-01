# Social (background)

The full text moved out of `AGENTS.md`, verbatim. `AGENTS.md` keeps each section's rules; this file keeps the history, measurements and derivations behind them.

- **Social foundation** (plan `boards/plan-social-foundation-2026-10-12.md`, Hugh's rulings 2026-10-12), always on
  (it shipped behind `SOCIAL_FRIENDS_ENABLED`, retired 2026-10-31). Friends are added
  by a single-use invite link or its QR code and never by search; a friendship is two directed `friend_links` rows,
  written in user id order so two readers' stamps lock the same way round; a pod's members are added only from its owner's own friends,
  and a pod passes to the longest-standing member when the owner leaves (so after a hand-on, a member need not be
  the new owner's friend: a pod grants no visibility by itself, and every read that uses one also joins the
  friendship). **Every cross-user read lives in `src/lib/social/`** and joins the
  grant on the session's viewer in the same statement; client payloads carry `social_profiles.public_id`, never a
  Clerk id. `pnpm check:social-reads` fails when a module under `src/` outside that directory touches a social table,
  by schema import, through `db.query`, or by name in raw SQL, and runs against the shipped tree inside `pnpm test`; `pnpm probe:social` proves the
  answers on a scratch branch.

  **Another reader's name is a `ThirdPartyName`** (PersonName plan `boards/handoffs/lane02-personname-plan.md`, PR A,
  2026-10-30), so PostHog autocapture never records it once clicks resume. The type (`src/lib/person-name/brand.ts`) is
  an opaque object, `{ $tp: string }` at runtime so it survives RSC props, server actions and JSON; JSX and attributes
  will not take it. It is minted by `named()` (`mint.ts`) only under `src/lib/social/`, read back by `reveal()`
  (`reveal.ts`) only in `REVEAL_ALLOW` (`scripts/lib/third-party-names-rules.mjs`), and drawn by `<PersonName>`,
  `<PersonInitials>`, `<PersonText>` (copy built with `` personText`…` ``) and `personAttrs()`, each of which puts
  `ph-no-capture` on the element holding the name ITSELF: posthog-js walks DOM parents, so a React ancestor's class
  does not reach a portal child (`src/lib/person-name/autocapture.test.tsx`, real posthog-js). A plain string (the
  reader's own name) is drawn plainly, so shared components take `string | ThirdPartyName` while the families convert.
  `pnpm check:third-party-names` (CI) resolves every import of the mint, the reveal and tests' `plain()`
  (`testing.ts`), fails a re-export of any of them, and fails a template (other than `personText`), `String()`,
  `.toString()` or `+` over a name, an `as ThirdPartyName` and a read of `.$tp`; ESLint's `no-restricted-imports` says
  the same in the editor. Converted so far: PR A, the invite and join family (`readInvite`, `inviteOutcomes`, `readInviteSender`; the friend
  landing and its card; `/join`; the receipt and toast the invite WATCH raises); and PR C, spares and requests
  (`SpareFriend`, `SharedPod`, `OtherSide`, an ask's `deckName` as the holder sees it, `waiting.ts`, `your-requests.ts`;
  the friend page's Spares tab, the stand-ins and cart spare rows, Waiting on you, Your requests, the answer sheet,
  the lead story's ask and receipt, Settings' pod list, and the cart's Friend filter, By friend panels and fact
  lists); PR D, the feed and push (`FeedItem.friend` and `FeedView.friend` are `FeedFriend`, minted by `feedFriend()` in `social/feed-items.ts`, the one place a feed name is minted; `feedText` returns `string | PersonParts` for title and press, the press draws through `PersonText` and a trade-ask press carries the marker on the button itself; `feedCopy.home.title.spareRequest` is also Waiting on you's ask title; `toPushItem` is the one server-side reveal, because a notification is not a page); PR E, friend decks (`FriendDeck.name` and `FriendDeckPage.name` in `social/decks.ts` and the picker's `FriendDeck.name` in `social/games.ts` are minted there; the Decks tab tile and its aria-label through `personAttrs`, the deck page title, the seat picker row and a seat's deck line draw through `PersonName`; `commanderRepeats` reads a deck name through `testName`; the viewer's own decks, `shares[].deckName` included, stay plain); and PRs B1 and B2, friends and pods (`access.ts`: `Friend.displayName`, `PodMember.displayName`, `Pod.name`,
  `Pod.nextOwner`, all branded, a pod's name for its creator too; the Friends list, row link and menu, the friend page's
  head and Decks and Wishlist tabs, a friend's deck page eyebrow and back link, the pods pane, card, menu, seats and Add
  friends sheet, the Leave and Delete confirms, the receipt after Accept on `/friends?accepted=`, Home's Friends section
  and first-run Friends row, and the game log's seat picker, its pod chips and the seats it fills: `PickerFriend`,
  `PickerPod` and `PodSeat` are branded, and `SeatFriend.name` is `string | ThirdPartyName`). A copy line that names a
  friend takes `string | ThirdPartyName` and returns `PersonParts`; `canSpare`, `keeping` and `tradeAskAria` are
  overloaded so a plain-string caller (push text) still gets a string, and so are the game log's seat and picker
  lines (`byName` in `copy/game-seats.ts`: a plain name yields the string it always did, a branded one yields parts). A
  pod's rename field starts from `draftText(name)` and carries `NO_CAPTURE` itself; a typed filter reads a name through
  `nameIncludes`, a sort through `compareNames`. The shared `FilterPanel` (`filter-panel.tsx`, the one `REVEAL_ALLOW`
  entry PR C adds) reads a friend's label only to hand its copy functions a string and marks the row, the trigger and
  the label span. Rule 0 (PR F1): `TableSeat.displayName`, `TableSeat.deck.name`, `TableView.podName` and `setBy`, `ClosedTable`, `OpenTable` (`podName`, `setterName`, each `TableFace`), `PodSetup` (`podName`, `owner`, each `SetupMember.displayName` and a friend's `SetupDeck.name`), `SeatedNow.deck.name` and `SetTableResult.occupied.setBy` are minted in `social/rule-zero*.ts`; the viewer's own seat, face, member and decks stay plain. The read's sentences (`copy/rule-zero.ts`) take `Said` (`string | ThirdPartyName | PersonParts`) and return `PersonParts`; `read-card.tsx` keeps its bold marks as sentinel runs inside the parts (`Emphasized`), and `upperFirst` capitalizes a sentence that opens on a name. The boards' fixtures live in `social/rule-zero-fixtures.ts` because they mint.
  Games and saved opponents (PR F2): `social/opponent-names.ts` (`savedName`) is the one place a saved seat's names are minted, called from `assembleOpponents`, so `GameOpponent.friend.name`, `.deckName` and `.label` and `FriendCell.name` are branded; `matchup-rows` carries a friend's initials as a name (`Thumb` `initials`), drawn by `OpponentInitials` (a `PersonInitials` with the `?` fallback), and `GameMatchups`, `GameVsLine` and `vsParts` draw names through `PersonName` and `PersonText`. `TablePrefill` (`podName`) and its seats (`name`, `deckName`) are minted in `social/rule-zero-log.ts`, so `SeatFromTable`, `seatName`, a seat's initials and sub line follow; the raw `TableSeatRow` and the seating hash stay plain. **A non-friend's table seat saved as a game opponent** is stored as the plain `label` of an `other` row (`seatLabel(displayName)`); the column holds that and a name the owner typed, and nothing in the row tells them apart, so `savedName` brands EVERY `label` on read. The owner's own typed label is marked too (harmless: it only opts that line out of autocapture), and the form's text field and the stored column stay plain.
  PR G (the seal): `FilterPanel` announces a friend's option through its own live region, drawn by `PersonText` (so marked), and never hands the name to `onAnnounce`; `redeemInviteAction` no longer carries the inviter's name (the receipt reads it by `publicId`). **Nothing is left unmarked, and PostHog autocapture is ON** (`posthogOptions`, `docs/agents/ops.md`). The guard also covers the read layer: under `src/lib/social/`, a select that projects `socialProfiles.displayName`, `pods.name` or a friend's `decks.name` must sit in (or be reached from, in the same file) a function that calls `named(`, `savedName(` or `feedFriend(`, else the function is listed in `RAW_ROW_READS` (`scripts/lib/third-party-names-rules.mjs`) with its reason; `src/lib/social/loader-types.test.ts` makes `pnpm typecheck` fail when an exported loader type carries a name-like field that is not a `ThirdPartyName`; `scripts/probe-autocapture-names.mts` clicks each family's name in a real browser and asserts no `$autocapture` event carries it.

  **Spares are view-only and shared per pod** (Q3, Q12): `loadFriendSpares(viewer, oracleIds)` reads the grants (the
  friendship, the friend's `pod_spare_shares` grant, the friend's membership of that pod and the viewer's, in one
  statement), then runs each granting friend's own claim model, at most four at once, each in a repeatable-read
  snapshot that re-checks that friend's grant first, so a grant revoked mid-read reads nothing. A spare is
  `owned − hard − soft`, so a copy only a draft wants is not spare. Each row's friend carries their face and the names of
  the pods the grant holds through (Social R2 PR 2), and the spares are served by `GET /api/friend-spares?ids=` (signed in,
  at most `MAX_SPARES_BATCH` card ids, `private, no-store`), so no
  cached key carries them. `loadFriend` reads one friend by public id through the viewer's own link row (R2's friend page).
  **A friend's write never moves the viewer's stamp**, so friend data stays out of cached payloads by default; a cached
  page that must draw it puts `await friendGeneration(viewer)` as a bare element of EVERY `cachePageForUser` key on that
  page, for that call's own reader, and `check:list-cache` fails a cached page whose loaders reach `src/lib/social/`
  (the switch module aside) without it. `pnpm measure:friend-spares` times the per-friend cost (read-only).

- **Opponents in the game log** (scope §4, Feature C; Hugh's ruling Q15), always on
  (its own switch, `SOCIAL_GAMES_ENABLED`, retired 2026-10-30, and `SOCIAL_FRIENDS_ENABLED`, which it then followed,
  retired 2026-10-31). `deck_game_opponents`
  holds the seats of a game, seat 1 upward and fewer than its pod size: a friend, a friend's deck, or anyone by a
  catalog commander and an optional label, plus an optional `won` on a loss (one at most). The rows are the game
  owner's and SNAPSHOT the friend's name and the deck's name and commanders at log time, so every read draws the
  snapshot and none depends on a friend's live rows or cache. `logGame` resolves a friend seat in the game's own transaction: a friend's deck is offered and seated only through the
  viewer's own friendship (`src/lib/social/games.ts`, held FOR SHARE until the game commits), and a pod only seats its
  members who are also friends. `pnpm probe:game-opponents` proves it. The live friend link is never sent to a client and is
  UNLINKED by the account purge (`SOCIAL_UNLINKED`), keeping the snapshot. The label is player-typed and no prompt
  reads the table (`game-opponents.test.ts` pins who may). `summarizeMatchups` splits a deck's games by commander,
  color identity and friend as `GameSummary` cells: counts with denominators, no rate.
  The picker's reads (R3 PR 1, plan `2026-10-15-social-r3-opponents-and-matchups.md`):
  `searchOpponentCommandersAction`, `listFriendDecksAction` and `listPodSeatsAction` (`src/app/decks/[id]/opponent-actions.ts`)
  each read for the signed-in reader, and `loadDeckOpponents` returns a deck's seats and matchups, or null when there
  are no games or the read failed (logged, never thrown). None has a caller beyond its tests and the probe until the form (PR 2) and the Games tab (PR 4).

- **Invites** (plan `2026-10-16-invites.md`), always on (its own switch, `SOCIAL_INVITES_ENABLED`, retired
  2026-10-30, and `SOCIAL_FRIENDS_ENABLED`, which it then followed, retired 2026-10-31). PR 1 is the data and the pure rules (`src/lib/invites/rules.ts`, `tokens.ts`, `read.ts`). PR 2 is
  the sender's writes: `sendEmailInvite` and `showInviteQr` (`send.ts`) and the admin's `setInvites`,
  `topUpGroupInvites` and `revokeReservation` (`admin.ts`), each under the sender's advisory lock
  (`lockSenderIn`, `invites:<sender>`). Every one but the revoke re-reads what is left through `readCountIn` (a revoke
  only stops a row holding, which cannot break it), so the invariant (`held` ≥ the rows holding) holds. The email path commits its reservation BEFORE Clerk is asked and answers every outcome
  after that as a success, at `SEND_FLOOR_MS` (`floor.ts`, 1500ms: about 2.4 times staging's measured Clerk READ p99, since a create was not measured), so neither the
  words nor the time tell a sender whether an address has an account; a Clerk refusal and an indeterminate send both
  keep holding. `src/lib/invites/clerk.ts` is the one caller of Clerk's invitations API, and `mail.ts` the Resend
  `fetch`, FAIL CLOSED: without `RESEND_API_KEY`, `INVITE_EMAIL_FROM` and `INVITE_CODE_SECRET`, nothing is fetched.
  The actions are `src/app/friends/invite-actions.ts`; the sender's sheet polls `GET /api/invite-qr?t=` (own row
  only). Admin history lines are `admin_events` kinds `invites_set`, `invites_topped_up` and `invite_revoked`; a
  sender's own sends and a newcomer's join are NOT logged there, because `admin_events.actor_id` survives the purge
  and would keep a deleted player's id: PR 6 reads them from the rows. PR 3 is the newcomer's backend: `claimInvite`,
  `confirmCode` and `handOver` (`claim.ts`, each decision a pure function) behind the actions in `src/app/join/actions.ts`
  (the token's SENDER's switch decides, off reads as N12; the claim secret travels only in an httpOnly cookie on the
  token's own path); `spendInviteOnSignUp` (`spend.ts`, from `user.created` in the Clerk webhook and from the
  newcomer's first `/friends`, idempotent in either order, with `takeReceipt` drawing the band once from the edge);
  `sweepInvites` behind the hourly `GET /api/cron/invite-sweep` (which also releases lapsed flyer claims and, 30 days after the launch date (the admin-set `flyer_settings` value, else `FLYER_LAUNCH_DATE`), purges `launch_list`; neither set means never: `src/lib/flyer/launch-purge.ts`); and the purge revoking the sender's pending Clerk
  invitations after it commits. Proof: `pnpm probe:invites`.
  PR 5 draws the newcomer's side. `/join/[token]` and `/sign-up` are public in `src/proxy.ts`; a signed-in reader goes Home
  from either. `readJoin` (`join-read.ts`, the step itself pure as `joinStep`) reads the token's row against the claim cookie
  once, so a reopened link redraws the code step (N3) or the hand-over (N6) for the browser that claimed it, and a claimed
  row opened anywhere else, an expired QR (N11) or an ended one (N12) names nobody. The client flow (`components/join/`)
  calls the three actions and keeps Clerk's sign-in a redirect. Proof, signed out at both widths: `pnpm probe:invites-join`
  (the contact sheet cannot photograph these routes: it signs in).
  The claim cookie is set by the PROXY on the GET of `/join/<token>` when the browser has none (`claim-cookie.ts`, Web
  Crypto so the edge can mint it), and `claimInvite` binds that PRESENTED secret when it is 43 base64url characters
  (else it mints one, the cookies-blocked fallback). A first Send code whose response is lost therefore leaves the
  cookie behind: the retry is a `wait`, not an ended claim holding its invite for 7 days.
- **Spare requests** (G5; plan `2026-10-22-spare-requests.md`; workshop `boards/me-page-workshop-2026-10-21.md` rounds
  4, 5 and 8), shipped behind `SPARE_REQUESTS_ENABLED`, since retired, as is `SOCIAL_FRIENDS_ENABLED`: spare requests are
  always on. A player asks a friend for one spare card with a deliberate press; the friend answers Yes or No and the asker is
  told; a Yes changes nothing else in the app. `spare_requests` is read and written only by
  `src/lib/social/spare-requests.ts` (`check:social-reads`); the rules are pure in `spare-request-rules.ts`.
  EXPIRY IS DERIVED: an open ask older than `SPARE_REQUEST_DAYS` (14) reads as expired everywhere and cannot be
  answered; no job sweeps. ONE open ask per asker and card across every friend, held by a partial unique index; the
  asker's next ask for the card first writes `expired` over an open row past its days or to someone no longer a
  friend, so the index frees, and a concurrent second
  ask is answered `asked`. After a No, that friend is not asked for that card again for `DECLINE_COOLDOWN_DAYS` (14) and
  the next friend may be asked at once (Hugh, 2026-10-22). An ask needs the card to be a spare the friend OFFERS the
  asker (`loadFriendSpares`: the pod grant, `spare_min`, `spare_keep`), read before the write. The write locks both
  friendship rows FOR SHARE in (user_id, friend_user_id) order, the purge's order, and writes the holder's
  `spare-request` feed item (`recordFeedItem`, keyed on the request id; nothing for a holder with that kind off) in
  the same transaction. An answer is one conditional UPDATE on the holder's own open, unexpired ask while the
  friendship row stands; when it lands, the SAME transaction writes the ASKER a `spare-request` item marked with the
  answer (`data.answer`, `answerData`/`answerOf`; keyed on the request id, which is unique on the asker), so its push
  queues through `recordFeedItem` under the asker's own spare-request ticks. It stands while the ask still holds that
  answer, never leads Home and never waits (`leadStory`, `feedOrder`), draws as "Your request" with Your requests' words
  (`withAnswerDetails` reads who else offers a declined card), and its push lands on `/friends`, never collapsed. An answer is SEEN by the asker's Friends cursor (`friends_seen_at`, a `/friends` visit) or one by one (`spare_requests.asker_seen_at`, small items item 3: `openAnswerAction` resolves the Home item's own key to the request through `answeredRequestIdQuery`, then `markAnswerSeen`), and `unseenAnswers`, `answerUnseen` and the feed's unseen tests (`answerOpened`) all read both, so opening one answer leaves another's diamond and takes one off each badge (`pnpm probe:answer-seen`). Every read joins the live friendship and names the other side by `public_id`. The purge
  deletes both sides (`SOCIAL_PURGED`). PR 2: the feed keeps a `spare-request` item only while its ask is open
  (`storedFeedBranch`), and the Friends badge has two halves (`NavBadges.friends`, cleared by a `/friends` visit: unseen
  trade matches plus unseen answers to the reader's asks, `unseenAnswersCount` / `markAnswersSeen`, an upsert so a
  reader with no prefs row can still be marked; `NavBadges.friendsWaiting`: the incoming open asks, `waitingAsksCount`,
  cleared only by answering, whatever the reader's feed opt-in). PR 3a (backend for the UI, handoff
  `design_handoff_the99_spare_requests` G1 to G4): the asker's ✕ WITHDRAWS an open ask (`withdrawn`: nobody is told, it
  holds no card and no cooldown, and it leaves the holder's list, badge and feed) or CLEARS an answered or expired one
  (`asker_cleared_at`, never a delete, so a cleared No still holds the cooldown); ASK INSTEAD is one transaction under the
  asker-and-card lock, the new friendship rows locked before the withdraw, and any refusal of the new ask rolls the
  withdraw back (`askInsteadForSpare`, `askIn` is the shared body). An ask carries `copies` (capped at the friend's spare
  count, `capCopies`) and `deck_id` (stored only when the deck is the asker's own, else null; display only, never a
  refusal); the holder reads the deck's NAME only through the live friendship. NO LONGER SPARE is derived at read: an
  open ask for a card the holder no longer offers (`loadOwnOffered`, the `isOffered` rule on their own collection) leaves
  Waiting on you and `waitingAsksCount` (which runs the SQL count first and filters only past zero, so the two agree);
  the asker reads it `unavailable` (`loadFriendSpares`), or `unneeded` against an optional `stillNeeded` set. The
  `spare-request` feed kind is ON BY DEFAULT (`DEFAULT_ON_KINDS`): `user_prefs.feed_kinds_declined` holds a default-on
  kind the reader turned off, `kindEnabledAt` renders the effective `enabledAt` for the writer and the stored branch
  (both left joining the prefs, so a reader with no row is told), nothing is written on read, and turning it back on
  stamps it now. The actions are `src/app/friends/spare-actions.ts` (`/friends` revalidated only for ✕ and an answer);
  the asker's per-card states for Shopping are `GET /api/spare-requests?ids=` (`loadAskStates`, 404 off, `private,
  no-store`). Proof: `pnpm probe:spare-requests`.

## Friend decks (always on)

**Tab order and default (Hugh, 2026-10-30, no Design round):** a friend's page opens on Decks, and its strip reads Decks,
Wishlist, Spares on every width. The routes follow: `/friends/[publicId]` is Decks, `/wishlist`, and `/spares` (Spares moved
off the bare address). Two redirects keep old links working: `/friends/[publicId]/decks` goes to the bare page, and a bare
page with `?spare=` goes to `/spares?spare=` before any read (pushes and feed rows sent before the move). Every link
builder (`friendRoute` in `push/message.ts`, the Home feed, Waiting on you) writes `/spares?spare=` directly.

Handoff `design/design_handoff_the99_friend_decks/` (R2, Green, Hugh 2026-10-22). A friend's Decks tab, and a friend's
deck opened read-only, show only what the OWNER lets friends see. The rule is one pure function, `friendCanSeeDeck`, and
both reads share one list (`visibleDecks` in `decks.ts`), so a tile the tab shows always opens and one it hides never
does. Its three inputs are the owner's: Settings' Friends can see my decks (`user_prefs.friends_see_decks`, on by
default), Include drafts and decks I'm building (`friends_see_unfinished`, off by default), and the deck's own Hidden
from friends (`decks.hidden_from_friends`, from its ⋯ menu).

- **Unfinished is a phase.** `New` and `Draft` (no committed version) and `Building` (committed, short of its body
  size). `Unresolved` is a committed deck at its size, so friends see it on the defaults, as `Over`, `To buy` and
  `Complete`.
- **Every tile opens.** No switch decides the tab any more (`FRIEND_DECKS_ENABLED` retired 2026-10-29,
  `SOCIAL_FRIENDS_ENABLED` 2026-10-31). The filter is the owner's rules; `loadFriendDecks(viewer, publicId)` returns
  every visible deck as an open tile (`FriendDeck`: an id, and no status or to-buy figure, so nothing of the owner's
  money is sent; the stats read still reads Shopping for the status), and `loadFriendDeck` reads the page. The tab's
  shipped form (view-only tiles with the status and the to-buy figure, no press) and its `viewerOpen` read are gone.
- **Retired switches.** `FRIEND_DECKS_ENABLED` and `SOCIAL_FRIENDS_ENABLED` are gone. Their names stay in the
  `friend-decks` and `friends` About entries and the `friends` and `opponents` key pairs as their historical identity
  (About's seen-state keys by it); `src/lib/about/visible.ts` maps each to always on.
- **The page's read.** The owner's own `getDeckDetail`, run as its owner with `Promise.resolve(null)` in place of the
  shared availability read, so the owner's claim model never runs for a friend; then cut field by field to
  `FriendDeckCard` (catalog facts and the owner's printing; no price, availability, proxy, lock, auto tag or combo
  partner), with `owned` read from the VIEWER's collection. The grant is read again after the reads.
- **Absence.** Every null of `loadFriendDeck` is the same 404: a stranger, a deck not theirs, hidden, unfinished, decks
  off. On the tab and the page a hidden deck and a deleted one cannot be told apart.
- **The game log's seat picker** (PR 5, Hugh's ruling 2026-10-22). With the switch on for the OWNER, `friendDecksQuery`
  leaves out a deck hidden from friends, and every deck while Friends can see my decks is off (no prefs row reads as
  on); drafts stay pickable, because the unfinished rule is the tab's alone. The friend list's count is the same rule
  (`friendDeckCountsQuery`'s `visible`), so the count and the list agree. For every friend whose switch is on the
  picker offers A deck not listed (`withheld`), whether or not they hid anything, so its presence says nothing of a
  hidden deck: the same seat as Just <name> (`{ friend, deck: null, commander: null }`, logged as `{ friend }`).
  Such a friend with nothing listed is not told "has no decks". `friendDecksIn` (the write-time check of a chosen
  seat) and Rule 0's seating are NOT filtered, so a game logged against a deck hidden since the pick still logs.
- **Writes.** `writeFriendDeckPrefs` and `setDeckHiddenFromFriends` write only on a change, because the stamp trigger
  fires on any UPDATE and the stamp is what moves a friend's `friendGeneration`. Hiding never writes `last_edited_at`
  and never touches Tonight's table or a logged game, which keep a hidden deck's name (G4, Hugh 2026-10-22).

## The face: any card, any printing (backend, 2026-10-27)

The backend landed behind `SOCIAL_FRIENDS_ENABLED` alone (#2263; since retired, always on): the column is nullable and every existing row reads null, so an unchanged profile draws exactly what it drew. The surfaces that offer any card shipped behind `SIGNATURE_CARD_ENABLED`, since retired: they are always on; see the next section.

- **`social_profiles.commander_oracle_id`** is any catalog card (the "must be able to lead a deck" refusal is gone; `canBeFace` moved to `lib/decks/commander-picker.ts` as `canLeadADeck`, which the existing picker still filters by). **`commander_printing_id`** is the player's chosen printing, a FK to `printings.scryfall_id` with `ON DELETE SET NULL`.
- **`setCommander(viewer, oracleId, printingId?)`** is the one writer. Refusals: `noCard` (not a catalog card), `badPrinting` (not a uuid, not a printing OF that card, or a printing with no card), `noProfile`. Every write sets both columns, so changing the card drops the old pick. A card or printing deleted between the check and the write comes back as the same refusal (FK violation), not a 500.
- **The art chain**, in `commanderColumns.commanderArt`: `coalesce(face_printing.art_crop_uri, commander_card.art_crop_uri)`. The printing joins on `faceJoin`, which names BOTH ids (`scryfall_id = commander_printing_id AND oracle_id = commander_oracle_id`), so a pick that no longer matches its card draws the card's own art. In `members` (access.ts) the printing joins only where the card does, so the pod grant decides both.
- **Readers.** Five modules spread `commanderColumns` (`friends`, `access`, `home-friends`, `rule-zero`, `spares`) and join `facePrinting`; `spare-requests.ts` writes the same chain in raw SQL (`ifp`, `mfp`). `face-reads.test.ts` fails when a reader joins the card without the printing. No cached page draws a face today (`friendGeneration` does not key it); a page that starts to must key the printing.
- Proof: `pnpm probe:face-printing`.

## Signature card (handoff 20, 2026-10-27)

Shipped behind `SIGNATURE_CARD_ENABLED`, since retired: the surfaces are always on, as is the line's Spares tab work (below). Plan `docs/superpowers/plans/2026-10-27-signature-card.md`.

- **The picker** (`src/components/social/signature-picker.tsx`, from the `/friends` head): any card, by `searchFaceCards` (`lib/decks/commander-picker.ts`), then its printings (`listFacePrintings`, usual art first), saved through `setCommanderAction(oracleId, printingId?)`. With nothing typed it offers the faces of the player's own decks (`listOwnDeckFaces`); a deck's pick is saved as a printing only when its `(oracle_id, set_code, collector_number)` names exactly one printing, else null (the usual art). The own-profile read returns the pick (`OwnCommander.printingId`, `printingGone`), and a pick whose printing left the catalog draws the P8 note.
- **The ask, once** (Home's first-run row and the strip, `src/components/home/signature-ask.tsx`): decided per request from `loadHomeFriends`, never from the cached payload. `user_prefs.face_prompt_done_at` (migration 0176) is set by a pick or by Skip, written only while null (the stamp trigger); the rule is `faceAskPlaces` in `src/lib/discovery/face-prompt.ts`, which sits there, not in `lib/social`, so the cached Home payload does not read a social table.
- **Spares outside Shopping** (shipped in this line; spare requests are always on): a friend's Spares tile opens `SparesSheet` for that card with the page's friend first (`orderSparesFirst`), the wishlist kicker and the card's price; the tile's count line carries THIS friend's ask. An ask from the tab is stored `standalone` (it is for no deck's list), so Your requests never reads it as no longer needed. `?spare=<oracle id>` opens the sheet on landing or, for a spare gone since, draws a toast; either way it is stripped through `mirrorUrl`. A single-card trade-match push, its Home feed item and its Waiting row link there. Each of them is marked `askable` (always, now that spare requests are always on), so the press reads "Ask {friend}" and the push body adds "Ask {friend} for it.".
- **About:** the `friends` entry's face sentence is a `captionLineSwitches` pair keyed on `SIGNATURE_CARD_ENABLED` (the retired name stays its historical identity; `visible.ts` resolves it to always on), riding the next batched `ABOUT_VERSION` bump with no halo; key 2 names the face the same way in four forms, one per (friend decks, `SIGNATURE_CARD_ENABLED`) pair, friend decks now always on with Friends. The `/friends` name hint and the friend link landing's rules and empty credit followed `SOCIAL_FRIENDS_ENABLED` too (READINESS call 1) and now always draw their friends-on forms.

## Hiding a feed item (✕, 2026-10-27)

Hugh's ruling (the menu-home plan's product call 6). No switch of its own: the ✕ shows wherever its row does.

- **The write**: `dismissFeedItemAction` → `dismissFeedTarget` (`src/lib/social/feed-dismiss.ts`) writes one `feed_dismissals` row per reader and key. The key is Home's own `FeedView.key`: `item:<feed_items id>`, `set:<code>` or `precon:<file>`. It is never a writer's dedupe key, because a trade match's names another account. A stored item is written once, guarded by its dedupe key, and only the purge deletes one, so a hidden item cannot come back under another key. A Waiting on you ask the reader holds is hidden under its own `ask:<request id>` key, and under the holder's feed item for it when there is one (a holder with the `spare-request` kind off has none), so its Home item goes too. Hiding answers nothing: the ask stays open for the asker.
- **The reads**: every read leaves a hidden key out:
  - `standing` in `feed-items.ts`, shared by the stored feed branch and the push resolver;
  - both catalog branches in `lib/feed/read.ts`, shared by the feed and the push enqueue;
  - `notDismissedAsk` in `spare-requests.ts`, for the incoming asks and the waiting count.

  So Home's rows, the lead story, the unseen count, Waiting on you, both badges and push all agree. Your requests keeps its own ✕ and is not covered.
- **The table**: purged with the account (`PURGE_ORDER`). It needs no stamp trigger, because the feed and /friends are read per request and no cached payload holds a feed item.
- Proof: `pnpm probe:feed-dismiss`.

## Ask in place (2026-10-27)

Hugh's ruling (the menu-home plan's product call 8). No switch: always on (spare requests' and friends' switches are retired), read as each trade match's `askable`.

- **The page's read**: `loadTradeAsk` (`src/lib/social/trade-ask.ts`) takes the trade-match cards the page draws with an Ask (Home's lead and rows, /friends' Waiting on you) and prices them through `loadPrices`. A failed price read draws the sheet's bare tag, never an error. No card, no read.
- **The provider**: `TradeAskFrame` / `TradeAskProvider` (`src/components/social/trade-ask.tsx`) mount `FriendSparesProvider` with the friend's Spares tab's settings (`requests`, `standalone`, `sparesOnOpen`) and host the sheet with the pressed row's friend `first`. Home mounts it inside the feed's `CardDetailProvider`; /friends wraps Waiting on you in its own, since the sheet's name opens card details.
- **The presses**: `FeedPress` (rows and the lead), the row's picture and `WaitingLink` become buttons inside the provider and stay links outside it. Once asked they read the tab's caption (`TradeAskLabel`: Requested or ✓ Accepted; on the lead's filled button, in the button's ink).
- **/friends**: the frame stays mounted with no payload (so a redraw keeps Waiting on you's visit state), an Ask redraws the page through `refreshFriendsAction` (the ask actions revalidate nothing) so Your requests lists it, and a Your requests ✕ moves `asksVersion`, which re-reads the trade matches' asks. Only each card's newest asks read is applied.
- **Loading**: `SparesSheetHost` passes `spares: null` while a card's read is pending and the page holds no fallback, and `SparesSheetBody` draws `SheetLoading` in its place.
- Inventory: `docs/superpowers/inventories/ask-in-place.json`.

## From AGENTS.md (moved 2026-10-28)

The rule-form bullets `AGENTS.md` carried for this area until 2026-10-28, verbatim. Where they and the text above differ in wording, both are current.

- **Social foundation** (always on; `SOCIAL_FRIENDS_ENABLED` retired). Friends are added by single-use invite link or QR, never search; a friendship is two directed `friend_links` rows written in user id order. **Every cross-user read lives in `src/lib/social/`** and joins the grant on the session's viewer in the same statement; client payloads carry `social_profiles.public_id`, never a Clerk id. `pnpm check:social-reads` fails when a module outside that directory touches a social table. Spares are view-only, per pod (`loadFriendSpares`, `GET /api/friend-spares`). A friend's write never moves the viewer's stamp, so a cached page that draws friend data puts `await friendGeneration(viewer)` in EVERY `cachePageForUser` key (`check:list-cache` enforces it), and a page drawing spares must also key each friend's resolved switches.
- **Invites** (always on; `SOCIAL_INVITES_ENABLED` and `SOCIAL_FRIENDS_ENABLED` retired). Every write that holds, spends or sets a sender's invites takes `lockSenderIn` and keeps `held` ≥ the rows holding. The email path answers every outcome after its reservation commits as a success, at `SEND_FLOOR_MS`. `src/lib/invites/clerk.ts` is the one Clerk invitations caller; `mail.ts` (Resend) fails closed. Proof: `pnpm probe:invites`.
- **Spare requests** (always on; `SPARE_REQUESTS_ENABLED` and `SOCIAL_FRIENDS_ENABLED` retired). `spare_requests` is read and written only by `src/lib/social/spare-requests.ts`. An open ask EXPIRES by derivation after 14 days (no job); one open ask per asker and card across every friend (a partial unique index; the next ask writes `expired` over a stale row first); after a No that friend is held back 14 days, the next asked at once. An ask needs a spare the friend offers (`loadFriendSpares`) and locks both friendship rows FOR SHARE in the purge's order; an answer is one conditional UPDATE, and when it lands the same transaction writes the asker a `spare-request` feed item marked with the answer (`data.answer`), which queues its push. ✕ withdraws an open ask (holds nothing) or clears an answered one (never a delete: a cleared No keeps its cooldown); Ask instead is one transaction. The `spare-request` feed kind is on by default (`feed_kinds_declined`, `kindEnabledAt`). An ANSWER is seen by the asker's Friends cursor or one by one (`asker_seen_at`, set by `markAnswerSeen` when it is opened over Home), and the Friends badge, Your requests and Home's count all read both. Proofs: `pnpm probe:spare-requests`, `pnpm probe:answer-seen`.
- **Signature card** (always on; `SIGNATURE_CARD_ENABLED` and `SOCIAL_FRIENDS_ENABLED` retired). A player's face is any card in any printing, picked from the `/friends` head (`signature-picker.tsx`) and saved by `setCommander` alone; Home asks once (`user_prefs.face_prompt_done_at`, set by a pick or Skip, written only while null; rule `faceAskPlaces` in `src/lib/discovery/face-prompt.ts`), decided per request and never from the cached payload. Shipped in the same line but behind `SPARE_REQUESTS_ENABLED` alone, a friend's Spares tile opens `SparesSheet` with that friend first, and `?spare=<oracle id>` opens it on landing, stripped through `mirrorUrl`. Proof: `pnpm probe:face-printing`.
- **Friend decks** (always on; its About entry is `friend-decks`). What a friend sees of a player's decks is ONE rule, `friendCanSeeDeck` (`src/lib/social/deck-visibility.ts`), over the OWNER's three inputs: `user_prefs.friends_see_decks` (default on), `friends_see_unfinished` (default off; unfinished is `New`, `Draft` or `Building`) and `decks.hidden_from_friends`. `loadFriendDecks` (the tab) and `loadFriendDeck` (the friend's deck page, `/friends/[publicId]/decks/[deckId]`, `FriendDeckView`: the open precon page's anatomy through `read-only-list.tsx`) both filter through it. Every tab tile is open (an id for the press, no status or to-buy figure). On those two reads a hidden deck is the same null as a deleted one. The page's cards are the owner's `getDeckDetail` with no availability read, cut field by field to `FriendDeckCard`, with `owned` the VIEWER's. Both writes change only on a change (the stamp trigger) and hiding never touches `last_edited_at`, a table or a logged game (G4). The game log's picker offers a friend's deck by the same owner rules except the unfinished one (drafts stay pickable), and, for every friend (hidden decks or none), offers A deck not listed, which seats the friend with no deck and says nothing of whether, how many or which. Rule 0 setup (`setupDecksQuery`) and `setTable`/`resolveSeatsIn` follow the picker's rule (`pickerSeesDeck`), and a friend's deck hidden since the pick reads as no deck on the setter's `Seats`, the table page (`seatsQuery`) and the game log's prefill and save (`tableSeatsQuery`), all through `seatDeckVisible`; the viewer's own decks are never filtered. Proof: `pnpm probe:friend-decks`.
- **Opponents in the game log** (always on; `SOCIAL_GAMES_ENABLED` and `SOCIAL_FRIENDS_ENABLED` retired). `deck_game_opponents` rows SNAPSHOT the friend's and deck's names at log time. The live friend link is never sent to a client and is unlinked by the purge. The player-typed label reaches no prompt.  Proof: `pnpm probe:game-opponents`.
