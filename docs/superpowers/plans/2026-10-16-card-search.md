# Card search: build plan

Design: `design/design_handoff_the99_card_search/` (#1920, R2, READINESS ready to build, approved by Hugh
2026-10-16). Brief: `docs/superpowers/design-briefs/2026-10-16-card-search.md`, whose eight locks stand. d9's audit came
back Yellow, with every item one engineering can resolve. d9 decided them as Hugh's proxy on 2026-10-16 and approved
this plan the same way. The resolutions:

1. **Build to the real header, 79px**: 20px top padding, the 44px account press, 14px bottom padding and a 1px rule.
   The boards drew 73px off the 38px avatar. G5 (the install slot steps aside while offline below 390px) covers
   375px, where the cluster would otherwise leave the wordmark 6px of air.
2. **Search gets its own shell-level `CardDetailProvider`** (open item 8). It is a sibling of the page's provider and
   never registers a sheet, so a card opened from search has nothing under it and keeps Find a deck. G2's
   mount-once rewrite is **not** built. The provider gains one prop, `onDismiss`, which fires only when the reader
   closes the card (✕, Escape, the swipe or Back). Find a deck, Edit copies and a navigation are not a dismissal.
   On the deck page a card opened from search opens as it does off a deck: the search's provider takes no `deckId`.
3. **History.** While the search is open it holds one entry (`useBackDismiss`). At the handover it gives that entry
   up silently (`leaveDialogsForNavigation`) and the card pushes its own. On dismiss the search reopens and pushes a
   fresh entry. So Back from the card returns to the search, and Back again returns to the page.
4. **Quick return**:
   - The header becomes a new fixed overlay, with a spacer in the page's flow at its height.
   - It publishes `--header-offset` (0 while away, its height while shown). Sticky `top-0` heads ride under it by
     reading the variable: the collection filter bar, the cart view and the admin head.
   - It reads a general "a page field has focus" attribute, `data-field-focus` on `<html>`. This is built after
     `data-note-focus`, which stays as the note field's own.
   - It ignores scroll for 300ms after a `reveal()`, a scroll restore or a navigation.
5. **The iOS keyboard.** The sheet's input is mounted with the shell, never lazily, and `focus()` runs inside the
   icon's tap handler, so the keyboard rises in the same gesture.
6. **The data.**
   - `nameSearch` stays as the matcher and gains a rank: the name starts with the query, then a word in it does, then
     any match, then by name, limit 20. The rank serves the new read only. Add cards and the Wishlist search keep
     their order.
   - New: `loadCardSignals(userId, oracleIds)`, the reader's owned sums, the names of the decks holding each card
     (`deck_cards`, plus the commander and partner columns) and wishlist membership. Recent cards reuse it.
   - Art is `cards.image_uri`.
   - The ilike is timed on a scratch branch, and a `pg_trgm` GIN index is added only if it is slow.
