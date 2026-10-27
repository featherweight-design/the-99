// The About entries: every capability the page describes, in reading order (chapters 01 to 04).
//
// Moved out of `about.ts` (discovery plan R2·1a) so the shell, `method-tag.tsx` and
// `provenance-panel.tsx`, which import `about.ts`'s other copy, no longer carry ~1,500 lines of
// entries into their bundles. The rules for writing an entry, and ABOUT_VERSION, stay in `about.ts`.

import { HISTORY_RETENTION_DAYS } from '../collection/retention';
import { benchmarksAboutEntry } from './deck-benchmarks';
import type { AboutEntry } from './about';

export const aboutEntries: readonly AboutEntry[] = [
  // ---- 01 · Your collection ------------------------------------------------
  {
    id: 'browse',
    screen: 'collection',
    chapter: '01',
    title: 'Finding a card in your Collection',
    route: '/collection',
    width: 'plate',
    caption:
      "Your Collection has the standard search, filter and sort options you’d expect to find anywhere else: search by name, filter by color, type or set, sort by name, quantity and more. But The 99 does you one better: Availability. We’ll go over it in more detail later, but this is what tells you what you own, what’s in use and what you need to buy.",
    keys: [
      'Cards, Sets and Proxies sit in the strip at the top.',
      'Sets lists every set you own cards from, newest first.',
      'Each filter becomes a chip. Press one to drop it.',
      'Grid or rows is your call, and we remember it.',
    ],
    marksPending: true,
    since: 1,
  },
  {
    id: 'collection-add',
    screen: 'collection',
    switch: 'COLLECTION_EDIT_ENABLED',
    chapter: '01',
    title: 'Adding cards by hand',
    route: '/collection',
    opens: 'opens Add cards',
    width: 'plate',
    caption:
      'Cracked a pack and don’t want to export your whole Collection for four cards? Press “Add cards” and search by name. Any card works, even ones you don’t own yet.\n\nPick the printing, mark it foil if it is, set how many, and keep going. One Save adds the lot.\n\nIf you have no Collection yet, you can start here instead of with a file.',
    keys: [
      'Each line is one printing and finish, so a foil and a nonfoil are two lines.',
      'You choose the printing before a card goes on the list.',
      'A card you already own shows how many you’ll have after.',
      'Nothing is saved until you press Save, and the save shows in History as one change.',
    ],
    marksPending: true,
    since: 12,
  },
  // The launch-end batch (handoff `addendum-launch-end-batch/`, #2156): every new entry is `since: 16`, announced by its
  // switch. Words: the handoff's drafts through prose-pass, stale facts corrected against the code (brief Draft vs code 13:
  // matching is on the server, Fast shipped as Auto, Normal picks the printing in the camera).
  {
    id: 'card-scan',
    screen: 'collection',
    switch: 'CARD_SCAN_ENABLED',
    chapter: '01',
    title: 'Scanning your cards',
    route: '/collection',
    opens: 'opens Add cards',
    caption:
      'Typing in a stack of new cards gets old fast. Press “Add cards”, then “Scan”, and hold each card up to your camera. We work out which card it is and put it on the list.\n\nWhen we’re not sure, you get the three closest to pick from. Then check the list, fix anything we got wrong, and one Save adds the lot.',
    keys: [
      'In Auto, a card goes on at the printing we matched as soon as it reads. In Normal, you pick the printing as you scan.',
      'Scanning needs a connection: we check each card as you scan it.',
      'A card that stays in view is never added twice. In Auto, take it out of frame to add a second copy.',
      'Press a scanned card’s name on the list to swap it for one of the closest matches.',
    ],
    since: 16,
  },
  {
    id: 'import',
    screen: 'upload',
    chapter: '01',
    title: 'Importing your Collection',
    route: '/collection/replace',
    width: 'inset',
    caption:
      "Your collection probably already lives somewhere else. Mine’s in ManaBox. Export it, drop the file in, and The 99 picks up every copy, set and foil.\n\nHeads up: an import replaces your whole Collection, it doesn’t add to it.\nAlready have a Collection here? The 99 asks whether the file replaces it or adds to it.",
    captionLineSwitches: {
      "Heads up: an import replaces your whole Collection, it doesn’t add to it.": '!COLLECTION_EDIT_ENABLED',
      'Already have a Collection here? The 99 asks whether the file replaces it or adds to it.': 'COLLECTION_EDIT_ENABLED',
    },
    keys: [
      'Takes ManaBox, Moxfield, Archidekt or Deckbox CSVs, or a pasted list.',
      'Any CSV with Name and Quantity columns works too.',
      'Reads quantity, set, collector number and finish.',
      'Nothing changes until you confirm.',
    ],
    marksPending: true,
    since: 1,
  },
  // A way in without a collection (plan `2026-10-15-no-collection-entry.md` PR 6, handoff
  // `design_handoff_the99_no_collection_entry/about · start without a collection.ts`, R3). After `import`,
  // following the line's own switch, which needs COLLECTION_EDIT_ENABLED. A switched entry, so it bumps nothing:
  // `since: 14`, the version current when it shipped, and it is announced by its id when the switch flips. The precon sentence is a caption line of its own and the precon key a line of its own,
  // so each follows PRECONS_ENABLED without the entry going dark. One caption at both widths.
  {
    id: 'start-without-a-collection',
    screen: 'collection',
    switch: 'NO_COLLECTION_ENTRY_ENABLED',
    chapter: '01',
    title: 'Starting without a collection file',
    route: '/collection',
    opens: 'opens the empty Collection',
    width: 'plate',
    caption:
      'No export to upload? Plenty of us don’t have one. If your cards are a few precon boxes, a Moxfield list or a pile on the desk, start there.\n\nPick the precons you own and each one starts its deck, with its cards in your Collection at the box’s printings, tokens too.\nImport a deck you play and select that you own its cards. Or add cards one at a time. A file can come later.',
    captionLineSwitches: {
      'Pick the precons you own and each one starts its deck, with its cards in your Collection at the box’s printings, tokens too.': 'PRECONS_ENABLED',
    },
    keys: [
      'Commanders, Discover and Decks open once your Collection has a card in it.',
      'Each precon box is its own change in History, and Revert takes its cards back. Adding a box twice stacks its copies and starts a second deck.',
      'An imported deck’s cards are added as one change, at the printings the list named.',
      'Your first file asks whether it replaces or adds, and says what a replace would remove.',
    ],
    keySwitches: {
      'Each precon box is its own change in History, and Revert takes its cards back. Adding a box twice stacks its copies and starts a second deck.':
        'PRECONS_ENABLED',
    },
    marksPending: true,
    since: 14,
  },
  {
    id: 'upload-choice',
    screen: 'upload',
    switch: 'COLLECTION_EDIT_ENABLED',
    chapter: '01',
    title: 'Replacing or adding from a file',
    route: '/collection/replace',
    opens: 'opens the upload',
    width: 'plate',
    caption:
      'Drop in a fresh export from ManaBox, Moxfield or any of the others and The 99 asks what the file is for. “Replace” makes your Collection exactly the file. “Add” stacks its cards on top of what you have, which is what you want for a booster haul or a trade binder.\n\nEither way, you see every card that moves before anything changes. Replace also tells you if it’ll overwrite changes you made in the app, and names any decks that will read short.',
    keys: [
      'Replace: anything not in the file leaves your Collection.',
      'Add: quantities go up, nothing leaves, and your art picks stay.',
      'Adding a full export doubles your copies, and the screen tells you when that’s about to happen.',
      'Your very first upload skips the question, since there’s nothing to replace.',
    ],
    // Collection sync (handoff `about · collection sync.ts`): the third choice, announced when its
    // switch flips. Keys stay at four: Sync's line replaces Add's doubling line, since a re-export
    // is now Sync's job and Add's overlap note still warns on screen.
    variant: {
      switch: 'COLLECTION_SYNC_ENABLED',
      title: 'Replacing, adding or syncing from a file',
      caption:
        'Drop in a fresh export from ManaBox, Moxfield or any of the others and The 99 asks what the file is for. “Replace” makes your Collection exactly the file. “Add” stacks its cards on top of what you have, which is what you want for a booster haul or a trade binder. “Sync” takes what changed in the file and keeps what you changed in the app.\n\nWhichever you pick, you see every card that moves before anything changes. Replace also tells you if it’ll overwrite changes you made in the app, and names any decks that will read short.',
      keys: [
        'Replace: anything not in the file leaves your Collection.',
        'Add: quantities go up, nothing leaves, and your art picks stay.',
        'Sync: takes the file’s changes, removals included, and keeps yours. If you both changed a card, it asks.',
        'Your very first upload skips the question, since there’s nothing to replace.',
      ],
    },
    marksPending: true,
    since: 12,
  },
  {
    id: 'post-import',
    screen: 'upload',
    chapter: '01',
    title: 'How replacing your Collection affects your decks',
    route: '/collection/replace',
    opens: 'opens the import summary',
    width: 'plate',
    caption:
      "Cracked a few packs and re-imported? The summary shows what that did for your decks: what you no longer need to buy, what you still do, and where you’re still short.\n\nYour decklists don’t change, just whether you own what’s in them.\nAfter a sync it also says how many of your own changes stayed.",
    // The handoff's half-line, kept only where a sync can happen: an ordinary edit, announced by nothing.
    captionLineSwitches: {
      'After a sync it also says how many of your own changes stayed.': 'COLLECTION_SYNC_ENABLED',
    },
    keys: [
      'Shows your card count before and after.',
      'Rows sort into No longer to buy, Still to buy and Still short.',
      'A card two decks want gets one row, the deck that has held it longest first.',
      'A new copy goes to the deck that committed first, unless you pick another.',
    ],
    // ⚠ R4: strings inside this figure are FIXTURES, not read from source.
    // #639/#643 landed after the last read of main; the structure is the
    // entry’s subject and holds, and the vocabulary is in
    // `src/lib/copy/card-assignments.ts` — the summary has no copy module of
    // its own. See `design/design_handoff_the99_about/READINESS-r4.md`.
    //
    // One structural decision inside it, not a fixture: a row under
    // `No longer to buy` carries NO diamond. Those copies became free, and
    // free carries nothing anywhere in the app — the availability entry two
    // above this one teaches exactly that. A solid diamond there would be the
    // `none free` mark on a row announcing the opposite.
    since: 1,
  },
  {
    id: 'import-issues',
    screen: 'upload',
    chapter: '01',
    title: 'When an import can’t find a card',
    route: '/collection/replace',
    opens: 'opens the issue inspector',
    // A ROW figure, so it takes the full plate. The route’s own issue rows carry
    // a name, a line number, a set code and a reason on one line; at the inset’s
    // 300px cap `no Oracle match` wrapped and the copy count collided with it —
    // a figure demonstrating the route’s row while showing a shape the route
    // never produces.
    width: 'plate',
    caption:
      'Sometimes a line just won’t match: a typo, or an export that does something odd. Those land in Import issues with the reason beside each one, and everything else imports as normal.',
    keys: [
      'Not in catalog: names we couldn’t find.',
      'Unreadable lines: lines we couldn’t read.',
      'A pasted list can’t fill in set completion.',
    ],
    marksPending: true,
    since: 1,
  },
  {
    id: 'availability',
    screen: 'collection',
    chapter: '01',
    title: 'Availability: what’s free, what’s taken, what to buy',
    route: '/collection?avail=inuse,over',
    width: 'plate',
    caption:
      'This is the one I mentioned earlier and is one of my favorite features, even if it’s a small one. A copy you own can only live in one committed deck at a time, so The 99 keeps track of which decks own which cards.\n\nOwn one Sol Ring and run it in three decks? It reads short 2. Sol Ring: always short because you never think you’ll build another deck until you do.',
    keys: [
      'free: a spare copy nothing wants. No mark.',
      'in a draft: an uncommitted deck wants it. Committed decks come first.',
      'none free: committed decks hold every copy.',
      'short 2: committed decks want two more than you own. The first to commit gets your copy.',
    ],
    marksPending: true,
    since: 1,
  },
  {
    id: 'sets',
    screen: 'sets',
    chapter: '01',
    title: 'Completing a set',
    route: '/collection/sets',
    width: 'plate',
    caption:
      'For the collectors, and the completionists who swear they aren’t. Open any set to see which cards you’re missing and what it would cost to finish it.\n\nA set counts as complete once you own its Checklist, the set’s own numbered run. Showcase, borderless and promo extras are extra credit.',
    keys: [
      'Missing cards are dashed and dimmed, with a price.',
      'Cost to finish counts only what Mana Pool has in stock.',
      'Promo sets with no numbered run count every printing.',
      'Toggle Missing or Owned. Sort by number or price.',
    ],
    since: 1,
  },
  {
    id: 'buy-tag',
    screen: 'deck',
    view: 'shopping',
    chapter: '01',
    title: 'What the cards you’re missing cost',
    route: '/decks',
    opens: 'opens a deck',
    width: 'inset',
    caption:
      'When a deck needs a card you don’t own, it tells you what it’ll cost. Prices come from Mana Pool and refresh daily, so you can see the damage before you check out.',
    keys: [
      'A price: what Mana Pool is asking today.',
      'A foil-only price, like $2.10 foil: they only have it in foil.',
      'sold out: Mana Pool has carried that printing but has none right now.',
      'A bare buy: the feed has no price for that printing at all.',
    ],
    marksPending: true,
    since: 1,
  },
  // Shopping for all decks (handoff `design_handoff_the99_all_decks_cart`), after the buy tag it
  // sums. Behind its own switch, so it is announced when the switch flips, by id: no version bump
  // (the About rule, 2026-10-11). Copy through /prose-pass.
  {
    id: 'all-decks-cart',
    screen: 'decks',
    chapter: '01',
    title: 'Shopping for all your decks',
    route: '/decks/shopping',
    opens: 'opens the cart',
    width: 'plate',
    switch: 'ALL_DECKS_CART_ENABLED',
    caption:
      'Every deck you’re building is short a few cards, and nobody wants to check out five times. Shopping for all decks puts everything they’re missing on one list with one total, ready for Mana Pool, where you pick the printings.\n\nEach card names the decks waiting on it, so you know where every copy is headed.',
    keys: [
      'Every deck missing a card starts selected, brews included.',
      'Unselect a deck to leave it out of this visit only.',
      'Each deck gets its own copy: three decks, three Sol Rings.',
      'Back from Mana Pool, press “buy” on what came, and it goes into your Collection.',
    ],
    // The press is I got it's: with its switch off the cart's tags are inert, and the line would
    // promise a button that does nothing.
    keySwitches: {
      'Back from Mana Pool, press “buy” on what came, and it goes into your Collection.': 'SHOPPING_MARK_BOUGHT_ENABLED',
    },
    marksPending: true,
    since: 14,
  },
  // Where an added copy goes (handoff `design_handoff_the99_added_copy`, `about · added copy.ts`,
  // Keep it free removed: Hugh ruled it out 2026-10-12). No bump: `since` is the version current at
  // merge, the deck-stats precedent. Caption through /prose-pass; the title to /copy-review.
  {
    id: 'added-copy',
    screen: 'collection',
    chapter: '01',
    title: 'Where a new copy goes',
    route: '/collection',
    opens: 'opens Add cards',
    width: 'plate',
    switch: 'ADDED_COPY_ENABLED',
    caption:
      'You buy a Sol Ring for your new Brago deck. But Gishath was short one too, and it committed the card first, so that’s where the copy goes. Fair, and easy to miss.\n\nNow every new copy tells you where it went, the moment you add it. Want it somewhere else? Change it, and it goes to the deck you pick.',
    keys: [
      'The upload summary, “Add cards” and “I got it” all say where it went.',
      'A brew holds a copy only once you give it one.',
      'Press “Change” to see every deck that needs the card.',
      '“Undo” on “I got it” takes back the copy and your pick.',
    ],
    marksPending: true,
    since: 14,
  },
  {
    id: 'card-detail',
    screen: 'card-details',
    chapter: '01',
    title: 'A closer look at any card',
    route: '/collection',
    opens: 'opens the card detail',
    width: 'inset',
    caption:
      'Press any card, anywhere, for a closer look at the art. Double-faced cards flip over, no unsleeving required.\n\nOwn a few printings? Pick your favorite, and that’s the art your Collection shows.',
    keys: [
      'Split cards, adventures and other cards with two costs show both.',
      'Swipe, or use the arrow keys, to page through the list you came from.',
      'Opened from a sheet or a combo partner? The pill at the top takes you back.',
    ],
    marksPending: true,
    since: 1,
  },
  {
    id: 'card-search',
    screen: 'collection',
    switch: 'CARD_SEARCH_ENABLED',
    chapter: '01',
    title: 'Looking up any card',
    // The search is on every page; the link lands on the screen whose frame shows its icon.
    route: '/collection',
    opens: 'opens Search all cards',
    caption:
      'Saw a card across the table, or in a friend’s deck? Look it up by name from any page: the search icon at the top of your phone, or at the top of the side rail on a computer (⌘K, or Ctrl K).\n\nEach card says how many you own and which of your decks hold it. It also says whether it’s on your wishlist. Press one for its full details.',
    // The wishlist sentence is the search's own `onWishlist`, drawn only with the wishlist on (`card-search/search.ts`).
    captionLineSwitches: { ' It also says whether it’s on your wishlist.': 'SOCIAL_WISHLIST_ENABLED' },
    keys: [
      'Search reads card names only, including the names printed on Secret Lair cards.',
      'The last 8 cards you opened from search wait in the field before you type.',
      'On a deck’s page, the “Add a card by name” field adds to that deck, in its colors.',
      'On a phone, the top bar comes back as soon as you scroll up a little.',
    ],
    since: 16,
  },

  // ---- 02 · Finding a commander -------------------------------------------
  {
    id: 'edit-copies',
    screen: 'card-details',
    switch: 'COLLECTION_EDIT_ENABLED',
    chapter: '01',
    title: 'Changing how many you own',
    route: '/collection',
    opens: 'opens the card detail',
    width: 'plate',
    caption:
      'Counts drift. Maybe you sold a copy, or logged the wrong printing. Open the card and press “Edit copies”. Every printing and finish you own gets a line with its own count. If a copy sits under the wrong printing, tap its line and pick the right one.\n\nThis is separate from choosing art. The printings grid still only decides which art your Collection shows.',
    keys: [
      'Adding copies needs no deck check. Press Save and it’s done.',
      'Taking copies away checks your decks first, and names any that would come up short.',
      'Changing a line’s printing doesn’t change your total, so it never leaves a deck short.',
      '“Add another printing” asks which printing before it adds anything.',
    ],
    marksPending: true,
    since: 12,
  },
  {
    id: 'remove-card',
    screen: 'collection',
    switch: 'COLLECTION_EDIT_ENABLED',
    chapter: '01',
    title: 'Removing a card from your Collection',
    route: '/collection',
    width: 'plate',
    caption:
      'When a card has really left your binder, take it out here. Open the card, press “Edit copies”, then “Remove from collection”. That takes every copy of every printing.\n\nIf a committed deck plays it, you see which decks will come up short before anything changes. Those decks show the card as short and add it to their shopping lists.',
    keys: [
      'To take away only some copies, lower their line instead.',
      'Right after, “Undo” puts it all back. So does History, later.',
      'Nothing about a deck changes on its own.',
    ],
    marksPending: true,
    since: 12,
  },
  {
    id: 'collection-history',
    screen: 'history',
    switch: 'COLLECTION_EDIT_ENABLED',
    chapter: '01',
    title: 'Undoing a change to your Collection',
    route: '/collection/history',
    width: 'plate',
    caption:
      `Every upload, add, edit and removal from the last ${HISTORY_RETENTION_DAYS} days lives in History, newest first. Press “Revert” on any of them to undo it.\n\nA revert works on your Collection as it is today. Say an add brought in three copies and you’ve since sold two. Reverting that add takes away the one that’s left.\n\nAnd a revert is a change of its own, so you can revert that too, in case you change your mind about changing your mind.`,
    keys: [
      'Open a change to see every card it moved.',
      'Reverting a Replace puts back every card that upload moved.',
      'A reverted change stays in the list, marked and linked to its revert.',
      `Changes older than ${HISTORY_RETENTION_DAYS} days age out. Your cards don’t.`,
    ],
    marksPending: true,
    since: 12,
  },
  // The Social line, entry 2 (Social R2's last PR; addendum `design_handoff_the99_about/addendum-social-line`, approved
  // 2026-10-15): last in chapter 01, as the Wishlist tab follows History. It follows `SOCIAL_WISHLIST_ENABLED`, which
  // stands alone, so `since: 14` and no bump; the friends paragraph and key line need `SOCIAL_FRIENDS_ENABLED` too.
  // The specimen is the Wishlist tab's own tile (E1, `wishlist/wishlist-tile.tsx`).
  {
    id: 'wishlist',
    screen: 'wishlist',
    switch: 'SOCIAL_WISHLIST_ENABLED',
    chapter: '01',
    title: 'Keeping a wishlist',
    route: '/collection/wishlist',
    width: 'plate',
    caption:
      'Want a card that no deck is asking for yet? Put it on your wishlist. Press “Add to wishlist” in any card’s details, or search on the “Wishlist” tab of your Collection, and set how many you want in all. Any printing counts.\n\nOnce your Collection holds that many, the card leaves the list by itself, and the tab tells you once what left. Nothing piles up to clear.\n\nYour friends can see your wishlist, and you can see theirs: open a friend from “Friends”.',
    captionLineSwitches: {
      'Your friends can see your wishlist, and you can see theirs: open a friend from “Friends”.': 'SOCIAL_FRIENDS_ENABLED',
    },
    keys: [
      '“Add to wishlist” turns into a counter right where you pressed it: the copies you want in all, never fewer than one more than you have.',
      'Copies in your decks count toward what you have.',
      'It stays apart from Shopping: a deck’s missing cards stay on that deck’s list.',
      'Friends see each card and how many you want, never how many you own.',
    ],
    keySwitches: {
      'Friends see each card and how many you want, never how many you own.': 'SOCIAL_FRIENDS_ENABLED',
    },
    marksPending: true,
    since: 14,
  },
  {
    // The menu and Home line's one entry (plan 2026-10-22-menu-home.md, product call 4), in `ready-to-build`'s slot so it is
    // first under Home. Drawn IN PLACE OF it while the feed is on: Ready to build leaves Home with the feed.
    id: 'whats-new',
    replaces: 'ready-to-build',
    chapter: '04',
    screen: 'home',
    frame: 'feed',
    switch: 'HOME_FEED_ENABLED',
    title: 'Home’s news, and the new bar',
    route: '/',
    caption:
      'Home opens on what’s new for you. One story leads at the top, then the decks you touched last, then the rest of What’s new:\n\n- A set that just came out\n- A precon that just came out\n- A price drop on a card on your wishlist\n- A combo you can now make with cards you own\n- A friend with a spare of a card on your wishlist\n\nNothing shows until you choose what you’d like to hear about: right on Home the first time, then in Settings, in the account menu.\n\nCommanders is one place now, with a tab for each way in:\n\n- For you: the commanders you own, ranked by fit\n- Discover: the ones worth buying\n- Help me choose: a few questions, and we pick\n\nFriends has its own spot in the bar, and a friend’s page shows their spares and decks.\n\nIn Settings, you choose how many spare copies a card needs before friends see it, and keep any card back.',
    captionLineSwitches: {
      '- A precon that just came out': 'PRECONS_ENABLED',
      // Settings' account-menu row shows with the Commanders place on; without it Settings is reached from Home's Choose what shows.
      ', in the account menu': 'COMMANDERS_PLACE_ENABLED',
      '- A price drop on a card on your wishlist': 'SOCIAL_WISHLIST_ENABLED',
      '- A friend with a spare of a card on your wishlist': ['SOCIAL_FRIENDS_ENABLED', 'SOCIAL_WISHLIST_ENABLED'],
      'Commanders is one place now, with a tab for each way in:': 'COMMANDERS_PLACE_ENABLED',
      '- For you: the commanders you own, ranked by fit': 'COMMANDERS_PLACE_ENABLED',
      '- Discover: the ones worth buying': 'COMMANDERS_PLACE_ENABLED',
      '- Help me choose: a few questions, and we pick': ['COMMANDERS_PLACE_ENABLED', 'HELP_ME_CHOOSE_ENABLED'],
      'Friends has its own spot in the bar, and a friend’s page shows their spares and decks.': ['COMMANDERS_PLACE_ENABLED', 'SOCIAL_FRIENDS_ENABLED'],
      'In Settings, you choose how many spare copies a card needs before friends see it, and keep any card back.': 'SOCIAL_FRIENDS_ENABLED',
    },
    keys: [
      'News stays in the app: a count on Home in the bar, and the list. No email, ever.',
      'News shows on Home, and as push where you turn it on. No email, ever.',
      'A story stays 14 days. Opening Home marks it seen.',
      'Old links to Discover and Help me choose land on their tabs.',
      'Friends see your deck names, commanders and statuses, never the lists.',
      'Friends can see your decks and their lists, except drafts and decks you’re building.',
    ],
    keySwitches: {
      // Push notifications (close-out, handoff A4): news also leaves the app as a push where a reader turns it on.
      'News stays in the app: a count on Home in the bar, and the list. No email, ever.': '!PUSH_ENABLED',
      'News shows on Home, and as push where you turn it on. No email, ever.': 'PUSH_ENABLED',
      'Old links to Discover and Help me choose land on their tabs.': 'COMMANDERS_PLACE_ENABLED',
      // Friend decks (close-out, READINESS 7): with the switch on, friends see the lists, so the key takes the privacy
      // line's default sentence instead.
      'Friends see your deck names, commanders and statuses, never the lists.': ['SOCIAL_FRIENDS_ENABLED', '!FRIEND_DECKS_ENABLED'],
      'Friends can see your decks and their lists, except drafts and decks you’re building.': 'FRIEND_DECKS_ENABLED',
    },
    // A switched entry is announced by its id, with no version bump (`about.ts`, above `ABOUT_VERSION`): its `since` is the
    // version current when it ships.
    since: 16,
  },
  {
    id: 'ready-to-build',
    screen: 'home',
    chapter: '02',
    title: 'Your two daily commanders',
    route: '/',
    width: 'plate',
    caption:
      'Every day, the Home page deals you two commanders you could build right now, picked from the best fits in your Collection that aren’t leading a deck of their own.',
    keys: [
      'Picks come from your top 28 commanders by fit.',
      'Each shows how many of your cards fit, and how many are in use.',
      'A new pair arrives at midnight UTC, never the same as yesterday’s.',
      'One of the two leans toward themes your decks play least.',
    ],
    since: 1,
  },
  {
    id: 'fit-score',
    screen: 'commanders',
    chapter: '02',
    title: 'How fit scores work',
    route: '/commanders',
    opens: 'opens a commander',
    width: 'plate',
    caption:
      'Every commander gets a score out of 100 for how well your Collection could build a deck around it. Most of it is how many of the commander’s most-played cards you already own. The rest checks that you have enough cards in its colors, and enough ramp, draw and removal to hold a deck together.\n\nMost-played cards come from EDHREC decklists. A brand-new or very niche commander may not have any decks yet, so it omits a Synergy score and is scored out of 40 instead of 100. A 32 there is a strong score, not a weak one.',
    keys: [
      'Synergy, 60: how many of its most-played cards you own.',
      'Roles, 25: enough ramp, draw, removal and wipes.',
      'Pool, 15: your cards in its colors, full at 200.',
    ],
    since: 1,
  },
  {
    id: 'commander-lane',
    screen: 'commanders',
    chapter: '02',
    title: 'Commanders you can build today',
    route: '/commanders',
    // A RACK figure, so it takes the full plate. `FilterRack` collapses its
    // controls behind a `Filters` sheet below the chassis stop, and at the
    // inset’s 300px that is all a reader sees — the Build from choice this
    // entry’s caption is about would be inside a sheet no specimen can open.
    width: 'plate',
    caption:
      'Every commander you own that isn’t leading a deck yet, ranked by how well your Collection fits it.\n\nDon’t want to raid your other decks? Switch the “Build from” filter from “All my cards” to “Free cards only”.',
    keys: [
      '“All my cards”: scores count everything you own.',
      '“Free cards only”: counts only copies no committed deck is holding, including any possible commanders tucked into another deck.',
      '“Printed in”: only commanders printed in the sets you pick.',
    ],
    marksPending: true,
    since: 1,
  },
  {
    id: 'discover',
    screen: 'discover',
    chapter: '02',
    title: 'Commanders worth buying',
    route: '/discover',
    width: 'plate',
    caption:
      'Discover is for the commanders you don’t own yet. It ranks them by how much of each one’s deck is already sitting in your Collection, and shows what the commander costs.\n\nEach one lists the themes it plays, starting with any your decks haven’t touched yet. Good for finding your next build and trying a mechanic you’ve never played before.',
    keys: [
      '“Best fit”, the default: ranked by how much of its deck you own.',
      '“Something new”: commanders that play themes you haven’t played yet, where you already own at least 30% of the deck.',
      '“Popularity”: the most-played commanders first.',
      '“Printed in”: only commanders printed in the sets you pick.',
    ],
    marksPending: true,
    since: 1,
  },
  {
    id: 'help-me-choose',
    screen: 'new-deck',
    chapter: '02',
    title: 'Help me choose a commander',
    route: '/decks/new/choose',
    width: 'plate',
    switch: 'HELP_ME_CHOOSE_ENABLED',
    caption:
      'Know the deck you want, but not who should lead it? Tell “Help me choose” what you’re after, and it finds commanders that fit, whether you own them or not.\n\nColors, themes, sets, a budget and a bracket narrow the list for free. Or describe the deck in your own words: how it should feel, or how it should differ from your decks. That uses a credit, and up to ten picks come first, each with a line on why.\n\nPick a commander and your answers carry over to a new deck, ready to fill from your Collection. Every run that reads your words is kept under History, and opening one again is free.',
    keys: [
      'Words in the “Anything else?” box are read against every commander your answers allow. Tag a card there with [[ and it is required: only commanders whose decks run it are suggested.',
      'Your answers always hold, so no pick falls outside them.',
      'Ask for something unlike your decks, and it compares their commanders and themes.',
      'The rest of your results follow the picks, in the usual order.',
    ],
    // The version current when it was written: an entry tied to a switch is announced by the
    // switch, and nothing bumps the version for it.
    marksPending: true,
    since: 9,
  },
  {
    id: 'role-coverage',
    screen: 'commanders',
    chapter: '02',
    title: 'What your cards already cover',
    route: '/commanders',
    opens: 'opens a commander',
    width: 'inset',
    caption:
      'Before you build, see what you’ve got to work with. Role Coverage sorts the cards you own for this commander by the job they do, and shows how far each role is from what its decks usually run.\n\nShort on ramp? That’s where mana screw starts.',
    keys: [
      'Roles: Ramp, Card Draw, Removal and Board Wipes.',
      '“1 owned, 2 short” means its decks usually run 3.',
      'Sort a role by “Most played”, or by “Availability” with free copies first.',
    ],
    marksPending: true,
    since: 1,
  },
  {
    id: 'commander-availability',
    screen: 'commanders',
    chapter: '02',
    title: 'Owned isn’t the same as free',
    route: '/commanders',
    opens: 'opens a commander',
    width: 'plate',
    caption:
      'Owning a card and being free to use it are two different things, as anyone who’s raided one deck to build another knows.\n\nOn a commander’s page, every card you own carries the same Availability note as your Collection, so you know what’s actually up for grabs.',
    keys: [
      'The owned mark only means you own it.',
      'Open a card to see which decks hold your copies.',
      'Cards you’d need to buy show their price right in the list.',
    ],
    since: 3,
  },
  {
    id: 'partners',
    screen: 'new-deck',
    chapter: '02',
    title: 'Building with two commanders',
    // The figure is the import proposal (`PartnerSlot`, state C), which only /decks/import
    // draws: Proposed is the import picker's label. /decks/new offers Add a partner alone.
    route: '/decks/import',
    opens: 'opens the commander picker after a paste',
    width: 'inset',
    caption:
      '“Partner”, “Partner with” and “Friends forever” all let two commanders share the top of the deck. Pick your first, then “Add a partner” offers the ones you own that can pair with it.\n\nTwo commanders also give the rule zero chat twice as much to talk about.',
    keys: [
      'A pair takes two of the hundred cards, so The 99 becomes The 98.',
      'Importing a pasted list? The second legend you pick arrives marked “Proposed”.',
    ],
    marksPending: true,
    since: 1,
  },

  // ---- 03 · Building the 99 -----------------------------------------------
  {
    id: 'deck-page',
    screen: 'deck',
    view: 'your-deck',
    chapter: '03',
    title: 'Everything about a deck, on one page',
    route: '/decks',
    opens: 'opens a deck',
    width: 'plate',
    caption:
      'Every deck gets a page of its own: the commander up top, how far along it is, and tabs for everything else.\n\nWhen a deck is waiting on you, a card under the header lists what to do, the next step first.\n\n“Consider” is where your commander drops hints: cards it wants that aren’t in the list yet, from your Collection first, then the ones you’d have to buy.',
    // When ANALYSIS_TAB ships on production, add “Analysis” to the tab list below (Hugh, 2026-10-06).
    keys: [
      'Tabs include “Your deck”, “Consider”, “Games”, and “Versions” once the deck is committed.',
      'The “Games” tab shows how many games you’ve logged with the deck.',
      'A basic land has − and + beside its count: press either, or type a new number.',
    ],
    marksPending: true,
    since: 1,
  },
  {
    id: 'deck-analysis',
    screen: 'deck',
    view: 'analysis',
    chapter: '03',
    title: 'Finding your deck’s bracket',
    route: '/decks',
    opens: 'opens a deck',
    width: 'plate',
    switch: 'ANALYSIS_TAB_ENABLED',
    caption:
      'Not sure where your deck lands? Press “Analyze” on a full deck’s “Analysis” tab, and The 99 reads your list against the Commander Format Panel’s bracket rules.\n\nAt either end of the scale, brackets come down to intent, so your cards might fit two brackets. A Squirrel deck with no Game Changers passes at both Exhibition and Core:\n\n- If the theme came first, it’s Exhibition.\n- If it’s built to hold its own against precons, it’s Core.\n\nThe top end works the same way: Optimized, or cEDH if you tuned it for the competitive scene. Only you know which, so you pick. Arguing about it at the table stays optional.',
    keys: [
      'A range means your cards fit two brackets. Pick the one that fits best.',
      'In the findings, every count with cards behind it opens to show them.',
      'Edit the deck and you’ll be asked if you want to “Re-analyze”.',
      'Describe the deck with the pencil beside its name. “Suggested changes” uses that description to understand what the deck is for.',
    ],
    // The fourth key names Suggested changes, not this entry's own feature (the bracket): with
    // Tuning off, nothing reads the description for that reason, so the line is dropped while
    // the rest of the entry (and the entry's own switch, the tab) draws exactly as before.
    keySwitches: {
      'Describe the deck with the pencil beside its name. “Suggested changes” uses that description to understand what the deck is for.': 'TUNING_ENABLED',
    },
    // The version current when it was written: an entry tied to a switch is announced by the
    // switch, and nothing bumps the version for it.
    marksPending: true,
    since: 9,
  },
  // Evidence benchmarks (plan `2026-10-10-evidence-benchmarks.md` PR 5, handoff
  // `addendum_evidence_benchmarks` §4a): the copy lives in `deck-benchmarks.ts` beside the block's,
  // after its /copy-review pass. It follows DECK_BENCHMARKS_ENABLED (audit rule 8), so the page
  // never describes a block nobody can see. `since: 13` is the evidence line's ONE bump. The
  // specimen is the block's phone layout (`layout="rows"`, E1) with no openers; the figure carries
  // no numerals yet, so the key draws unnumbered (`marksPending`).
  {
    ...benchmarksAboutEntry,
    // Restated, the same value: `scripts/lib/about-clear.mjs` reads the catalog's ids from this
    // file's source (`    id: '…',`), and a spread id is invisible to it.
    id: 'deck-benchmarks',
    screen: 'deck',
    view: 'analysis',
    keys: [...benchmarksAboutEntry.keys],
    switch: 'DECK_BENCHMARKS_ENABLED',
    marksPending: true,
  },
  {
    id: 'auto-fill',
    screen: 'deck',
    view: 'your-deck',
    chapter: '03',
    title: 'Building the 99 for you',
    // The canvas names /decks/new, which is where the fill is ORDERED. The
    // surface drawn below is where the rest of it is offered: the Top off
    // strip, which lives between the ledger and the decklist on a deck’s own
    // page. The route line names the page the reader is looking at.
    route: '/decks',
    opens: 'opens a deck',
    // 'inset' at the canvas, where the figure was a three-row legend. The
    // strip’s head is one baseline row on desktop and a ~300px column stacks
    // it into five lines.
    width: 'plate',
    caption:
      'Pick a commander and The 99 builds the deck for you, like a precon built from your own binder.\n\nIt starts with staples, fills from your Collection, and only reaches for cards to buy where you run short.',
    keys: [
      'Up to ten staples go in first. Cards you’d need to buy are the ones the commander’s decks play most.',
      'Slots still open? “Choose the last” lets you pick them, with cards you own preselected.',
      'The “auto” tag marks cards The 99 added for you, so you can tell them from your own picks.',
      '“Clear all auto” removes all auto-added cards, except any you’ve locked.',
    ],
    marksPending: true,
    since: 1,
  },
  {
    id: 'decklist-marks',
    screen: 'deck',
    view: 'your-deck',
    chapter: '03',
    title: 'Reading a decklist row',
    route: '/decks',
    opens: 'opens a deck',
    width: 'plate',
    caption:
      'Each row tells you, left to right:\n\n- whether you own it\n- what it is\n- how many copies the deck wants\n- whether anything’s in the way\n\nMarks after the name flag what would matter for your bracket placement: Game Changers, mass land denial, extra turns and tutors. Demonic Tutor gets two, since it’s a tutor and a Game Changer. Exhibition and Core allow no Game Changers and Upgraded allows three, so count them before the rule zero chat.',
    keys: [
      'Filled green: in your Collection. Hollow and dashed: not.',
      '“1 in a draft”, “none free” or “short” means something’s in the way. “short” also rings the row in red.',
      'A card to buy shows “$”, with its price a hover or tap away. “P” marks one you’re printing as a proxy.',
      'A bright edge marks rows you’ve changed since your last commit.',
    ],
    marksPending: true,
    since: 1,
  },
  {
    id: 'combos-one-away',
    screen: 'deck',
    view: 'your-deck',
    chapter: '03',
    title: 'Combos one piece away',
    route: '/decks',
    opens: 'opens a deck',
    width: 'plate',
    switch: 'NEAR_COMBOS_ENABLED',
    caption:
      'Some decks sit one card short of a combo. The line under the deck’s header, beside its version, counts them: “5 combos one piece away”.\n\nPress it for the list. Each combo says where its missing piece is:\n\n- A spare in your Collection\n- In another of your decks, with a link to that deck\n- To buy, with its price\n\nSay your deck runs Kiki-Jiki, Mirror Breaker and a Zealous Conscripts sits spare in your Collection. That’s one piece away, and the list says where it is.\n\nOpen a combo to see how it works, step by step, and the mana it needs. Add puts the missing piece in the deck from there.\n\nA card’s details list its combos the same way: whole in this deck first, then one piece away.',
    keys: [
      'Only two-card combos in this deck’s colors are counted.',
      'The turn-again mark is a combo that gives you extra turns.',
      'Combos, their steps and their mana come from Commander Spellbook.',
    ],
    // The version current when it ships: a switched entry is announced by its switch and bumps nothing.
    since: 16,
  },
  {
    id: 'card-marks',
    screen: 'collection',
    chapter: '03',
    title: 'Bracket marks on every card',
    route: '/collection',
    width: 'plate',
    // Tied to the tab's switch though the marks draw without it: key 3 sends the reader to the
    // Analysis tab, and with the switch off there is no tab to send them to.
    switch: 'ANALYSIS_TAB_ENABLED',
    caption:
      'A card’s bracket marks follow it everywhere: your Collection, your decklists, “Consider” and search. Game Changers, mass land denial, extra turns and tutors each get their own.\n\nRhystic Study is a Game Changer, and it starts more power-level debates than most.',
    keys: [
      'A tutor searches for more than a land. Fetching a land counts as ramp.',
      'Game Changers come from WotC’s official list. The other three we attempt to detect from card text.',
      'A card’s details spell out its marks under “Bracket facts”.',
    ],
    // The version current when it was written, as `deck-analysis` above.
    since: 9,
  },
  {
    id: 'locked-cards',
    screen: 'deck',
    view: 'your-deck',
    chapter: '03',
    title: 'Locking your favorite cards',
    route: '/decks',
    opens: 'opens a deck',
    width: 'plate',
    switch: 'NEVER_CUT_ENABLED',
    caption:
      'Lock a card and nothing in the app will offer to cut it. Your pet cards are safe with us.\n\n- “Suggested changes” won’t propose cutting it.\n- “Clear all auto” and “Pull it” skip it.\n- It gets no cheaper stand-ins.\n- “Update from a list” keeps it.\n\nIf you ever want to stop protecting it, unlock it and Swords to Plowshares it.',
    keys: [
      'Press “Lock cards” in the list’s toolbar to lock or unlock cards, then “Done”.',
      'A locked card shows a lock beside its remove button.',
      'Committing a version without the card ends its lock.',
    ],
    // The version current when it was written: an entry tied to a switch is announced by the
    // switch, and nothing bumps the version for it.
    since: 9,
  },
  {
    id: 'roles',
    screen: 'deck',
    view: 'your-deck',
    chapter: '03',
    title: 'How much ramp, draw and removal you need',
    route: '/decks',
    opens: 'opens a deck',
    width: 'plate',
    caption:
      'Most decks come up short in the same places: ramp, draw, removal, board wipes and lands. The role strip counts each one against what EDHREC decks like yours usually run.\n\nOne board wipe is a problem in a way eleven creatures rarely is. And ramp to your heart’s content: going over never counts against you.',
    keys: [
      '“12 / 10” means 12 in the deck against a target of 10.',
      'Targets come from decks with your commander, or failing that, decks in your colors.',
      '“EDHREC averages” means measured. “A common starting point” means our default.',
      'Short on a role? “consider →” jumps to cards that fill it.',
    ],
    marksPending: true,
    since: 1,
  },
  {
    id: 'informed-build',
    screen: 'deck',
    view: 'your-deck',
    chapter: '03',
    title: 'Targets that fit your commander',
    route: '/decks',
    opens: 'opens a deck',
    width: 'plate',
    caption:
      'How much ramp a deck wants depends on who leads it. A Kinnan deck runs about 20 ramp, twice the usual, and no board wipes at all. Kinnan players already knew.\n\nSo auto-fill, “Choose the last” and “Consider” all aim at what decks with your commander actually run.',
    keys: [
      'Not enough decks to measure? We fall back to 10 ramp, 10 draw, 8 removal, 3 wipes and 37 lands (36 with a partner).',
      'Lands move too: a deck that ramps hard might want 28.',
      'A target of 0 means its decks don’t run that role at all.',
    ],
    marksPending: true,
    since: 8,
  },
  {
    id: 'combo-awareness',
    screen: 'collection',
    chapter: '03',
    title: 'Spotting combos you already own',
    route: '/collection',
    opens: 'opens your collection',
    width: 'plate',
    caption:
      'Some cards do something remarkable next to one other card. Heliod, Sun-Crowned and Walking Ballista are a classic pair.\n\nOwn both halves of a combo no deck is using yet? Your Collection flags it and names the partner. While you build, cards that would complete a combo in your deck get flagged in “Consider”, “Choose the last” and search. In a deck, a card whose two-card partner is in the same deck is marked on its row.\n\nThe salt is between you and your table.',
    keys: [
      'A card’s details list every partner: this deck’s first, then ones you own, then ones to buy.',
      'Opened from a deck, a card’s details list its combos whole in that deck first, then one piece away, with where that piece is.',
      'Only two-card combos are flagged.',
      'Combos come from Commander Spellbook.',
    ],
    // Card details draw the near-combos block while combos one piece away is on (combos-close UI-3).
    keySwitches: {
      'A card’s details list every partner: this deck’s first, then ones you own, then ones to buy.': '!NEAR_COMBOS_ENABLED',
      'Opened from a deck, a card’s details list its combos whole in that deck first, then one piece away, with where that piece is.':
        'NEAR_COMBOS_ENABLED',
    },
    marksPending: true,
    since: 9,
  },
  {
    id: 'decklist-order',
    screen: 'deck',
    view: 'your-deck',
    chapter: '03',
    title: 'Sorting your decklist',
    route: '/decks',
    opens: 'opens a deck',
    // 'inset' at the canvas, where the figure was a four-row legend. It draws
    // the decklist’s own bar now, which is a full-width row on the deck page.
    width: 'plate',
    caption:
      'Your decklist sits in sections, grouped “By type” or “By role”. Pick an order and each section sorts within itself.',
    keys: [
      'Sort by “Name” or “Mana value”.',
      'On the “Shopping” filter, you can sort by “Price” too.',
    ],
    marksPending: true,
    since: 1,
  },
  {
    id: 'add-cards',
    screen: 'deck',
    view: 'your-deck',
    chapter: '03',
    title: 'Adding a card by name',
    route: '/decks',
    opens: "opens a deck’s Add panel",
    // 'inset' at the canvas, where the figure was two names and a dot each.
    // The panel’s result row is a full-width option with a meta line and an
    // availability slot, which a ~300px column cannot hold.
    width: 'plate',
    caption:
      'Know exactly what you want? Type its name in the search under the deck’s tabs. Results start from your Collection, in your commander’s colors.',
    keys: [
      'Turn off “Owned only” to search every card in your commander’s colors.',
      'Nothing you own matches? Press “Search all cards”.',
      'Each result says how many you own, or if it’s already in the deck.',
      'A card another committed deck is holding still adds, with its Availability note.',
    ],
    marksPending: true,
    since: 1,
  },
  {
    id: 'fits-your-decks',
    screen: 'card-details',
    chapter: '03',
    title: 'Find a deck for it',
    route: '/collection',
    opens: 'opens the card detail',
    width: 'plate',
    switch: 'SWAP_TOOLS_ENABLED',
    caption:
      'Pulled something great and not sure where it goes? Press “Find a deck for it” in any card’s details, and The 99 lists the decks that could use it, and why.\n\nThat binder of loose rares finally has somewhere to go.',
    keys: [
      'Decks where it completes a combo come first, then decks whose theme it fits.',
      'Each deck shows its best reason, like a combo or a theme.',
      '“Add” puts the card in that deck’s draft.',
      'Decks already running it sit at the bottom.',
    ],
    // The version current when it was written: an entry tied to a switch is announced by the
    // switch, and nothing bumps the version for it.
    since: 9,
  },
  {
    // Find a deck, with a read (handoff `design_handoff_the99_find_a_deck_read`, R2): straight after
    // `fits-your-decks`, which keeps describing the free list. Its own switch, so no ABOUT_VERSION
    // bump: a switched entry is announced when its switch turns on. Through /prose-pass, 2026-10-12.
    id: 'find-a-deck-read',
    screen: 'card-details',
    chapter: '03',
    title: 'Which deck needs it most?',
    route: '/collection',
    opens: 'opens the card detail',
    width: 'plate',
    switch: 'FIND_A_DECK_READ_ENABLED',
    caption:
      'Some cards fit a dozen of your decks on paper and really help two of them. A read takes the card through each deck’s plan and list to find those two.\n\nIt names up to five decks the card actually helps, says how in that deck’s own cards, and suggests a card it would replace. That rare from the prerelease finally gets a deck.',
    keys: [
      'Press “Which deck needs it most?” in “Find a deck for it”. It uses a credit.',
      'The credit comes back if the read fails, finds no fit or barely holds up.',
      '“Swap in” trades the card for the cut. “Add only” adds it alone. Press either again to undo.',
      'Reopening a read is free until one of your decks changes.',
    ],
    marksPending: true,
    since: 14,
  },
  {
    id: 'versions',
    screen: 'deck',
    view: 'versions',
    chapter: '03',
    title: 'Committing a deck and its versions',
    route: '/decks',
    opens: "opens a deck’s Versions tab",
    width: 'plate',
    caption:
      'Your adds and cuts wait as changes until you commit. Each commit saves a version you can look back on, handy for settling whether last month’s list was better.',
    keys: [
      'A card added to a committed deck uses your copy right away. Other decks see it once you commit.',
      'Each version shows its date, card count and average mana value.',
      'Games you log name their version, so you can see if a change helped.',
      'Open a version to see which of its new cards you own today.',
    ],
    marksPending: true,
    since: 1,
  },
  {
    id: 'shopping',
    screen: 'deck',
    view: 'shopping',
    chapter: '03',
    title: 'Your shopping list',
    route: '/decks',
    opens: 'opens a deck’s Shopping filter',
    // 'inset' at the canvas, where the figure was two legend rows. It draws
    // real Shopping-filter rows now, and a ~300px column truncated both card
    // names to `Dockside ...` and `R. —`.
    width: 'plate',
    caption:
      'Every card a deck wants that you can’t supply lands on its “Shopping” filter, priced from Mana Pool.\n\nA card you own can still show up here. If your Atraxa deck already has your only Sol Ring, your Meren deck needs another.',
    keys: [
      'Each deck’s tile shows how many cards it needs and what they cost.',
      '“To buy, all decks” on Home adds it up across every deck.',
    ],
    marksPending: true,
    since: 1,
  },
  {
    id: 'deck-tokens',
    screen: 'deck',
    view: 'your-deck',
    chapter: '03',
    title: 'The tokens your deck makes',
    route: '/decks',
    opens: 'opens a deck’s tokens',
    width: 'plate',
    switch: 'DECK_TOKENS_ENABLED',
    caption:
      'Anyone who plays Food, Treasure or Soldier makers knows the token drawer is never quite right. Your deck now lists the tokens its cards make, one row each, in a Tokens group under the last card group.\n\nOwn one? Say so, and it comes off every deck’s Shopping list. Don’t? Add it to Shopping, where tokens get their own group and never count toward what the deck needs.',
    keys: [
      'Any printing counts, so one Treasure covers every deck.',
      'Uploading your Collection reads its tokens. “I have one” marks them by hand.',
      'Open a token to see which cards make it. Its picture or name opens its card details, where you pick the printing this deck shows.',
      'On Shopping, tokens go to Mana Pool by set and number where it has one.',
    ],
    // The version current when it was written: an entry tied to a switch is announced by the
    // switch, and nothing bumps the version for it.
    marksPending: true,
    since: 14,
  },
  {
    id: 'stand-ins',
    screen: 'deck',
    view: 'shopping',
    chapter: '03',
    title: 'Cheaper stand-ins',
    route: '/decks',
    opens: 'opens a deck’s Shopping filter',
    width: 'plate',
    switch: 'SWAP_TOOLS_ENABLED',
    caption:
      'Some cards cost more than the job they do. Each deck has a price limit per card, $10 until you set your own, and anything over it gets flagged on “Shopping”.\n\nPress a flagged card’s swap button for cheaper cards, or free copies from your Collection, that do the same job. That $300 dual land has cousins that still come in untapped.',
    keys: [
      'A spell’s stand-ins keep at least one of its jobs, and say what they keep or lose.',
      'Land stand-ins sort by their mana, untapped first.',
      'Changed your mind? “Undo swap” puts the original card back.',
      'Want options for a card that isn’t flagged? Open it from “Shopping” and find its stand-ins in its details.',
    ],
    since: 9,
  },
  // The Social line, entry 3 (Social R2's last PR; addendum `design_handoff_the99_about/addendum-social-line`, approved
  // 2026-10-15): after `stand-ins` in chapter 03, since a spare opens the same modal. It follows `SOCIAL_FRIENDS_ENABLED`,
  // which gates the rows' spare glyph and the stand-ins modal's friends (#1891, #1872), so `since: 14` and no bump; the
  // `Before you buy` line needs the swap tools, and the cart line the all-decks cart. The specimen is two Shopping rows
  // and the spares-only modal's own body, drawn in place (E2, `social/spare-markers.tsx`).
  {
    id: 'friend-spares',
    screen: 'deck',
    view: 'shopping',
    switch: 'SOCIAL_FRIENDS_ENABLED',
    chapter: '03',
    title: 'When a friend has a spare',
    route: '/decks',
    opens: 'opens a deck’s Shopping filter',
    width: 'plate',
    caption:
      'Before you buy a card, check whether a friend has one sitting idle. On a deck’s “Shopping” list, a card a friend can spare gets the friends mark beside its price. Press it to see who has one, the pod they share it with, and how many.\n\nA spare is a copy none of their decks uses, drafts included. It’s view only, so the trade happens at the table.\n\nYour own spares stay private until you tick “Share my spares with this pod” on one of your pods in “Friends”.',
    keys: [
      'You only see spares from friends who share them with a pod you’re both in.',
      'When cheaper stand-ins exist too, the same window opens as “Before you buy”, friends first.',
      'A spare changes nothing: no price, no cart, and no card moves into your deck.',
      'The same mark shows on the cart for all your decks.',
    ],
    keySwitches: {
      'When cheaper stand-ins exist too, the same window opens as “Before you buy”, friends first.': 'SWAP_TOOLS_ENABLED',
      'The same mark shows on the cart for all your decks.': 'ALL_DECKS_CART_ENABLED',
    },
    // Spare requests (close-out): with requests on, the view-only sentence is false, so the entry reads this form, which
    // asks and answers instead. A variant, not line switches, so turning the switch on ANNOUNCES it (seen by
    // `friend-spares@SPARE_REQUESTS_ENABLED`) with no ABOUT_VERSION bump. The keys are the entry's own; `keySwitches`
    // still applies to them.
    variant: {
      switch: 'SPARE_REQUESTS_ENABLED',
      title: 'When a friend has a spare',
      caption:
        'Before you buy a card, check whether a friend has one sitting idle. On a deck’s “Shopping” list, a card a friend can spare gets the friends mark beside its price. Press it to see who has one, the pod they share it with, and how many.\n\nA spare is a copy none of their decks uses, drafts included. Press “Ask” beside a friend to ask for one, and they answer yes or no in “Friends”. Their answer reaches you on Home. A request with no answer lapses after 14 days, and the trade itself still happens at the table.\n\nYour own spares stay private until you tick “Share my spares with this pod” on one of your pods in “Friends”.',
      keys: [
        'You only see spares from friends who share them with a pod you’re both in.',
        'When cheaper stand-ins exist too, the same window opens as “Before you buy”, friends first.',
        'A spare changes nothing: no price, no cart, and no card moves into your deck.',
        'The same mark shows on the cart for all your decks.',
      ],
    },
    marksPending: true,
    since: 14,
  },
  // I got it (plan `2026-10-10-i-got-it.md` PR 5, handoff `design_handoff_the99_i_got_it/about-entry`):
  // after `stand-ins`, the order a card is bought in. `since: 14` is the ONE bump this launch makes,
  // shared with `deck-printings`. Its switch reads `shoppingMarkBoughtEnabled`, which is already on
  // only with COLLECTION_EDIT_ENABLED too, so the entry never describes a tag that does nothing
  // (handoff README open 1, answered without an array form). Copy through /prose-pass.
  {
    id: 'shopping-got-it',
    screen: 'deck',
    view: 'shopping',
    chapter: '03',
    title: 'Marking a card you bought',
    route: '/decks',
    opens: 'opens a deck’s Shopping filter',
    width: 'plate',
    switch: 'SHOPPING_MARK_BOUGHT_ENABLED',
    caption:
      'The cards showed up. Now comes the part nobody looks forward to: logging them.\n\nSo do it right where you shopped. Mark a card off a deck’s Shopping list with the printing and how many came, and it goes straight into your Collection. The deck counts the new copy, and the card usually drops off the list.',
    keys: [
      'Press a card’s “buy” tag, or “Bought this card?” in its details.',
      'It starts on the printing the list priced. Change it if another came.',
      'If an older deck was short too, the copy goes there first.',
      'Undo is on the receipt. After that, the change is in History.',
    ],
    marksPending: true,
    since: 14,
  },
  {
    id: 'deck-import',
    screen: 'new-deck',
    chapter: '03',
    title: 'Importing a deck, or updating one',
    route: '/decks/import',
    // 'inset' at the canvas, where the figure named three labels. It draws
    // the route’s own entry surface now — a mode toggle over a full-width
    // paste field.
    width: 'plate',
    // R4: there is NO link mode. copy/deck-import.ts:26-30 — "that mode does
    // not exist and is not being built (#282)". The doors are `Paste a list`
    // and `Upload a file` (:37-40); the phone line is "Paste it or drop a
    // file". Import reads a Moxfield CSV *export*, which is the collection
    // entry’s claim, not this one’s.
    caption:
      'Built a deck somewhere else? Bring it over. Paste a list or upload a file, and The 99 makes the deck.\n\nAlready have it here? Press “Update from a list” on the deck to bring it up to date.',
    keys: [
      'Paste Moxfield or MTGO text, or upload a CSV from ManaBox, Moxfield or Archidekt.',
      'Updating shows what the new list changes, and lets you keep cards it leaves out.',
      'A line we can’t match still comes over, flagged for you to fix.',
      // No-collection entry, an ordinary edit riding the line's bump: the tick is drawn only with its switch.
      'Own the deck you’re importing? Select “I own these cards” and its cards go into your Collection too.',
    ],
    keySwitches: {
      'Own the deck you’re importing? Select “I own these cards” and its cards go into your Collection too.': 'NO_COLLECTION_ENTRY_ENABLED',
    },
    marksPending: true,
    since: 1,
  },
  {
    id: 'review-and-commit',
    screen: 'deck',
    view: 'versions',
    chapter: '03',
    title: 'Reviewing changes before you commit',
    route: '/decks',
    opens: 'opens the review page',
    width: 'plate',
    // Design R5, with two corrections for the 2026-09-19 vocabulary ruling:
    // the caption opened "A draft becomes a version here", which now reads as
    // the versionless deck rather than the edits, and key line 3 quoted the
    // guard tag as `deck in draft`. Both are copy, so eng resolved them.
    caption:
      '“Review changes” is the last stop before a commit. It shows what your edits ask of the rest of your Collection: which cards are free, which are sleeved in another deck, and which you’d need to buy.\n\nNeed a card that’s sleeved elsewhere? “Pull it” moves your copy over and leaves the other deck a draft to sort out. Say your Kinnan deck takes Atraxa’s only Arcane Signet. She has lifelink. She’ll be fine.',
    keys: [
      'Changed your mind after “Pull it”? Open the deck you pulled from and discard its draft, and the card goes back.',
      'A card leading another deck as its commander stays with that deck.',
    ],
    marksPending: true,
    since: 7,
  },
  {
    id: 'new-deck',
    screen: 'new-deck',
    chapter: '03',
    title: 'Starting a new deck',
    route: '/decks/new',
    opens: 'opens the commander picker',
    width: 'plate',
    caption:
      'Pick a commander you own, give the deck a name, and that’s it. The 99 fills in the rest.\n\nA commander with partner gets a second slot with only legal pairs, like Tymna and Thrasios. Your pod has been warned.',
    keys: [
      'The list shows every commander you own and can legally build.',
      'The number beside each is how many of your cards fit its colors.',
      'Starting from a commander’s page skips the list and brings your synergy picks along.',
    ],
    since: 7,
  },
  {
    id: 'precons',
    screen: 'new-deck',
    chapter: '03',
    title: 'Starting from a precon',
    route: '/decks/precons',
    opens: 'opens the precon list',
    width: 'plate',
    switch: 'PRECONS_ENABLED',
    // R3's sentence (no-collection entry): the way in is the Add cards sheet's row, drawn only with the line's switch.
    captionLineSwitches: {
      'Own a few boxes and don’t want decks from them yet? Press Add cards in your Collection, then Pick them, and they’re added without starting anything.':
        'NO_COLLECTION_ENTRY_ENABLED',
    },
    caption:
      'Every Commander precon, from the first boxes in 2011 to the newest, is listed on Decks under Commander precons. Each shows its commander’s card and how many of its cards are already in your Collection. A Collector’s Edition with the same cards is listed once, under the plain edition, and its page switches between the two to show each edition’s own printings.\n\nOpen one to read its list, group by group, as rows or as cards. Say you own 74 of Eldrazi Unbound’s 85: start a deck from it and you get the whole list, in the box’s printings. Own the box? Select “I own this precon” when you start, and its cards and tokens go into your collection too.\nOwn a few boxes and don’t want decks from them yet? Press Add cards in your Collection, then Pick them, and they’re added without starting anything.\n\nUpgrading a precon is how a lot of Commander decks begin.',
    keys: [
      'Any printing counts, as everywhere else. Basic lands are left out of the count.',
      'If one of your decks shares much of a precon’s list, the precon names it and counts what you share.',
      'Link a deck to the precon it came from, and its Versions start at v0, the box’s own list. Nothing in the deck changes.',
      'Precon decklists come from MTGJSON, under the MIT license. Copyright (c) 2018 - Present, Zach Halpern.',
    ],
    // The version current when it was written: an entry tied to a switch is announced by the
    // switch, and nothing bumps the version for it.
    marksPending: true,
    since: 14,
  },
  {
    id: 'upcoming-precons',
    screen: 'new-deck',
    chapter: '03',
    title: 'Commander sets on the way',
    route: '/decks/precons',
    opens: 'opens the precon list',
    width: 'plate',
    switch: 'UPCOMING_PRECONS_ENABLED',
    caption:
      'When a Commander set is announced, Commander precons lists it under Announced, above this year’s decklists, with its release date and every commander revealed so far. Its decks aren’t listed yet, so there’s nothing to own or start a deck from.\n\nWhen a set is announced, or its decklists arrive, Home says so once, under the header. Close it, or open Commander precons, and it won’t show again on any of your devices.',
    keys: [
      'A revealed commander is a legendary creature from the set. Until the decks are listed, nothing says which deck it leads.',
      'Dates are release days. A set that’s out stays under Announced until its decklists arrive.',
      'When they arrive, the set’s precons join the list, marked new for two weeks.',
    ],
    // The version current when it was written: an entry tied to a switch is announced by the
    // switch, and nothing bumps the version for it.
    marksPending: true,
    since: 14,
  },
  {
    id: 'change-commander',
    screen: 'deck',
    view: 'your-deck',
    chapter: '03',
    title: 'A new commander for the same 99',
    route: '/decks',
    opens: 'opens a deck',
    width: 'plate',
    switch: 'CHANGE_COMMANDER_ENABLED',
    caption:
      'Love the 99 but not the leader? “Change commander”, on the commander’s art, suggests commanders in the same colors that already play most of your list.\n\nOn a Korvold deck, “41 of 72 are in its decks” beside Prossh means Prossh players already run most of your cards.',
    keys: [
      'Every option shares your deck’s exact colors, so nothing in the 99 has to change.',
      'Press the “41 of 72” count to see which of your cards that commander’s decks run.',
      'Pick one that’s already in the 99 and it swaps places with your old commander.',
      'Changed your mind? “Discard” puts the old commander back.',
    ],
    // The version current when it was written: an entry tied to a switch is announced by the
    // switch, and nothing bumps the version for it.
    marksPending: true,
    since: 9,
  },
  {
    id: 'undo-removal',
    screen: 'deck',
    view: 'your-deck',
    chapter: '03',
    title: 'Putting a card back',
    route: '/decks',
    opens: 'opens a deck',
    // 'inset' at the canvas, where the figure was three legend rows. It draws
    // decklist rows now, which are full-width.
    width: 'plate',
    // R4: the specimen is the DECK PAGE control — `Rhystic Study removed` +
    // `Undo` (decks-builder.ts, undo.removed / undo.action). The review
    // screen’s `Put back` (deck-versioning.ts:249) is a second door and is
    // named in the caption rather than drawn. R3 drew one wearing the other.
    caption:
      'Cut a card by mistake? Its row turns into an “Undo” that names it: “Rhystic Study removed”. Your table may be hoping you leave that one out.\n\n“Undo” puts everything back the way it was.',
    keys: [
      'Cut several and each keeps its own “Undo”.',
      '“Undo” disappears once you leave the page. Until you commit, “Put back” on “Review changes” still brings the card back.',
    ],
    marksPending: true,
    since: 1,
  },
  {
    id: 'export',
    screen: 'deck',
    view: 'your-deck',
    chapter: '03',
    title: 'Exporting your deck, or buying what’s missing',
    route: '/decks',
    opens: 'opens the export dialog',
    width: 'plate',
    // R4: the tabs are `Decklist` and `Shopping list` (export-dialog.tsx:2,52);
    // the primary is `Copy to clipboard`, swapping to `Copied ✓` for 1.5s
    // (export-copy-button.tsx:72); the secondary is `Download .txt`
    // (export-dialog.tsx:561). `Buy these at Mana Pool` was already right
    // (decks-builder.ts:472).
    caption:
      'Take your list anywhere as plain text.\n\nOr send just the cards you need to buy straight to Mana Pool, and check out there.',
    keys: [
      '“Copy to clipboard” or “Download .txt” for the full list.',
      'The “Shopping list” tab holds only what this deck needs to buy.',
      '“Buy these at Mana Pool” opens that list in a new tab.',
    ],
    since: 1,
  },
  // Deck printings (plan `2026-10-10-deck-printings.md`, written in I got it's PR 5 with its bump,
  // handoff `design_handoff_the99_deck_printings/about-entry`): after `export`, where printings come
  // in and go out. Copy through /prose-pass.
  {
    id: 'deck-printings',
    screen: 'deck',
    view: 'your-deck',
    chapter: '03',
    title: 'Choosing a printing for a deck',
    route: '/decks',
    opens: 'opens a card from a deck',
    width: 'plate',
    switch: 'DECK_PRINTINGS_ENABLED',
    caption:
      'Own three Sol Rings? Your cEDH deck can run the borderless one while your Goblins deck keeps the one that came in its precon.\n\nPick a printing for a card in one deck, and that deck shows it, prices it and exports it. Your other decks keep their own.',
    keys: [
      'Open a card from the deck and choose under “Set”.',
      'A deck with no pick shows your Collection’s printing.',
      'Picking isn’t a deck change, so there’s nothing to commit.',
      'Import a list that names a printing you own, and it’s picked.',
    ],
    marksPending: true,
    since: 14,
  },

  // ---- 04 · Playing and tuning --------------------------------------------
  {
    id: 'log-a-game',
    screen: 'deck',
    view: 'games',
    chapter: '04',
    title: 'Logging a game',
    route: '/decks',
    opens: "opens a deck’s Games tab",
    width: 'plate',
    caption:
      'Logging a game takes about fifteen seconds: the result, the pod size, and the two or three things that decided it.\n\nGot mana screwed? Mark “Mana” under “What let me down”, and it’s on the record. “Suggested changes” reads your games the next time it runs.',
    keys: [
      '“What worked” and “What let me down” offer the same eight options.',
      'Your history shows the pod size beside each game.',
      'Add a note with what happened. The more detail you give, the better “Suggested changes” can tune the deck.',
    ],
    since: 1,
  },
  {
    id: 'log-findings',
    screen: 'deck',
    view: 'games',
    chapter: '04',
    title: 'What your games are telling you',
    route: '/decks',
    opens: "opens a deck’s Games tab",
    width: 'plate',
    caption:
      'The more games you log, the more the “Games” tab has to say. After a few, it starts spotting patterns, like “Mana is letting this deck down.”',
    keys: [
      'One game is a note, two a leaning, three a finding.',
      'Your marks sort into “Fix” and “Keep”.',
      'Anything marked both ways equally goes under “Mixed”.',
    ],
    marksPending: true,
    since: 1,
  },
  // The Social line (Social R3 PR 5; addendum `design_handoff_the99_about/addendum-social-line`, approved 2026-10-15). Each
  // follows its own switch, so both are `since: 14` and bump nothing; the specimens are the shipped PodCard and GameMatchups.
  {
    id: 'friends',
    screen: 'friends',
    switch: 'SOCIAL_FRIENDS_ENABLED',
    chapter: '04',
    title: 'Friends and pods',
    route: '/friends',
    width: 'plate',
    // Launch-end batch (E4): with invites on, Add a friend opens a chooser, so the link path names its choice.
    // With the Commanders place on, Friends has its own slot in the bar (menu and Home PR 2): the sentence names the bar, not the account menu.
    // With the signature card on (handoff 20), the face is any card in any printing, so the face sentence's opening swaps.
    captionLineSwitches: {
      ' pick “They’re on The 99”,': 'SOCIAL_INVITES_ENABLED',
      'Open “Friends” from your account menu, ': '!COMMANDERS_PLACE_ENABLED',
      'Press “Friends” in the bar, ': 'COMMANDERS_PLACE_ENABLED',
      'commander and ': '!SIGNATURE_CARD_ENABLED',
      'signature card, any card in any printing, and ': 'SIGNATURE_CARD_ENABLED',
    },
    caption:
      'Playing with the same people every week? Make them friends in The 99. Open “Friends” from your account menu, Press “Friends” in the bar, press “Add a friend”, pick “They’re on The 99”, and send them the link, or let them scan the QR code off your screen. Once they accept, you’re friends.\n\nPick a commander and signature card, any card in any printing, and its art becomes your face, beside your name everywhere a friend sees you. Then gather the friends you play with into a pod, and choose, pod by pod, who gets to see your spare cards.',
    keys: [
      'Nobody can find you by searching. A friend link works once and lasts 7 days, and you can revoke one that’s still open.',
      'Friends see your name and your commander, never what you own. Your spares show only to the pods you share them with.',
      'Friends see your name, your commander and the decks you let them open, never your collection. Your spares show only to the pods you share them with.',
      'Friends see your name and your signature card, never what you own. Your spares show only to the pods you share them with.',
      'Friends see your name, your signature card and the decks you let them open, never your collection. Your spares show only to the pods you share them with.',
      'You add your own friends to your pods. Leave one you own and it passes to its longest-standing member.',
      'Removing a friend or leaving a pod tells nobody.',
    ],
    // Friend decks (addendum `design_handoff_the99_about/addendum-friend-decks`): with the switch on, friends see the
    // decks a player lets them open, so key 2 swaps for its sentence. The signature card (handoff 20, call 1) names the
    // face a signature card. Four forms, one drawn.
    keySwitches: {
      'Friends see your name and your commander, never what you own. Your spares show only to the pods you share them with.': ['!FRIEND_DECKS_ENABLED', '!SIGNATURE_CARD_ENABLED'],
      'Friends see your name, your commander and the decks you let them open, never your collection. Your spares show only to the pods you share them with.': ['FRIEND_DECKS_ENABLED', '!SIGNATURE_CARD_ENABLED'],
      'Friends see your name and your signature card, never what you own. Your spares show only to the pods you share them with.': ['!FRIEND_DECKS_ENABLED', 'SIGNATURE_CARD_ENABLED'],
      'Friends see your name, your signature card and the decks you let them open, never your collection. Your spares show only to the pods you share them with.': ['FRIEND_DECKS_ENABLED', 'SIGNATURE_CARD_ENABLED'],
    },
    marksPending: true,
    since: 14,
  },
  // Friend decks (addendum `design_handoff_the99_about/addendum-friend-decks`, approved 2026-10-23; the line's handoff
  // `design_handoff_the99_friend_decks`, READINESS G6 deferred its entry here). Switched, so no bump: `since` is the version
  // current when it ships. Its halo is the /friends privacy line, `[data-decks-seen]`.
  {
    id: 'friend-decks',
    screen: 'friends',
    switch: 'FRIEND_DECKS_ENABLED',
    chapter: '04',
    title: 'Your friends’ decks',
    route: '/friends',
    caption:
      'On a friend’s page, press any deck under “Decks” to see its whole list, read-only: the commander, every card by type, and a dot on each card you own yourself. Press a card for its details, and add it to your wishlist from there.\n\nYour decks open for friends the same way. Out of the box they see a deck once its list is full and committed, never your drafts or the decks you’re still building. In Settings, under “Your decks”:\n\n- Friends can see my decks: turn it off and they see none\n- Include drafts and decks I’m building: turn it on and they see them all\n\nTo keep one deck to yourself, tick “Hidden from friends” in its ⋯ menu.\n\nLogging a game with a friend? Their decks are listed when you seat them. If the one they played isn’t, pick “A deck not listed”: they’re seated by name, with no deck. A game already logged keeps the deck it named, even if it’s hidden later.',
    captionLineSwitches: {
      ', and add it to your wishlist from there': 'SOCIAL_WISHLIST_ENABLED',
      'Logging a game with a friend? Their decks are listed when you seat them. If the one they played isn’t, pick “A deck not listed”: they’re seated by name, with no deck. A game already logged keeps the deck it named, even if it’s hidden later.': 'SOCIAL_GAMES_ENABLED',
    },
    keys: [
      'Friends never see a deck’s prices, what it still needs to buy, or its notes.',
      'A hidden deck has no tile, and its link stops working, the same as a deleted deck’s.',
      'Hiding a deck never changes your spares: its cards still count as in use.',
      '“A deck not listed” shows for every friend, so it never gives away a hidden deck.',
    ],
    keySwitches: {
      '“A deck not listed” shows for every friend, so it never gives away a hidden deck.': 'SOCIAL_GAMES_ENABLED',
    },
    since: 16,
  },
  {
    id: 'invites',
    screen: 'friends',
    switch: 'SOCIAL_INVITES_ENABLED',
    chapter: '04',
    title: 'Inviting someone new',
    route: '/friends',
    opens: 'opens Add a friend',
    caption:
      'The 99 is invite-only, so new players arrive through the people already in it. On Friends, press “Add a friend”, then “Invite someone new”. At the table, show an invite QR: they scan it, type their own email, and confirm it with a code. Or type their email here, and The 99 sends the invitation.\n\nOnce they make their account, you’re friends. Adding someone who already plays? Pick “They’re on The 99” and send a friend link: it works once and uses no invite.',
    keys: [
      'An invite is used only when someone makes an account. One that isn’t used within 7 days comes back.',
      'An invite QR holds one invite for its 15 minutes, and gives it back if nobody uses it.',
      'Whatever the email, you’re told “Invitation sent”, so nobody can use an invite to find out who’s on The 99.',
      'How many you have left shows under “Add a friend”. Invites are given out by The 99, not bought.',
    ],
    since: 16,
  },
  {
    id: 'rule-zero',
    screen: 'friends',
    switch: 'RULE_ZERO_ENABLED',
    chapter: '04',
    title: 'Checking tonight’s table',
    route: '/friends',
    opens: 'from a pod’s “Rule 0 check”',
    caption:
      'The Rule 0 check puts tonight’s decks side by side before anyone shuffles. One of you seats the players from a pod and picks the decks for yourself and your friends. Everyone seated sees the same table, and it waits for them on Home.\n\nEach complete deck lands on the five brackets, measured from the middle of the table. A deck a bracket or more away is flagged above or below, with what puts it there, like a two-card combo it can tutor for or one Game Changer too many. Better to know now than on turn four.\n\nFlagged? We’ll show you a few of your own decks that sit closer, and a swap shows up for everyone at the table. The bracket is read from each list, so a flag is where the conversation starts.\n\nAfter the game, log it from the table and the seats come filled in. Anyone who isn’t your friend comes in by name and commander, marked “from the table”.',
    // The whole last paragraph is ONE line, so its removal leaves no stray break (brief Draft vs code 10).
    captionLineSwitches: {
      'After the game, log it from the table and the seats come filled in. Anyone who isn’t your friend comes in by name and commander, marked “from the table”.': 'SOCIAL_GAMES_ENABLED',
    },
    keys: [
      'Start one from a pod’s “Rule 0 check”, for 2 to 8 players.',
      'When you set the table, friends’ decks are listed. Anyone else picks their own.',
      '“Swap in” or “Change deck” changes yours. “Undo” changes it back.',
      'A table closes 24 hours after it’s set. Its logged games stay.',
    ],
    since: 16,
  },
  {
    id: 'opponents',
    screen: 'deck',
    view: 'games',
    switch: 'SOCIAL_GAMES_ENABLED',
    chapter: '04',
    title: 'Who you played against',
    route: '/decks',
    opens: 'opens a deck’s Games tab',
    width: 'plate',
    caption:
      'When you log a game, “Across the table” lets you seat who you played: a friend, one of their decks, or anyone by their commander. Lost? Mark who won.\n\nOnce a few games carry names, “Matchups” on the deck’s “Games” tab splits your record by commander, colors and friend, and each game in “History” says who was there.',
    keys: [
      'Seats are optional. A game with nobody seated counts as it always has.',
      'Each square is one game, won, lost or drawn. No percentages, so one game reads as one game.',
      'A seat keeps names and decks as they were that night, even if a friend renames a deck or leaves.',
      'A seat keeps names and decks as they were that night, even if a friend renames or hides a deck, or leaves.',
      '“Seat a pod” sits a whole pod at once.',
    ],
    // Friend decks: with the switch on a friend can hide a deck too, so key 3 swaps for the sentence that says so.
    keySwitches: {
      'A seat keeps names and decks as they were that night, even if a friend renames a deck or leaves.': '!FRIEND_DECKS_ENABLED',
      'A seat keeps names and decks as they were that night, even if a friend renames or hides a deck, or leaves.': 'FRIEND_DECKS_ENABLED',
    },
    marksPending: true,
    since: 14,
  },
  {
    id: 'suggested-changes',
    screen: 'deck',
    view: 'analysis',
    chapter: '04',
    title: 'Tuning a deck with Suggested changes',
    route: '/decks',
    opens: "opens a deck’s Analysis tab",
    width: 'plate',
    // 2026-10-08 (see the header comment above): Tuning decoupled from the Analysis tab, so this
    // draws only while ITS OWN flag is on, never only the tab's.
    switch: 'TUNING_ENABLED',
    caption:
      'Want a second opinion? “Suggested changes”, at the bottom of the “Analysis” tab, offers up to five cards to add and five to cut, each with its own reason.\n\nTell it what the deck is for: describe your Meren deck as slow graveyard value for casual tables, cap cards at $5, ask for more removal, and the suggestions come back as cheap removal you already own.',
    keys: [
      'Limits set the most a card can cost, which sets adds come from, and whether they come only from your Collection.',
      'Each run uses a credit.',
      'Every run is kept in History, under Tuning. Open one and its changes come back, each checked against the deck as it is now.',
      'It aims at the deck’s focus when one is picked.',
    ],
    // History lives in the Tuning hub, which draws only with a second tool on.
    keySwitches: {
      'Every run is kept in History, under Tuning. Open one and its changes come back, each checked against the deck as it is now.': 'TUNING_HUB_ENABLED',
      // The focus line follows the strategy ring's switch (strategy focus close-out).
      'It aims at the deck’s focus when one is picked.': 'STRATEGY_FOCUS_ENABLED',
    },
    marksPending: true,
    since: 10,
  },
  {
    id: 'proposed-cuts',
    screen: 'deck',
    view: 'analysis',
    chapter: '04',
    title: 'Cutting back to 99 with Proposed cuts',
    route: '/decks',
    opens: 'opens a deck’s Analysis tab',
    width: 'plate',
    // 2026-10-15 (`design_handoff_the99_proposed_cuts_about`, R1, approved): follows PROPOSED_CUTS_ENABLED,
    // so turning the tool on is what announces it. NO BUMP, as `mana-balance` and `deck-tokens`: a switched
    // entry is seen by its id, and `since` is the current version. Caption and keys are placeholders owed to
    // /copy-review. The specimen is the panel's own free count (`CutsFreeCount`) from HD - Zombies.
    switch: 'PROPOSED_CUTS_ENABLED',
    caption:
      'Deck over 100 cards? Proposed cuts, on a deck’s Analysis tab, counts what runs long against the decks EDHREC holds for your commander: roles past their recommended count, the fullest steps of the curve, cards few of those decks run, and anything the bracket you declared doesn’t allow. The count is free, and it names no card.\n\n' +
      'Look deeper names the cards: as many as the deck is over, in batches when it’s far over, each with a one-line reason. Cut or Keep each one, and when the deck is back to 99 the tool closes.\n\n' +
      'When a deck is over, its header says so, with a Proposed cuts press that opens the tool. Every run is kept in History, under Tuning, and reopening one checks each cut against the deck as it is now.',
    // The trim line's Proposed cuts press and History both draw only with the Tuning hub on.
    captionLineSwitches: {
      'When a deck is over, its header says so, with a Proposed cuts press that opens the tool. Every run is kept in History, under Tuning, and reopening one checks each cut against the deck as it is now.': 'TUNING_HUB_ENABLED',
    },
    keys: [
      'The count is free. Look deeper uses a credit, and a run that names nothing or doesn’t finish gives it back.',
      'It never names your commander, a card you locked or a Key card.',
      'Every reason is checked against the deck. One that doesn’t hold is swapped for a plain note, with only the figures that do.',
      'Cut changes the list straight away, and Undo puts the card back.',
    ],
    marksPending: true,
    since: 14,
  },
  {
    id: 'mana-balance',
    screen: 'deck',
    view: 'analysis',
    chapter: '04',
    title: 'Reading your deck’s mana',
    route: '/decks',
    opens: 'opens a deck’s Analysis tab',
    width: 'plate',
    // 2026-10-11 (Tuning line close-out; R3 M10 in `design_handoff_the99_tuning_hub/mana-balance R3 ·
    // copy strings.ts`): follows MANA_BALANCE_ENABLED, so turning the tool on is what announces it.
    // NO BUMP, as `deck-stats`: a switched entry is seen by its id, and `since` is the current version.
    switch: 'MANA_BALANCE_ENABLED',
    caption:
      'Wondering whether your deck can cast what it asks for? Mana Balance, under Tuning on a deck’s Analysis tab, puts each color’s pips beside its sources, counted the same way as the Mana colors card, with what each color’s tightest cost needs alongside.\n\nIt won’t tell you a color is short. That call depends on how the deck plays, so the figures sit side by side and you decide. Want help? Improve my mana lists your colors, tightest first. Pick one to see basics that could swap to it and staples your commander’s decks run, the ones you own first.\n\nA staple can come with a trade, and the trade names the card that goes out: one Proposed cuts or Suggested changes already picked, a land that makes none of your colors, or a basic from the color with the most to spare. A land only goes when the deck has more than recommended, or a land takes its place.\n\nEach color you pick is kept in History too. Reopen it and each trade is checked against today’s deck.',
    // History lives in the Tuning hub, which draws only with a second tool on.
    captionLineSwitches: {
      'Each color you pick is kept in History too. Reopen it and each trade is checked against today’s deck.': 'TUNING_HUB_ENABLED',
    },
    keys: [
      'Pips count the commander, as the Mana colors card does.',
      'Needs is Frank Karsten’s figure: the sources a 99-card deck needs to cast a cost on curve about 9 times in 10.',
      'Improve my mana only offers your commander’s colors, and nothing is picked for you.',
      'Karsten’s figures come from his 2022 article on TCGplayer. They’re a reference point, not a target.',
    ],
    marksPending: true,
    since: 14,
  },
  {
    id: 'deck-focus',
    screen: 'deck',
    view: 'analysis',
    chapter: '04',
    title: 'Giving a deck a focus',
    route: '/decks',
    opens: 'opens a deck’s Analysis tab',
    width: 'plate',
    // 2026-10-22 (strategy focus close-out, `design_handoff_the99_strategy_focus/about · giving a deck a focus.ts`):
    // follows STRATEGY_FOCUS_ENABLED, so turning the ring on is what announces it. NO BUMP, as `mana-balance`: a switched
    // entry is seen by its id, and `since` is the current version. The handoff asked for the launch-end bump; the code's
    // rule (`ABOUT_VERSION`'s header) is that a switched entry bumps nothing, and d9 ruled to follow it.
    switch: 'STRATEGY_FOCUS_ENABLED',
    caption:
      'What is this deck about? On “Analysis”, “The deck’s strategy” rings up to five strategies the list leans on more than the Commander card pool does overall: a creature type, a theme like Tokens, or a card type. Pick one as the deck’s focus, and its icon takes the middle of the ring.\n\nWith a focus picked, “Suggested changes” aims at it: most of its additions count toward the focus, and each shows the count it moves. Add one and its arc grows.',
    // The Suggested changes paragraph and its credit line need Tuning as well: the ring needs only Analysis
    // (review round 1).
    captionLineSwitches: {
      'With a focus picked, “Suggested changes” aims at it: most of its additions count toward the focus, and each shows the count it moves. Add one and its arc grows.': 'TUNING_ENABLED',
    },
    keySwitches: {
      '“Suggested changes” uses a credit, as it always has.': 'TUNING_ENABLED',
    },
    keys: [
      'The ring and the focus are free.',
      '“Suggested changes” uses a credit, as it always has.',
      '“Keep it balanced” clears the focus.',
      'Lands aren’t counted, so a landfall deck reads its payoffs, not its lands.',
    ],
    marksPending: true,
    since: 16,
  },
  {
    id: 'deck-stats',
    screen: 'deck',
    view: 'stats',
    chapter: '04',
    title: 'Stats: the deck, drawn',
    route: '/decks',
    opens: 'opens a deck’s Your deck tab, on Stats',
    width: 'plate',
    // 2026-10-10 (Deck stats PR 9, `design_handoff_the99_deck_stats_view/ABOUT-entry.md`): follows
    // DECK_STATS_ENABLED, so turning the Stats view on is what announces it. The handoff's last
    // caption sentence ("Where Analysis has a finding about a figure, a link takes you to it.") is
    // dropped: PR 8 (finding links) was not built, since no Analysis finding concerns a Stats figure.
    // Revive the sentence only if evidence benchmarks give Analysis such findings and the links ship.
    // NO BUMP (the handoff's own caveat: "drop the bump or ship the switch on"): the switch is off on
    // production, and a bump there would redirect every account to /about with nothing new to show
    // (`proxy.ts` decides on the version before it knows which entries the switches hide). So the
    // entry is `since: 11`, the current version, announced by its switch like `deck-analysis`.
    switch: 'DECK_STATS_ENABLED',
    caption:
      'Every deck has two views: the list, and Stats. Stats draws the list, your Collection and your logged games as six cards:\n\n- The curve, by card type. Tap a type to light its cards.\n- The colors your costs ask for, against the colors your lands and other mana sources make.\n- Jobs: how many cards ramp, draw, remove, wipe the board, protect or win.\n- How the deck compares with the average deck for its commander.\n- What the deck is worth, and what is left to buy.\n- Your logged games, overall and by version.\n\nOn a Meren deck, the colors card sets the black and green pips you need against the sources that make them. Counting them now beats finding out through mana screw.',
    keys: [
      'Stats draws whether or not the deck has been analyzed, and never uses a credit.',
      'Land sources count the colors a land can add. Other mana sources are counted too, by the colors their text names.',
      'Games with no version on record, from before versioning or from a version since deleted, sit together under “Version not recorded”.',
    ],
    marksPending: true,
    since: 11,
  },
  // Stats on /decks (handoff `design_handoff_the99_lineup`, R2, `about · lineup.ts`): follows LINEUP_ENABLED,
  // so turning Stats on is what announces it, by id. No bump: `since` is the version current at merge, the
  // deck-stats precedent. Caption through /prose-pass (2026-10-12); the title to /copy-review.
  {
    id: 'decks-stats',
    screen: 'decks',
    chapter: '04',
    title: 'Stats: your decks, side by side',
    route: '/decks',
    opens: 'opens Decks, on Stats',
    width: 'plate',
    switch: 'LINEUP_ENABLED',
    caption:
      'Somewhere around deck twenty it gets hard to say which one hasn’t left the box since July, or how many are fighting over the same Sol Ring. Stats on Decks puts every deck side by side.\n\nYou see when each last played, where they sit by bracket and color, the cards they share, and how much of your Collection they put to work. Pick a deck to see how it stacks up against the rest, from its ramp and removal to what it’s worth.\n\nYour Collection gets its own say, too: the cards you own that sit in no deck, though your commanders’ decks run them. Each copy counts once, however many decks play the card.',
    keys: [
      'Never-played decks always show, together in their own group.',
      'Results are as logged, with each game’s pod size.',
      '“Finished only” leaves brews out. Your Collection still counts every copy.',
      'A tile’s “…” menu has “See it among your decks”.',
    ],
    marksPending: true,
    since: 14,
  },
  {
    id: 'notes',
    screen: 'deck',
    view: 'notes',
    chapter: '04',
    title: 'Notes on a deck',
    route: '/decks',
    opens: 'opens a deck’s Your deck tab, on Notes',
    width: 'plate',
    // 2026-10-12 (Deck notes PR 3, `design_handoff_the99_deck_notes/about-notes.ts`): follows
    // DECK_NOTES_ENABLED, so turning Notes on is what announces it. NO BUMP, as `deck-stats`: a
    // switched entry is seen by its id, and `since` is the current version. It sits after Stats,
    // because Notes sits beside Stats in Your deck. Copy through /prose-pass.
    switch: 'DECK_NOTES_ENABLED',
    caption:
      'Every deck keeps a short list of notes, under Notes in Your deck, next to Stats. One line each, newest first, dated when you add it.\n\nType [[ or press [[ ]] and start a card’s name to tag it. The deck’s own cards come first, then any card, and a tagged name opens that card. Say you want to try Laboratory Maniac beside Thassa’s Oracle: write it down with both tagged, and it waits for you.\n\nSelect a note when it’s done and it folds under Done. Edit or delete any of them. Notes belong to the deck, not a version, so they carry over when you commit.\n\nTagging works in other boxes too, such as “Anything else?” in Help me choose, “Additional notes” in Suggested changes, a deck’s description and the note on a game you log.',
    keys: [
      'A solid underline means the deck holds the card. Dashed means it doesn’t, including a card you’ve since taken out.',
      'One line is 140 characters, and a tag counts as its name.',
      'A deck keeps up to 100 notes, done ones included.',
      'Notes are yours only. Suggested changes and the analysis don’t read them.',
    ],
    marksPending: true,
    since: 14,
  },
  {
    id: 'credits',
    // Launch-end batch (option b, 2026-10-21): this form stays for a reader without payments, whose /credits is a 404.
    // With payments on, `buying-credits` below is drawn in its place (`replaces`). Still seen by `since`.
    screen: 'deck',
    view: 'analysis',
    chapter: '04',
    title: 'How credits work',
    route: '/decks',
    opens: "opens a deck’s Analysis tab",
    // 'inset': the figure is two lines of the credit line, narrow enough to sit beside its text.
    width: 'inset',
    // Hugh, 2026-10-05: credits get ONE entry of their own, and every other entry says only that
    // an action "uses a credit". Every spender is a `ModelFeature` (`allowance-rule.ts`): the
    // Overview (`synopsis`), Suggested changes (`tuning`) and Help me choose's read (`intake`). Each refund
    // rule is its own: `chargeFor` (all four sections), `tuning-actions.ts` (zero swaps kept
    // fails the run), `settleTheRead` in `run-store.ts` for intake (at least one valid pick). NO switch. It shipped at
    // `since: 10` with no bump; Hugh then ruled (2026-10-06) that it is announced, so it moved to
    // `since: 11` with the ABOUT_VERSION bump that ends the second prose pass.
    // "You get {allowance}" is the READER'S own limit (`dailyLimitFor`), filled at render by
    // `fillAllowance` (admin PR 9c, 2026-10-13, a copy edit, no bump); it was the friend's fixed five.
    // The owner's monthly testing share is left out on purpose: Hugh, 2026-10-06, "friends only".
    caption:
      'Some features write something just for you, and those use credits. You get {allowance}, and each one comes back 24 hours after you use it.\n\nThe following use a credit:\n\n- Writing a deck’s Overview\n- Each “Suggested changes” run\n- Each “Look deeper” in Proposed cuts\n- Each new “Help me choose” search where you fill in “Anything else?”\n- Each “Which deck needs it most?” read\n\nDetermining your deck’s bracket is free.\nOpening a past “Help me choose” run from History is free.',
    // 2026-10-08: the second bullet names Suggested changes, which Tuning can now withhold while
    // the Overview and Help me choose still spend credits — so, unlike the rest of this entry
    // (which carries no switch), that one line does.
    captionLineSwitches: {
      // 2026-10-17 (discovery R2·5, plan decision 3): the Overview is written only with the Analysis tab on
      // (`synopsis-actions.ts` refuses otherwise), so its line follows that switch. An ordinary edit, no bump.
      '- Writing a deck’s Overview': 'ANALYSIS_TAB_ENABLED',
      '- Each “Suggested changes” run': 'TUNING_ENABLED',
      // The read spends only with Help me choose on; the bullet names it, so it follows that switch.
      '- Each new “Help me choose” search where you fill in “Anything else?”': 'HELP_ME_CHOOSE_ENABLED',
      // 2026-10-12 (Find a deck read, UI-3): the credit lines link here rather than list (Hugh), so the
      // list names every spender, each line behind its own feature's switch. An ordinary edit, no bump.
      '- Each “Look deeper” in Proposed cuts': 'PROPOSED_CUTS_ENABLED',
      '- Each “Which deck needs it most?” read': 'FIND_A_DECK_READ_ENABLED',
      // 2026-10-14 (Help me choose history): an ordinary edit, no bump.
      'Opening a past “Help me choose” run from History is free.': 'HELP_ME_CHOOSE_ENABLED',
    },
    keys: [
      'A run that comes back empty-handed or doesn’t finish gives the credit back.',
      'Next to each button that uses a credit, you’ll see how many you have left and when the next one comes back.',
      'If we change how overviews are written, rewriting one written the old way is free, once per deck.',
      'An Overview settles the deck’s main plan first, with any backups, then writes around it. In the full Overview, “Based on” under a claim lists the cards it’s about, and each one opens like any card.',
    ],
    // 2026-10-10 (overview accuracy, PR 5): an ORDINARY EDIT to this entry, no bump (plan 7.4, 8): the
    // free rewrite is not a new capability. It follows `OVERVIEW_V2_ENABLED`, the switch that
    // makes the notice exist. Reviewed 2026-10-11 (copy-review, prose-pass): the plan-first and
    // "Based on" key is a second ordinary edit to this entry, no bump (Hugh's ruling), same switch.
    keySwitches: {
      'If we change how overviews are written, rewriting one written the old way is free, once per deck.': 'OVERVIEW_V2_ENABLED',
      'An Overview settles the deck’s main plan first, with any backups, then writes around it. In the full Overview, “Based on” under a claim lists the cards it’s about, and each one opens like any card.': 'OVERVIEW_V2_ENABLED',
    },
    marksPending: true,
    since: 11,
  },
  {
    id: 'buying-credits',
    // The redraw for buying credits (#2144), on the Credits screen: drawn while payments is on, in place of `credits`,
    // and announced by its switch. Its two OVERVIEW_V2 keys are dropped (Hugh, 2026-10-21, option b). "Running a deck's
    // Analysis" is not a spender (the Analysis calls no model, `allowance-rule.ts`) and is left out, a Design erratum.
    screen: 'credits',
    switch: 'PAYMENTS_ENABLED',
    replaces: 'credits',
    chapter: '04',
    title: 'How credits work',
    route: '/credits',
    caption:
      'Browsing is always free. Anything we write just for you uses a credit.\n\nThe following use a credit:\n\n- Writing a deck’s Overview\n- Each “Suggested changes” run\n- Each new “Help me choose” search where you fill in “Anything else?”\n- Each “Which deck needs it most?” read\n- Each “Look deeper” in Proposed cuts\n\nEvery card, deck and collection view is free, and so is reading a deck’s bracket.\nOpening a past “Help me choose” run from History is free.\n\nCredits come from these, and are spent in this order:\n\n- Your free credits: {allowance}, each back 24 hours after you use it\n- 15 welcome credits when you join\n- A monthly plan: 60 credits a month\n- A gift from us, now and then\n- Packs: 40 credits for $5',
    // Each spender follows its own feature, as `credits` does; the welcome lot follows its own switch.
    captionLineSwitches: {
      '- Writing a deck’s Overview': 'ANALYSIS_TAB_ENABLED',
      '- Each “Suggested changes” run': 'TUNING_ENABLED',
      '- Each new “Help me choose” search where you fill in “Anything else?”': 'HELP_ME_CHOOSE_ENABLED',
      '- Each “Look deeper” in Proposed cuts': 'PROPOSED_CUTS_ENABLED',
      '- Each “Which deck needs it most?” read': 'FIND_A_DECK_READ_ENABLED',
      'Opening a past “Help me choose” run from History is free.': 'HELP_ME_CHOOSE_ENABLED',
      '- 15 welcome credits when you join': 'WELCOME_CREDITS_ENABLED',
    },
    keys: [
      'Welcome credits expire 30 days after you join. Plan credits roll over while you’re subscribed, and end with the period after you cancel. Gift and pack credits never expire.',
      'A run that fails gives its credit back on its own. A refunded payment takes back the credits it bought that you haven’t spent. A disputed one takes them back, and returns them if the dispute goes your way.',
      'Welcome, plan, gift and pack credits share one daily limit on how many you can spend. Your free credits have their own.',
      'Next to each button that uses a credit, you’ll see how many you have left and when the next one comes back.',
    ],
    since: 16,
  },
  {
    id: 'statuses',
    screen: 'decks',
    chapter: '04',
    title: 'What a deck’s status means',
    route: '/decks',
    width: 'plate',
    caption:
      'Every deck wears one of seven statuses, each pointing at what to do next. “Complete” means sleeve it up and play.\n\n“To buy” is the one to watch: a full deck you can’t sleeve yet. Own two Command Towers across five decks, and three of them still need one.',
    keys: [
      '“New”: empty. “Draft”: has cards, but never committed.',
      '“Building”: committed, but short of a full list.',
      '“Over”: too many cards.',
      '“Unresolved”: has lines we couldn’t match to a card.',
    ],
    since: 1,
  },
  {
    id: 'folders',
    screen: 'decks',
    chapter: '04',
    title: 'Organizing decks into folders',
    route: '/decks',
    // 'inset' at the canvas, where the figure was a legend. Mounted,
    // the shelf line is a full-width row of segments, and a ~300px column wraps it to three.
    width: 'plate',
    caption:
      'Give your decks some shelves. File a deck with “Move” in its menu.\n\n“Just precons” makes a fine name for the decks everyone swears are just precons.',
    keys: [
      'A deck lives in one folder, or none.',
      'Folders sit above the filters on a computer, and under “Folders” on a phone.',
      '“Unfiled” appears once you make your first folder.',
    ],
    marksPending: true,
    since: 1,
  },
  {
    id: 'resume',
    screen: 'home',
    chapter: '04',
    title: 'Pick up where you left off',
    route: '/',
    // 'inset' at the canvas, where the figure was a legend. Mounted,
    // Home’s resume block is a list of full-width rows, each with a portrait, a status keyline and a count.
    width: 'plate',
    caption:
      'The Home page opens on the four decks you touched last, so you can jump right back in.',
    keys: [
      'Each row says why it’s there: edited, committed or played.',
    ],
    marksPending: true,
    since: 1,
  },
  {
    id: 'commitments',
    screen: 'home',
    chapter: '04',
    title: 'How much of your Collection is in use',
    route: '/',
    width: 'inset',
    caption:
      'Three numbers on the Home page show how hard your decks are leaning on your Collection.',
    keys: [
      '“Cards in use”: how much of your Collection is sleeved into committed decks.',
      '“Spoken for twice”: cards your decks want more copies of than you own.',
      '“To buy, all decks”: what every deck still needs, and what it costs.',
    ],
    marksPending: true,
    since: 1,
  },
  {
    id: 'getting-help',
    screen: 'home',
    switch: 'HELP_PANEL_ENABLED',
    chapter: '04',
    title: 'Getting help on any screen',
    route: '/',
    opens: 'from the ? on any screen',
    caption:
      'Every screen has a ? with the About entries for what you’re looking at. Open one for the short version, or read the whole entry in the Reference.\n\nWhere an entry is about a tool on the page, “Show me” scrolls to it and lights it up. Looking for something that lives on another screen? Search reads all of About from right there.\n\nAnd if you’d like the walk-through again, “Take the tour” in the account menu runs it on your own app. Six stops, about a minute.',
    captionLineSwitches: {
      'And if you’d like the walk-through again, “Take the tour” in the account menu runs it on your own app. Six stops, about a minute.': 'FIRST_RUN_TOUR_ENABLED',
    },
    keys: [
      'The ? sits at the foot of the rail, or in the header on a phone.',
      'On a deck or in Collection, chips open the other tabs’ entries.',
      'On desktop, the ? works over a card’s details too.',
      '“Take the tour →” also sits at the top of About.',
    ],
    keySwitches: { '“Take the tour →” also sits at the top of About.': 'FIRST_RUN_TOUR_ENABLED' },
    since: 16,
  },
  // 'reservations' (chapter 04, 'Which deck gets a shared copy') was retired 2026-10-04 (Hugh,
  // no Design round — a removal): it demonstrated overriding the default FROM A DECK'S REVIEW
  // PAGE, and that override no longer exists there (the per-row panel on /decks/[id]/changes
  // was removed; a replacement chooser is going to Design separately). The rule it taught is
  // still true and still shown where it is still live — `post-import`'s own key bullet states
  // it: "when two committed decks want the copy that arrived, the first to sleeve it keeps it
  // unless you say otherwise." No orphaned fact; one entry fewer.
  {
    id: 'proxies',
    screen: 'proxies',
    chapter: '04',
    title: 'Proxying instead of buying',
    route: '/collection/proxies',
    // 'inset' STAYS. Hugh’s ruling, 2026-09-19: a figure that is genuinely
    // narrow sits beside its text and a full-width surface sits under it, so
    // the two-column rhythm follows what each figure IS rather than being
    // imposed. The proxy control is a tick and two lines; it fits.
    width: 'inset',
    caption:
      'Not every deck needs a real Gaea’s Cradle. Choose “Run a proxy” on a card in your deck, and it comes off your shopping list.',
    keys: [
      'In your Collection, the “Proxies” tab beside “Cards” and “Sets” lists everything you’re printing.',
    ],
    marksPending: true,
    since: 1,
  },
  {
    id: 'themes',
    screen: 'account',
    chapter: '04',
    title: 'Picking a color theme',
    route: '/',
    opens: 'in the account menu',
    width: 'plate',
    caption:
      'Six themes live in the account menu under “Theme”, from Low Sun to First Frost. Pick the one that matches your playmat.',
    keys: [
      'Each is named for how it looks, with the plane that inspired it underneath, like Neon Rain and Kamigawa.',
      'Green always means owned, and red always means over-committed, in every theme.',
      'Your pick is saved in this browser, so pick again on another device.',
    ],
    since: 1,
  },
  {
    id: 'about-rebuilt',
    screen: 'account',
    // No switch: the entry the bump to 16 announces.
    chapter: '04',
    title: 'About, rebuilt',
    route: '/about',
    opens: 'opens About',
    caption:
      'About used to be one long page. Now it starts with what the app can do for you.\n\n- Tools: what each tool is for, pictured on a real screen. Press one and it takes you there and lights it up.\n- Reference: every entry, by the screen it lives on, with search and what’s new since your last visit.\n- A ? on every screen, with that screen’s entries.\n- Help me choose, waiting on Decks, Home and Commanders while you have no decks yet.\n- A one-minute tour the first time you open Home.',
    captionLineSwitches: {
      '- A ? on every screen, with that screen’s entries.': 'HELP_PANEL_ENABLED',
      '- Help me choose, waiting on Decks, Home and Commanders while you have no decks yet.': 'HELP_ME_CHOOSE_ENABLED',
      '- A one-minute tour the first time you open Home.': 'FIRST_RUN_TOUR_ENABLED',
    },
    keys: [
      'A tool that needs a deck opens one that fits.',
      '“How it works ›” on a tool opens its full entry.',
      'My note on why The 99 exists now closes the Reference.',
    ],
    since: 16,
  },
  {
    id: 'push',
    chapter: '04',
    screen: 'settings',
    switch: 'PUSH_ENABLED',
    title: 'Push notifications',
    route: '/settings',
    caption:
      'The 99 can tell your phone or computer when something new lands, even with the app closed. It sends the same news Home shows, and you choose each kind on its own:\n\n- A set or a precon that just came out\n- A price drop on a card on your wishlist\n- A combo you can now make with cards you own\n- A friend with a spare of a card on your wishlist\n- A friend asking for one of your spares\n\nIn Settings, tick Push beside a kind. Your browser asks once before anything is sent, and each phone or computer has its own switch at the top of the column.\n\nOn iPhone, add The 99 to your Home Screen first (Share, then Add to Home Screen), open it from there, and turn push on.',
    // Each line follows the kind's own availability (`feedKindAvailable`, src/lib/feed/flag.ts): a kind Settings does not
    // offer has no push box. A new set is always offered, so its line stays and only ` or a precon` follows Precons.
    captionLineSwitches: {
      ' or a precon': 'PRECONS_ENABLED',
      '- A price drop on a card on your wishlist': 'SOCIAL_WISHLIST_ENABLED',
      '- A friend with a spare of a card on your wishlist': ['SOCIAL_FRIENDS_ENABLED', 'SOCIAL_WISHLIST_ENABLED'],
      '- A friend asking for one of your spares': 'SPARE_REQUESTS_ENABLED',
    },
    keys: [
      'Only a friend asking for your spare starts ticked. Nothing is sent until you allow it on a device.',
      'Nothing is sent until you allow it on a device.',
      'Nothing comes between 9pm and 9am; it waits for the morning. Several of one kind arrive as one, except a friend’s ask or answer.',
      'A tap opens what it’s about. Opening Home marks your news seen.',
      'No push while The 99 is open in front of you, except in Safari and on iPhone. No email, ever.',
    ],
    // The spare-request kind starts on (`push_kinds`' rule), and is offered only with spare requests on; without it no kind
    // starts ticked, and the key keeps its second sentence alone.
    keySwitches: {
      'Only a friend asking for your spare starts ticked. Nothing is sent until you allow it on a device.': 'SPARE_REQUESTS_ENABLED',
      'Nothing is sent until you allow it on a device.': '!SPARE_REQUESTS_ENABLED',
    },
    // The version current when it ships: a switched entry is announced by its switch and bumps nothing.
    since: 16,
  },
] as const;
