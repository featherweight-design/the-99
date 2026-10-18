# Brief: The public card page and the public commander page

2026-10-17. Launch epic F2 (`docs/superpowers/plans/2026-10-17-launch-epic.md`), ruling L12 by Hugh, 2026-10-17, from the F1
research. Every item under "Locked" is his and is not reopened by Design.

**What this brief asks.** Two read-only pages a person can open with no account: one for a card, one for a commander. What
each shows and leaves out, how a signed-out visitor is invited toward The 99 without anything being gated, and how search
hands off to Scryfall. It proposes one Design round and one board.

## The problem

Every card, commander, deck and search view in The 99 needs a session, and sign-up is invite-only, so card data is reachable
neither anonymously nor with a free account anyone can get. Wizards' Fan Content Policy bars requiring "email registration to
access your Fan Content", and Scryfall's terms ask that "End-users should be able to access card data anonymously or with free
accounts." Every peer that was checked (EDHREC, Archidekt, MTGGoldfish) shows card and commander pages to a logged-out
visitor and gates personal data, writes and paid compute instead. Invite-only stays (L2); these two pages are the open
surface that sits beside it.

## What exists today, and stays

- **No standalone card page.** A card opens as a sheet over a deck or a list (`src/components/cards/`, loaded through
  `/api/card-detail`, keyed on the reader and a 401 when signed out). The sheet carries owned copies, availability, deck
  rows and prices tied to holdings: none of that may appear here.
- **`/commanders/[slug]` exists** and is per-user end to end (a ranked list, a score against the reader's collection, owned
  art). Its catalog-only parts are `commander_support` (rank, deck count, themes, bracket and budget counts, similar
  commanders, engine) and the one accepted prose sentence, plus the card's own catalog row.
- **The card's catalog row** (`cards`): name, mana cost, mana value, colour identity, type line, oracle text, keywords,
  Commander legality, image and a frame-free art crop, rarity, layout and a back face; printings and prices are in their
  own tables (`printings`, `printing_prices`).
- **Public routes today** are `/`, `/offline`, `/friend/(.*)`, `/join/(.*)`, `/sign-up`, and the webhook and health paths
  (`src/proxy.ts`, `isPublic`).
- **The Fan Content footer** (launch epic A0, `2026-10-17-fan-content-notice.md`) sits on every page, these two included,
  and is not redrawn here.

## Locked (do not reopen)

1. **Two pages: a card page and a commander page** (L12). Shared deck pages are deferred and decided together with opening
   sign-up. There is no card search on these pages (the in-app search, `2026-10-16-card-search.md`, is signed-in only and
   stays so). **Search links out to Scryfall.**
2. **Catalog only.** Neither page reads anything about a person: no collection, owned art, availability, decks, game log,
   wishlist, friends or account. A test will prove the public loaders import nothing from collection, decks or the social
   code; so nothing on these pages may need such data, even in a loading or empty state.
3. **Signed out is the design.** A signed-in reader may later see more, but these pages are drawn for someone with no account,
   no cookie and no context. There is no wall, no blocking modal and no gate anywhere on them.
4. **Sign-up stays invite-only** (L2), so the page cannot say "Sign up". What it may offer a visitor is a way to ask for an
   invitation or to sign in if they already have one; Design draws that, and it asks for nothing.
5. **Cached at the CDN and rate-limited by IP** (engineering, below): the pages are the same for everyone.
6. **The Fan Content footer is on both pages**, and the card and Scryfall credit lines the A0 notice already carries are not
   repeated in the body.
7. **Mobile and desktop ship together**, as always.

## Engineering notes

- **Routes.** A new card route, and a catalog-only render path for the commander page, each public in `src/proxy.ts`. Each
  public loader is separate from the signed-in one rather than the signed-in page with the reader nulled out. **Whether the
  public commander page is the same URL as `/commanders/[slug]` or its own path is an engineering decision for F3**, since a
  page cached the same for everyone cannot also be the per-user page at one address; Design draws the signed-out page and
  does not assume a signed-in reader ever sees it.