7. **Accessibility as drawn** (README call 7). Recent cards are cleared on sign-out.
8. **The About entry ships with PR D** (d9's call): `card-search`, switched on `CARD_SEARCH_ENABLED`, `since` the
   current version, so it bumps nothing and only re-pins the hash. **Do not bump `ABOUT_VERSION` to 15**; it is spent,
   and the next bump is 16.

## PR split

Four PRs, built in order and never stacked; each opens off `main` once the one before it has merged. Each is under
~800 lines and ~20 files.

### A: the read and its action (no UI)

- `src/lib/cards/name-search.ts`: `nameSearch` returns `rank`, a SQL expression with values 0 (the name starts with
  the query), 1 (a word in the name starts with it: after a space, a hyphen or a slash), 2 (any other match,
  flavor-only matches included). The existing callers do not read it.
- `src/lib/cards/card-search.ts`:
  - `searchAllCards(userId, query)` returns at most 20 `CardSearchRow`s, ordered by rank then name. Each row holds
    `oracleId`, `name`, `imageUri` and `flavorName` (`shownFlavor`'s rule).
  - `loadCardSignals(userId, oracleIds)` returns, per oracle id:
    - `owned`, the sum of `collection_items` across printings;
    - `decks`, the reader's deck names holding the card, by name ascending;
    - `wishlist`, a boolean.

  Every join is scoped to the reader in its own SQL (lock 8). Correlated subqueries alias and qualify both sides, the
  Drizzle rule.
- `src/app/card-search-actions.ts`: `searchAllCardsAction(query)` and `cardSignalsAction(oracleIds)`, both signed in
  and re-checking `CARD_SEARCH_ENABLED` for the reader (off: empty). `cardSignalsAction` takes at most 8 ids, the
  recent list's length.
- `CARD_SEARCH_ENABLED` in the registry (`kind: "feature"`, no parent) with `cardSearchEnabled(env)`.
- Tests: the rank order (prefix, word start, any, then name), `.toSQL()` on the signal read (qualified columns, the
  reader in every join), and the actions' switch and signed-out answers.
- **Timing.** On a scratch branch of local-dev, EXPLAIN ANALYZE the ranked search for 2-, 3- and 5-letter queries.
  If any runs over ~50ms, add a `pg_trgm` GIN index on `lower(cards.name)` in the same PR, with the before and
  after figures in the body.
- Probe `pnpm probe:card-search` on a scratch branch: a fixture user's owned, deck (commander, partner and body
  cases) and wishlist signals come back right, and another user's never do.

### B: quick return and the sticky-head offset (no switch)

Hugh's lock 5 is a redesign of the header on every phone screen, so it ships unswitched.

- `MobileHeader` becomes `fixed` with a spacer of its own height. A small hook, `useQuickReturn`, runs it:
  - **at the top**, the header sits in place (`scrollY` ≤ its height);
  - **away** after 8px of downward travel past the top (160ms);
  - **back** after 12px of upward travel from the lowest point (200ms, the sheet curve), with a shadow.
  - **Frozen** while a scroll lock is held (a sheet or modal).
  - **Away and held** while `html[data-field-focus]` is set.
  - **Ignores scroll** for 300ms after `reveal()` (which marks it), a popstate, or a pathname change. A new page
    arrives with the header in place.
  - **Reduced motion:** no slide.
- `--header-offset` on `<html>`. `sticky top-0` heads become `top-[var(--header-offset,0px)]` below md:
  `collection/filter-bar.tsx` (both), `cart/cart-view.tsx` and `admin/admin-head.tsx`. The rest (the rail, the
  create picker, top-off, tuning history, set grid) are desktop-only or inside sheets; each is checked and listed
  in the PR.
- `data-field-focus`: one document-level `focusin`/`focusout` listener in the shell sets it while an `input`,
  `textarea`, `select` or `contenteditable` element inside `<main>` has focus. The deck's Add a card field is the
  case lock 7 needs. The TabBar's `data-note-focus` hiding is unchanged.
- Tests for the hook's state machine (thresholds, freeze, field focus, suppression windows), with mutations checked.
- Contact sheet `quick-return.json` at 360, 375 and 390: top, away, returned mid-page, with the collection filter
  head under it, on the deck page over the bottom controls, and typing in Add a card.

### C: the phone, behind `CARD_SEARCH_ENABLED`

- **The icon.** 20px glyph, 44px press, directly left of the account button, `aria-label="Search all cards"`,
  `aria-haspopup="dialog"`. `InstallSlot` hides while offline below 390px (G5).
- **The sheet**, `CardSearchSheet`. Full screen and mounted with the shell; the field is focused in the tap handler.
  - S1: graphic A, the brand fan with the lens.
  - S2: recent cards with Clear.
  - S3: typing at 2+ characters, a 150ms debounce, the accent bar, skeletons, previous rows at 50%.
  - S4: results with the count; a drag lowers the keyboard; the foot line at 20.
  - S5: no results, reusing the Add cards words.
  - S6: failed, with Try again.
  - S7: offline. Recents hidden, re-run on `online`.
- **The row**, `CardSearchRow`. Art 40×56, the name at 15/600 with the typed letters in the accent, and the mono line:
  `×N owned` / `not owned` · `in {deck}` `+N`. The bookmark marks a wishlisted card. A flavor match reads
  `printed as {flavor}` on line 2 and ownership on line 3. The whole row is one press, with the name from
  `row.aria`.
- **Recent cards** in `localStorage` under `card-search:recent:<userId>`. The last 8 opened from search, newest first
  and deduped. Signals are read fresh on open (`cardSignalsAction`). Every access is wrapped in try/catch, and the
  key is removed in the account menu's `onSignOut` before `clerk.signOut()`.
- **The provider and the handover.** The shell mounts a `CardDetailProvider` for search, with `onDismiss` added to the
  provider (resolution 2). A result: the search records its scroll and query, gives up its history entry, closes,
  and opens card details with the results as siblings. `onDismiss` reopens the search as it was, with focus on the
  row that opened it.
- **Accessibility.** A combobox with a listbox. ↑ and ↓ move, ↵ opens. A polite live region is always mounted and
  speaks 500ms after typing stops; a failure uses `role="alert"`. Escape clears the query, then closes. Back closes
  in one press. Focus returns to the icon.
- New strings: `src/lib/copy/card-search.ts`, from the handoff's file, through `/copy-review` first.
- Probe `pnpm probe:card-search-ui` (390). It opens the sheet, types, presses a result, asserts Find a deck on the
  card, then Back twice: search with the query standing, then the page. Run on the deck page as well.
- Contact sheet `card-search-phone.json` at 360, 375 and 390: S1 to S7, H2, H3, the header with the offline pill,
  and the deck page (DP1, DP4).

### D: the desktop, behind `CARD_SEARCH_ENABLED`, plus About

- **The rail slot (R-A).** A 38px square under the mark and above Home, with a 24px rule under it. It lights like a
  nav slot, and its name tag reads `Search all cards ⌘K`. The touch rail labels it `Search`.
- **The field.** 540px, opening 12px out from the rail with a caret, its top on the well's. The shortcut shows at the
  field's right edge until typing starts. The dropdown under it reuses C's states and rows at 30×42 and 14/600, with
  the foot line `⌘K opens this from anywhere` and the keys hint.
- **⌘K on a Mac, Ctrl+K elsewhere**, including inside page fields, but never Ctrl+K on a Mac and not while a dialog is
  up. `aria-keyshortcuts` is on the well. Focus returns to the slot, or to wherever the shortcut was pressed.
- **The handover**, D7 and D8, through the same provider and `onDismiss`.
- **About:** the `card-search` entry from `about · card search.ts`, chapter 01 after `card-detail`, switched, with
  `since` the current version and the hash re-pinned. Its words go through `/copy-review`.
- Probe: the desktop leg of `probe:card-search-ui` at 1300. ⌘K opens it, a result shows Find a deck, Escape on the
  card returns to the field.
- Contact sheet `card-search-desktop.json` at 1300: D1 to D8, plus DD1 and DD2 on the deck page.

## Route × viewport inventory

| Surface | 360 | 375 | 390 | 1300 | PR |
|---|---|---|---|---|---|
| Any page, header at top, away and returned | ☐ | ☐ | ☐ | n/a | B |
| `/collection`, filter head under the returned header | ☐ | ☐ | ☐ | n/a | B |
| `/decks/[id]`, header over the bottom controls, Add a card typing | ☐ | ☐ | ☐ | n/a | B |
| Header icon at rest, and offline with install (G5) | ☐ | ☐ | ☐ | n/a | C |
| Sheet S1 to S7 | ☐ | ☐ | ☐ | n/a | C |
| Card from a result (Find a deck) and back | ☐ | ☐ | ☐ | n/a | C |
| `/decks/[id]`, search all cards beside Add a card | ☐ | ☐ | ☐ | ☐ | C, D |
| Rail slot, field, D1 to D8 | n/a | n/a | n/a | ☐ | D |
| `/about`, the entry | ☐ | ☐ | ☐ | ☐ | D |

## Switch rollout

When A merges, d9 is told: `CARD_SEARCH_ENABLED` exists, set it `'true'` on staging, leave production unset. Off,
the actions answer empty, and from C onward no icon, sheet, rail slot, shortcut or About entry appears. Quick
return (B) is unswitched.

## Not in this plan

Filters of any kind, search by rules text, changing card details, and G2's mount-once provider.