- **Caching.** The page is static per card or commander and cached keyed on the catalog refresh stamp, so the database sees
  about one read per page per day (on the order of 30,000 oracle cards and 3,400 commanders). A page's content cannot depend on who is
  asking, which is why nothing personal may appear.
- **Slugs are not settled.** Cards have no slug today, and a commander's slug is stored per reader (`commander_scores.slug`,
  deduplicated by the reader's own rank order), so a person-independent slug for each is new work in F3. Design the title and
  heading for the name; the address is not part of this brief.
- **Anonymous reads get an IP-keyed rate bucket** and `robots` and a sitemap for the two page types. None of that is drawn.
- **Prices** come from Mana Pool (`printing_prices`), credited in the footer. The public pages show none (decided, below).

## Open for Design to call

1. **The card page's contents and order.** Candidates, all catalog-only: the card image (and the back face for a double-faced
   card), name, mana cost and type line, oracle text, colour identity, whether it is Commander-legal (a yes or no; the catalog does not say why a card is not), the Game Changer mark and the
   bracket marks the app already draws on a card (`design/design_handoff_the99_card_mark/`), a printings list, and a link out
   to the card on Scryfall. Which are the page and which are noise, at 390 and 1300.
2. **How a flipped card reads** on a page with no tap-to-zoom sheet: the existing flip, or both faces shown.
3. **The commander page's contents.** Candidates: the commander card and its art, the one-sentence read, rank and deck count,
   its themes, the bracket spread of the decks built around it, the similar commanders (each a link to its own public page),
   and the engine. The prose is a generated sentence The 99 pays for; it is the page's one piece of The 99's own writing, so
   decide where it sits. What is dropped from the signed-in page because it needs the reader (the score, the gap line, owned
   art) and what takes its place.
4. **Signed-out framing.** What the visitor is told once, quietly: that this is The 99, what it does with their own
   collection, and how to ask for an invitation or sign in. One small block per page, not a banner. Where it sits and how it
   stays out of the way of the card.
5. **Search.** The "search links out to Scryfall" element: a small, honest "Find another card on Scryfall" that opens
   Scryfall in a new tab, placed where a person who landed on a page and wants a different card would look. No search box
   on The 99 itself.
6. **Moving between pages.** From a commander to its signature cards or similar commanders, and from a card back to commanders
   it fits, only where the data is catalog-only; or no cross-links in the first cut. Say which.
7. **Empty and unavailable states** a public page can reach: a card with no image, a commander with no support data (EDHREC
   does not index it: `absent`), one whose support read failed (`degraded`, which a reader should see as "not available right
   now" rather than as a commander with nothing to say) or no prose, rank and deck count that are blank, a card that is not Commander-legal, and an unknown slug (a plain not-found page, no
   suggestions that need a search).
8. **Share and link previews.** What a link to either page unfurls as (title, description, image). The page is the product's
   front door, so this is the first thing many people see.

## Decided 2026-10-18 (d9 for Hugh)

- **No prices on the public pages, first cut.** They come from Mana Pool's feed, anonymous traffic on them adds scraping
  value, and prices are per printing so a card page has no single price. The link out to the card on Scryfall carries a
  shopper to one. Revisit later.
- **The generated prose sentence is on the public commander page.** It is already generated and cached, so a view costs
  nothing extra, and it is what makes the page worth opening. Open 3 decides where it sits.
- Logged as Hugh's proxy; he can override.

## Every state to draw

One board, both widths:

- A card page: a single-faced card, a double-faced card, a card with several printings, a card with no image.
- A commander page: a full one (support data and prose), one with support data and no prose, one EDHREC does not index, and
  one whose support read is degraded.
- The signed-out framing block on each, and a link preview for each.
- An unknown slug.

## Out of scope

- Shared deck pages, card search, a public collection or profile, anything that reads a person.
- The footer notice (A0), the rate limit, `robots`, the sitemap and the loaders (F3 and after).
- Opening sign-up (L2), which is decided with the shared deck pages.
